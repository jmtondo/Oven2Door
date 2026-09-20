const express = require('express');
const router = express.Router();
const db = require('../db');
const { getAuth } = require('../firebase-admin');

const imageMap = {
  'Pepperoni Pizza': 'assets/images/pizzapics/Pepperonithincrust.png',
  'Hawaiian Pizza': 'assets/images/pizzapics/Hawaiianthincrust.png',
  'Cheese Pizza': 'assets/images/pizzapics/Cheesestuffedcrust.png',
  'Bacon Mushroom Pizza': 'assets/images/pizzapics/Veggiethincrust.png',
};

async function requireUser(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
    req.user = await getAuth().verifyIdToken(token);
    next();
  } catch (_) { return res.status(401).json({ message: 'Your session has expired. Please sign in again.' }); }
}

async function catalog() {
  const [products] = await db.query(`SELECT p.product_id, p.product_name, p.description, p.image_url,
    c.category_name, MIN(ps.price) AS price FROM products p JOIN categories c ON c.category_id=p.category_id
    LEFT JOIN product_sizes ps ON ps.product_id=p.product_id AND ps.status='active'
    WHERE p.status='available' GROUP BY p.product_id ORDER BY p.product_id`);
  return Promise.all(products.map(async product => {
    const [sizes] = await db.query(`SELECT s.size_id AS id, CONCAT(s.size_name, ' ', s.size_inches, '\"') AS name, ps.price FROM product_sizes ps JOIN sizes s ON s.size_id=ps.size_id WHERE ps.product_id=? AND ps.status='active'`, [product.product_id]);
    const [crusts] = await db.query(`SELECT c.crust_id AS id, c.crust_name AS name, pc.additional_price AS price FROM product_crusts pc JOIN crusts c ON c.crust_id=pc.crust_id WHERE pc.product_id=? AND pc.status='active'`, [product.product_id]);
    const [toppings] = await db.query(`SELECT t.topping_id AS id, t.topping_name AS name, pt.additional_price AS price FROM product_toppings pt JOIN toppings t ON t.topping_id=pt.topping_id WHERE pt.product_id=? AND pt.status='active'`, [product.product_id]);
    const basePrice = Number(product.price || 0);
    const sizePrice = Number(sizes[0]?.price || 0);
    const resolvedPrice = basePrice > 0 ? basePrice : sizePrice;
    return {...product, image_path: product.image_url || imageMap[product.product_name] || '', price: resolvedPrice, sizes, crusts, toppings};
  }));
}

router.get('/catalog', async (_req, res) => { try { res.json(await catalog()); } catch (error) { console.error('Catalog error:', error); res.status(500).json({message: 'Could not load catalog.'}); } });

router.get('/addresses', requireUser, async (req, res) => { const [rows] = await db.query('SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC, created_at DESC', [req.user.uid]); res.json(rows); });
router.post('/addresses', requireUser, async (req, res) => {
  const {label, houseNumber, street, barangay, city, province, postalCode} = req.body;
  if (!barangay || !city || !province) return res.status(400).json({message: 'Barangay, city, and province are required.'});
  const [result] = await db.query('INSERT INTO addresses (user_id,address_label,house_number,street,barangay,city,province,postal_code,is_default) VALUES (?,?,?,?,?,?,?,?, NOT EXISTS(SELECT 1 FROM (SELECT address_id FROM addresses WHERE user_id=?) a))', [req.user.uid,label||'Home',houseNumber||null,street||null,barangay,city,province,postalCode||null,req.user.uid]);
  res.status(201).json({addressId: result.insertId});
});

router.post('/cart', requireUser, async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const connection = await db.getConnection();
  try { await connection.beginTransaction(); const [[cart]] = await connection.query('SELECT cart_id FROM carts WHERE user_id=?', [req.user.uid]); let cartId=cart?.cart_id; if (!cartId) { const [insert] = await connection.query('INSERT INTO carts (user_id) VALUES (?)',[req.user.uid]); cartId=insert.insertId; } await connection.query('DELETE FROM cart_items WHERE cart_id=?',[cartId]); for (const item of items) { const detail=await pricedItem(connection,item); const [insert]=await connection.query('INSERT INTO cart_items (cart_id,product_id,size_id,crust_id,quantity,unit_price,subtotal) VALUES (?,?,?,?,?,?,?)',[cartId,item.productId,item.sizeId||null,item.crustId||null,item.quantity,detail.unit,detail.unit*item.quantity]); for(const topping of detail.toppings) await connection.query('INSERT INTO cart_item_toppings (cart_item_id,topping_id,price) VALUES (?,?,?)',[insert.insertId,topping.id,topping.price]); } await connection.commit(); res.json({success:true}); } catch(error) { await connection.rollback(); console.error('Cart error:',error); res.status(400).json({message:'Could not save cart.'}); } finally { connection.release(); }
});

async function pricedItem(connection, item) {
  const [[product]] = await connection.query('SELECT product_id, product_name FROM products WHERE product_id=? AND status="available"',[item.productId]); if (!product) throw new Error('Product unavailable');
  const [[size]] = await connection.query('SELECT ps.price, s.size_name, s.size_inches FROM product_sizes ps JOIN sizes s ON s.size_id=ps.size_id WHERE ps.product_id=? AND ps.size_id=? AND ps.status="active"',[item.productId,item.sizeId || 1]); if (!size) throw new Error('Invalid size');
  let unit=Number(size.price); let crust=null; if(item.crustId) { const [[value]]=await connection.query('SELECT pc.additional_price,c.crust_name FROM product_crusts pc JOIN crusts c ON c.crust_id=pc.crust_id WHERE pc.product_id=? AND pc.crust_id=? AND pc.status="active"',[item.productId,item.crustId]); if(!value) throw new Error('Invalid crust'); crust=value; unit+=Number(value.additional_price); }
  const toppings=[]; for(const toppingId of item.toppingIds || []) { const [[value]]=await connection.query('SELECT pt.additional_price AS price,t.topping_id AS id FROM product_toppings pt JOIN toppings t ON t.topping_id=pt.topping_id WHERE pt.product_id=? AND pt.topping_id=? AND pt.status="active"',[item.productId,toppingId]); if(value){toppings.push(value);unit+=Number(value.price);} }
  return {product,size,crust,toppings,unit};
}

router.post('/checkout', requireUser, async (req, res) => {
  const {items,addressId,orderType='delivery',paymentMethod='cash',notes='',promoCode} = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({message:'Your cart is empty.'});
  if(orderType==='delivery' && !addressId) return res.status(400).json({message:'Choose a delivery address.'});
  const connection=await db.getConnection(); try { await connection.beginTransaction(); if(addressId){const [[address]]=await connection.query('SELECT address_id FROM addresses WHERE address_id=? AND user_id=?',[addressId,req.user.uid]);if(!address)throw new Error('Invalid address');}
    const entries=[]; for(const item of items) entries.push({...await pricedItem(connection,item),quantity:Number(item.quantity)}); const subtotal=entries.reduce((sum,item)=>sum+item.unit*item.quantity,0); const deliveryFee=orderType==='delivery'?49:0; let discount=0,promotion=null;
    if(promoCode){const [[promo]]=await connection.query('SELECT * FROM promotions WHERE promo_code=? AND status="active" AND NOW() BETWEEN start_date AND end_date',[promoCode]);if(promo && subtotal>=Number(promo.minimum_order)){promotion=promo;discount=promo.discount_type==='percentage'?subtotal*Number(promo.discount_value)/100:Number(promo.discount_value);}}
    const orderNumber=`O2D-${Date.now().toString().slice(-8)}`; const [order]=await connection.query('INSERT INTO orders (user_id,address_id,order_number,order_type,subtotal,delivery_fee,discount,total_amount,notes) VALUES (?,?,?,?,?,?,?,?,?)',[req.user.uid,addressId||null,orderNumber,orderType,subtotal,deliveryFee,discount,Math.max(0,subtotal+deliveryFee-discount),notes||null]);
    for(const entry of entries){const [orderItem]=await connection.query('INSERT INTO order_items (order_id,product_id,product_name,size_id,size_name,size_inches,crust_id,crust_name,quantity,unit_price,subtotal) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[order.insertId,entry.product.product_id,entry.product.product_name,entry.size?req.body.items[entries.indexOf(entry)].sizeId:null,entry.size?.size_name||null,entry.size?.size_inches||null,entry.crust?req.body.items[entries.indexOf(entry)].crustId:null,entry.crust?.crust_name||null,entry.quantity,entry.unit,entry.unit*entry.quantity]);for(const topping of entry.toppings)await connection.query('INSERT INTO order_item_toppings (order_item_id,topping_id,topping_name,quantity,price) SELECT ?, topping_id, topping_name, 1, ? FROM toppings WHERE topping_id=?',[orderItem.insertId,topping.price,topping.id]);}
    if(promotion) await connection.query('INSERT INTO order_promotions (order_id,promotion_id,discount_amount) VALUES (?,?,?)',[order.insertId,promotion.promotion_id,discount]); await connection.query('INSERT INTO payments (order_id,payment_method,amount,payment_status) VALUES (?,?,?,?)',[order.insertId,paymentMethod,Math.max(0,subtotal+deliveryFee-discount),paymentMethod==='cash'?'pending':'pending']); await connection.query('DELETE ci FROM cart_items ci JOIN carts c ON c.cart_id=ci.cart_id WHERE c.user_id=?',[req.user.uid]); await connection.commit();res.status(201).json({orderNumber,total:Math.max(0,subtotal+deliveryFee-discount)});
  } catch(error){await connection.rollback();console.error('Checkout error:',error);res.status(400).json({message:error.message||'Could not place order.'});} finally {connection.release();}
});
router.get('/orders', requireUser, async (req,res)=>{const [rows]=await db.query('SELECT order_number,order_status,total_amount,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC',[req.user.uid]);res.json(rows);});
router.post('/profile', requireUser, async (req,res)=>{const {firstName,lastName,phone}=req.body;if(!firstName||!lastName)return res.status(400).json({message:'First and last name are required.'});await db.query('UPDATE users SET first_name=?,last_name=?,phone=? WHERE user_id=?',[firstName,lastName,phone||null,req.user.uid]);res.json({success:true});});
module.exports = router;

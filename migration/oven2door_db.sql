-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 16, 2026 at 05:13 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `oven2door_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `addresses`
--

CREATE TABLE `addresses` (
  `address_id` int(10) UNSIGNED NOT NULL,
  `user_id` varchar(128) NOT NULL,
  `address_label` varchar(50) DEFAULT NULL,
  `house_number` varchar(100) DEFAULT NULL,
  `street` varchar(150) DEFAULT NULL,
  `barangay` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL,
  `province` varchar(100) NOT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `carts`
--

CREATE TABLE `carts` (
  `cart_id` int(10) UNSIGNED NOT NULL,
  `user_id` varchar(128) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cart_items`
--

CREATE TABLE `cart_items` (
  `cart_item_id` int(10) UNSIGNED NOT NULL,
  `cart_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `size_id` int(10) UNSIGNED DEFAULT NULL,
  `crust_id` int(10) UNSIGNED DEFAULT NULL,
  `quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `special_instructions` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cart_item_toppings`
--

CREATE TABLE `cart_item_toppings` (
  `cart_item_topping_id` int(10) UNSIGNED NOT NULL,
  `cart_item_id` int(10) UNSIGNED NOT NULL,
  `topping_id` int(10) UNSIGNED NOT NULL,
  `quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `category_id` int(10) UNSIGNED NOT NULL,
  `category_name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`category_id`, `category_name`, `description`, `status`, `created_at`) VALUES
(1, 'Pizza', 'Freshly baked pizzas', 'active', '2026-08-28 16:59:32'),
(2, 'Pasta', 'Pasta dishes', 'active', '2026-08-28 16:59:32'),
(3, 'Chicken', 'Chicken meals and sides', 'active', '2026-08-28 16:59:32'),
(4, 'Sides', 'Pizza side dishes', 'active', '2026-08-28 16:59:32'),
(5, 'Drinks', 'Cold and refreshing beverages', 'active', '2026-08-28 16:59:32'),
(6, 'Desserts', 'Sweet treats', 'active', '2026-08-28 16:59:32');

-- --------------------------------------------------------

--
-- Table structure for table `crusts`
--

CREATE TABLE `crusts` (
  `crust_id` int(10) UNSIGNED NOT NULL,
  `crust_name` varchar(50) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `crusts`
--

INSERT INTO `crusts` (`crust_id`, `crust_name`, `status`) VALUES
(1, 'Classic', 'active'),
(2, 'Thin Crust', 'active'),
(3, 'Cheese Burst', 'active'),
(4, 'Stuffed Crust', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `deliveries`
--

CREATE TABLE `deliveries` (
  `delivery_id` int(10) UNSIGNED NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `rider_id` varchar(128) NOT NULL,
  `delivery_status` enum('pending','assigned','picked_up','out_for_delivery','delivered','cancelled') NOT NULL DEFAULT 'pending',
  `assigned_at` datetime DEFAULT NULL,
  `picked_up_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `delivery_notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `delivery_tracking`
--

CREATE TABLE `delivery_tracking` (
  `tracking_id` bigint(20) UNSIGNED NOT NULL,
  `delivery_id` int(10) UNSIGNED NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `recorded_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` int(10) UNSIGNED NOT NULL,
  `user_id` varchar(128) NOT NULL,
  `address_id` int(10) UNSIGNED DEFAULT NULL,
  `order_number` varchar(30) NOT NULL,
  `order_type` enum('delivery','pickup') NOT NULL DEFAULT 'delivery',
  `order_status` enum('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled') NOT NULL DEFAULT 'pending',
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` int(10) UNSIGNED NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED DEFAULT NULL,
  `product_name` varchar(100) NOT NULL,
  `size_id` int(10) UNSIGNED DEFAULT NULL,
  `size_name` varchar(30) DEFAULT NULL,
  `size_inches` decimal(4,1) DEFAULT NULL,
  `crust_id` int(10) UNSIGNED DEFAULT NULL,
  `crust_name` varchar(50) DEFAULT NULL,
  `quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `special_instructions` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_item_toppings`
--

CREATE TABLE `order_item_toppings` (
  `order_item_topping_id` int(10) UNSIGNED NOT NULL,
  `order_item_id` int(10) UNSIGNED NOT NULL,
  `topping_id` int(10) UNSIGNED DEFAULT NULL,
  `topping_name` varchar(50) NOT NULL,
  `quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_promotions`
--

CREATE TABLE `order_promotions` (
  `order_id` int(10) UNSIGNED NOT NULL,
  `promotion_id` int(10) UNSIGNED NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` int(10) UNSIGNED NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `payment_method` enum('cash','gcash','maya','card') NOT NULL DEFAULT 'cash',
  `transaction_id` varchar(100) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(10) UNSIGNED NOT NULL,
  `category_id` int(10) UNSIGNED NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `status` enum('available','unavailable','inactive') NOT NULL DEFAULT 'available',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `category_id`, `product_name`, `description`, `image_url`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'Pepperoni Thin Crust', 'Classic pizza topped with pepperoni and cheese', 'assets/images/pizzapics/Pepperonithincrust.png', 'available', '2026-08-28 16:59:32', '2026-09-03 23:56:16'),
(2, 1, 'Hawaiian Thin Crust', 'Pizza topped with ham and pineapple', 'assets/images/pizzapics/Hawaiianthincrust.png', 'available', '2026-08-28 16:59:32', '2026-09-03 23:56:16'),
(3, 1, 'Cheese Stuffed Crust', 'Classic pizza with rich melted cheese', 'assets/images/pizzapics/Cheesestuffedcrust.png', 'available', '2026-08-28 16:59:32', '2026-09-03 23:56:16'),
(4, 1, 'BBQ Chicken Thin Crust', 'Pizza topped with bacon and mushrooms', 'assets/images/pizzapics/Bbqchickenthincrust.png', 'available', '2026-08-28 16:59:32', '2026-09-03 23:56:16'),
(5, 1, 'Spinach Thin Crust', 'Fresh spinach, creamy cheese, and tomato sauce', 'assets/images/pizzapics/Spinachthincrust.png', 'available', '2026-09-03 23:54:26', '2026-09-03 23:54:26'),
(6, 1, 'BBQ Chicken Thin Crust', 'Tender chicken with smoky BBQ sauce and cheese', 'assets/images/pizzapics/Bbqchickenthincrust.png', 'available', '2026-09-03 23:54:26', '2026-09-03 23:54:26'),
(7, 1, 'Veggie Thin Crust', 'Fresh vegetables, savory sauce, and cheese', 'assets/images/pizzapics/Veggiethincrust.png', 'available', '2026-09-03 23:54:26', '2026-09-03 23:54:26'),
(8, 2, 'Carbonara', 'Creamy and savory pasta', 'assets/images/pizzapics/Carbonara.png', 'available', '2026-09-03 23:54:26', '2026-09-03 23:54:26'),
(9, 3, 'Chicken Nuggets', 'Crispy golden chicken nuggets', 'assets/images/pizzapics/ChickenNuggets.png', 'available', '2026-09-03 23:54:26', '2026-09-03 23:54:26'),
(10, 4, 'Classic Fries', 'Crispy golden fries', 'assets/images/pizzapics/Fries.png', 'available', '2026-09-03 23:54:26', '2026-09-03 23:54:26'),
(11, 5, 'Coca Cola', 'Refreshing fizzy cola', 'assets/images/pizzapics/CocaCola.png', 'available', '2026-09-03 23:54:26', '2026-09-03 23:54:26'),
(12, 1, 'All Meat Thick Crust', 'A thick golden crust loaded with rich and savory meats.', 'assets/images/pizzapics/Allmeatthickcrust.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(13, 1, 'Ham & Cheese Thick Crust', 'Fluffy thick crust topped with savory ham and melted cheese.', 'assets/images/pizzapics/Hamncheesethickcrust.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(14, 1, 'Supreme Thick Crust', 'Thick crust loaded with bacon, pepperoni, sausage, vegetables, and cheese.', 'assets/images/pizzapics/Thicksupremepizza.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(15, 1, 'All In Overload', 'A thick crust piled high with premium meats, vegetables, and mozzarella cheese.', 'assets/images/pizzapics/Allinoverload.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(16, 1, 'Hawaiian Thick Crust', 'Fluffy thick crust topped with ham, pineapple, and mozzarella.', 'assets/images/pizzapics/Hawaiianthickcrust.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(17, 1, 'Pepperoni Stuffed Crust', 'Cheese-stuffed crust loaded with pepperoni and mozzarella cheese.', 'assets/images/pizzapics/Pepperonistuffedcrust.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(18, 1, 'Meat Lovers Stuffed Crust', 'Stuffed crust loaded with pepperoni, ham, bacon, sausage, and cheese.', 'assets/images/pizzapics/Meatloversstuffedcrust.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(19, 1, 'Hawaiian Stuffed Crust', 'Cheese-stuffed crust topped with savory ham and sweet pineapple.', 'assets/images/pizzapics/Hawaiianstuffedcrust.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(20, 1, 'Supreme Stuffed Crust', 'Stuffed crust loaded with premium meats, vegetables, and mozzarella.', 'assets/images/pizzapics/Supremestuffedcrust.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(21, 5, 'Sprite', 'A crisp and refreshing lemon-lime soda.', 'assets/images/pizzapics/Sprite.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(22, 5, 'Royal', 'A sweet and fruity orange-flavored soda.', 'assets/images/pizzapics/Royal.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(23, 5, 'Root Beer', 'A sweet, creamy, and aromatic root beer beverage.', 'assets/images/pizzapics/Rootbeer.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(24, 5, 'Mountain Dew', 'A bold citrus-flavored refreshing soft drink.', 'assets/images/pizzapics/Mountaindew.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(25, 5, 'Orange Juice', 'A naturally sweet and tangy orange drink.', 'assets/images/pizzapics/Orangejuice.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(26, 5, 'Apple Juice', 'A smooth drink with a naturally sweet apple flavor.', 'assets/images/pizzapics/Applejuice.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(27, 5, 'Lemon Juice', 'A bright and refreshing drink with a tangy lemon flavor.', 'assets/images/pizzapics/Lemonjuice.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(28, 5, 'Pineapple Juice', 'A tropical drink with a sweet and tangy pineapple flavor.', 'assets/images/pizzapics/Pineapplejuice.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(29, 5, 'Mango Juice', 'A smooth and fruity drink with a sweet tropical mango flavor.', 'assets/images/pizzapics/Mangojuice.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(30, 5, 'Iced Tea', 'A chilled and refreshing beverage for warm days.', 'assets/images/pizzapics/Icedtea.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(31, 5, 'Iced Coffee', 'Smooth and creamy coffee served chilled over ice.', 'assets/images/pizzapics/Icedcoffee.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(32, 5, 'Blue Lemonade', 'Sweet and tangy lemonade with a refreshing citrus flavor.', 'assets/images/pizzapics/Bluelemonade.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(33, 5, 'Beer', 'A chilled beverage with a smooth and slightly bitter taste.', 'assets/images/pizzapics/Beer.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(34, 5, 'Sparkling Water', 'Light and refreshing water with a crisp bubbly finish.', 'assets/images/pizzapics/sparklingwater.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(35, 4, 'Waffle Fries', 'Crispy golden waffle-cut fries with a satisfying crunch.', 'assets/images/pizzapics/WaffleFries.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(36, 4, 'Crinkle Cut Fries', 'Thick crispy fries with a fun crinkle-cut texture.', 'assets/images/pizzapics/CrinkleCutFries.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(37, 4, 'Bacon Cheese Fries', 'Golden fries loaded with crispy bacon and melted cheese.', 'assets/images/pizzapics/BaconCheeseFries.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(38, 4, 'Sweet Potato Fries', 'Crispy sweet potato fries with a sweet and savory flavor.', 'assets/images/pizzapics/SweetPotatoFries.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(39, 3, 'Wings', 'Juicy chicken wings with Garlic Parmesan, Buffalo, or BBQ sauce.', 'assets/images/pizzapics/Wings.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(40, 3, 'Boneless Chicken Bites', 'Tender bite-sized chicken pieces crispy on the outside and juicy inside.', 'assets/images/pizzapics/BonelessChickenBites.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(41, 3, 'Chicken Tenders', 'Crispy golden strips of tender chicken perfect for dipping.', 'assets/images/pizzapics/ChickenTenders.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(42, 3, 'Chicken Poppers', 'Crispy flavorful bite-sized chicken pieces.', 'assets/images/pizzapics/ChickenPoppers.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(43, 2, 'Carbonara / Chicken Alfredo', 'Creamy and savory pasta tossed in a rich sauce.', 'assets/images/pizzapics/Carbonara.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(44, 2, 'Spaghetti', 'Classic spaghetti tossed in rich tomato sauce.', 'assets/images/pizzapics/Spaghetti.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(45, 2, 'Lasagna', 'Layers of pasta, meat sauce, and creamy cheese baked together.', 'assets/images/pizzapics/Lasagna.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(46, 2, 'Mac n Cheese', 'Creamy macaroni covered in smooth melted cheese.', 'assets/images/pizzapics/MacnCheese.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02'),
(47, 2, 'Pesto Pasta', 'Pasta tossed in a flavorful basil pesto sauce.', 'assets/images/pizzapics/PestoPasta.png', 'available', '2026-09-04 00:02:02', '2026-09-04 00:02:02');

-- --------------------------------------------------------

--
-- Table structure for table `product_crusts`
--

CREATE TABLE `product_crusts` (
  `product_id` int(10) UNSIGNED NOT NULL,
  `crust_id` int(10) UNSIGNED NOT NULL,
  `additional_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_crusts`
--

INSERT INTO `product_crusts` (`product_id`, `crust_id`, `additional_price`, `status`) VALUES
(1, 1, 0.00, 'active'),
(1, 2, 20.00, 'active'),
(1, 3, 50.00, 'active'),
(1, 4, 40.00, 'active'),
(2, 1, 0.00, 'active'),
(2, 2, 20.00, 'active'),
(2, 3, 50.00, 'active'),
(2, 4, 40.00, 'active'),
(3, 1, 0.00, 'active'),
(3, 2, 20.00, 'active'),
(3, 3, 50.00, 'active'),
(3, 4, 40.00, 'active'),
(4, 1, 0.00, 'active'),
(4, 2, 20.00, 'active'),
(4, 3, 50.00, 'active'),
(4, 4, 40.00, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `product_seed`
--

CREATE TABLE `product_seed` (
  `category_id` int(11) NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_seed`
--

INSERT INTO `product_seed` (`category_id`, `product_name`, `description`, `image_url`, `price`) VALUES
(1, 'Pepperoni Thin Crust', 'Crispy, cheesy pizza packed with flavorful pepperoni slices.', 'assets/images/pizzapics/Pepperonithincrust.png', 299.00),
(1, 'Hawaiian Thin Crust', 'Crispy crust topped with smoky ham and sweet pineapple.', 'assets/images/pizzapics/Hawaiianthincrust.png', 299.00),
(1, 'Spinach Thin Crust', 'Fresh spinach, creamy cheese, and tomato sauce on a crisp crust.', 'assets/images/pizzapics/Spinachthincrust.png', 299.00),
(1, 'BBQ Chicken Thin Crust', 'Tender chicken glazed with smoky BBQ sauce and cheese.', 'assets/images/pizzapics/Bbqchickenthincrust.png', 329.00),
(1, 'Veggie Thin Crust', 'Fresh vegetables, savory sauce, and cheese on a crisp crust.', 'assets/images/pizzapics/Veggiethincrust.png', 299.00),
(1, 'All Meat Thick Crust', 'A thick golden crust loaded with rich and savory meats.', 'assets/images/pizzapics/Allmeatthickcrust.png', 349.00),
(1, 'Ham & Cheese Thick Crust', 'Fluffy thick crust topped with savory ham and melted cheese.', 'assets/images/pizzapics/Hamncheesethickcrust.png', 329.00),
(1, 'Supreme Thick Crust', 'Thick crust loaded with bacon, pepperoni, sausage, vegetables, and cheese.', 'assets/images/pizzapics/Thicksupremepizza.png', 379.00),
(1, 'All In Overload', 'A thick crust piled high with premium meats, vegetables, and mozzarella cheese.', 'assets/images/pizzapics/Allinoverload.png', 399.00),
(1, 'Hawaiian Thick Crust', 'Fluffy thick crust topped with ham, pineapple, and mozzarella.', 'assets/images/pizzapics/Hawaiianthickcrust.png', 349.00),
(1, 'Cheese Stuffed Crust', 'Fluffy crust filled with gooey cheese and melted mozzarella.', 'assets/images/pizzapics/Cheesestuffedcrust.png', 369.00),
(1, 'Pepperoni Stuffed Crust', 'Cheese-stuffed crust loaded with pepperoni and mozzarella cheese.', 'assets/images/pizzapics/Pepperonistuffedcrust.png', 389.00),
(1, 'Meat Lovers Stuffed Crust', 'Stuffed crust loaded with pepperoni, ham, bacon, sausage, and cheese.', 'assets/images/pizzapics/Meatloversstuffedcrust.png', 399.00),
(1, 'Hawaiian Stuffed Crust', 'Cheese-stuffed crust topped with savory ham and sweet pineapple.', 'assets/images/pizzapics/Hawaiianstuffedcrust.png', 389.00),
(1, 'Supreme Stuffed Crust', 'Stuffed crust loaded with premium meats, vegetables, and mozzarella.', 'assets/images/pizzapics/Supremestuffedcrust.png', 409.00),
(5, 'Coca Cola', 'A classic fizzy cola with a refreshing sweet taste.', 'assets/images/pizzapics/CocaCola.png', 60.00),
(5, 'Sprite', 'A crisp and refreshing lemon-lime soda.', 'assets/images/pizzapics/Sprite.png', 60.00),
(5, 'Royal', 'A sweet and fruity orange-flavored soda.', 'assets/images/pizzapics/Royal.png', 60.00),
(5, 'Root Beer', 'A sweet, creamy, and aromatic root beer beverage.', 'assets/images/pizzapics/Rootbeer.png', 65.00),
(5, 'Mountain Dew', 'A bold citrus-flavored refreshing soft drink.', 'assets/images/pizzapics/Mountaindew.png', 65.00),
(5, 'Orange Juice', 'A naturally sweet and tangy orange drink.', 'assets/images/pizzapics/Orangejuice.png', 90.00),
(5, 'Apple Juice', 'A smooth drink with a naturally sweet apple flavor.', 'assets/images/pizzapics/Applejuice.png', 90.00),
(5, 'Lemon Juice', 'A bright and refreshing drink with a tangy lemon flavor.', 'assets/images/pizzapics/Lemonjuice.png', 85.00),
(5, 'Pineapple Juice', 'A tropical drink with a sweet and tangy pineapple flavor.', 'assets/images/pizzapics/Pineapplejuice.png', 90.00),
(5, 'Mango Juice', 'A smooth and fruity drink with a sweet tropical mango flavor.', 'assets/images/pizzapics/Mangojuice.png', 95.00),
(5, 'Iced Tea', 'A chilled and refreshing beverage for warm days.', 'assets/images/pizzapics/Icedtea.png', 85.00),
(5, 'Iced Coffee', 'Smooth and creamy coffee served chilled over ice.', 'assets/images/pizzapics/Icedcoffee.png', 110.00),
(5, 'Blue Lemonade', 'Sweet and tangy lemonade with a refreshing citrus flavor.', 'assets/images/pizzapics/Bluelemonade.png', 95.00),
(5, 'Beer', 'A chilled beverage with a smooth and slightly bitter taste.', 'assets/images/pizzapics/Beer.png', 120.00),
(5, 'Sparkling Water', 'Light and refreshing water with a crisp bubbly finish.', 'assets/images/pizzapics/sparklingwater.png', 70.00),
(4, 'Classic Fries', 'Crispy golden fries with cheese, BBQ, or sour cream flavor.', 'assets/images/pizzapics/Fries.png', 99.00),
(4, 'Waffle Fries', 'Crispy golden waffle-cut fries with a satisfying crunch.', 'assets/images/pizzapics/WaffleFries.png', 119.00),
(4, 'Crinkle Cut Fries', 'Thick crispy fries with a fun crinkle-cut texture.', 'assets/images/pizzapics/CrinkleCutFries.png', 109.00),
(4, 'Bacon Cheese Fries', 'Golden fries loaded with crispy bacon and melted cheese.', 'assets/images/pizzapics/BaconCheeseFries.png', 149.00),
(4, 'Sweet Potato Fries', 'Crispy sweet potato fries with a sweet and savory flavor.', 'assets/images/pizzapics/SweetPotatoFries.png', 129.00),
(3, 'Wings', 'Juicy chicken wings with Garlic Parmesan, Buffalo, or BBQ sauce.', 'assets/images/pizzapics/Wings.png', 159.00),
(3, 'Boneless Chicken Bites', 'Tender bite-sized chicken pieces crispy on the outside and juicy inside.', 'assets/images/pizzapics/BonelessChickenBites.png', 149.00),
(3, 'Chicken Tenders', 'Crispy golden strips of tender chicken perfect for dipping.', 'assets/images/pizzapics/ChickenTenders.png', 149.00),
(3, 'Chicken Nuggets', 'Bite-sized chicken coated in crispy golden breading.', 'assets/images/pizzapics/ChickenNuggets.png', 139.00),
(3, 'Chicken Poppers', 'Crispy flavorful bite-sized chicken pieces.', 'assets/images/pizzapics/ChickenPoppers.png', 139.00),
(2, 'Carbonara / Chicken Alfredo', 'Creamy and savory pasta tossed in a rich sauce.', 'assets/images/pizzapics/Carbonara.png', 199.00),
(2, 'Spaghetti', 'Classic spaghetti tossed in rich tomato sauce.', 'assets/images/pizzapics/Spaghetti.png', 179.00),
(2, 'Lasagna', 'Layers of pasta, meat sauce, and creamy cheese baked together.', 'assets/images/pizzapics/Lasagna.png', 229.00),
(2, 'Mac n Cheese', 'Creamy macaroni covered in smooth melted cheese.', 'assets/images/pizzapics/MacnCheese.png', 189.00),
(2, 'Pesto Pasta', 'Pasta tossed in a flavorful basil pesto sauce.', 'assets/images/pizzapics/PestoPasta.png', 199.00);

-- --------------------------------------------------------

--
-- Table structure for table `product_sizes`
--

CREATE TABLE `product_sizes` (
  `product_id` int(10) UNSIGNED NOT NULL,
  `size_id` int(10) UNSIGNED NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_sizes`
--

INSERT INTO `product_sizes` (`product_id`, `size_id`, `price`, `status`) VALUES
(1, 1, 249.00, 'active'),
(1, 2, 299.00, 'active'),
(1, 3, 349.00, 'active'),
(1, 4, 399.00, 'active'),
(2, 1, 239.00, 'active'),
(2, 2, 289.00, 'active'),
(2, 3, 339.00, 'active'),
(2, 4, 389.00, 'active'),
(3, 1, 199.00, 'active'),
(3, 2, 249.00, 'active'),
(3, 3, 299.00, 'active'),
(3, 4, 349.00, 'active'),
(4, 1, 269.00, 'active'),
(4, 2, 319.00, 'active'),
(4, 3, 369.00, 'active'),
(4, 4, 419.00, 'active'),
(5, 1, 299.00, 'active'),
(6, 1, 329.00, 'active'),
(7, 1, 299.00, 'active'),
(8, 1, 229.00, 'active'),
(8, 2, 299.00, 'active'),
(8, 3, 349.00, 'active'),
(8, 4, 399.00, 'active'),
(9, 1, 139.00, 'active'),
(10, 1, 99.00, 'active'),
(11, 1, 60.00, 'active'),
(12, 1, 349.00, 'active'),
(13, 1, 329.00, 'active'),
(14, 1, 379.00, 'active'),
(15, 1, 399.00, 'active'),
(16, 1, 349.00, 'active'),
(17, 1, 389.00, 'active'),
(18, 1, 399.00, 'active'),
(19, 1, 389.00, 'active'),
(20, 1, 409.00, 'active'),
(21, 1, 60.00, 'active'),
(22, 1, 60.00, 'active'),
(23, 1, 65.00, 'active'),
(24, 1, 65.00, 'active'),
(25, 1, 90.00, 'active'),
(26, 1, 90.00, 'active'),
(27, 1, 85.00, 'active'),
(28, 1, 90.00, 'active'),
(29, 1, 95.00, 'active'),
(30, 1, 85.00, 'active'),
(31, 1, 110.00, 'active'),
(32, 1, 95.00, 'active'),
(33, 1, 120.00, 'active'),
(34, 1, 70.00, 'active'),
(35, 1, 119.00, 'active'),
(36, 1, 109.00, 'active'),
(37, 1, 149.00, 'active'),
(38, 1, 129.00, 'active'),
(39, 1, 159.00, 'active'),
(40, 1, 149.00, 'active'),
(41, 1, 149.00, 'active'),
(42, 1, 139.00, 'active'),
(43, 1, 199.00, 'active'),
(44, 1, 179.00, 'active'),
(45, 1, 229.00, 'active'),
(46, 1, 189.00, 'active'),
(47, 1, 199.00, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `product_toppings`
--

CREATE TABLE `product_toppings` (
  `product_id` int(10) UNSIGNED NOT NULL,
  `topping_id` int(10) UNSIGNED NOT NULL,
  `additional_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_toppings`
--

INSERT INTO `product_toppings` (`product_id`, `topping_id`, `additional_price`, `status`) VALUES
(1, 1, 50.00, 'active'),
(1, 2, 60.00, 'active'),
(1, 3, 40.00, 'active'),
(1, 4, 60.00, 'active'),
(1, 5, 30.00, 'active'),
(1, 6, 30.00, 'active'),
(2, 1, 50.00, 'active'),
(2, 2, 60.00, 'active'),
(2, 3, 40.00, 'active'),
(2, 4, 60.00, 'active'),
(2, 5, 30.00, 'active'),
(2, 6, 30.00, 'active'),
(3, 1, 50.00, 'active'),
(3, 2, 60.00, 'active'),
(3, 3, 40.00, 'active'),
(3, 4, 60.00, 'active'),
(3, 5, 30.00, 'active'),
(3, 6, 30.00, 'active'),
(4, 1, 50.00, 'active'),
(4, 2, 60.00, 'active'),
(4, 3, 40.00, 'active'),
(4, 4, 60.00, 'active'),
(4, 5, 30.00, 'active'),
(4, 6, 30.00, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `promotions`
--

CREATE TABLE `promotions` (
  `promotion_id` int(10) UNSIGNED NOT NULL,
  `promo_code` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `discount_type` enum('percentage','fixed') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `minimum_order` decimal(10,2) NOT NULL DEFAULT 0.00,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `usage_limit` int(10) UNSIGNED DEFAULT NULL,
  `status` enum('active','inactive','expired') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `promotions`
--

INSERT INTO `promotions` (`promotion_id`, `promo_code`, `description`, `discount_type`, `discount_value`, `minimum_order`, `start_date`, `end_date`, `usage_limit`, `status`, `created_at`) VALUES
(1, 'WELCOME20', '20% discount for new customers', 'percentage', 20.00, 300.00, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 1000, 'active', '2026-08-28 16:59:32');

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `review_id` int(10) UNSIGNED NOT NULL,
  `user_id` varchar(128) NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `rating` tinyint(3) UNSIGNED NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sizes`
--

CREATE TABLE `sizes` (
  `size_id` int(10) UNSIGNED NOT NULL,
  `size_name` varchar(30) NOT NULL,
  `size_inches` decimal(4,1) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sizes`
--

INSERT INTO `sizes` (`size_id`, `size_name`, `size_inches`, `status`) VALUES
(1, 'Small', 8.0, 'active'),
(2, 'Medium', 10.0, 'active'),
(3, 'Large', 12.0, 'active'),
(4, 'Extra Large', 14.0, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `toppings`
--

CREATE TABLE `toppings` (
  `topping_id` int(10) UNSIGNED NOT NULL,
  `topping_name` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `toppings`
--

INSERT INTO `toppings` (`topping_id`, `topping_name`, `price`, `status`) VALUES
(1, 'Extra Cheese', 50.00, 'active'),
(2, 'Pepperoni', 60.00, 'active'),
(3, 'Mushroom', 40.00, 'active'),
(4, 'Bacon', 60.00, 'active'),
(5, 'Onion', 30.00, 'active'),
(6, 'Pineapple', 30.00, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` varchar(128) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('customer','staff','admin','rider') NOT NULL DEFAULT 'customer',
  `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `first_name`, `last_name`, `email`, `phone`, `role`, `status`, `created_at`, `updated_at`) VALUES
('kipIK3u0CegJkEQLX73spwPoh3O2', 'John Martin', 'Tondo', 'qjmdtondo@tip.edu.ph', '09997582763', 'customer', 'active', '2026-08-30 21:20:09', '2026-09-03 23:03:51');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `addresses`
--
ALTER TABLE `addresses`
  ADD PRIMARY KEY (`address_id`),
  ADD KEY `idx_addresses_user` (`user_id`);

--
-- Indexes for table `carts`
--
ALTER TABLE `carts`
  ADD PRIMARY KEY (`cart_id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD PRIMARY KEY (`cart_item_id`),
  ADD KEY `fk_cart_items_size` (`size_id`),
  ADD KEY `fk_cart_items_crust` (`crust_id`),
  ADD KEY `idx_cart_items_cart` (`cart_id`),
  ADD KEY `idx_cart_items_product` (`product_id`);

--
-- Indexes for table `cart_item_toppings`
--
ALTER TABLE `cart_item_toppings`
  ADD PRIMARY KEY (`cart_item_topping_id`),
  ADD KEY `fk_cart_item_toppings_item` (`cart_item_id`),
  ADD KEY `fk_cart_item_toppings_topping` (`topping_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `category_name` (`category_name`);

--
-- Indexes for table `crusts`
--
ALTER TABLE `crusts`
  ADD PRIMARY KEY (`crust_id`),
  ADD UNIQUE KEY `crust_name` (`crust_name`);

--
-- Indexes for table `deliveries`
--
ALTER TABLE `deliveries`
  ADD PRIMARY KEY (`delivery_id`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD KEY `idx_deliveries_status` (`delivery_status`),
  ADD KEY `fk_deliveries_rider` (`rider_id`);

--
-- Indexes for table `delivery_tracking`
--
ALTER TABLE `delivery_tracking`
  ADD PRIMARY KEY (`tracking_id`),
  ADD KEY `idx_delivery_tracking_delivery` (`delivery_id`),
  ADD KEY `idx_delivery_tracking_recorded` (`recorded_at`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `fk_orders_address` (`address_id`),
  ADD KEY `idx_orders_user` (`user_id`),
  ADD KEY `idx_orders_status` (`order_status`),
  ADD KEY `idx_orders_created` (`created_at`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `fk_order_items_product` (`product_id`),
  ADD KEY `fk_order_items_size` (`size_id`),
  ADD KEY `fk_order_items_crust` (`crust_id`),
  ADD KEY `idx_order_items_order` (`order_id`);

--
-- Indexes for table `order_item_toppings`
--
ALTER TABLE `order_item_toppings`
  ADD PRIMARY KEY (`order_item_topping_id`),
  ADD KEY `fk_order_item_toppings_item` (`order_item_id`),
  ADD KEY `fk_order_item_toppings_topping` (`topping_id`);

--
-- Indexes for table `order_promotions`
--
ALTER TABLE `order_promotions`
  ADD PRIMARY KEY (`order_id`,`promotion_id`),
  ADD KEY `fk_order_promotions_promotion` (`promotion_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD UNIQUE KEY `transaction_id` (`transaction_id`),
  ADD KEY `idx_payments_order` (`order_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `idx_products_category` (`category_id`);

--
-- Indexes for table `product_crusts`
--
ALTER TABLE `product_crusts`
  ADD PRIMARY KEY (`product_id`,`crust_id`),
  ADD KEY `fk_product_crusts_crust` (`crust_id`);

--
-- Indexes for table `product_sizes`
--
ALTER TABLE `product_sizes`
  ADD PRIMARY KEY (`product_id`,`size_id`),
  ADD KEY `fk_product_sizes_size` (`size_id`);

--
-- Indexes for table `product_toppings`
--
ALTER TABLE `product_toppings`
  ADD PRIMARY KEY (`product_id`,`topping_id`),
  ADD KEY `fk_product_toppings_topping` (`topping_id`);

--
-- Indexes for table `promotions`
--
ALTER TABLE `promotions`
  ADD PRIMARY KEY (`promotion_id`),
  ADD UNIQUE KEY `promo_code` (`promo_code`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD KEY `fk_reviews_order` (`order_id`),
  ADD KEY `idx_reviews_product` (`product_id`),
  ADD KEY `fk_reviews_user` (`user_id`);

--
-- Indexes for table `sizes`
--
ALTER TABLE `sizes`
  ADD PRIMARY KEY (`size_id`),
  ADD UNIQUE KEY `size_name` (`size_name`);

--
-- Indexes for table `toppings`
--
ALTER TABLE `toppings`
  ADD PRIMARY KEY (`topping_id`),
  ADD UNIQUE KEY `topping_name` (`topping_name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `email_2` (`email`),
  ADD UNIQUE KEY `phone` (`phone`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `addresses`
--
ALTER TABLE `addresses`
  MODIFY `address_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `carts`
--
ALTER TABLE `carts`
  MODIFY `cart_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cart_items`
--
ALTER TABLE `cart_items`
  MODIFY `cart_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cart_item_toppings`
--
ALTER TABLE `cart_item_toppings`
  MODIFY `cart_item_topping_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `crusts`
--
ALTER TABLE `crusts`
  MODIFY `crust_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `deliveries`
--
ALTER TABLE `deliveries`
  MODIFY `delivery_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `delivery_tracking`
--
ALTER TABLE `delivery_tracking`
  MODIFY `tracking_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_item_toppings`
--
ALTER TABLE `order_item_toppings`
  MODIFY `order_item_topping_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `promotions`
--
ALTER TABLE `promotions`
  MODIFY `promotion_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `review_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sizes`
--
ALTER TABLE `sizes`
  MODIFY `size_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `toppings`
--
ALTER TABLE `toppings`
  MODIFY `topping_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `addresses`
--
ALTER TABLE `addresses`
  ADD CONSTRAINT `fk_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `carts`
--
ALTER TABLE `carts`
  ADD CONSTRAINT `fk_carts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD CONSTRAINT `fk_cart_items_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cart_items_crust` FOREIGN KEY (`crust_id`) REFERENCES `crusts` (`crust_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cart_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cart_items_size` FOREIGN KEY (`size_id`) REFERENCES `sizes` (`size_id`) ON UPDATE CASCADE;

--
-- Constraints for table `cart_item_toppings`
--
ALTER TABLE `cart_item_toppings`
  ADD CONSTRAINT `fk_cart_item_toppings_item` FOREIGN KEY (`cart_item_id`) REFERENCES `cart_items` (`cart_item_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cart_item_toppings_topping` FOREIGN KEY (`topping_id`) REFERENCES `toppings` (`topping_id`) ON UPDATE CASCADE;

--
-- Constraints for table `deliveries`
--
ALTER TABLE `deliveries`
  ADD CONSTRAINT `fk_deliveries_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_deliveries_rider` FOREIGN KEY (`rider_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `delivery_tracking`
--
ALTER TABLE `delivery_tracking`
  ADD CONSTRAINT `fk_delivery_tracking_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries` (`delivery_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_address` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`address_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_order_items_crust` FOREIGN KEY (`crust_id`) REFERENCES `crusts` (`crust_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_order_items_size` FOREIGN KEY (`size_id`) REFERENCES `sizes` (`size_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `order_item_toppings`
--
ALTER TABLE `order_item_toppings`
  ADD CONSTRAINT `fk_order_item_toppings_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`order_item_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_order_item_toppings_topping` FOREIGN KEY (`topping_id`) REFERENCES `toppings` (`topping_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `order_promotions`
--
ALTER TABLE `order_promotions`
  ADD CONSTRAINT `fk_order_promotions_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_order_promotions_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`promotion_id`) ON UPDATE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON UPDATE CASCADE;

--
-- Constraints for table `product_crusts`
--
ALTER TABLE `product_crusts`
  ADD CONSTRAINT `fk_product_crusts_crust` FOREIGN KEY (`crust_id`) REFERENCES `crusts` (`crust_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_product_crusts_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `product_sizes`
--
ALTER TABLE `product_sizes`
  ADD CONSTRAINT `fk_product_sizes_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_product_sizes_size` FOREIGN KEY (`size_id`) REFERENCES `sizes` (`size_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `product_toppings`
--
ALTER TABLE `product_toppings`
  ADD CONSTRAINT `fk_product_toppings_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_product_toppings_topping` FOREIGN KEY (`topping_id`) REFERENCES `toppings` (`topping_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_reviews_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

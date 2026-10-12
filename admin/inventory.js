import { db } from "./firebase-config.js";

import {
  collection,
  onSnapshot,
  doc,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Products loaded from Firebase
let inventory = [];

function getProductImage(imagePath) {
  if (!imagePath) return "";

  // Cloudinary or Firebase Storage URLs
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  // Convert local asset paths into root-relative URLs
  return "/" + imagePath.replace(/^\/+/, "");
}

// Listen for real-time product updates
onSnapshot(
  collection(db, "products"),

  (snapshot) => {
    inventory = snapshot.docs.flatMap((productDoc) => {
      const product = productDoc.data();

      const categoryName = product.categoryName || "Uncategorized";
      const category = categoryName.toLowerCase();

      const sizes = Array.isArray(product.sizes) ? product.sizes : [];

      // One inventory row per product size
      if (sizes.length > 0) {
        return sizes.map((size, index) => ({
          id: `${productDoc.id}_${index}`,
          documentId: productDoc.id,
          sizeId: size.id,
          name: product.productName || "Unnamed Product",
          category,
          categoryName,
          subcategory: size.name || "Standard",
          image: getProductImage(product.imagePath),
          stock: Number(size.stockQuantity) || 0,
        }));
      }

      // Products without sizes
      return [
        {
          id: productDoc.id,
          documentId: productDoc.id,
          sizeId: null,
          name: product.productName || "Unnamed Product",
          category,
          categoryName,
          subcategory: "Standard",
          image: product.imagePath || "",
          stock: Number(product.stockQuantity) || 0,
        },
      ];
    });

    displayInventory();

    console.log(`Loaded ${inventory.length} inventory entries from Firestore.`);
  },

  (error) => {
    console.error("Error loading inventory:", error);
  },
);

/* =====================================================
   VARIABLES
===================================================== */

const inventoryTable = document.getElementById("inventoryTable");

const searchInput = document.getElementById("searchInput");

const emptyState = document.getElementById("emptyState");

const filterPanel = document.getElementById("filterPanel");

const categoryFilter = document.getElementById("categoryFilter");

const stockFilter = document.getElementById("stockFilter");

let selectedCategory = "all";

let selectedProduct = null;

let adjustmentType = "add";

let adjustmentQuantity = 0;

/* =====================================================
   STOCK STATUS
===================================================== */

function getStockStatus(stock) {
  if (stock <= 0) {
    return {
      className: "out-stock",
      text: "Out of Stock",
    };
  }

  if (stock <= 10) {
    return {
      className: "low-stock",
      text: "Low Stock",
    };
  }

  return {
    className: "in-stock",
    text: "In Stock",
  };
}

/* =====================================================
   DISPLAY INVENTORY
===================================================== */

function displayInventory() {
  const searchValue = searchInput.value.toLowerCase().trim();

  const selectedStock = stockFilter.value;

  const filteredProducts = inventory.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchValue);

    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;

    const status = getStockStatus(product.stock);

    let matchesStock = true;

    if (selectedStock === "in") {
      matchesStock = status.className === "in-stock";
    }

    if (selectedStock === "low") {
      matchesStock = status.className === "low-stock";
    }

    if (selectedStock === "out") {
      matchesStock = status.className === "out-stock";
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  inventoryTable.innerHTML = "";

  if (filteredProducts.length === 0) {
    emptyState.style.display = "block";

    return;
  }

  emptyState.style.display = "none";

  filteredProducts.forEach((product) => {
    const status = getStockStatus(product.stock);

    const row = document.createElement("tr");

    row.innerHTML = `

            <td>

                <div class="product-info">

                    <img
                        class="product-image"
                        src="${product.image}"
                        alt="${product.name}"
                    >

                    <div>

                        <div class="product-name">
                            ${product.name}
                        </div>

                        <div class="product-price">
                            Oven2Door Menu Item
                        </div>

                    </div>

                </div>

            </td>


            <td>

                <div class="category-name">
                    ${product.categoryName}
                </div>

                <div class="subcategory-name">
                    ${product.subcategory}
                </div>

            </td>


            <td>

                <span class="stock-number">
                    ${product.stock}
                </span>

            </td>


            <td>

                <span class="status ${status.className}">
                    ${status.text}
                </span>

            </td>


            <td>

                <div class="action-buttons">

                    <button
                        class="add-stock-btn"
                        data-id="${product.id}"
                        data-action="add"

                        <i class="fa-solid fa-plus"></i>
                        Add Stocks

                    </button>


                    <button
                        class="remove-stock-btn"
                        data-id="${product.id}"
                        data-action="remove"
                        title="Remove Stocks">

                        <i class="fa-solid fa-minus"></i>
                        <span>Remove Stocks</span>

                    </button>

                </div>

            </td>

        `;

    inventoryTable.appendChild(row);
  });
}

inventoryTable.addEventListener("click", (event) => {
  const button = event.target.closest(".add-stock-btn, .remove-stock-btn");

  if (!button) return;

  const productId = button.dataset.id;
  const action = button.dataset.action;

  openStockModal(productId, action);
});

/* =====================================================
   CATEGORY TABS
===================================================== */

document.querySelectorAll(".category-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".category-tab").forEach((item) => {
      item.classList.remove("active");
    });

    tab.classList.add("active");

    selectedCategory = tab.dataset.category;

    categoryFilter.value = selectedCategory;

    displayInventory();
  });
});

/* =====================================================
   SEARCH
===================================================== */

searchInput.addEventListener("input", displayInventory);

/* =====================================================
   FILTER
===================================================== */

document.getElementById("filterButton").addEventListener("click", () => {
  filterPanel.classList.toggle("show");
});

categoryFilter.addEventListener("change", () => {
  selectedCategory = categoryFilter.value;

  document.querySelectorAll(".category-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.category === selectedCategory);
  });

  displayInventory();
});

stockFilter.addEventListener("change", displayInventory);

/* =====================================================
   SORT
===================================================== */

document.getElementById("sortButton").addEventListener("click", () => {
  inventory.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  displayInventory();
});

/* =====================================================
   MODAL ELEMENTS
===================================================== */

const stockModal = document.getElementById("stockModal");

const modalOverlay = document.getElementById("modalOverlay");

const modalTitle = document.getElementById("modalTitle");

const modalProductImage = document.getElementById("modalProductImage");

const modalProductName = document.getElementById("modalProductName");

const modalProductCategory = document.getElementById("modalProductCategory");

const modalCurrentStock = document.getElementById("modalCurrentStock");

const quantityDisplay = document.getElementById("quantityDisplay");

quantityDisplay.addEventListener("input", () => {
  const rawValue = quantityDisplay.value;

  if (rawValue === "") {
    adjustmentQuantity = 0;
    return;
  }

  let quantity = Number(rawValue);

  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    quantity = 0;
  }

  if (adjustmentType === "remove" && selectedProduct) {
    quantity = Math.min(quantity, selectedProduct.stock);
  }

  adjustmentQuantity = quantity;
  quantityDisplay.value = adjustmentQuantity;
});

quantityDisplay.addEventListener("blur", () => {
  quantityDisplay.value = adjustmentQuantity;
});

/* =====================================================
   OPEN STOCK MODAL
===================================================== */

function openStockModal(id, type) {
  selectedProduct = inventory.find((product) => product.id === id);

  adjustmentType = type;

  /*
        IMPORTANT:

        The adjustment starts at 0.

        The original stock is NOT
        changed when the modal opens.
    */

  adjustmentQuantity = 0;

  quantityDisplay.value = adjustmentQuantity;

  if (type === "add") {
    modalTitle.textContent = "Add Stocks";
  } else {
    modalTitle.textContent = "Remove Stocks";
  }

  modalProductImage.src = selectedProduct.image;

  modalProductImage.alt = selectedProduct.name;

  modalProductName.textContent = selectedProduct.name;

  modalProductCategory.textContent = `${selectedProduct.categoryName} • ${selectedProduct.subcategory}`;

  modalCurrentStock.textContent = selectedProduct.stock;

  stockModal.classList.add("show");

  modalOverlay.classList.add("show");
}

/* =====================================================
   PLUS
===================================================== */

document.getElementById("plusButton").addEventListener("click", () => {
  /*
            For REMOVE:
            do not allow quantity to exceed
            the current stock.
        */

  if (
    adjustmentType === "remove" &&
    adjustmentQuantity >= selectedProduct.stock
  ) {
    return;
  }

  adjustmentQuantity++;

  quantityDisplay.textContent = adjustmentQuantity;
});

/* =====================================================
   MINUS
===================================================== */

document.getElementById("minusButton").addEventListener("click", () => {
  if (adjustmentQuantity > 0) {
    adjustmentQuantity--;
  }

  quantityDisplay.textContent = adjustmentQuantity;
});

/* =====================================================
   SAVE
===================================================== */

document.getElementById("saveButton").addEventListener("click", async () => {
  if (!selectedProduct || adjustmentQuantity <= 0) {
    return;
  }

  const saveButton = document.getElementById("saveButton");
  const product = selectedProduct;
  const quantity = adjustmentQuantity;
  const type = adjustmentType;

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  try {
    const productRef = doc(db, "products", product.documentId);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(productRef);

      if (!snapshot.exists()) {
        throw new Error("Product no longer exists.");
      }

      const data = snapshot.data();

      if (product.sizeId !== null) {
        // Products with size options
        const sizes = Array.isArray(data.sizes) ? data.sizes : [];

        const sizeIndex = sizes.findIndex(
          (size) => String(size.id) === String(product.sizeId),
        );

        if (sizeIndex === -1) {
          throw new Error("Product size no longer exists.");
        }

        const updatedSizes = sizes.map((size, index) => {
          if (index !== sizeIndex) return size;

          const currentStock = Number(size.stockQuantity ?? 0);

          const newStock =
            type === "add" ? currentStock + quantity : currentStock - quantity;

          if (!Number.isSafeInteger(newStock) || newStock < 0) {
            throw new Error("Invalid stock quantity or insufficient stock.");
          }

          return {
            ...size,
            stockQuantity: newStock,
          };
        });

        transaction.update(productRef, {
          sizes: updatedSizes,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Products without size options
        const currentStock = Number(data.stockQuantity ?? 0);

        const newStock =
          type === "add" ? currentStock + quantity : currentStock - quantity;

        if (!Number.isSafeInteger(newStock) || newStock < 0) {
          throw new Error("Invalid stock quantity or insufficient stock.");
        }

        transaction.update(productRef, {
          stockQuantity: newStock,
          updatedAt: serverTimestamp(),
        });
      }
    });

    closeStockModal();
  } catch (error) {
    console.error("Stock adjustment failed:", error);
    alert(`Unable to save stock: ${error.message}`);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save";
  }
});

/* =====================================================
   CANCEL
===================================================== */

document
  .getElementById("cancelButton")
  .addEventListener("click", closeStockModal);

document
  .getElementById("closeModal")
  .addEventListener("click", closeStockModal);

modalOverlay.addEventListener("click", closeStockModal);

/* =====================================================
   CLOSE MODAL
===================================================== */

function closeStockModal() {
  /*
        Reset temporary quantity.

        Since the actual product stock
        is only changed inside SAVE,
        cancelling automatically keeps
        the original stock.
    */

  adjustmentQuantity = 0;

  selectedProduct = null;

  stockModal.classList.remove("show");

  modalOverlay.classList.remove("show");
}

/* =====================================================
   INITIAL DISPLAY
===================================================== */

displayInventory();

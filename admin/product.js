// ==========================================
// FIREBASE CONFIGURATION
// ==========================================

import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // ADMIN AUTHENTICATION
  // ==========================================

  onAuthStateChanged(auth, async (user) => {
    // Stop any previous Firestore listener
    if (unsubscribeProducts) {
      unsubscribeProducts();
      unsubscribeProducts = null;
    }

    // Redirect if not logged in
    if (!user) {
      window.location.replace("/login");
      return;
    }

    try {
      // Get user profile from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        window.location.replace("/home");
        return;
      }

      const profile = userDoc.data();

      // Only active administrators are allowed
      if (profile.role !== "admin" || profile.status !== "active") {
        window.location.replace("/home");
        return;
      }

      console.log("Administrator verified:", user.uid);

      // Load products after successful verification
      loadProducts();
    } catch (error) {
      console.error("Product admin authorization failed:", error);
      window.location.replace("/login");
    }
  });
  // ==========================================
  // FIRESTORE PRODUCT STATE
  // ==========================================

  let products = [];
  let unsubscribeProducts = null;

  const filterToggleBtn = document.getElementById("filterToggleBtn");
  const filterPanel = document.getElementById("filterPanel");

  // Add Product Modal Elements
  const openAddModalBtn = document.getElementById("openAddModalBtn");
  const modalOverlay = document.getElementById("modalOverlay");
  const productModal = document.getElementById("productModal");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalCancelBtn = document.getElementById("modalCancelBtn");
  const modalSaveBtn = document.getElementById("modalSaveBtn");
  const productForm = document.getElementById("productForm");

  // ==========================================
  // EDIT PRODUCT STATE
  // ==========================================

  let editingProductId = null;
  let editingProductImagePath = null;

  const CLOUDINARY_CLOUD_NAME = "kwzhs0q3";
  const CLOUDINARY_UPLOAD_PRESET = "oven2door_products";
  // ==========================================
  // PRODUCT IMAGE PREVIEW ELEMENTS
  // ==========================================

  const modalProdImage = document.getElementById("modalProdImage");
  const productImagePreview = document.getElementById("productImagePreview");

  let productPreviewUrl = null;

  // Stock Adjustment Modal Elements
  const stockModal = document.getElementById("stockModal");
  const stockModalCloseBtn = document.getElementById("stockModalCloseBtn");
  const stockCancelBtn = document.getElementById("stockCancelBtn");
  const stockSaveBtn = document.getElementById("stockSaveBtn");
  const stockModalImg = document.getElementById("stockModalImg");
  const stockModalName = document.getElementById("stockModalName");
  const stockModalCategory = document.getElementById("stockModalCategory");
  const stockModalCurrentCount = document.getElementById(
    "stockModalCurrentCount",
  );
  const stockMinusBtn = document.getElementById("stockMinusBtn");
  const stockPlusBtn = document.getElementById("stockPlusBtn");
  const stockQuantityDisplay = document.getElementById("stockQuantityDisplay");

  let currentStockQuantity = 0;

  // 1. Toggle Filter Panel
  if (filterToggleBtn && filterPanel) {
    filterToggleBtn.addEventListener("click", () => {
      filterPanel.classList.toggle("show");
    });
  }

  // 2. Add New Product Modal Controls
  function openAddModal() {
    editingProductId = null;
    editingProductImagePath = null;
    modalSaveBtn.textContent = "Save Product";

    if (modalOverlay && productModal) {
      modalOverlay.classList.add("show");
      productModal.classList.add("show");
    }
  }

  // ==========================================
  // STEP 5.9.14.2 - OPEN EDIT PRODUCT MODAL
  // ==========================================

  function openEditModal(product) {
    if (!product || !product.id) {
      alert("Unable to identify the selected product.");
      return;
    }

    // Remember the Firestore document ID and existing image
    editingProductId = product.id;
    editingProductImagePath = product.imagePath || "";

    // Reset previous form values
    productForm.reset();

    // Basic product information
    document.getElementById("modalProdName").value = product.productName || "";

    document.getElementById("modalProdCategory").value = String(
      product.categoryId ?? "",
    );

    document.getElementById("modalProdDescription").value =
      product.description || "";

    document.getElementById("modalProdPrice").value = product.price ?? "";

    // Determine whether the product has one or multiple sizes
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const hasMultipleSizes = sizes.length > 1;

    modalSizeType.value = hasMultipleSizes ? "multiple" : "single";

    if (hasMultipleSizes) {
      document.querySelectorAll(".size-enabled").forEach((checkbox) => {
        const size = sizes.find(
          (item) => Number(item.id) === Number(checkbox.value),
        );

        checkbox.checked = Boolean(size);

        const priceInput = document.querySelector(
          `.size-price[data-size-id="${checkbox.value}"]`,
        );

        if (priceInput) {
          priceInput.value = size?.price ?? "";
        }
      });
    } else {
      document.getElementById("modalSingleSizeName").value =
        sizes[0]?.name || "Regular";
    }

    // Restore pizza crusts and toppings
    function restoreOptions(options, checkboxClass, priceClass, dataKey) {
      document.querySelectorAll(`.${checkboxClass}`).forEach((checkbox) => {
        const option = options.find(
          (item) => Number(item.id) === Number(checkbox.value),
        );

        checkbox.checked = Boolean(option);

        const priceInput = [
          ...document.querySelectorAll(`.${priceClass}`),
        ].find((input) => input.dataset[dataKey] === checkbox.value);

        if (priceInput) {
          priceInput.value = option?.price ?? "";
        }
      });
    }

    restoreOptions(
      Array.isArray(product.crusts) ? product.crusts : [],
      "crust-enabled",
      "crust-price",
      "crustId",
    );

    restoreOptions(
      Array.isArray(product.toppings) ? product.toppings : [],
      "topping-enabled",
      "topping-price",
      "toppingId",
    );

    // Refresh enabled/disabled fields
    updateSizeType();
    updatePizzaCustomization();
    syncBasePrice();

    // Show the current product image
    resetProductImagePreview();

    if (editingProductImagePath && productImagePreview) {
      const image = document.createElement("img");

      image.src = editingProductImagePath.startsWith("assets/")
        ? "../" + editingProductImagePath
        : editingProductImagePath;

      image.alt = product.productName || "Product image";

      const message = document.createElement("p");
      message.textContent = "Current product image";

      productImagePreview.replaceChildren(image, message);
    }

    // Image replacement will be optional during editing
    modalProdImage.value = "";

    // Change button label
    modalSaveBtn.textContent = "Update Product";

    // Open the modal
    modalOverlay.classList.add("show");
    productModal.classList.add("show");
  }

  function closeAddModal() {
    if (modalOverlay && productModal) {
      modalOverlay.classList.remove("show");
      productModal.classList.remove("show");

      if (productForm) productForm.reset();
    }

    // Reset editing state
    editingProductId = null;
    editingProductImagePath = null;

    // Restore default button text
    if (modalSaveBtn) {
      modalSaveBtn.textContent = "Save Product";
    }
  }

  if (openAddModalBtn) openAddModalBtn.addEventListener("click", openAddModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeAddModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener("click", closeAddModal);

  // ==========================================
  // STEP 5.9.10 - PRODUCT FORM VALIDATION
  // ==========================================

  function validateProductForm() {
    const nameInput = document.getElementById("modalProdName");
    const categoryInput = document.getElementById("modalProdCategory");
    const priceInput = document.getElementById("modalProdPrice");
    const imageInput = document.getElementById("modalProdImage");
    const sizeTypeInput = document.getElementById("modalSizeType");

    // PRODUCT NAME
    if (!nameInput.value.trim()) {
      alert("Please enter a product name.");
      nameInput.focus();
      return false;
    }

    // CATEGORY
    if (!categoryInput.value) {
      alert("Please select a category.");
      categoryInput.focus();
      return false;
    }

    // BASE PRICE
    const price = Number(priceInput.value);

    if (
      priceInput.value.trim() === "" ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      alert("Please enter a valid product price.");
      priceInput.focus();
      return false;
    }

    // PRODUCT IMAGE
    const file = imageInput.files?.[0];

    if (!file && !editingProductId) {
      alert("Please select a product image.");
      return false;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (file && !allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG, and WEBP images are allowed.");
      return false;
    }

    if (file && file.size > 5 * 1024 * 1024) {
      alert("Image must not exceed 5 MB.");
      return false;
    }

    // SINGLE SIZE
    if (sizeTypeInput.value === "single") {
      const sizeName = document
        .getElementById("modalSingleSizeName")
        .value.trim();

      if (!sizeName) {
        alert("Please enter a size name.");
        return false;
      }
    }

    // MULTIPLE SIZES
    if (sizeTypeInput.value === "multiple") {
      const selectedSizes = document.querySelectorAll(".size-enabled:checked");

      if (selectedSizes.length === 0) {
        alert("Please select at least one size.");
        return false;
      }

      for (const checkbox of selectedSizes) {
        const sizePrice = document.querySelector(
          `.size-price[data-size-id="${checkbox.value}"]`,
        );

        if (
          !sizePrice ||
          sizePrice.value.trim() === "" ||
          !Number.isFinite(Number(sizePrice.value)) ||
          Number(sizePrice.value) <= 0
        ) {
          alert("Please enter a valid price for each selected size.");
          sizePrice?.focus();
          return false;
        }
      }
    }

    // PIZZA CUSTOMIZATION
    if (categoryInput.value === "1") {
      const optionGroups = [
        [".crust-enabled:checked", ".crust-price", "crustId"],
        [".topping-enabled:checked", ".topping-price", "toppingId"],
      ];

      for (const [checkboxSelector, priceSelector, dataKey] of optionGroups) {
        const selected = document.querySelectorAll(checkboxSelector);

        for (const checkbox of selected) {
          const priceField = [...document.querySelectorAll(priceSelector)].find(
            (input) => input.dataset[dataKey] === checkbox.value,
          );

          if (
            !priceField ||
            priceField.value.trim() === "" ||
            !Number.isFinite(Number(priceField.value)) ||
            Number(priceField.value) < 0
          ) {
            alert("Please enter a valid pizza customization price.");
            priceField?.focus();
            return false;
          }
        }
      }
    }

    return true;
  }

  // ==========================================
  // STEP 5.9.13 - COLLECT PRODUCT INFORMATION
  // ==========================================

  function collectProductData(imageUrl) {
    const categorySelect = document.getElementById("modalProdCategory");
    const categoryId = Number(categorySelect.value);
    const categoryName =
      categorySelect.options[categorySelect.selectedIndex].text.trim();

    const price = Number(document.getElementById("modalProdPrice").value);
    const sizeType = document.getElementById("modalSizeType").value;

    let sizes = [];

    if (sizeType === "single") {
      sizes = [
        {
          id: 1,
          name: document.getElementById("modalSingleSizeName").value.trim(),
          price,
        },
      ];
    } else {
      sizes = [...document.querySelectorAll(".size-enabled:checked")].map(
        (checkbox) => ({
          id: Number(checkbox.value),
          name: checkbox.closest("label").textContent.trim(),
          price: Number(
            document.querySelector(
              `.size-price[data-size-id="${checkbox.value}"]`,
            ).value,
          ),
        }),
      );
    }

    function collectOptions(checkboxClass, priceClass, dataKey) {
      return [...document.querySelectorAll(`.${checkboxClass}:checked`)].map(
        (checkbox) => {
          const priceField = [
            ...document.querySelectorAll(`.${priceClass}`),
          ].find((input) => input.dataset[dataKey] === checkbox.value);

          return {
            id: Number(checkbox.value),
            name: checkbox.closest("label").textContent.trim(),
            price: Number(priceField.value),
          };
        },
      );
    }

    return {
      productName: document.getElementById("modalProdName").value.trim(),
      categoryId,
      categoryName,
      price,
      description: document.getElementById("modalProdDescription").value.trim(),
      imagePath: imageUrl,
      sizes,
      crusts:
        categoryId === 1
          ? collectOptions("crust-enabled", "crust-price", "crustId")
          : [],
      toppings:
        categoryId === 1
          ? collectOptions("topping-enabled", "topping-price", "toppingId")
          : [],
      status: "available",
    };
  }

  // ==========================================
  // SAVE PRODUCT TO FIRESTORE
  // ==========================================

  async function saveProductToFirestore(productData) {
    const counterRef = doc(db, "metadata", "productCounter");

    let savedProductId;

    await runTransaction(db, async (transaction) => {
      // 1. Read the current counter
      const counterSnapshot = await transaction.get(counterRef);

      if (!counterSnapshot.exists()) {
        throw new Error("Product counter is not initialized yet.");
      }

      // 2. Generate the next product ID
      const nextId = Number(counterSnapshot.data().lastProductId) + 1;

      if (!Number.isSafeInteger(nextId) || nextId < 1) {
        throw new Error("Invalid product counter.");
      }

      // 3. Use the numeric ID as the Firestore document ID
      const newProductRef = doc(db, "products", String(nextId));

      // 4. Check that the document ID is not already used
      const existingProduct = await transaction.get(newProductRef);

      if (existingProduct.exists()) {
        throw new Error(`Product ID ${nextId} already exists.`);
      }

      // 5. Update counter and create product together
      transaction.update(counterRef, {
        lastProductId: nextId,
      });

      transaction.set(newProductRef, {
        ...productData,
        productId: nextId,
        createdAt: serverTimestamp(),
      });

      savedProductId = newProductRef.id;
    });

    return savedProductId;
  }

  // ==========================================
  // STEP 5.9.14.3 - UPDATE EXISTING PRODUCT
  // ==========================================

  async function updateProductInFirestore(documentId, productData) {
    if (!documentId) {
      throw new Error("Missing product document ID.");
    }

    const productRef = doc(db, "products", documentId);

    await updateDoc(productRef, {
      productName: productData.productName,
      categoryId: productData.categoryId,
      categoryName: productData.categoryName,
      price: productData.price,
      description: productData.description,
      imagePath: productData.imagePath,
      sizes: productData.sizes,
      crusts: productData.crusts,
      toppings: productData.toppings,
      updatedAt: serverTimestamp(),
    });
  }

  // ==========================================
  // STEP 5.9.15 - DELETE PRODUCT FROM FIRESTORE
  // ==========================================

  async function deleteProductFromFirestore(product) {
    if (!product || !product.id) {
      alert("Unable to identify the selected product.");
      return;
    }

    const productName = product.productName || "Unnamed Product";

    const confirmed = confirm(
      `Are you sure you want to permanently delete "${productName}"?\n\n` +
        "This action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      const productRef = doc(db, "products", product.id);

      await deleteDoc(productRef);

      console.log("Product deleted:", product.id);

      alert(`"${productName}" was successfully deleted.`);
    } catch (error) {
      console.error("Product deletion failed:", error);
      alert("Unable to delete product: " + error.message);
    }
  }

  // ==========================================
  // STEP 5.9.13.3 - SAVE PRODUCT BUTTON
  // ==========================================

  if (modalSaveBtn) {
    modalSaveBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      // Validate product information
      if (!validateProductForm()) {
        return;
      }

      modalSaveBtn.disabled = true;

      modalSaveBtn.textContent = editingProductId
        ? "Updating Product..."
        : "Checking Product Counter...";

      try {
        // Only check the counter when adding a new product
        if (!editingProductId) {
          const counterRef = doc(db, "metadata", "productCounter");
          const counterSnapshot = await getDoc(counterRef);

          if (!counterSnapshot.exists()) {
            throw new Error("Product counter is not initialized yet.");
          }
        }

        const imageFile = modalProdImage.files?.[0];

        let imageUrl;

        // Upload a new image only when one is selected
        if (imageFile) {
          modalSaveBtn.textContent = "Uploading Image...";
          imageUrl = await uploadProductImage(imageFile);
        } else {
          imageUrl = editingProductImagePath;
        }

        // Collect form information
        const productData = collectProductData(imageUrl);

        if (editingProductId) {
          // UPDATE EXISTING PRODUCT
          modalSaveBtn.textContent = "Updating Product...";

          await updateProductInFirestore(editingProductId, productData);

          console.log("Product updated:", editingProductId);

          alert("Product successfully updated!");
        } else {
          // CREATE NEW PRODUCT
          modalSaveBtn.textContent = "Saving Product...";

          const documentId = await saveProductToFirestore(productData);

          console.log("Product saved to Firestore:", documentId);

          alert("Product successfully saved!");
        }

        // Close the modal
        closeAddModal();
      } catch (error) {
        console.error("Product saving failed:", error);

        alert("Unable to save product: " + error.message);
      } finally {
        modalSaveBtn.disabled = false;
        modalSaveBtn.textContent = editingProductId
          ? "Update Product"
          : "Save Product";
      }
    });
  }

  // 3. Stock Modal Controls
  function openStockModal(productData) {
    // Populate modal with specific row data
    stockModalImg.src = productData.image;
    stockModalName.textContent = productData.name;
    stockModalCategory.textContent = `${productData.category} • ${productData.subcategory}`;
    stockModalCurrentCount.textContent = productData.stock;

    currentStockQuantity = 0;
    stockQuantityDisplay.textContent = currentStockQuantity;

    if (modalOverlay && stockModal) {
      modalOverlay.classList.add("show");
      stockModal.classList.add("show");
    }
  }

  function closeStockModal() {
    if (modalOverlay && stockModal) {
      modalOverlay.classList.remove("show");
      stockModal.classList.remove("show");
    }
  }

  if (stockModalCloseBtn)
    stockModalCloseBtn.addEventListener("click", closeStockModal);
  if (stockCancelBtn) stockCancelBtn.addEventListener("click", closeStockModal);

  // Quantity Stepper Controls
  if (stockMinusBtn) {
    stockMinusBtn.addEventListener("click", () => {
      if (currentStockQuantity > 0) {
        currentStockQuantity--;
        stockQuantityDisplay.textContent = currentStockQuantity;
      }
    });
  }

  if (stockPlusBtn) {
    stockPlusBtn.addEventListener("click", () => {
      currentStockQuantity++;
      stockQuantityDisplay.textContent = currentStockQuantity;
    });
  }

  if (stockSaveBtn) {
    stockSaveBtn.addEventListener("click", () => {
      alert(`Successfully added ${currentStockQuantity} stocks!`);
      closeStockModal();
    });
  }

  // Close modals when clicking the dark backdrop overlay
  if (modalOverlay) {
    modalOverlay.addEventListener("click", () => {
      closeAddModal();
      closeStockModal();
    });
  }

  // 4. Product Table Interactivity (Listen for "+ Add Stock" button click)
  const productTableBody = document.getElementById("productTableBody");
  const productSearchInput = document.getElementById("productSearchInput");
  const statusFilterSelect = document.getElementById("statusFilterSelect");
  const emptyState = document.getElementById("emptyState");

  // ==========================================
  // LOAD PRODUCTS FROM FIRESTORE
  // ==========================================

  function loadProducts() {
    if (unsubscribeProducts) {
      unsubscribeProducts();
    }

    unsubscribeProducts = onSnapshot(
      collection(db, "products"),

      (snapshot) => {
        products = snapshot.docs.map((productDoc) => ({
          ...productDoc.data(),
          id: productDoc.id,
        }));

        console.log("Firestore products loaded:", products.length);
        renderProducts();
      },

      (error) => {
        console.error("Unable to load products:", error);
      },
    );
  }

  // ==========================================
  // RENDER PRODUCTS TABLE
  // ==========================================

  function renderProducts() {
    if (!productTableBody) return;

    productTableBody.innerHTML = "";

    const sortedProducts = [...products].sort(
      (a, b) => Number(a.productId ?? 0) - Number(b.productId ?? 0),
    );

    const createCell = (className, value) => {
      const td = document.createElement("td");
      if (className) td.className = className;
      td.textContent = String(value ?? "");
      return td;
    };

    sortedProducts.forEach((product) => {
      const row = document.createElement("tr");

      // PRODUCT NAME AND IMAGE
      const productCell = document.createElement("td");
      const productName = document.createElement("div");
      productName.className = "product-name";
      productName.textContent = product.productName || "Unnamed Product";

      const productImage = document.createElement("img");
      const imagePath = String(product.imagePath || "");

      // Firestore stores customer-app asset paths.
      // Admin is located in /admin, so go up one directory.
      productImage.src = imagePath.startsWith("assets/")
        ? "../" + imagePath
        : imagePath || "../assets/images/placeholder.png";

      productImage.alt = product.productName || "Product";
      productImage.width = 48;
      productImage.height = 48;

      const productId = document.createElement("small");
      productId.textContent = `#P-${product.productId ?? product.id}`;

      productCell.append(productImage, productName, productId);
      row.appendChild(productCell);

      // CATEGORY
      row.appendChild(
        createCell("category-name", product.categoryName || "Uncategorized"),
      );

      // PRICE
      const price = Number(product.price || 0);
      row.appendChild(createCell("stock-number", `₱${price.toFixed(2)}`));

      // STATUS
      const statusCell = document.createElement("td");
      const statusBadge = document.createElement("span");

      const isAvailable = product.status === "available";

      statusBadge.className = isAvailable
        ? "status available"
        : "status unavailable";

      statusBadge.textContent = isAvailable ? "Available" : "Unavailable";

      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);

      // ACTIONS
      const actionsCell = document.createElement("td");

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "edit-product-btn";
      editButton.textContent = "Edit";
      editButton.disabled = false;
      editButton.title = "Edit this product";

      editButton.addEventListener("click", () => {
        openEditModal(product);
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-product-btn";
      deleteButton.textContent = "Delete";
      deleteButton.disabled = false;
      deleteButton.title = "Delete this product";

      deleteButton.addEventListener("click", async () => {
        await deleteProductFromFirestore(product);
      });

      actionsCell.append(editButton, deleteButton);
      row.appendChild(actionsCell);

      productTableBody.appendChild(row);

      filterProducts();
    });

    if (emptyState) {
      emptyState.style.display = sortedProducts.length === 0 ? "block" : "none";
    }
  }

  if (productTableBody) {
    productTableBody.addEventListener("click", (e) => {
      // Trigger Add Stock Modal dynamically based on the row clicked
      const addStockBtn = e.target.closest(".add-stock-btn");
      if (addStockBtn) {
        const row = addStockBtn.closest("tr");
        const productData = {
          name: row.querySelector(".product-name")?.textContent || "Product",
          image: row.querySelector(".product-image")?.src || "",
          category:
            row.querySelector(".category-name")?.textContent || "Category",
          subcategory:
            row.querySelector(".subcategory-name")?.textContent ||
            "Subcategory",
          stock: "35", // You can pull actual stock numbers if you store them in data-attributes or elements
        };
        openStockModal(productData);
      }
    });
  }
  // ==========================================
  // PRODUCT CATEGORY NAVIGATION
  // ==========================================

  let selectedCategory = "all";

  const categoryTabs = document.querySelectorAll(
    "#productCategoryNav .category-tab",
  );

  categoryTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      selectedCategory = tab.dataset.category;

      categoryTabs.forEach((button) => {
        button.classList.remove("active");
      });

      tab.classList.add("active");

      filterProducts();
    });
  });

  // 5. Search and Filter Functionality
  function filterProducts() {
    if (!productTableBody) return;

    const searchTerm = productSearchInput
      ? productSearchInput.value.toLowerCase().trim()
      : "";
    const selectedStatus = statusFilterSelect
      ? statusFilterSelect.value
      : "all";
    const rows = productTableBody.querySelectorAll("tr");
    let visibleCount = 0;

    rows.forEach((row) => {
      const nameEl = row.querySelector(".product-name");
      const statusEl = row.querySelector(".status");

      const categoryEl = row.querySelector(".category-name");

      if (!nameEl || !statusEl) return;

      const productName = nameEl.textContent.toLowerCase();
      const productStatus = statusEl.textContent.trim();

      const matchesSearch = productName.includes(searchTerm);
      const productCategory = categoryEl?.textContent.trim() || "";

      const matchesCategory =
        selectedCategory === "all" || productCategory === selectedCategory;

      const matchesStatus =
        selectedStatus === "all" || productStatus === selectedStatus;

      if (matchesSearch && matchesStatus && matchesCategory) {
        row.style.display = "";
        visibleCount++;
      } else {
        row.style.display = "none";
      }
    });

    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? "block" : "none";
    }
  }

  if (productSearchInput)
    productSearchInput.addEventListener("input", filterProducts);
  if (statusFilterSelect)
    statusFilterSelect.addEventListener("change", filterProducts);

  // ==========================================
  // PRODUCT SIZE CHECKBOX FUNCTIONALITY
  // ==========================================

  const sizeCheckboxes = document.querySelectorAll(".size-enabled");

  const modalSizeType = document.getElementById("modalSizeType");
  const singleSizeSection = document.getElementById("singleSizeSection");
  const multipleSizeSection = document.getElementById("productSizesSection");
  const singleNameInput = document.getElementById("modalSingleSizeName");

  function updateSizeType() {
    if (!modalSizeType || !singleSizeSection || !multipleSizeSection) {
      return;
    }

    const isSingle = modalSizeType.value === "single";

    // Show the appropriate size fields
    singleSizeSection.style.display = isSingle ? "block" : "none";
    multipleSizeSection.style.display = isSingle ? "none" : "block";

    // Enable the single-size name only in Single Size mode
    if (singleNameInput) {
      singleNameInput.disabled = !isSingle;
    }

    // Enable prices only for checked sizes in Multiple Sizes mode
    sizeCheckboxes.forEach((checkbox) => {
      const priceInput = multipleSizeSection.querySelector(
        `.size-price[data-size-id="${checkbox.value}"]`,
      );

      if (!priceInput) return;

      checkbox.disabled = isSingle;
      priceInput.disabled = isSingle || !checkbox.checked;
    });
  }

  sizeCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const priceInput = document.querySelector(
        `.size-price[data-size-id="${checkbox.value}"]`,
      );

      if (!priceInput) return;

      if (!checkbox.checked) {
        priceInput.value = "";
      }

      updateSizeType();
    });
  });

  if (modalSizeType) {
    modalSizeType.addEventListener("change", updateSizeType);
  }

  // Restore correct field states after the form resets
  if (productForm) {
    productForm.addEventListener("reset", () => {
      queueMicrotask(updateSizeType);
    });
  }

  // ==========================================
  // PRODUCT BASE PRICE SYNCHRONIZATION
  // ==========================================

  const basePriceInput = document.getElementById("modalProdPrice");

  function syncBasePrice() {
    if (!basePriceInput || !modalSizeType) return;

    // Single Size: the base price is entered directly.
    if (modalSizeType.value === "single") {
      basePriceInput.readOnly = false;
      return;
    }

    // Multiple Sizes: base price follows the first selected size.
    const selectedSize = [...sizeCheckboxes].find(
      (checkbox) => checkbox.checked,
    );

    if (!selectedSize) {
      basePriceInput.value = "";
      basePriceInput.readOnly = true;
      return;
    }

    const selectedPriceInput = multipleSizeSection.querySelector(
      `.size-price[data-size-id="${selectedSize.value}"]`,
    );

    basePriceInput.value = selectedPriceInput?.value || "";
    basePriceInput.readOnly = true;
  }

  // Update base price when a size price changes
  multipleSizeSection?.querySelectorAll(".size-price").forEach((input) => {
    input.addEventListener("input", syncBasePrice);
  });

  // Update when size checkboxes change
  sizeCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", syncBasePrice);
  });

  // Update when switching between size types
  modalSizeType?.addEventListener("change", syncBasePrice);

  // Restore price field when form resets
  productForm?.addEventListener("reset", () => {
    queueMicrotask(syncBasePrice);
  });

  // Initialize base price behavior
  syncBasePrice();

  // Initialize the selector when the page loads
  updateSizeType();

  // ==========================================
  // STEP 5.9.9.3 - PIZZA CUSTOMIZATION
  // ==========================================

  const modalProdCategory = document.getElementById("modalProdCategory");

  const productCrustsSection = document.getElementById("productCrustsSection");
  const productToppingsSection = document.getElementById(
    "productToppingsSection",
  );

  function updatePizzaCustomization() {
    // Category ID 1 represents Pizza
    const isPizza = modalProdCategory?.value === "1";

    if (productCrustsSection) {
      productCrustsSection.style.display = isPizza ? "block" : "none";
    }

    if (productToppingsSection) {
      productToppingsSection.style.display = isPizza ? "block" : "none";
    }

    // Disable customization fields when the category is not Pizza
    [productCrustsSection, productToppingsSection].forEach((section) => {
      if (!section) return;

      section.querySelectorAll("input").forEach((input) => {
        if (!isPizza) {
          input.disabled = true;
        } else if (
          input.classList.contains("crust-enabled") ||
          input.classList.contains("topping-enabled")
        ) {
          input.disabled = false;
        } else {
          const checkboxClass = input.classList.contains("crust-price")
            ? ".crust-enabled"
            : ".topping-enabled";

          const optionId = input.dataset.crustId || input.dataset.toppingId;

          const checkbox = section.querySelector(
            `${checkboxClass}[value="${optionId}"]`,
          );

          input.disabled = !checkbox?.checked;
        }
      });
    });
  }

  // Enable or disable individual crust and topping price inputs
  document
    .querySelectorAll(".crust-enabled, .topping-enabled")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const isCrust = checkbox.classList.contains("crust-enabled");

        const selector = isCrust
          ? `.crust-price[data-crust-id="${checkbox.value}"]`
          : `.topping-price[data-topping-id="${checkbox.value}"]`;

        const priceInput = document.querySelector(selector);

        if (priceInput) {
          priceInput.disabled = !checkbox.checked;

          if (!checkbox.checked) {
            priceInput.value = "";
          }
        }
      });
    });

  // Update when category changes
  modalProdCategory?.addEventListener("change", updatePizzaCustomization);

  // Restore the correct state when the form resets
  productForm?.addEventListener("reset", () => {
    queueMicrotask(updatePizzaCustomization);
  });

  // Initialize when the page loads
  updatePizzaCustomization();

  // ==========================================
  // STEP 5.9.11 - PRODUCT IMAGE PREVIEW
  // ==========================================

  function resetProductImagePreview() {
    if (productPreviewUrl) {
      URL.revokeObjectURL(productPreviewUrl);
      productPreviewUrl = null;
    }

    if (!productImagePreview) return;

    productImagePreview.replaceChildren();

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-image";

    const message = document.createElement("p");
    message.textContent = "No image selected";

    productImagePreview.append(icon, message);
  }

  if (modalProdImage && productImagePreview) {
    modalProdImage.addEventListener("change", () => {
      const file = modalProdImage.files?.[0];

      resetProductImagePreview();

      if (!file) return;

      // Validate image format
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(file.type)) {
        alert("Please select a JPG, PNG, or WEBP image.");
        modalProdImage.value = "";
        return;
      }

      // Validate image size (5 MB maximum)
      const maxFileSize = 5 * 1024 * 1024;

      if (file.size > maxFileSize) {
        alert("Image size must not exceed 5 MB.");
        modalProdImage.value = "";
        return;
      }

      // Create a temporary preview URL
      productPreviewUrl = URL.createObjectURL(file);

      const image = document.createElement("img");
      image.src = productPreviewUrl;
      image.alt = "Selected product image";

      const fileName = document.createElement("p");
      fileName.textContent = file.name;
      fileName.className = "selected-image-name";

      productImagePreview.replaceChildren(image, fileName);
    });
  }

  // Reset image preview whenever the form resets
  productForm?.addEventListener("reset", () => {
    resetProductImagePreview();
  });

  // ==========================================
  // STEP 5.9.12.3 - CLOUDINARY IMAGE UPLOAD
  // ==========================================

  async function uploadProductImage(file) {
    if (!file) {
      throw new Error("Please select a product image.");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Only JPG, PNG, and WEBP images are allowed.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image must not exceed 5 MB.");
    }

    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.secure_url) {
      throw new Error(
        result.error?.message || "Cloudinary image upload failed.",
      );
    }

    return result.secure_url;
  }
});

document.addEventListener("DOMContentLoaded", () => {
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

  // Stock Adjustment Modal Elements
  const stockModal = document.getElementById("stockModal");
  const stockModalCloseBtn = document.getElementById("stockModalCloseBtn");
  const stockCancelBtn = document.getElementById("stockCancelBtn");
  const stockSaveBtn = document.getElementById("stockSaveBtn");
  const stockModalImg = document.getElementById("stockModalImg");
  const stockModalName = document.getElementById("stockModalName");
  const stockModalCategory = document.getElementById("stockModalCategory");
  const stockModalCurrentCount = document.getElementById("stockModalCurrentCount");
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
    if (modalOverlay && productModal) {
      modalOverlay.classList.add("show");
      productModal.classList.add("show");
    }
  }

  function closeAddModal() {
    if (modalOverlay && productModal) {
      modalOverlay.classList.remove("show");
      productModal.classList.remove("show");
      if (productForm) productForm.reset();
    }
  }

  if (openAddModalBtn) openAddModalBtn.addEventListener("click", openAddModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeAddModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener("click", closeAddModal);

  if (modalSaveBtn) {
    modalSaveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeAddModal();
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

  if (stockModalCloseBtn) stockModalCloseBtn.addEventListener("click", closeStockModal);
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

  if (productTableBody) {
    productTableBody.addEventListener("click", (e) => {
      // Trigger Add Stock Modal dynamically based on the row clicked
      const addStockBtn = e.target.closest(".add-stock-btn");
      if (addStockBtn) {
        const row = addStockBtn.closest("tr");
        const productData = {
          name: row.querySelector(".product-name")?.textContent || "Product",
          image: row.querySelector(".product-image")?.src || "",
          category: row.querySelector(".category-name")?.textContent || "Category",
          subcategory: row.querySelector(".subcategory-name")?.textContent || "Subcategory",
          stock: "35" // You can pull actual stock numbers if you store them in data-attributes or elements
        };
        openStockModal(productData);
      }

      // Delete product row functionality
      const deleteBtn = e.target.closest(".delete-product-btn");
      if (deleteBtn) {
        const row = deleteBtn.closest("tr");
        if (row && confirm("Are you sure you want to delete this product?")) {
          row.remove();
          filterProducts();
        }
      }
    });
  }

  // 5. Search and Filter Functionality
  function filterProducts() {
    if (!productTableBody) return;

    const searchTerm = productSearchInput ? productSearchInput.value.toLowerCase().trim() : "";
    const selectedStatus = statusFilterSelect ? statusFilterSelect.value : "all";
    const rows = productTableBody.querySelectorAll("tr");
    let visibleCount = 0;

    rows.forEach(row => {
      const nameEl = row.querySelector(".product-name");
      const statusEl = row.querySelector(".status");

      if (!nameEl || !statusEl) return;

      const productName = nameEl.textContent.toLowerCase();
      const productStatus = statusEl.textContent.trim();

      const matchesSearch = productName.includes(searchTerm);
      const matchesStatus = selectedStatus === "all" || productStatus === selectedStatus;

      if (matchesSearch && matchesStatus) {
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

  if (productSearchInput) productSearchInput.addEventListener("input", filterProducts);
  if (statusFilterSelect) statusFilterSelect.addEventListener("change", filterProducts);
});
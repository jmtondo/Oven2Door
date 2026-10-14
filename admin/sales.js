import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/* ==========================================
   FIREBASE AUTHENTICATION AND SALES DATA
========================================== */

/* ==========================================
   TOP-SELLING PRODUCTS
========================================== */

function renderTopSellingProducts(orders) {
  const tableBody = document.getElementById("topProductsTable");

  if (!tableBody) return;

  const products = new Map();

  // Count products from delivered and paid orders
  const completedSales = orders.filter(
    (order) =>
      order.orderStatus === "delivered" && order.paymentStatus === "paid",
  );

  completedSales.forEach((order) => {
    (order.items || []).forEach((item) => {
      const productId = String(item.productId);
      const quantity = Number(item.quantity || 0);
      const revenue = Number(
        item.subtotal ?? quantity * Number(item.unitPrice || 0),
      );

      if (!products.has(productId)) {
        products.set(productId, {
          name: item.productName || "Unknown Product",
          category: item.category || "Uncategorized",
          quantity: 0,
          revenue: 0,
        });
      }

      const product = products.get(productId);

      product.quantity += quantity;
      product.revenue += revenue;
    });
  });

  const sortedProducts = [...products.values()].sort(
    (a, b) => b.quantity - a.quantity,
  );

  tableBody.replaceChildren();

  if (!sortedProducts.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 6;
    cell.className = "empty-cell";
    cell.textContent = "No completed product sales yet.";

    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  sortedProducts.forEach((product, index) => {
    const row = document.createElement("tr");

    const values = [
      index + 1,
      product.name,
      product.category,
      product.quantity,
      product.revenue.toLocaleString("en-PH", {
        style: "currency",
        currency: "PHP",
      }),
      "Sold",
    ];

    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });
}

/* ==========================================
   RECENT SALES
========================================== */

function renderRecentSales(orders) {
  const tableBody = document.getElementById("salesTable");
  if (!tableBody) return;

  const paidOrders = orders
    .filter((order) => order.paymentStatus === "paid")
    .sort(
      (a, b) =>
        (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
    );

  tableBody.replaceChildren();

  if (!paidOrders.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 6;
    cell.className = "empty-cell";
    cell.textContent = "No confirmed sales yet.";

    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  paidOrders.forEach((order) => {
    const customer = order.customer || {};

    const customerName =
      [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
      "Unknown Customer";

    const date =
      order.createdAt?.toDate?.()?.toLocaleDateString("en-PH") || "—";

    const discount = Number(order.discount || 0);
    const total = Number(order.total || 0);

    const currency = (amount) =>
      amount.toLocaleString("en-PH", {
        style: "currency",
        currency: "PHP",
      });

    const row = document.createElement("tr");

    [
      order.orderNumber || order.id,
      customerName,
      date,
      order.paymentMethod || "—",
      currency(discount),
      currency(total),
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });

  // Apply existing search filter after refreshing rows
  document.getElementById("salesSearch")?.dispatchEvent(new Event("input"));
}

/* ==========================================
   PAYMENT METHODS REPORT
========================================== */

function renderPaymentMethods(orders) {
  const paymentCard = [...document.querySelectorAll(".report-card")].find(
    (card) =>
      card.querySelector("h2")?.textContent.trim() === "Payment Methods",
  );

  if (!paymentCard) return;

  const reportContainer = paymentCard.querySelector(".empty-report");

  if (!reportContainer) return;

  const paymentMethods = new Map();

  // Only count payments confirmed as paid
  const paidOrders = orders.filter(
    (order) => String(order.paymentStatus || "").toLowerCase() === "paid",
  );

  paidOrders.forEach((order) => {
    const method = String(order.paymentMethod || "").toLowerCase();

    const methodName =
      method === "card" || method === "maya"
        ? "Maya"
        : method === "cod"
          ? "Cash on Delivery"
          : method || "Other";

    if (!paymentMethods.has(methodName)) {
      paymentMethods.set(methodName, {
        count: 0,
        revenue: 0,
      });
    }

    const payment = paymentMethods.get(methodName);

    payment.count++;
    payment.revenue += Number(order.total || 0);
  });

  reportContainer.replaceChildren();

  if (!paymentMethods.size) {
    reportContainer.textContent = "No confirmed payments yet.";
    return;
  }

  reportContainer.style.alignItems = "stretch";
  reportContainer.style.justifyContent = "center";
  reportContainer.style.gap = "15px";

  const currency = (amount) =>
    amount.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
    });

  paymentMethods.forEach((payment, methodName) => {
    const item = document.createElement("div");

    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    item.style.alignItems = "center";
    item.style.padding = "14px";
    item.style.border = "1px solid #e3e3df";
    item.style.borderRadius = "8px";

    const name = document.createElement("strong");
    name.textContent = methodName;

    const details = document.createElement("span");
    details.textContent = `${payment.count} orders · ${currency(payment.revenue)}`;

    item.append(name, details);
    reportContainer.appendChild(item);
  });
}

/* ==========================================
   SALES BY CATEGORY
========================================== */

let productCategories = new Map();

async function loadProductCategories() {
  const snapshot = await getDocs(collection(db, "products"));

  productCategories = new Map();

  snapshot.forEach((document) => {
    const product = document.data();

    if (product.productId != null) {
      productCategories.set(
        String(product.productId),
        product.categoryName || "Uncategorized",
      );
    }
  });
}

function renderSalesByCategory(orders) {
  const categoryCard = [...document.querySelectorAll(".report-card")].find(
    (card) =>
      card.querySelector("h2")?.textContent.trim() === "Sales by Category",
  );

  const container = categoryCard?.querySelector(".empty-report");
  if (!container) return;

  const categorySales = new Map();

  // Use the same qualifying orders as Top-Selling Products
  const completedSales = orders.filter(
    (order) =>
      order.orderStatus === "delivered" &&
      String(order.paymentStatus || "").toLowerCase() === "paid",
  );

  completedSales.forEach((order) => {
    (order.items || []).forEach((item) => {
      const category =
        productCategories.get(String(item.productId)) || "Uncategorized";

      const quantity = Number(item.quantity || 0);
      const revenue = Number(
        item.subtotal ?? quantity * Number(item.unitPrice || 0),
      );

      categorySales.set(category, (categorySales.get(category) || 0) + revenue);
    });
  });

  container.replaceChildren();

  if (!categorySales.size) {
    container.textContent = "No completed category sales yet.";
    return;
  }

  container.style.alignItems = "stretch";
  container.style.justifyContent = "center";
  container.style.gap = "12px";

  const currency = (value) =>
    value.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
    });

  [...categorySales.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, revenue]) => {
      const row = document.createElement("div");

      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.padding = "14px";
      row.style.border = "1px solid #e3e3df";
      row.style.borderRadius = "8px";

      const name = document.createElement("strong");
      name.textContent = category;

      const amount = document.createElement("span");
      amount.textContent = currency(revenue);

      row.append(name, amount);
      container.appendChild(row);
    });
}

/* ==========================================
   DAILY / WEEKLY / MONTHLY SALES OVERVIEW
========================================== */

let selectedSalesPeriod = "daily";

function renderSalesOverview(orders) {
  const container = document.querySelector(".sales-overview .empty-report");

  if (!container) return;

  const paidOrders = orders.filter(
    (order) => String(order.paymentStatus || "").toLowerCase() === "paid",
  );

  const groups = new Map();

  paidOrders.forEach((order) => {
    const date = order.createdAt?.toDate?.();

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return;
    }

    let key;
    let label;

    if (selectedSalesPeriod === "daily") {
      key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      label = date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } else if (selectedSalesPeriod === "weekly") {
      // Group weeks from Monday to Sunday
      const monday = new Date(date);
      const day = (monday.getDay() + 6) % 7;

      monday.setDate(monday.getDate() - day);
      monday.setHours(0, 0, 0, 0);

      key = [
        monday.getFullYear(),
        String(monday.getMonth() + 1).padStart(2, "0"),
        String(monday.getDate()).padStart(2, "0"),
      ].join("-");

      label =
        "Week of " +
        monday.toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
    } else {
      key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
      ].join("-");

      label = date.toLocaleDateString("en-PH", {
        month: "long",
        year: "numeric",
      });
    }

    if (!groups.has(key)) {
      groups.set(key, {
        label,
        orders: 0,
        revenue: 0,
      });
    }

    const group = groups.get(key);

    group.orders++;
    group.revenue += Number(order.total || 0);
  });

  container.replaceChildren();

  if (!groups.size) {
    container.textContent = "No confirmed sales for this report.";
    return;
  }

  const currency = (amount) =>
    amount.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
    });

  const sortedGroups = [...groups.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const maxRevenue = Math.max(
    ...sortedGroups.map(([, group]) => group.revenue),
    1,
  );

  container.style.alignItems = "stretch";
  container.style.justifyContent = "center";
  container.style.gap = "16px";

  sortedGroups.forEach(([, group]) => {
    const item = document.createElement("div");

    const details = document.createElement("div");
    details.style.display = "flex";
    details.style.justifyContent = "space-between";
    details.style.gap = "12px";
    details.style.marginBottom = "8px";

    const label = document.createElement("strong");
    label.textContent = group.label;

    const amount = document.createElement("span");
    amount.textContent = `${group.orders} orders · ${currency(group.revenue)}`;

    details.append(label, amount);

    const track = document.createElement("div");
    track.style.height = "14px";
    track.style.background = "#f0efec";
    track.style.borderRadius = "8px";
    track.style.overflow = "hidden";

    const bar = document.createElement("div");
    bar.style.height = "100%";
    bar.style.width = `${(group.revenue / maxRevenue) * 100}%`;
    bar.style.background = "#8C0000";
    bar.style.borderRadius = "8px";

    track.appendChild(bar);
    item.append(details, track);
    container.appendChild(item);
  });
}

let salesOrders = [];
let unsubscribeSales = null;

const salesMainContent = document.querySelector(".main-content");

if (salesMainContent) {
  salesMainContent.style.visibility = "hidden";
}

onAuthStateChanged(auth, async (user) => {
  if (unsubscribeSales) {
    unsubscribeSales();
    unsubscribeSales = null;
  }

  if (!user) {
    window.location.replace("/login");
    return;
  }

  try {
    const userSnapshot = await getDoc(doc(db, "users", user.uid));

    const profile = userSnapshot.data();

    if (
      !userSnapshot.exists() ||
      !["admin", "staff"].includes(profile?.role) ||
      profile?.status !== "active"
    ) {
      window.location.replace("/home");
      return;
    }

    await loadProductCategories();

    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("updatedAt", "desc"),
    );

    unsubscribeSales = onSnapshot(
      ordersQuery,
      (snapshot) => {
        salesOrders = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        console.log("Sales Reports: Orders loaded:", salesOrders.length);

        /* ==========================================
   SALES SUMMARY STATISTICS
========================================== */

        // Total orders, including archived orders
        const totalOrders = salesOrders.length;

        // Completed orders
        const completedOrders = salesOrders.filter(
          (order) => order.orderStatus === "delivered",
        ).length;

        // Revenue from confirmed payments only
        const paidOrders = salesOrders.filter((order) => {
          const paymentStatus = String(order.paymentStatus || "").toLowerCase();

          return paymentStatus === "paid";
        });

        const totalRevenue = paidOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0,
        );

        // Update existing HTML cards
        document.getElementById("totalOrders").textContent =
          totalOrders.toLocaleString("en-PH");

        document.getElementById("totalSales").textContent =
          totalRevenue.toLocaleString("en-PH", {
            style: "currency",
            currency: "PHP",
          });

        // Display completed orders
        const completedOrdersElement = document.getElementById("averageOrder");

        if (completedOrdersElement) {
          completedOrdersElement.textContent =
            completedOrders.toLocaleString("en-PH");
        }

        // Log completed orders until we add its own card
        console.log("Completed orders:", completedOrders);
        console.log("Confirmed revenue:", totalRevenue);
        // Update Top-Selling Products table
        renderTopSellingProducts(salesOrders);

        renderRecentSales(salesOrders);

        renderPaymentMethods(salesOrders);

        renderSalesByCategory(salesOrders);

        renderSalesOverview(salesOrders);
      },
      (error) => {
        console.error("Sales Reports: Unable to load orders:", error);
      },
    );

    if (salesMainContent) {
      salesMainContent.style.visibility = "visible";
    }
  } catch (error) {
    console.error("Sales Reports authorization failed:", error);

    window.location.replace("/login");
  }
});

const periodButtons = document.querySelectorAll(".period-btn");

periodButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    /* Remove active from all buttons */

    periodButtons.forEach(function (btn) {
      btn.classList.remove("active");
    });

    /* Add active to selected button */

    this.classList.add("active");

    /* Get selected period */

    const selectedPeriod = this.getAttribute("data-period");

    console.log("Selected sales period:", selectedPeriod);

    selectedSalesPeriod = selectedPeriod;
    renderSalesOverview(salesOrders);

    /*
            DATABASE CODE WILL GO HERE LATER.

            Example:

            daily
            weekly
            monthly
        */
  });
});

/* =====================================================
   SEARCH RECENT SALES
===================================================== */

const searchInput = document.getElementById("salesSearch");

if (searchInput) {
  searchInput.addEventListener("input", function () {
    const searchValue = this.value.toLowerCase();

    const rows = document.querySelectorAll("#salesTable tr");

    rows.forEach(function (row) {
      const rowText = row.textContent.toLowerCase();

      if (rowText.includes(searchValue)) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  });
}

/* =====================================================
   EXPORT REPORT
===================================================== */

/* ==========================================
   EXPORT SALES REPORT TO CSV
========================================== */

const exportButton = document.getElementById("exportProducts");

if (exportButton) {
  exportButton.addEventListener("click", function () {
    const paidOrders = salesOrders.filter(
      (order) =>
        order.orderStatus === "delivered" &&
        String(order.paymentStatus || "").toLowerCase() === "paid",
    );

    if (!paidOrders.length) {
      alert("No completed and paid sales available to export.");
      return;
    }

    const products = new Map();

    paidOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const productId = String(item.productId);
        const quantity = Number(item.quantity || 0);
        const revenue = Number(
          item.subtotal ?? quantity * Number(item.unitPrice || 0),
        );

        if (!products.has(productId)) {
          products.set(productId, {
            name: item.productName || "Unknown Product",
            category: productCategories.get(productId) || "Uncategorized",
            unitsSold: 0,
            revenue: 0,
          });
        }

        const product = products.get(productId);
        product.unitsSold += quantity;
        product.revenue += revenue;
      });
    });

    // Escape CSV values and prevent spreadsheet formula injection
    const csvValue = (value) => {
      let text = String(value ?? "");

      if (/^[\s]*[=+\-@]/.test(text)) {
        text = "'" + text;
      }

      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = [
      ["Product", "Category", "Units Sold", "Revenue (PHP)"],
      ...[...products.values()]
        .sort((a, b) => b.unitsSold - a.unitsSold)
        .map((product) => [
          product.name,
          product.category,
          product.unitsSold,
          product.revenue.toFixed(2),
        ]),
    ];

    const csv = rows.map((row) => row.map(csvValue).join(",")).join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Oven2Door-Product-Sales-${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

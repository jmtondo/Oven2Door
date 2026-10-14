// ==========================================
// OVEN2DOOR - CUSTOMERS MODULE
// ==========================================

import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let customers = [];
let customerOrderCounts = new Map();
// ==========================================
// GET HTML ELEMENTS
// ==========================================

const tableBody = document.getElementById("customerTableBody");
const emptyState = document.getElementById("emptyState");

const searchInput = document.getElementById("customerSearch");
const statusFilter = document.getElementById("statusFilter");
const sortSelect = document.getElementById("sortCustomers");

const viewModal = document.getElementById("viewModal");
const addModal = document.getElementById("addModal");
const deleteModal = document.getElementById("deleteModal");

let selectedCustomerUid = null;
// ==========================================
// GET CUSTOMER INITIALS
// ==========================================

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

// ==========================================
// DISPLAY CUSTOMERS
// ==========================================

function renderCustomers() {
  const search = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const sort = sortSelect.value;

  // Filter customers
  let filtered = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(search) ||
      customer.id.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      customer.contact.toLowerCase().includes(search);

    const matchesStatus =
      status === "all" ||
      String(customer.status || "").toLowerCase() === status;

    return matchesSearch && matchesStatus;
  });

  // ======================================
  // SORT CUSTOMERS
  // ======================================

  if (sort === "nameAsc") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sort === "nameDesc") {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  }

  if (sort === "idAsc") {
    filtered.sort((a, b) => a.id.localeCompare(b.id));
  }

  // Clear current table
  tableBody.innerHTML = "";

  // ======================================
  // DISPLAY EACH CUSTOMER
  // ======================================

  filtered.forEach((customer) => {
    const row = document.createElement("tr");

    row.innerHTML = `


            <td>
                <span class="customer-id">
                    ${customer.id}
                </span>
            </td>




            <td>


                <div class="customer-name-cell">


                    <div class="customer-avatar">
                        ${getInitials(customer.name)}
                    </div>


                    <span class="customer-name">
                        ${customer.name}
                    </span>


                </div>


            </td>




            <td>


                <span class="customer-email">
                    ${customer.email}
                </span>


            </td>




            <td>


                <span class="customer-contact">
                    ${customer.contact}
                </span>


            </td>




            <td>


                <span class="status ${customer.status.toLowerCase()}">


                    ${
                      customer.status === "active"
                        ? "Active"
                        : customer.status === "inactive"
                          ? "Inactive"
                          : customer.status === "suspended"
                            ? "Suspended"
                            : "Unknown"
                    }


                </span>


            </td>




            <td>


                <div class="action-buttons">


                    <!-- VIEW BUTTON -->
                    <button
                        class="action-btn view"
                        title="View Customer"
                        data-index="${customers.indexOf(customer)}">


                        <i class="fa-regular fa-eye"></i>


                    </button>




                    <!-- DELETE BUTTON -->
                    <button
                        class="action-btn toggle-status"
                        title="${customer.status === "active" ? "Deactivate Customer" : "Reactivate Customer"}"
                        data-index="${customers.indexOf(customer)}">
                        <i class="fa-solid ${customer.status === "active" ? "fa-user-slash" : "fa-user-check"}"></i>
                    </button>


                </div>


            </td>


        `;

    tableBody.appendChild(row);
  });

  // ======================================
  // EMPTY STATE
  // ======================================

  if (filtered.length === 0) {
    emptyState.classList.add("show");
  } else {
    emptyState.classList.remove("show");
  }

  // ======================================
  // RESULT COUNT
  // ======================================

  const resultCount = document.getElementById("resultCount");

  resultCount.textContent = `Showing ${filtered.length} customer${filtered.length !== 1 ? "s" : ""}`;

  // Update summary cards
  updateSummary();
}

// ==========================================
// UPDATE SUMMARY CARDS
// ==========================================

function updateSummary() {
  const total = customers.length;

  // Returning customers: at least 2 orders
  const returning = customers.filter((customer) => {
    return (customerOrderCounts.get(customer.id) || 0) >= 2;
  }).length;

  // New customers: registered within the last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now);

  thirtyDaysAgo.setDate(now.getDate() - 30);

  const newCustomers = customers.filter((customer) => {
    const registeredAt = customer.createdAt?.toDate?.();

    return (
      registeredAt instanceof Date &&
      registeredAt >= thirtyDaysAgo &&
      registeredAt <= now
    );
  }).length;

  document.getElementById("totalCustomers").textContent =
    total.toLocaleString();

  document.getElementById("returningCustomers").textContent =
    returning.toLocaleString();

  document.getElementById("newCustomers").textContent =
    newCustomers.toLocaleString();
}

// ==========================================
// OPEN MODAL
// ==========================================

function openModal(modal) {
  modal.classList.add("show");

  document.body.style.overflow = "hidden";
}

// ==========================================
// CLOSE MODAL
// ==========================================

function closeModal(modal) {
  modal.classList.remove("show");

  // Enable scrolling again
  if (!document.querySelector(".modal-overlay.show")) {
    document.body.style.overflow = "";
  }
}

// ==========================================
// SHOW TOAST MESSAGE
// ==========================================

function showToast(message) {
  const toast = document.getElementById("toast");

  const toastMessage = document.getElementById("toastMessage");

  toastMessage.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// ==========================================
// SEARCH
// ==========================================

searchInput.addEventListener("input", function () {
  renderCustomers();
});

// ==========================================
// STATUS FILTER
// ==========================================

statusFilter.addEventListener("change", function () {
  renderCustomers();
});

// ==========================================
// SORT CUSTOMERS
// ==========================================

sortSelect.addEventListener("change", function () {
  renderCustomers();
});

// ==========================================
// CUSTOMER ACTION BUTTONS
// ==========================================

/* ==========================================
   CUSTOMER ACTION BUTTONS
========================================== */

tableBody.addEventListener("click", function (event) {
  const button = event.target.closest(".action-btn");

  if (!button) return;

  const index = Number(button.dataset.index);
  const customer = customers[index];

  if (!customer) return;

  // VIEW CUSTOMER
  if (button.classList.contains("view")) {
    document.getElementById("viewAvatar").textContent = getInitials(
      customer.name,
    );

    document.getElementById("viewName").textContent = customer.name;

    document.getElementById("viewId").textContent = customer.id;

    document.getElementById("viewEmail").textContent = customer.email;

    document.getElementById("viewContact").textContent = customer.contact;

    document.getElementById("viewStatus").textContent = customer.status;

    openModal(viewModal);
    return;
  }

  // ACTIVATE / DEACTIVATE
  if (button.classList.contains("toggle-status")) {
    selectedCustomerUid = customer.id;

    const isActive = customer.status === "active";

    document.getElementById("statusModalTitle").textContent = isActive
      ? "Deactivate Customer?"
      : "Reactivate Customer?";

    document.getElementById("statusAction").textContent = isActive
      ? "deactivate"
      : "reactivate";

    document.getElementById("deleteCustomerName").textContent = customer.name;

    openModal(deleteModal);
  }
});

/* ==========================================
   CONFIRM CUSTOMER STATUS CHANGE
========================================== */

document
  .getElementById("confirmDelete")
  .addEventListener("click", async function () {
    if (!selectedCustomerUid) return;

    const customer = customers.find((item) => item.id === selectedCustomerUid);

    if (!customer) {
      selectedCustomerUid = null;
      closeModal(deleteModal);
      showToast("Customer record is no longer available.");
      return;
    }

    const newStatus = customer.status === "active" ? "inactive" : "active";

    const button = this;
    button.disabled = true;

    try {
      await updateDoc(doc(db, "users", customer.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      selectedCustomerUid = null;
      closeModal(deleteModal);

      showToast(
        newStatus === "active"
          ? "Customer reactivated successfully."
          : "Customer deactivated successfully.",
      );
    } catch (error) {
      console.error("Customer status update failed:", error);

      showToast("Failed to update customer status.");
    } finally {
      button.disabled = false;
    }
  });

// ==========================================
// CLOSE MODAL BUTTONS
// ==========================================

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", function () {
    const modal = document.getElementById(button.dataset.close);

    closeModal(modal);
  });
});

// ==========================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ==========================================

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", function (event) {
    // Only close if clicking the dark background
    if (event.target === overlay) {
      closeModal(overlay);
    }
  });
});

// ==========================================
// ESCAPE KEY CLOSES MODAL
// ==========================================

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal-overlay.show").forEach((modal) => {
      closeModal(modal);
    });
  }
});

// ==========================================
// SIDEBAR DEMO LINKS
// ==========================================

document
  .querySelectorAll(".sidebar-nav .nav-item, .sidebar-bottom .nav-item")
  .forEach((link) => {
    link.addEventListener("click", function (event) {
      if (link.getAttribute("href") === "#") {
        event.preventDefault();

        const label = link.querySelector("span").textContent;

        // Do not show message for current page
        if (label !== "Customers") {
          showToast(`${label} page link clicked.`);
        }
      }
    });
  });

/* ==========================================
   FIREBASE CUSTOMER DATA
========================================== */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("/login");
    return;
  }

  try {
    const profileSnapshot = await getDoc(doc(db, "users", user.uid));

    const profile = profileSnapshot.data();

    if (
      !profileSnapshot.exists() ||
      profile?.role !== "admin" ||
      profile?.status !== "active"
    ) {
      window.location.replace("/home");
      return;
    }

    // Listen for orders to calculate returning customers
    onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        customerOrderCounts = new Map();

        snapshot.forEach((document) => {
          const order = document.data();
          const userId = order.userId;

          if (!userId) return;

          // Exclude cancelled orders from purchase counts
          if (String(order.orderStatus || "").toLowerCase() === "cancelled") {
            return;
          }

          customerOrderCounts.set(
            userId,
            (customerOrderCounts.get(userId) || 0) + 1,
          );
        });

        updateSummary();
      },
      (error) => {
        console.error("Unable to calculate customer orders:", error);
      },
    );

    const customersQuery = query(
      collection(db, "users"),
      where("role", "==", "customer"),
    );

    onSnapshot(
      customersQuery,
      (snapshot) => {
        customers = snapshot.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            name:
              [data.firstName || "", data.lastName || ""].join(" ").trim() ||
              "Unnamed Customer",
            email: data.email || "",
            contact: data.phone || "",
            status: data.status || "active",
            returning: false,
            createdAt: data.createdAt,
          };
        });

        console.log("Customers loaded from Firestore:", customers.length);

        // Table layout will be updated in the next step.
        // For now, this displays the actual customer accounts.
        renderCustomers();
      },
      (error) => {
        console.error("Unable to load customers:", error);
      },
    );
  } catch (error) {
    console.error("Customer authorization failed:", error);
    window.location.replace("/login");
  }
});

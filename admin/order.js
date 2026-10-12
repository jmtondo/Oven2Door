import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  updateDoc,
  arrayUnion,
  runTransaction,
  Timestamp,
  serverTimestamp,
  deleteField,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ==========================================
// ELEMENTS AND STATE
// ==========================================

const orderTableBody = document.getElementById("orderTableBody");
const searchInput = document.getElementById("orderSearchInput");
const statusFilter = document.getElementById("statusFilterSelect");
const filterToggleBtn = document.getElementById("filterToggleBtn");
const filterPanel = document.getElementById("filterPanel");
const selectAllCheckbox = document.getElementById("selectAll");
const emptyState = document.getElementById("emptyState");
const mainContent = document.querySelector(".main-content");

let orders = [];
let unsubscribeOrders = null;
const savingOrders = new Set();

// ==========================================
// ORDER VIEW STATE
// ==========================================

let orderView = "active";

let riders = [];
let currentRole = null;

const STATUS_LABELS = {
  placed: "Placed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for Pickup",
  rider_assigned: "Rider Assigned",
  picked_up: "Picked Up",
  on_the_way: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Only allow the next kitchen preparation stage.
const NEXT_STATUS = {
  placed: "preparing",
  preparing: "ready_for_pickup",
};

// ==========================================
// HELPERS
// ==========================================

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "-";

  return timestamp.toDate().toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function createCell(className = "") {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  return cell;
}

function createStatusControl(order) {
  const currentStatus = order.orderStatus || "placed";
  const nextStatus = NEXT_STATUS[currentStatus];

  // Rider and completed stages are read-only here.
  if (!nextStatus) {
    const badge = document.createElement("span");
    badge.className = `status-dropdown ${currentStatus}`;
    badge.textContent = STATUS_LABELS[currentStatus] || "Unknown";
    return badge;
  }

  const select = document.createElement("select");
  select.className = `status-dropdown ${currentStatus}`;
  select.dataset.orderId = order.id;
  select.dataset.currentStatus = currentStatus;

  for (const value of [currentStatus, nextStatus]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = STATUS_LABELS[value];
    select.appendChild(option);
  }

  select.value = currentStatus;
  select.disabled = savingOrders.has(order.id);

  return select;
}

async function assignRider(orderId, riderId) {
  const order = orders.find((item) => item.id === orderId);
  const rider = riders.find((item) => item.id === riderId);

  if (!order || !rider) {
    alert("Order or rider not found.");
    return;
  }

  if (order.orderStatus !== "ready_for_pickup") {
    alert("The order must be ready for pickup first.");
    return;
  }

  if (rider.status !== "active") {
    alert("This rider is not active.");
    return;
  }

  const riderName =
    [rider.firstName || "", rider.lastName || ""].join(" ").trim() ||
    "Assigned rider";

  const confirmed = confirm(`Assign ${riderName} to ${order.orderNumber}?`);

  if (!confirmed) {
    renderOrders();
    return;
  }

  if (savingOrders.has(orderId)) return;

  savingOrders.add(orderId);
  renderOrders();

  try {
    const orderRef = doc(db, "orders", orderId);
    const latest = await getDoc(orderRef);

    if (!latest.exists() || latest.data().orderStatus !== "ready_for_pickup") {
      throw new Error("This order is no longer ready for pickup.");
    }

    await updateDoc(orderRef, {
      assignedRiderId: rider.id,
      assignedRiderName: riderName,
      orderStatus: "rider_assigned",
      statusHistory: arrayUnion({
        status: "rider_assigned",
        at: Timestamp.now(),
      }),
      updatedAt: serverTimestamp(),
    });

    alert(`Successfully assigned ${riderName}.`);
  } catch (error) {
    console.error("Rider assignment failed:", error);
    alert(error.message || "Unable to assign rider.");
  } finally {
    savingOrders.delete(orderId);
    renderOrders();
  }
}

function riderControl(order) {
  const cell = document.createElement("td");

  if (order.assignedRiderId) {
    cell.textContent = order.assignedRiderName || "Assigned rider";
    return cell;
  }

  if (order.orderStatus !== "ready_for_pickup") {
    cell.textContent = "—";
    return cell;
  }

  if (currentRole !== "admin") {
    cell.textContent = "Admin assignment required";
    return cell;
  }

  const select = document.createElement("select");
  select.className = "status-dropdown";
  select.dataset.assignOrderId = order.id;

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = riders.length ? "Assign Rider" : "No active riders";
  select.append(placeholder);

  for (const rider of riders) {
    const option = document.createElement("option");
    option.value = rider.id;
    option.textContent =
      `${rider.firstName || ""} ${rider.lastName || ""}`.trim() || rider.id;
    select.append(option);
  }

  select.disabled = savingOrders.has(order.id) || !riders.length;
  cell.append(select);
  return cell;
}

// ==========================================
// ARCHIVE ORDER (ADMIN ONLY)
// ==========================================

async function archiveOrder(orderId) {
  if (currentRole !== "admin") {
    alert("Only administrators can archive orders.");
    return;
  }

  const order = orders.find((item) => item.id === orderId);

  if (!order || savingOrders.has(orderId)) return;

  // Only archive completed or cancelled orders.
  if (!["delivered", "cancelled"].includes(order.orderStatus)) {
    alert("Only delivered or cancelled orders can be archived.");
    return;
  }

  const confirmed = window.confirm(
    `Archive order #${order.orderNumber || orderId}?\n\n` +
      "This order will be hidden from the active list, but its records will be preserved.",
  );

  if (!confirmed) return;

  savingOrders.add(orderId);
  renderOrders();

  try {
    const orderRef = doc(db, "orders", orderId);
    const latest = await getDoc(orderRef);

    if (!latest.exists()) {
      throw new Error("Order no longer exists.");
    }

    if (!["delivered", "cancelled"].includes(latest.data().orderStatus)) {
      throw new Error("This order is not yet eligible for archiving.");
    }

    if (latest.data().archived === true) {
      throw new Error("This order has already been archived.");
    }

    if (!auth.currentUser) {
      throw new Error("Administrator is not signed in.");
    }

    await updateDoc(orderRef, {
      archived: true,
      archivedAt: serverTimestamp(),
      archivedBy: auth.currentUser.uid,
    });

    alert("Order archived successfully.");
  } catch (error) {
    console.error("Unable to archive order:", error);
    alert(error.message || "Unable to archive order.");
  } finally {
    savingOrders.delete(orderId);
    renderOrders();
  }
}

// ==========================================
// RESTORE ARCHIVED ORDER
// ==========================================

async function restoreOrder(orderId) {
  // Only administrators can restore orders.
  if (currentRole !== "admin") {
    alert("Only administrators can restore orders.");
    return;
  }

  const order = orders.find((item) => item.id === orderId);

  if (!order || savingOrders.has(orderId)) {
    return;
  }

  if (order.archived !== true) {
    alert("This order is not archived.");
    return;
  }

  const confirmed = window.confirm(
    `Restore order #${order.orderNumber || orderId}?\n\n` +
      "This order will return to the active orders list.",
  );

  if (!confirmed) return;

  savingOrders.add(orderId);
  renderOrders();

  try {
    const orderRef = doc(db, "orders", orderId);

    // Check the latest order data before restoring.
    const latest = await getDoc(orderRef);

    if (!latest.exists()) {
      throw new Error("Order no longer exists.");
    }

    if (latest.data().archived !== true) {
      throw new Error("This order is not archived.");
    }

    if (!auth.currentUser) {
      throw new Error("Administrator is not signed in.");
    }

    // Restore the order without deleting its records.
    await updateDoc(orderRef, {
      archived: false,
      archivedAt: deleteField(),
      archivedBy: deleteField(),
    });

    alert("Order restored successfully.");
  } catch (error) {
    console.error("Unable to restore order:", error);
    alert(error.message || "Unable to restore order.");
  } finally {
    savingOrders.delete(orderId);
    renderOrders();
  }
}

// ==========================================
// RENDER ORDERS
// ==========================================

function renderOrders() {
  const search = searchInput?.value.trim().toLowerCase() || "";
  const selectedStatus = statusFilter?.value || "all";

  const filtered = orders.filter((order) => {
    // Display orders according to the selected tab.
    const isArchived = order.archived === true;

    if (orderView === "active" && isArchived) {
      return false;
    }

    if (orderView === "archived" && !isArchived) {
      return false;
    }

    const customer = order.customer || {};

    const customerName = [
      customer.firstName || "",
      customer.lastName || "",
    ].join(" ");

    const searchable = [order.orderNumber || "", order.id, customerName]
      .join(" ")
      .toLowerCase();

    return (
      searchable.includes(search) &&
      (selectedStatus === "all" || order.orderStatus === selectedStatus)
    );
  });

  orderTableBody.replaceChildren();
  emptyState.style.display = filtered.length ? "none" : "flex";

  for (const order of filtered) {
    const row = document.createElement("tr");

    // Checkbox
    const checkboxCell = createCell("checkbox-col");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "row-select";
    checkboxCell.appendChild(checkbox);

    // Order number and customer
    const orderCell = createCell();
    const orderInfo = document.createElement("div");
    orderInfo.className = "order-info-cell";

    const orderNumber = document.createElement("span");
    orderNumber.className = "order-id";
    orderNumber.textContent = `#${order.orderNumber || order.id}`;

    const customerName = document.createElement("small");
    customerName.textContent = [
      order.customer?.firstName || "",
      order.customer?.lastName || "",
    ]
      .join(" ")
      .trim();

    orderInfo.append(orderNumber, customerName);
    orderCell.appendChild(orderInfo);

    // Date
    const dateCell = createCell("date-cell");
    dateCell.textContent = formatDate(order.createdAt);

    // Status
    const statusCell = createCell();
    statusCell.appendChild(createStatusControl(order));

    // ==========================================
    // ARCHIVE / RESTORE ORDER BUTTONS
    // ==========================================

    const actionsCell = createCell("actions-cell");

    if (currentRole === "admin") {
      if (order.archived === true) {
        // RESTORE BUTTON
        const restoreButton = document.createElement("button");

        restoreButton.type = "button";
        restoreButton.className = "restore-order-btn";
        restoreButton.textContent = "Restore";
        restoreButton.dataset.restoreOrderId = order.id;

        restoreButton.disabled = savingOrders.has(order.id);

        restoreButton.title = "Restore this order to the active orders list.";

        actionsCell.appendChild(restoreButton);
      } else {
        // ARCHIVE BUTTON
        const archiveButton = document.createElement("button");

        archiveButton.type = "button";
        archiveButton.className = "archive-order-btn";
        archiveButton.textContent = "Archive";
        archiveButton.dataset.archiveOrderId = order.id;

        const canArchive = ["delivered", "cancelled"].includes(
          order.orderStatus,
        );

        archiveButton.disabled = !canArchive || savingOrders.has(order.id);

        if (!canArchive) {
          archiveButton.title =
            "Only delivered or cancelled orders can be archived.";
        }

        actionsCell.appendChild(archiveButton);
      }
    }

    // ==========================================
    // APPEND TABLE CELLS
    // ==========================================

    row.append(
      checkboxCell,
      orderCell,
      dateCell,
      statusCell,
      riderControl(order),
      actionsCell,
    );

    orderTableBody.appendChild(row);
  }
}

// ==========================================
// ACTIVE / ARCHIVED ORDER TAB SWITCHING
// ==========================================

const activeOrdersBtn = document.getElementById("activeOrdersBtn");
const archivedOrdersBtn = document.getElementById("archivedOrdersBtn");

function switchOrderView(view) {
  orderView = view;

  // Update active button styling
  activeOrdersBtn?.classList.toggle("active", view === "active");
  archivedOrdersBtn?.classList.toggle("active", view === "archived");

  // Refresh the table
  renderOrders();
}

activeOrdersBtn?.addEventListener("click", () => {
  switchOrderView("active");
});

archivedOrdersBtn?.addEventListener("click", () => {
  switchOrderView("archived");
});

// ==========================================
// SAVE ORDER STATUS
// ==========================================

async function updateOrderStatus(orderId, nextStatus) {
  const order = orders.find((item) => item.id === orderId);

  if (!order || savingOrders.has(orderId)) return;

  const currentStatus = order.orderStatus;

  if (NEXT_STATUS[currentStatus] !== nextStatus) {
    alert("This status change is not permitted.");
    return;
  }

  const confirmed = window.confirm(
    `Change ${order.orderNumber || orderId} from ` +
      `${STATUS_LABELS[currentStatus]} to ${STATUS_LABELS[nextStatus]}?`,
  );

  if (!confirmed) {
    renderOrders();
    return;
  }

  savingOrders.add(orderId);
  renderOrders();

  try {
    // Re-read the order to avoid updating a stale status.
    const orderRef = doc(db, "orders", orderId);
    const latest = await getDoc(orderRef);

    if (!latest.exists() || latest.data().orderStatus !== currentStatus) {
      throw new Error(
        "The order status has already changed. Please try again.",
      );
    }

    await updateDoc(orderRef, {
      orderStatus: nextStatus,
      statusHistory: arrayUnion({
        status: nextStatus,
        at: Timestamp.now(),
      }),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Unable to update order status:", error);

    alert(error.message || "Unable to update order status.");
  } finally {
    savingOrders.delete(orderId);
    renderOrders();
  }
}

// ==========================================
// EVENTS
// ==========================================

filterToggleBtn?.addEventListener("click", () => {
  filterPanel?.classList.toggle("show");
});

searchInput?.addEventListener("input", renderOrders);
statusFilter?.addEventListener("change", renderOrders);

selectAllCheckbox?.addEventListener("change", () => {
  orderTableBody.querySelectorAll(".row-select").forEach((checkbox) => {
    checkbox.checked = selectAllCheckbox.checked;
  });
});

orderTableBody?.addEventListener("change", (event) => {
  // ==========================================
  // RIDER ASSIGNMENT
  // ==========================================

  const riderSelect = event.target.closest("select[data-assign-order-id]");

  if (riderSelect) {
    if (riderSelect.value) {
      assignRider(riderSelect.dataset.assignOrderId, riderSelect.value);
    }

    return;
  }

  // ==========================================
  // ORDER STATUS UPDATE
  // ==========================================

  const statusSelect = event.target.closest("select[data-order-id]");

  if (statusSelect) {
    updateOrderStatus(statusSelect.dataset.orderId, statusSelect.value);
  }
});

// ==========================================
// ARCHIVE ORDER BUTTON CLICK
// ==========================================
// ==========================================
// ARCHIVE / RESTORE ORDER CLICK EVENTS
// ==========================================

orderTableBody?.addEventListener("click", (event) => {
  // Handle Archive button
  const archiveButton = event.target.closest("button[data-archive-order-id]");

  if (archiveButton && !archiveButton.disabled) {
    const orderId = archiveButton.dataset.archiveOrderId;

    if (orderId) {
      archiveOrder(orderId);
    }

    return;
  }

  // Handle Restore button
  const restoreButton = event.target.closest("button[data-restore-order-id]");

  if (restoreButton && !restoreButton.disabled) {
    const orderId = restoreButton.dataset.restoreOrderId;

    if (orderId) {
      restoreOrder(orderId);
    }
  }
});

document
  .querySelector("[data-logout]")
  ?.addEventListener("click", async (event) => {
    event.preventDefault();

    await signOut(auth);
    window.location.replace("/login");
  });

// ==========================================
// AUTHENTICATION AND REAL-TIME ORDERS
// ==========================================

if (mainContent) {
  mainContent.style.visibility = "hidden";
}

onAuthStateChanged(auth, async (user) => {
  if (unsubscribeOrders) {
    unsubscribeOrders();
    unsubscribeOrders = null;
  }

  if (!user) {
    window.location.replace("/login");
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const profile = userDoc.data();

    if (
      !userDoc.exists() ||
      !["admin", "staff"].includes(profile.role) ||
      profile.status !== "active"
    ) {
      window.location.replace("/home");
      return;
    }

    // ==========================================
    // LOAD ACTIVE RIDERS FROM FIREBASE
    // ==========================================

    currentRole = profile.role;

    if (currentRole === "admin") {
      const ridersQuery = query(
        collection(db, "users"),
        where("role", "==", "rider"),
        where("status", "==", "active"),
      );

      onSnapshot(
        ridersQuery,
        (snapshot) => {
          riders = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

          renderOrders();
        },
        (error) => {
          console.error("Unable to load riders:", error);
        },
      );
    }

    if (profile.role === "staff") {
      document.querySelectorAll("[data-admin-only]").forEach((link) => {
        link.remove();
      });
    }

    if (mainContent) {
      mainContent.style.visibility = "visible";
    }

    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("updatedAt", "desc"),
    );

    unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        orders = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        renderOrders();
      },
      (error) => {
        console.error("Unable to load orders:", error);

        orderTableBody.replaceChildren();

        const row = document.createElement("tr");
        const cell = createCell();
        cell.colSpan = 6;
        cell.textContent =
          "Unable to load orders. Check Firestore permissions.";

        row.appendChild(cell);
        orderTableBody.appendChild(row);
      },
    );
  } catch (error) {
    console.error("Admin authorization failed:", error);
    window.location.replace("/login");
  }
});

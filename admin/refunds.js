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
  query,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ==========================================
// DOM ELEMENTS
// ==========================================
const REFUND_API_BASE_URL = "https://oven2door-backend.vercel.app";

const mainContent = document.querySelector(".main-content");

const refundTableBody = document.getElementById("refundTableBody");

const refundEmptyState = document.getElementById("refundEmptyState");

const searchInput = document.getElementById("refundSearchInput");

const statusFilter = document.getElementById("refundStatusFilter");

const totalRequests = document.getElementById("totalRequests");

const pendingRequests = document.getElementById("pendingRequests");

const approvedRequests = document.getElementById("approvedRequests");

const rejectedRequests = document.getElementById("rejectedRequests");

const reviewDialog = document.getElementById("refundReviewDialog");

const reviewOrderNumber = document.getElementById("reviewOrderNumber");

const reviewCustomer = document.getElementById("reviewCustomer");

const reviewOrderTotal = document.getElementById("reviewOrderTotal");

const reviewPaymentMethod = document.getElementById("reviewPaymentMethod");

const reviewResolution = document.getElementById("reviewResolution");

const reviewReason = document.getElementById("reviewReason");

const reviewStatus = document.getElementById("reviewStatus");

const reviewDescription = document.getElementById("reviewDescription");

const adminReviewNote = document.getElementById("adminReviewNote");

// Affected order items
const affectedItemsSection = document.getElementById("affectedItemsSection");

const affectedItemsList = document.getElementById("affectedItemsList");

const calculatedRefundAmount = document.getElementById(
  "calculatedRefundAmount"
);

const affectedItemsMessage = document.getElementById("affectedItemsMessage");

const reviewMessage = document.getElementById("reviewMessage");

const approveButton = document.getElementById("approveRefundBtn");

const rejectButton = document.getElementById("rejectRefundBtn");

const closeButton = document.getElementById("closeReviewDialog");

const cancelButton = document.getElementById("cancelReviewBtn");

// ==========================================
// APPLICATION STATE
// ==========================================

let refundRequests = [];
let selectedRequestId = null;

let unsubscribeRefunds = null;
let authGeneration = 0;

let isSaving = false;
let currentRole = null;

// Affected item selection
let selectedRefundItems = [];
let selectedRefundOrder = null;
let affectedItemsLoadVersion = 0;

// Order information cache
const orderCache = new Map();

// ==========================================
// LABELS
// ==========================================

const REASON_LABELS = {
  missing_item: "Missing Item",
  wrong_item: "Wrong Item Delivered",
  damaged_item: "Damaged Item",
  food_quality: "Food Quality Concern",
  other: "Other Issue",
};

const RESOLUTION_LABELS = {
  refund: "Request a Refund",
  replacement: "Request a Replacement",
  support: "Customer Support",
};

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

// ==========================================
// FORMATTING HELPERS
// ==========================================

function formatMoney(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value) || 0);
}

// ==========================================
// FIXED REFUND AMOUNT HELPERS
// ==========================================

function toCents(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid monetary amount.");
  }

  return Math.round(amount * 100);
}

function getFixedRefundAmount(request) {
  if (request.requestedResolution !== "refund") {
    throw new Error("This request is not a monetary refund.");
  }

  if (request.status !== "approved") {
    throw new Error("The refund request must be approved first.");
  }

  if (request.refundAmount === undefined || request.refundAmount === null) {
    throw new Error(
      "No approved refund amount has been assigned to this request."
    );
  }

  const cents = toCents(request.refundAmount);
  const orderTotalCents = toCents(request.orderTotal);

  if (cents <= 0 || cents > orderTotalCents) {
    throw new Error("The approved refund amount is invalid.");
  }

  return cents / 100;
}

// ==========================================
// ORIGINAL ORDER ITEM REFUND CALCULATION
// ==========================================

function getRefundableOrderItems(order) {
  if (!Array.isArray(order?.items)) {
    return [];
  }

  return order.items.map((item, index) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const subtotal = Number(item.subtotal);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      !Number.isFinite(subtotal) ||
      subtotal < 0 ||
      toCents(unitPrice * quantity) !== toCents(subtotal)
    ) {
      throw new Error(
        `Invalid pricing information for order item ${index + 1}.`
      );
    }

    return {
      index,
      productId: item.productId,
      productName: item.productName || "Unknown Product",
      quantity,
      unitPrice,
      subtotal,
    };
  });
}

function calculateItemRefund(order, selectedItems) {
  const orderItems = getRefundableOrderItems(order);

  if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
    throw new Error("Select at least one affected order item.");
  }

  let totalCents = 0;
  const selectedIndexes = new Set();

  for (const selection of selectedItems) {
    const index = Number(selection.index);
    const refundQuantity = Number(selection.quantity);

    if (!Number.isSafeInteger(index) || selectedIndexes.has(index)) {
      throw new Error("Invalid or duplicate order item selection.");
    }

    selectedIndexes.add(index);

    const item = orderItems[index];

    if (!item) {
      throw new Error("Selected item was not found in the order.");
    }

    if (
      !Number.isSafeInteger(refundQuantity) ||
      refundQuantity < 1 ||
      refundQuantity > item.quantity
    ) {
      throw new Error(`Invalid refund quantity for ${item.productName}.`);
    }

    totalCents += toCents(item.unitPrice) * refundQuantity;
  }

  if (totalCents <= 0) {
    throw new Error("Refund amount must be greater than zero.");
  }

  return totalCents / 100;
}

// ==========================================
// REFUND APPROVAL VALIDATION
// ==========================================

function prepareRefundApproval(request, order) {
  if (request.requestedResolution !== "refund") {
    return null;
  }

  if (!order || !Array.isArray(order.items)) {
    throw new Error("Original order items could not be verified.");
  }

  if (selectedRefundItems.length === 0) {
    throw new Error(
      "Select at least one affected item before approving the refund."
    );
  }

  const selectedItems = selectedRefundItems.map((item) => ({
    index: item.index,
    quantity: item.quantity,
  }));

  const amount = calculateItemRefund(order, selectedItems);

  if (toCents(amount) > toCents(order.total)) {
    throw new Error("Refund cannot exceed the original order total.");
  }

  return {
    refundAmount: amount,
    refundItems: selectedItems,
    refundStatus: "not_processed",
  };
}

// ==========================================
// AFFECTED ORDER ITEMS UI
// ==========================================

function updateCalculatedRefund() {
  if (!calculatedRefundAmount) return;

  try {
    if (!selectedRefundOrder || selectedRefundItems.length === 0) {
      calculatedRefundAmount.textContent = formatMoney(0);
      return;
    }

    const amount = calculateItemRefund(
      selectedRefundOrder,
      selectedRefundItems
    );

    calculatedRefundAmount.textContent = formatMoney(amount);

    if (affectedItemsMessage) {
      affectedItemsMessage.textContent = "";
    }
  } catch (error) {
    calculatedRefundAmount.textContent = "Unavailable";

    if (affectedItemsMessage) {
      affectedItemsMessage.textContent = error.message;
    }
  }
}

function renderAffectedOrderItems(order, readOnly = false) {
  if (!affectedItemsList) return;

  affectedItemsList.replaceChildren();

  selectedRefundOrder = order;
  selectedRefundItems = [];

  let items;

  try {
    items = getRefundableOrderItems(order);
  } catch (error) {
    affectedItemsList.textContent = error.message;
    updateCalculatedRefund();
    return;
  }

  if (items.length === 0) {
    affectedItemsList.textContent = "No refundable order items were found.";

    updateCalculatedRefund();
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "affected-item";

    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.disabled = readOnly;

    const itemName = document.createElement("span");
    itemName.textContent = `${item.productName} (Qty: ${item.quantity})`;

    const price = document.createElement("span");
    price.className = "affected-item-price";
    price.textContent = formatMoney(item.subtotal);

    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.min = "1";
    quantityInput.max = String(item.quantity);
    quantityInput.step = "1";
    quantityInput.value = String(item.quantity);
    quantityInput.disabled = true;
    quantityInput.className = "refund-quantity-input";
    quantityInput.setAttribute(
      "aria-label",
      `Refund quantity for ${item.productName}`
    );

    const updateSelection = () => {
      selectedRefundItems = selectedRefundItems.filter(
        (selection) => selection.index !== item.index
      );

      if (checkbox.checked) {
        selectedRefundItems.push({
          index: item.index,
          quantity: Number(quantityInput.value),
        });
      }

      updateCalculatedRefund();
    };

    checkbox.addEventListener("change", () => {
      quantityInput.disabled = readOnly || !checkbox.checked;
      updateSelection();
    });

    quantityInput.addEventListener("input", updateSelection);

    label.append(checkbox, itemName);
    row.append(label, quantityInput, price);
    affectedItemsList.appendChild(row);
  }

  updateCalculatedRefund();
}

async function loadAffectedItemsForRequest(request) {
  const loadVersion = ++affectedItemsLoadVersion;

  selectedRefundOrder = null;
  selectedRefundItems = [];

  if (affectedItemsSection) {
    affectedItemsSection.hidden = request.requestedResolution !== "refund";
  }

  if (request.requestedResolution !== "refund") return;

  if (affectedItemsList) {
    affectedItemsList.textContent = "Loading order items...";
  }

  if (calculatedRefundAmount) {
    calculatedRefundAmount.textContent = formatMoney(0);
  }

  if (affectedItemsMessage) {
    affectedItemsMessage.textContent = "";
  }

  const order = await loadOrderDetails(request.orderId);

  // Ignore responses from a previously opened request.
  if (
    loadVersion !== affectedItemsLoadVersion ||
    selectedRequestId !== request.id ||
    !reviewDialog?.open
  ) {
    return;
  }

  if (!order) {
    if (affectedItemsList) {
      affectedItemsList.textContent = "Unable to load the original order.";
    }
    return;
  }

  // The original selection must become immutable
  // after authorization.
  const readOnly = request.status !== "pending";

  if (readOnly) {
    if (affectedItemsList) {
      affectedItemsList.textContent =
        "This request has already been reviewed. " +
        "The affected-item selection is locked.";
    }

    if (calculatedRefundAmount) {
      calculatedRefundAmount.textContent =
        request.refundAmount != null
          ? formatMoney(request.refundAmount)
          : "Amount not yet determined";
    }

    return;
  }

  renderAffectedOrderItems(order);
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "—";

  return timestamp.toDate().toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPaymentMethod(method) {
  if (method === "cod") return "Cash on Delivery";
  if (method === "maya") return "Maya";

  return String(method || "Not specified").toUpperCase();
}

function getCustomerName(order) {
  const customer = order?.customer || {};

  const name = [customer.firstName || "", customer.lastName || ""]
    .join(" ")
    .trim();

  return name || "Customer";
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = String(value ?? "—");
  }
}

// ==========================================
// ORDER DETAILS
// ==========================================

async function loadOrderDetails(orderId) {
  if (!orderId) return null;

  if (orderCache.has(orderId)) {
    return orderCache.get(orderId);
  }

  try {
    const orderSnapshot = await getDoc(doc(db, "orders", orderId));

    if (!orderSnapshot.exists()) {
      return null;
    }

    const order = {
      id: orderSnapshot.id,
      ...orderSnapshot.data(),
    };

    orderCache.set(orderId, order);

    return order;
  } catch (error) {
    console.error("Unable to load order details:", error);

    return null;
  }
}

// ==========================================
// SUMMARY STATISTICS
// ==========================================

function updateStatistics() {
  const total = refundRequests.length;

  const pending = refundRequests.filter(
    (request) => request.status === "pending"
  ).length;

  const approved = refundRequests.filter(
    (request) => request.status === "approved"
  ).length;

  const rejected = refundRequests.filter(
    (request) => request.status === "rejected"
  ).length;

  if (totalRequests) {
    totalRequests.textContent = total;
  }

  if (pendingRequests) {
    pendingRequests.textContent = pending;
  }

  if (approvedRequests) {
    approvedRequests.textContent = approved;
  }

  if (rejectedRequests) {
    rejectedRequests.textContent = rejected;
  }
}

// ==========================================
// TABLE HELPERS
// ==========================================

function createCell(value, className = "") {
  const cell = document.createElement("td");

  if (className) {
    cell.className = className;
  }

  cell.textContent = String(value ?? "—");

  return cell;
}

function createStatusBadge(status) {
  const badge = document.createElement("span");

  badge.className = `refund-status ${status || "pending"}`;

  badge.textContent = STATUS_LABELS[status] || "Unknown";

  return badge;
}

function createActionButton(request) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "review-request-btn";

  button.dataset.requestId = request.id;

  button.textContent = request.status === "pending" ? "Review" : "View Details";

  return button;
}

// ==========================================
// FILTER AND RENDER REQUESTS
// ==========================================

function renderRefundRequests() {
  if (!refundTableBody) return;

  const search = searchInput?.value.trim().toLowerCase() || "";

  const selectedStatus = statusFilter?.value || "all";

  const filtered = refundRequests.filter((request) => {
    const searchable = [
      request.orderNumber,
      request.id,
      request.customerName,
      request.reason,
      REASON_LABELS[request.reason],
      request.description,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchable.includes(search);

    const matchesStatus =
      selectedStatus === "all" || request.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  refundTableBody.replaceChildren();

  if (refundEmptyState) {
    refundEmptyState.hidden = filtered.length > 0;
  }

  for (const request of filtered) {
    const row = document.createElement("tr");

    // Order number
    const orderNumberCell = createCell(
      request.orderNumber || request.orderId,
      "order-number-cell"
    );

    // Customer
    const customerCell = createCell(request.customerName || "Customer");

    // Issue
    const issueCell = createCell(
      REASON_LABELS[request.reason] || request.reason
    );

    // Resolution
    const resolutionCell = createCell(
      RESOLUTION_LABELS[request.requestedResolution] ||
        request.requestedResolution
    );

    // Date
    const dateCell = createCell(formatDate(request.createdAt), "date-cell");

    // Status
    const statusCell = document.createElement("td");

    statusCell.appendChild(createStatusBadge(request.status));

    // Actions
    const actionCell = document.createElement("td");

    actionCell.appendChild(createActionButton(request));

    row.append(
      orderNumberCell,
      customerCell,
      issueCell,
      resolutionCell,
      dateCell,
      statusCell,
      actionCell
    );

    refundTableBody.appendChild(row);
  }
}

// ==========================================
// OPEN REVIEW DIALOG
// ==========================================

function openReviewDialog(requestId) {
  const request = refundRequests.find((item) => item.id === requestId);

  if (!request || !reviewDialog) return;

  selectedRequestId = request.id;

  setText("reviewOrderNumber", request.orderNumber || request.orderId);

  setText("reviewCustomer", request.customerName || "Customer");

  setText("reviewOrderTotal", formatMoney(request.orderTotal));

  setText("reviewPaymentMethod", formatPaymentMethod(request.paymentMethod));

  setText(
    "reviewResolution",
    RESOLUTION_LABELS[request.requestedResolution] ||
      request.requestedResolution
  );

  setText("reviewReason", REASON_LABELS[request.reason] || request.reason);

  setText("reviewStatus", STATUS_LABELS[request.status] || request.status);

  setText(
    "reviewDescription",
    request.description || "No description provided."
  );

  if (adminReviewNote) {
    adminReviewNote.value = request.adminNote || "";
    adminReviewNote.readOnly = request.status !== "pending";
  }

  if (reviewMessage) {
    reviewMessage.textContent = "";
  }

  const canReview = request.status === "pending" && currentRole === "admin";

  if (approveButton) {
    approveButton.hidden = !canReview;
  }

  if (rejectButton) {
    rejectButton.hidden = !canReview;
  }

  // ==========================================
  // REFUND FULFILLMENT DISPLAY
  // ==========================================

  const fulfillmentSection = document.getElementById(
    "refundFulfillmentSection"
  );

  const fixedAmountElement = document.getElementById("fixedRefundAmount");

  const startProcessingButton = document.getElementById(
    "startRefundProcessingBtn"
  );

  const completeRefundButton = document.getElementById("completeRefundBtn");

  const canFulfill =
    request.status === "approved" && request.requestedResolution === "refund";

  if (fulfillmentSection) {
    fulfillmentSection.hidden = !canFulfill;
  }

  let amountAvailable = false;

  if (canFulfill && fixedAmountElement) {
    try {
      const amount = getFixedRefundAmount(request);

      fixedAmountElement.textContent = formatMoney(amount);
      amountAvailable = true;
    } catch (error) {
      fixedAmountElement.textContent = "Amount not yet determined";
    }
  }

  const canProcess = canFulfill && amountAvailable && currentRole === "admin";

  if (startProcessingButton) {
    startProcessingButton.disabled =
      !canProcess || request.refundStatus !== "not_processed";
  }

  if (completeRefundButton) {
    completeRefundButton.disabled =
      !canProcess || request.refundStatus !== "processing";
  }

  // ==========================================
  // OPEN DIALOG
  // ==========================================

  reviewDialog.showModal();

  loadAffectedItemsForRequest(request).catch((error) => {
    console.error("Unable to load affected items:", error);

    if (
      selectedRequestId === request.id &&
      reviewDialog.open &&
      affectedItemsMessage
    ) {
      affectedItemsMessage.textContent = "Unable to load the order items.";
    }
  });
}

// ==========================================
// CLOSE REVIEW DIALOG
// ==========================================

function closeReviewDialog() {
  if (isSaving) return;

  selectedRequestId = null;

  affectedItemsLoadVersion++;
  selectedRefundItems = [];
  selectedRefundOrder = null;

  if (reviewDialog?.open) {
    reviewDialog.close();
  }
}

// ==========================================
// APPROVE / REJECT REQUEST
// ==========================================

async function reviewRefundRequest(nextStatus) {
  if (isSaving) return;

  if (currentRole !== "admin") {
    alert("Only administrators can review requests.");
    return;
  }

  if (!["approved", "rejected"].includes(nextStatus)) {
    return;
  }

  const request = refundRequests.find((item) => item.id === selectedRequestId);

  if (!request) {
    alert("Request not found.");
    return;
  }

  if (request.status !== "pending") {
    alert("This request has already been reviewed.");
    return;
  }

  const user = auth.currentUser;

  if (!user) {
    alert("Administrator is not signed in.");
    return;
  }

  // ==========================================
  // PREPARE MONETARY REFUND
  // ==========================================

  let refundApproval = null;

  if (nextStatus === "approved" && request.requestedResolution === "refund") {
    try {
      const order = await loadOrderDetails(request.orderId);

      refundApproval = prepareRefundApproval(request, order);
    } catch (error) {
      if (reviewMessage) {
        reviewMessage.textContent = error.message;
      }

      return;
    }
  }

  const note = adminReviewNote?.value.trim() || "";

  if (note.length > 2000) {
    alert("Administrator notes cannot exceed 2000 characters.");
    return;
  }

  if (nextStatus === "rejected" && !note) {
    alert("Please provide a reason for rejection.");
    adminReviewNote?.focus();
    return;
  }

  const actionLabel = nextStatus === "approved" ? "approve" : "reject";

  const confirmed = window.confirm(
    `Are you sure you want to ${actionLabel} ` +
      `request ${request.orderNumber || request.id}?`
  );

  if (!confirmed) return;

  isSaving = true;

  if (approveButton) approveButton.disabled = true;
  if (rejectButton) rejectButton.disabled = true;
  if (cancelButton) cancelButton.disabled = true;
  if (closeButton) closeButton.disabled = true;

  if (reviewMessage) {
    reviewMessage.textContent = "Saving your decision...";
  }

  try {
    const requestRef = doc(db, "refundRequests", request.id);

    await runTransaction(db, async (transaction) => {
      const latest = await transaction.get(requestRef);

      if (!latest.exists()) {
        throw new Error("This request no longer exists.");
      }

      const latestRequest = latest.data();

      if (latestRequest.status !== "pending") {
        throw new Error("This request has already been reviewed.");
      }

      const updates = {
        status: nextStatus,
        adminNote: note,
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (
        nextStatus === "approved" &&
        latestRequest.requestedResolution === "refund" &&
        !refundApproval
      ) {
        throw new Error(
          "Select affected items and calculate the refund amount before approval."
        );
      }

      if (refundApproval) {
        const orderRef = doc(db, "orders", request.orderId);
        const orderSnapshot = await transaction.get(orderRef);

        if (!orderSnapshot.exists()) {
          throw new Error("Original order not found.");
        }

        const originalOrder = orderSnapshot.data();

        // Verify the refund belongs to the original customer
        if (originalOrder.userId !== latestRequest.userId) {
          throw new Error(
            "Refund request does not belong to the original order customer."
          );
        }

        // Verify the order has been delivered
        if (originalOrder.orderStatus !== "delivered") {
          throw new Error("Only delivered orders can be refunded.");
        }

        // Recalculate using the latest original order document.
        const verifiedAmount = calculateItemRefund(
          originalOrder,
          refundApproval.refundItems
        );

        if (toCents(verifiedAmount) !== toCents(refundApproval.refundAmount)) {
          throw new Error(
            "Order pricing changed. Please reopen and review this request."
          );
        }

        updates.refundAmount = verifiedAmount;
        updates.refundItems = refundApproval.refundItems;
        updates.refundStatus = "not_processed";
      }

      transaction.update(requestRef, updates);
    });

    closeAfterSave();

    alert(
      nextStatus === "approved"
        ? "Request approved successfully. Any refund payment must still be processed separately."
        : "Request rejected successfully."
    );
  } catch (error) {
    console.error("Unable to review refund request:", error);

    if (reviewMessage) {
      reviewMessage.textContent =
        error.message || "Unable to save your decision.";
    }
  } finally {
    isSaving = false;

    if (approveButton) approveButton.disabled = false;
    if (rejectButton) rejectButton.disabled = false;
    if (cancelButton) cancelButton.disabled = false;
    if (closeButton) closeButton.disabled = false;
  }
}

async function updateRefundFulfillment(nextStatus) {
  if (isSaving || !selectedRequestId) return;

  const request = refundRequests.find((item) => item.id === selectedRequestId);

  if (!request || request.status !== "approved") {
    alert("This refund request is not approved.");
    return;
  }

  if (request.requestedResolution !== "refund") {
    alert("This request does not require a monetary refund.");
    return;
  }

  if (currentRole !== "admin") {
    alert("Only administrators can process refunds.");
    return;
  }

  const user = auth.currentUser;

  if (!user) {
    alert("Please sign in again.");
    return;
  }

  const method = document.getElementById("refundMethod")?.value;

  const reference =
    document.getElementById("refundReference")?.value.trim() || "";

  const validMethods = ["cash", "gcash", "maya", "bank_transfer", "other"];

  if (!validMethods.includes(method)) {
    alert("Please select a valid refund method.");
    return;
  }

  if (nextStatus === "completed" && !reference) {
    alert("Enter a transaction reference before completion.");
    return;
  }

  const expectedStatus =
    nextStatus === "processing" ? "not_processed" : "processing";

  if (request.refundStatus !== expectedStatus) {
    alert("This refund is not in the correct processing stage.");
    return;
  }

  const fixedAmount = getFixedRefundAmount(request);

  const confirmed = confirm(
    nextStatus === "processing"
      ? `Start processing the refund of ${formatMoney(fixedAmount)}?`
      : `Confirm that ${formatMoney(
          fixedAmount
        )} has actually been returned to the customer?`
  );

  if (!confirmed) return;

  isSaving = true;

  try {
    if (nextStatus === "processing") {
      // STEP 1: Start processing directly through Firestore.
      const requestRef = doc(db, "refundRequests", request.id);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(requestRef);

        if (!snapshot.exists()) {
          throw new Error("Refund request no longer exists.");
        }

        const latest = snapshot.data();

        if (
          latest.status !== "approved" ||
          latest.requestedResolution !== "refund" ||
          latest.refundStatus !== "not_processed"
        ) {
          throw new Error("Refund status changed. Please reopen the request.");
        }

        getFixedRefundAmount(latest);

        transaction.update(requestRef, {
          refundStatus: "processing",
          refundMethod: method,
          refundReference: reference,
          refundProcessedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
      });

      alert("Refund marked as processing.");
    } else if (nextStatus === "completed") {
      // STEP 2: Complete through the protected Vercel API.
      const token = await user.getIdToken();

      const response = await fetch(
        `${REFUND_API_BASE_URL}/api/completeRefund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderId: request.orderId || request.id,
            refundMethod: method,
            refundReference: reference,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to complete refund.");
      }

      alert("Refund marked as completed. Email notification is pending.");
    } else {
      throw new Error("Invalid refund status.");
    }

    closeAfterSave();
  } catch (error) {
    console.error("Refund fulfillment failed:", error);

    const message = document.getElementById("refundFulfillmentMessage");

    if (message) {
      message.textContent = error.message || "Unable to update refund status.";
    }

    alert(error.message || "Unable to update refund status.");
  } finally {
    isSaving = false;
  }
}

function closeAfterSave() {
  selectedRequestId = null;

  if (reviewDialog?.open) {
    reviewDialog.close();
  }
}

// ==========================================
// REAL-TIME REFUND REQUESTS
// ==========================================

function subscribeToRefundRequests(generation) {
  const requestsQuery = query(collection(db, "refundRequests"));

  unsubscribeRefunds = onSnapshot(
    requestsQuery,

    async (snapshot) => {
      const incomingRequests = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const enrichedRequests = await Promise.all(
        incomingRequests.map(async (request) => {
          const order = await loadOrderDetails(request.orderId);

          return {
            ...request,
            customerName: getCustomerName(order),
          };
        })
      );

      // Ignore callbacks from an old login session.
      if (generation !== authGeneration) return;

      enrichedRequests.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;

        return bTime - aTime;
      });

      refundRequests = enrichedRequests;

      updateStatistics();
      renderRefundRequests();
    },

    (error) => {
      console.error("Unable to load refund requests:", error);

      if (generation !== authGeneration) return;

      if (refundTableBody) {
        refundTableBody.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 7;
        cell.className = "loading-cell";
        cell.textContent =
          "Unable to load refund requests. Check Firestore permissions.";

        row.appendChild(cell);
        refundTableBody.appendChild(row);
      }
    }
  );
}

// ==========================================
// SEARCH AND FILTER EVENTS
// ==========================================

searchInput?.addEventListener("input", renderRefundRequests);

statusFilter?.addEventListener("change", renderRefundRequests);

// ==========================================
// TABLE CLICK EVENTS
// ==========================================

refundTableBody?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-request-id]");

  if (!button) return;

  openReviewDialog(button.dataset.requestId);
});

document
  .getElementById("startRefundProcessingBtn")
  ?.addEventListener("click", () => {
    updateRefundFulfillment("processing");
  });

document.getElementById("completeRefundBtn")?.addEventListener("click", () => {
  updateRefundFulfillment("completed");
});

// ==========================================
// REVIEW DIALOG EVENTS
// ==========================================

approveButton?.addEventListener("click", () => {
  reviewRefundRequest("approved");
});

rejectButton?.addEventListener("click", () => {
  reviewRefundRequest("rejected");
});

closeButton?.addEventListener("click", closeReviewDialog);

cancelButton?.addEventListener("click", closeReviewDialog);

reviewDialog?.addEventListener("cancel", (event) => {
  if (isSaving) {
    event.preventDefault();
  } else {
    selectedRequestId = null;
  }
});

reviewDialog?.addEventListener("close", () => {
  selectedRequestId = null;
});

// ==========================================
// LOGOUT
// ==========================================

document
  .querySelector("[data-logout]")
  ?.addEventListener("click", async (event) => {
    event.preventDefault();

    await signOut(auth);

    window.location.replace("/login");
  });

// ==========================================
// AUTHENTICATION
// ==========================================

if (mainContent) {
  mainContent.style.visibility = "hidden";
}

onAuthStateChanged(auth, async (user) => {
  const generation = ++authGeneration;

  if (unsubscribeRefunds) {
    unsubscribeRefunds();
    unsubscribeRefunds = null;
  }

  refundRequests = [];
  orderCache.clear();
  selectedRequestId = null;
  currentRole = null;

  if (reviewDialog?.open) {
    reviewDialog.close();
  }

  if (mainContent) {
    mainContent.style.visibility = "hidden";
  }

  if (!user) {
    window.location.replace("/login");
    return;
  }

  try {
    const userSnapshot = await getDoc(doc(db, "users", user.uid));

    if (generation !== authGeneration) return;

    if (!userSnapshot.exists()) {
      window.location.replace("/home");
      return;
    }

    const profile = userSnapshot.data();

    // Only active administrators can access
    // the Returns & Refunds management page.
    if (profile.role !== "admin" || profile.status !== "active") {
      window.location.replace("/home");
      return;
    }

    currentRole = profile.role;

    if (mainContent) {
      mainContent.style.visibility = "visible";
    }

    subscribeToRefundRequests(generation);
  } catch (error) {
    console.error("Refund administration authorization failed:", error);

    if (generation !== authGeneration) return;

    window.location.replace("/login");
  }
});

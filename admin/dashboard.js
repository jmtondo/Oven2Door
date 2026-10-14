import { db } from "./firebase-config.js";

import {
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Dashboard elements
const totalOrdersElement = document.getElementById("dashboardTotalOrders");
const totalRevenueElement = document.getElementById("dashboardTotalRevenue");
const systemStatusElement = document.getElementById("dashboardSystemStatus");

// Listen for real-time order updates
onSnapshot(
  collection(db, "orders"),
  (snapshot) => {
    let totalRevenue = 0;

    snapshot.forEach((doc) => {
      const order = doc.data();

      console.log("Dashboard order:", {
        id: doc.id,
        paymentStatus: order.paymentStatus,
        total: order.total,
      });

      // Count only paid orders as revenue
      const paymentStatus = String(order.paymentStatus || "").toLowerCase();

      if (paymentStatus === "paid") {
        totalRevenue += Number(order.total || 0);
      }
    });

    // Prepare recent order activity from Firestore
    recentOrderActivities = snapshot.docs
      .map((document) => {
        const order = document.data();
        const customer = order.customer || {};

        const customerName =
          [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
          order.userId ||
          "Unknown Customer";

        const timestamp = order.updatedAt || order.createdAt;
        const dateObject = timestamp?.toDate?.();

        const date = dateObject
          ? dateObject.toLocaleString("en-PH", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "—";

        const status = String(order.orderStatus || "pending").replace(
          /[_-]/g,
          " ",
        );

        return {
          id: order.orderNumber || document.id,
          customerName,
          action: `Order ${status}`,
          date,
          sortTime: timestamp?.toMillis?.() || 0,
        };
      })
      .sort((a, b) => b.sortTime - a.sortTime)
      .slice(0, 10);

    renderRecentActivity();

    // Update Total Orders
    if (totalOrdersElement) {
      totalOrdersElement.textContent = snapshot.size.toString();
    }
    console.log("Calculated dashboard revenue:", totalRevenue);
    console.log("Revenue HTML element:", totalRevenueElement);
    // Update Total Revenue
    if (totalRevenueElement) {
      totalRevenueElement.textContent =
        "₱" +
        totalRevenue.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
    }

    // Update connection status
    if (systemStatusElement) {
      systemStatusElement.textContent = "Firestore connected";
    }
  },
  (error) => {
    console.error("Dashboard Firestore error:", error);

    if (systemStatusElement) {
      systemStatusElement.textContent = "Unable to load dashboard data";
    }
  },
);

// ==========================================
// RECENT ORDER ACTIVITY
// ==========================================

const activityTableBody = document.getElementById("activityTableBody");
const activitySearchInput = document.getElementById("activitySearchInput");

let recentOrderActivities = [];

function renderRecentActivity() {
  if (!activityTableBody) return;

  const searchTerm = (activitySearchInput?.value || "").toLowerCase().trim();

  const filteredOrders = recentOrderActivities.filter((order) => {
    const searchableText = [
      order.id,
      order.customerName,
      order.action,
      order.date,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(searchTerm);
  });

  activityTableBody.replaceChildren();

  if (filteredOrders.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 4;
    cell.className = "empty-cell";
    cell.textContent = searchTerm
      ? "No matching order activity found."
      : "No recent order activity.";

    row.appendChild(cell);
    activityTableBody.appendChild(row);
    return;
  }

  filteredOrders.forEach((order) => {
    const row = document.createElement("tr");

    [order.id, order.customerName, order.action, order.date].forEach(
      (value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      },
    );

    activityTableBody.appendChild(row);
  });
}

activitySearchInput?.addEventListener("input", renderRecentActivity);

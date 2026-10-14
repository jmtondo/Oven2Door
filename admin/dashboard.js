import { db } from "./firebase-config.js";

import {
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Dashboard elements
const totalOrdersElement = document.getElementById("dashboardTotalOrders");
const systemStatusElement = document.getElementById("dashboardSystemStatus");

// Listen for changes in Firestore orders
onSnapshot(
  collection(db, "orders"),
  (snapshot) => {
    if (totalOrdersElement) {
      totalOrdersElement.textContent = snapshot.size.toString();
    }

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

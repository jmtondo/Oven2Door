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
  runTransaction,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

let promos = [];
let editingCode = null;
let unsubscribe = null;
let saving = false;

const money = (value) =>
  "₱" +
  Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function promoStatus(promo) {
  if (!promo.enabled) return "inactive";

  const now = Date.now();
  const start = promo.startAt?.toMillis?.() ?? 0;
  const end = promo.endAt?.toMillis?.() ?? 0;

  if (end <= now) return "expired";
  if (start > now) return "scheduled";

  if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
    return "expired";
  }

  return "active";
}

function formatDate(value) {
  return value?.toDate?.()?.toLocaleDateString("en-PH") || "—";
}

function dateInput(value) {
  if (!value?.toDate) return "";

  const date = value.toDate();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 16);
}

function showMessage(text) {
  $("promoMessage").textContent = text;
}

function renderPromos() {
  const tbody = $("promosTableBody");
  tbody.replaceChildren();

  const search = $("promoSearch").value.trim().toUpperCase();
  const filter = $("promoStatusFilter").value;

  const filtered = promos.filter((promo) => {
    return (
      promo.code.includes(search) &&
      (filter === "all" || promoStatus(promo) === filter)
    );
  });

  if (!filtered.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.textContent = "No promos found.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  filtered.forEach((promo) => {
    const tr = document.createElement("tr");

    const discount =
      promo.type === "percentage" ? `${promo.value}%` : money(promo.value);

    const values = [
      promo.code,
      discount,
      money(promo.minimumOrder),
      `${promo.usedCount || 0}/${promo.usageLimit}`,
      formatDate(promo.endAt),
    ];

    values.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });

    const status = promoStatus(promo);
    const statusTd = document.createElement("td");
    const badge = document.createElement("span");

    badge.className = `promo-status ${status}`;
    badge.textContent = status[0].toUpperCase() + status.slice(1);

    statusTd.appendChild(badge);
    tr.appendChild(statusTd);

    const actionTd = document.createElement("td");

    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openPromo(promo.code));

    const toggle = document.createElement("button");
    toggle.textContent = promo.enabled ? "Disable" : "Enable";
    toggle.addEventListener("click", () => togglePromo(promo));

    actionTd.append(edit, toggle);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });
}

function updateStats() {
  $("totalPromos").textContent = promos.length;

  ["active", "scheduled", "expired"].forEach((status) => {
    const id = {
      active: "activePromos",
      scheduled: "scheduledPromos",
      expired: "expiredPromos",
    }[status];

    $(id).textContent = promos.filter((p) => promoStatus(p) === status).length;
  });
}

function openPromo(code = null) {
  editingCode = code;
  $("promoForm").reset();
  $("promoFormMessage").textContent = "";

  const promo = promos.find((p) => p.code === code);

  $("promoDialogTitle").textContent = promo ? "Edit Promo" : "Create Promo";

  $("promoCode").disabled = !!promo;

  if (promo) {
    $("promoCode").value = promo.code;
    $("discountType").value = promo.type;
    $("discountValue").value = promo.value;
    $("minimumOrder").value = promo.minimumOrder;
    $("maximumDiscount").value = promo.maximumDiscount ?? "";
    $("usageLimit").value = promo.usageLimit;
    $("startDate").value = dateInput(promo.startAt);
    $("endDate").value = dateInput(promo.endAt);
    $("promoEnabled").checked = promo.enabled;
  } else {
    $("minimumOrder").value = 0;
    $("promoEnabled").checked = true;
  }

  $("promoDialog").showModal();
}

function closePromo() {
  $("promoDialog").close();
  editingCode = null;
}

async function togglePromo(promo) {
  if (!confirm(`${promo.enabled ? "Disable" : "Enable"} ${promo.code}?`))
    return;

  try {
    await updateDoc(doc(db, "promos", promo.code), {
      enabled: !promo.enabled,
      updatedAt: serverTimestamp(),
    });
    showMessage("Promo status updated.");
  } catch (error) {
    console.error(error);
    showMessage("Unable to update promo: " + error.message);
  }
}

$("promoForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (saving) return;

  const code = $("promoCode").value.trim().toUpperCase();
  const type = $("discountType").value;
  const value = Number($("discountValue").value);
  const minimumOrder = Number($("minimumOrder").value);
  const maxInput = $("maximumDiscount").value.trim();
  const maximumDiscount = maxInput === "" ? null : Number(maxInput);
  const usageLimit = Number($("usageLimit").value);
  const startDate = new Date($("startDate").value);
  const endDate = new Date($("endDate").value);

  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
    $("promoFormMessage").textContent = "Use 3–24 letters, numbers, _ or -.";
    return;
  }

  if (
    !["percentage", "fixed"].includes(type) ||
    !Number.isFinite(value) ||
    value <= 0 ||
    (type === "percentage" && value > 100) ||
    !Number.isFinite(minimumOrder) ||
    minimumOrder < 0 ||
    !Number.isInteger(usageLimit) ||
    usageLimit < 1 ||
    (maximumDiscount !== null &&
      (!Number.isFinite(maximumDiscount) || maximumDiscount <= 0)) ||
    !Number.isFinite(startDate.getTime()) ||
    !Number.isFinite(endDate.getTime()) ||
    endDate <= startDate
  ) {
    $("promoFormMessage").textContent =
      "Please check discount, usage limit and dates.";
    return;
  }

  const payload = {
    code,
    type,
    value,
    minimumOrder,
    maximumDiscount,
    usageLimit,
    startAt: Timestamp.fromDate(startDate),
    endAt: Timestamp.fromDate(endDate),
    enabled: $("promoEnabled").checked,
    updatedAt: serverTimestamp(),
  };

  saving = true;
  $("savePromoBtn").disabled = true;

  try {
    const ref = doc(db, "promos", code);

    if (editingCode) {
      await updateDoc(ref, payload);
    } else {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);

        if (snapshot.exists()) {
          throw new Error("Promo code already exists.");
        }

        transaction.set(ref, {
          ...payload,
          usedCount: 0,
          createdAt: serverTimestamp(),
        });
      });
    }

    closePromo();
    showMessage("Promo saved successfully.");
  } catch (error) {
    console.error(error);
    $("promoFormMessage").textContent = error.message;
  } finally {
    saving = false;
    $("savePromoBtn").disabled = false;
  }
});

$("addPromoBtn").addEventListener("click", () => openPromo());

$("closePromoDialog").addEventListener("click", closePromo);
$("cancelPromo").addEventListener("click", closePromo);

$("promoSearch").addEventListener("input", renderPromos);
$("promoStatusFilter").addEventListener("change", renderPromos);

document.addEventListener("click", async (event) => {
  const logout = event.target.closest("[data-logout]");
  if (!logout) return;

  event.preventDefault();
  await signOut(auth);
  window.location.replace("/login");
});

onAuthStateChanged(auth, async (user) => {
  if (unsubscribe) unsubscribe();

  if (!user) {
    window.location.replace("/login");
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, "users", user.uid));

    if (
      !snapshot.exists() ||
      snapshot.data().role !== "admin" ||
      snapshot.data().status !== "active"
    ) {
      window.location.replace("/admin/index.html");
      return;
    }

    unsubscribe = onSnapshot(
      collection(db, "promos"),
      (snapshot) => {
        promos = snapshot.docs.map((d) => ({
          ...d.data(),
          code: d.id,
        }));

        renderPromos();
        updateStats();
        document.body.style.visibility = "visible";
      },
      (error) => {
        console.error(error);
        showMessage("Unable to load promos.");
        document.body.style.visibility = "visible";
      },
    );
  } catch (error) {
    console.error(error);
    window.location.replace("/login");
  }
});

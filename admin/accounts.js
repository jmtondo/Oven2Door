import { auth, db, secondaryDb } from "./firebase-config.js";
import { secondaryAuth } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signOut as signOutSecondary,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import { setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
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
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

let accounts = [];
let selectedId = null;
let unsubscribe = null;
let saving = false;

async function createAccountSecurely(account) {
  const validRoles = ["customer", "rider", "staff", "admin"];

  if (!validRoles.includes(account.role)) {
    throw new Error("Invalid account role.");
  }

  const credential = await createUserWithEmailAndPassword(
    secondaryAuth,
    account.email,
    account.password,
  );

  try {
    const uid = credential.user.uid;

    // Current Firestore rules only allow users to
    // create their own customer profile.
    await setDoc(doc(secondaryDb, "users", uid), {
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      role: "customer",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      uid,
      requestedRole: account.role,
    };
  } finally {
    await signOutSecondary(secondaryAuth);
  }
}

function message(text) {
  $("accountMessage").textContent = text;
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "—";

  return timestamp.toDate().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fullName(account) {
  return (
    [account.firstName, account.lastName].filter(Boolean).join(" ") ||
    account.fullName ||
    account.name ||
    account.displayName ||
    "Unnamed Account"
  );
}

function cell(text, className = "") {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function renderAccounts() {
  const search = $("accountSearch").value.toLowerCase().trim();
  const role = $("roleFilter").value;
  const status = $("statusFilter").value;

  const filtered = accounts.filter((account) => {
    const searchable =
      `${fullName(account)} ${account.email || ""}`.toLowerCase();

    return (
      searchable.includes(search) &&
      (role === "all" || account.role === role) &&
      (status === "all" || account.status === status)
    );
  });

  const tbody = $("accountsTableBody");
  tbody.replaceChildren();

  if (!filtered.length) {
    const row = document.createElement("tr");
    const td = cell("No accounts found.", "loading-cell");
    td.colSpan = 5;
    row.appendChild(td);
    tbody.appendChild(row);
    return;
  }

  filtered.forEach((account) => {
    const row = document.createElement("tr");

    const identity = document.createElement("td");
    const name = document.createElement("div");
    name.className = "account-name";
    name.textContent = fullName(account);

    const email = document.createElement("div");
    email.className = "account-email";
    email.textContent = account.email || "No email";

    identity.append(name, email);
    row.appendChild(identity);

    const roleCell = document.createElement("td");
    const roleBadge = document.createElement("span");
    roleBadge.className = "account-badge role";
    const roleLabels = {
      customer: "Customer",
      rider: "Rider",
      staff: "Staff",
      admin: "Administrator",
    };

    roleBadge.textContent = roleLabels[account.role] || "Unknown";
    roleCell.appendChild(roleBadge);
    row.appendChild(roleCell);

    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = `account-badge ${account.status === "active" ? "active" : "inactive"}`;
    statusBadge.textContent =
      account.status === "active" ? "Active" : "Inactive";
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);

    row.appendChild(cell(formatDate(account.createdAt)));

    const actions = document.createElement("td");
    const actionGroup = document.createElement("div");
    actionGroup.className = "account-actions";

    if (account.id !== auth.currentUser?.uid) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => openEdit(account.id));
      actionGroup.appendChild(edit);

      if (account.role !== "admin") {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "danger";

        toggle.textContent =
          account.status === "active" ? "Deactivate" : "Activate";

        toggle.addEventListener("click", () => {
          changeStatus(
            account.id,
            account.status === "active" ? "inactive" : "active",
          );
        });

        actionGroup.appendChild(toggle);
      }
    }

    actions.appendChild(actionGroup);
    row.appendChild(actions);
    tbody.appendChild(row);
  });
}

function updateStatistics() {
  const countRole = (role) =>
    accounts.filter((account) => account.role === role).length;

  $("totalAccounts").textContent = accounts.length;
  $("customerAccounts").textContent = countRole("customer");
  $("riderAccounts").textContent = countRole("rider");
  $("staffAccounts").textContent = countRole("staff");
  $("adminAccounts").textContent = countRole("admin");
}

function openEdit(id) {
  const account = accounts.find((a) => a.id === id);
  if (!account) return;

  if (id === auth.currentUser?.uid) return;

  selectedId = id;

  $("accountFirstName").value = account.firstName || "";
  $("accountLastName").value = account.lastName || "";
  $("accountEmail").value = account.email || "";
  $("accountRole").value = account.role;
  $("accountStatus").value = account.status || "inactive";

  $("accountRole").disabled = false;
  $("accountStatus").disabled = account.role === "admin";

  $("editAccountMessage").textContent = "";

  $("editAccountDialog").showModal();
}

function closeEdit() {
  $("editAccountDialog").close();
  selectedId = null;
}

async function verifyAdmin(user) {
  const snapshot = await getDoc(doc(db, "users", user.uid));

  if (
    !snapshot.exists() ||
    snapshot.data().role !== "admin" ||
    snapshot.data().status !== "active"
  ) {
    window.location.replace("/admin/index.html");
    return false;
  }

  return true;
}

async function updateAccount(id, updates) {
  if (saving) return;

  if (
    id === auth.currentUser?.uid &&
    ("role" in updates || "status" in updates)
  ) {
    alert("You cannot change your own role or status.");
    return;
  }

  saving = true;
  $("saveAccountBtn").disabled = true;

  try {
    const targetRef = doc(db, "users", id);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(targetRef);

      if (!snapshot.exists()) {
        throw new Error("Account no longer exists.");
      }

      const current = snapshot.data();

      if (!["customer", "rider", "staff", "admin"].includes(current.role)) {
        throw new Error("Unsupported account role.");
      }

      if (
        current.role === "admin" &&
        (("role" in updates && updates.role !== current.role) ||
          ("status" in updates && updates.status !== current.status))
      ) {
        throw new Error(
          "Administrator role and status changes are restricted.",
        );
      }

      if ("role" in updates) {
        const allowedRoles = ["customer", "rider", "staff", "admin"];

        if (!allowedRoles.includes(updates.role)) {
          throw new Error("Invalid account role.");
        }

        if (current.role === "admin") {
          throw new Error("Existing administrator roles cannot be changed.");
        }
      }

      transaction.update(targetRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    });

    closeEdit();
    message("Account updated successfully.");
  } catch (error) {
    console.error("Account update failed:", error);
    $("editAccountMessage").textContent = error.message;
    message("Could not update account. Check Firestore permissions.");
  } finally {
    saving = false;
    $("saveAccountBtn").disabled = false;
  }
}

async function changeStatus(id, nextStatus) {
  const account = accounts.find((a) => a.id === id);
  if (!account) return;

  if (id === auth.currentUser?.uid) {
    alert("You cannot change your own status.");
    return;
  }

  if (account.role === "admin") {
    alert("Administrator account deactivation is restricted.");
    return;
  }

  const action = nextStatus === "active" ? "Activate" : "Deactivate";

  if (!confirm(`${action} ${fullName(account)}?`)) {
    return;
  }

  await updateAccount(id, {
    status: nextStatus,
  });
}

$("editAccountForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedId) return;

  const account = accounts.find((a) => a.id === selectedId);
  if (!account) return;

  if (selectedId === auth.currentUser?.uid) {
    $("editAccountMessage").textContent =
      "You cannot edit your own account here.";
    return;
  }

  const firstName = $("accountFirstName").value.trim();
  const lastName = $("accountLastName").value.trim();

  if (!firstName || !lastName) {
    $("editAccountMessage").textContent =
      "First name and last name are required.";
    return;
  }

  const updates = {};

  // Update first name
  if (firstName !== (account.firstName || "")) {
    updates.firstName = firstName;
  }

  // Update last name
  if (lastName !== (account.lastName || "")) {
    updates.lastName = lastName;
  }

  // Update account role
  const selectedRole = $("accountRole").value;

  if (selectedRole !== account.role) {
    updates.role = selectedRole;
  }

  // Update account status
  if (account.role !== "admin" && $("accountStatus").value !== account.status) {
    updates.status = $("accountStatus").value;
  }

  // Check whether anything changed
  if (Object.keys(updates).length === 0) {
    $("editAccountMessage").textContent = "No changes were made.";
    return;
  }

  // Save changes to Firestore
  await updateAccount(selectedId, updates);
});

$("closeAccountDialog").addEventListener("click", closeEdit);
$("cancelAccountEdit").addEventListener("click", closeEdit);

$("accountSearch").addEventListener("input", renderAccounts);
$("roleFilter").addEventListener("change", renderAccounts);
$("statusFilter").addEventListener("change", renderAccounts);

$("addAccountBtn").addEventListener("click", () => {
  $("addAccountForm").reset();
  $("addAccountMessage").textContent = "";
  $("addAccountDialog").showModal();
});

function closeAddAccount() {
  $("addAccountDialog").close();
}

$("closeAddAccount").addEventListener("click", closeAddAccount);

$("cancelAddAccount").addEventListener("click", closeAddAccount);

$("addAccountForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const account = {
    firstName: $("newFirstName").value.trim(),
    lastName: $("newLastName").value.trim(),
    email: $("newEmail").value.trim().toLowerCase(),
    password: $("newPassword").value,
    role: $("newRole").value,
  };

  const button = $("createAccountBtn");
  button.disabled = true;

  try {
    const result = await createAccountSecurely(account);

    closeAddAccount();
    message("Account created successfully.");

    if (result.requestedRole !== "customer") {
      alert(
        "Account created as Customer.\n\n" +
          "To assign the requested role, open:\n" +
          "Firebase Console → Firestore Database → users → " +
          result.uid +
          "\n\nChange the role field to: " +
          result.requestedRole,
      );
    }
  } catch (error) {
    $("addAccountMessage").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.addEventListener("click", async (event) => {
  const logout = event.target.closest("[data-logout]");
  if (!logout) return;

  event.preventDefault();
  await signOut(auth);
  window.location.replace("/login");
});

onAuthStateChanged(auth, async (user) => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  if (!user) {
    window.location.replace("/login");
    return;
  }

  try {
    if (!(await verifyAdmin(user))) return;

    unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        accounts = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        updateStatistics();
        renderAccounts();
        message("");

        document.querySelector(".main-content").style.visibility = "visible";
        document.body.style.visibility = "visible";
      },
      (error) => {
        console.error("Failed to load accounts:", error);
        document.body.style.visibility = "visible";
        document.querySelector(".main-content").style.visibility = "visible";
        message("Unable to load accounts. Verify Firestore security rules.");
      },
    );
  } catch (error) {
    console.error("Authorization failed:", error);
    window.location.replace("/login");
  }
});

import { auth, db } from './firebase-config.js';

import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

import {
  doc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ADMIN_ROLES = ['admin', 'staff'];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace('/login');
    return;
  }

  try {
    const userSnapshot = await getDoc(doc(db, 'users', user.uid));

    const role = userSnapshot.exists()
      ? userSnapshot.data().role
      : null;

    if (!ADMIN_ROLES.includes(role)) {
      window.location.replace('/home');
      return;
    }

    // Show the authenticated user's role.
    document.querySelectorAll('.user-role').forEach((element) => {
      element.textContent = role === 'admin'
        ? 'Administrator'
        : 'Staff Member';
    });

    // Hide admin-only navigation from staff.
    if (role === 'staff') {
      document.querySelectorAll('[data-admin-only]').forEach((element) => {
        element.remove();
      });

      const adminOnlyPages = [
        'product.html',
        'customers.html',
        'sales.html'
      ];

      const currentPage = window.location.pathname
        .split('/')
        .pop();

      if (adminOnlyPages.includes(currentPage)) {
        window.location.replace('/admin/index.html');
      }
    }

    document.body.style.visibility = 'visible';

  } catch (error) {
    console.error('Admin authorization failed:', error);
    window.location.replace('/login');
  }
});

document.addEventListener('click', async (event) => {
  const logoutLink = event.target.closest('[data-logout]');

  if (!logoutLink) {
    return;
  }

  event.preventDefault();

  await signOut(auth);
  window.location.replace('/login');
});
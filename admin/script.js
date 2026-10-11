// Tab Navigation Switcher
const navItems = document.querySelectorAll('.nav-item[data-target]');
const sections = document.querySelectorAll('.section-content');
const pageTitle = document.getElementById('page-title');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const targetSection = item.getAttribute('data-target');

    // Update Active Nav Class
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');

    // Display Active Section
    sections.forEach(section => {
      if (section.id === targetSection) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    // Update Page Title
    pageTitle.innerText = item.textContent.trim();
  });
});

// Login Modal Handlers
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');

function openLogin() {
  loginModal.classList.add('active');
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Logged in successfully!');
  loginModal.classList.remove('active');
});

// Close modal when clicking outside box
loginModal.addEventListener('click', (e) => {
  if (e.target === loginModal) {
    loginModal.classList.remove('active');
  }
});
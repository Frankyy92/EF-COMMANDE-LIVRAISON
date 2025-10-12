/*
 * Common utilities for the bakery frontend. Handles API calls with the
 * current user ID, session management (localStorage), and responsive
 * navigation.
 */

// Retrieve the current user from localStorage
function getUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user;
  } catch (e) {
    return null;
  }
}

// Perform an API request with the appropriate headers
async function apiRequest(path, method = 'GET', body = null) {
  const user = getUser();
  const headers = {
    'Content-Type': 'application/json'
  };
  if (user && user.id) {
    headers['X-User-Id'] = user.id;
  }
  const options = {
    method,
    headers
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(path, options);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Erreur serveur');
    }
    // If response is JSON
    const contentType = res.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return await res.text();
  } catch (err) {
    throw err;
  }
}

// Logout and redirect to login page
function logout() {
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Toggle the side navigation on small screens
function toggleNav() {
  const nav = document.querySelector('.nav');
  if (nav) {
    nav.classList.toggle('open');
  }
}

// Format date to YYYY-MM-DD for input[type=date]
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get tomorrow's date in YYYY-MM-DD
function getTomorrow() {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return formatDate(t);
}
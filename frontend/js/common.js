/* ============================================================
 * Common utilities for the bakery frontend.
 * - Centralise l'URL de l'API (API_BASE)
 * - Appels fetch avec l'ID utilisateur si présent
 * - Gestion session & helpers UI
 * ============================================================ */

const API_BASE = 'https://orderflow-pro-f7lb.onrender.com'; // <= TON backend Render

// Compose une URL absolue vers l'API
function apiUrl(path) {
  if (!path) return API_BASE;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

// Récupère l'utilisateur courant depuis le localStorage
function getUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user || null;
  } catch (e) {
    return null;
  }
}

// Appel générique à l'API (JSON par défaut)
async function apiRequest(path, method = 'GET', body = null) {
  const user = getUser();

  const headers = {
    'Content-Type': 'application/json'
  };
  // Le backend lise X-User-Id pour savoir "qui" agit (pas de mot de passe)
  if (user && user.id) {
    headers['X-User-Id'] = user.id;
  }

  const options = { method, headers };
  if (body !== null && body !== undefined) {
    options.body = JSON.stringify(body);
  }

  // IMPORTANT : on appelle TOUJOURS l'URL absolue de l'API
  const url = apiUrl(path);

  try {
    const res = await fetch(url, options);

    // CORS / preflight
    if (res.status === 204) return null;

    if (!res.ok) {
      // Essaie de lire l'erreur JSON renvoyée par l'API
      let errMsg = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        errMsg = data.error || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return await res.text();
  } catch (err) {
    // Remonte une erreur lisible dans l'UI
    throw new Error(err.message || 'Erreur réseau');
  }
}

// Déconnexion
function logout() {
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Menu latéral (mobile)
function toggleNav() {
  const nav = document.querySelector('.nav');
  if (nav) nav.classList.toggle('open');
}

// Format YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Demain en YYYY-MM-DD
function getTomorrow() {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return formatDate(t);
}

// Petit “health check” pour diagnostiquer vite si le front joint le back
async function pingBackend() {
  try {
    const txt = await apiRequest('/api/health'); // si non présent, ignore simplement
    return txt;
  } catch (_) {
    return null;
  }
}

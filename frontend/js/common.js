/* ============================================================
 * Common utilities for the bakery frontend.
 * - Centralise l'URL de l'API (API_BASE)
 * - Appels fetch robustes (JSON optionnel, corps vide OK)
 * - Gestion session & helpers UI
 * ============================================================ */

const API_BASE = 'https://orderflow-pro-f7lb.onrender.com'; // <= TON backend Render

// Compose l'URL absolue de l'API
function apiUrl(path) {
  if (!path) return API_BASE;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

// Utilisateur courant
function getUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user || null;
  } catch {
    return null;
  }
}

// Lit la réponse en JSON SANS planter si vide / non-JSON
async function safeParse(res) {
  // Réponse sans corps ?
  const len = res.headers.get('Content-Length');
  if (res.status === 204 || len === '0') return null;

  const ct = (res.headers.get('Content-Type') || '').toLowerCase();
  const txt = await res.text(); // lis le flux une seule fois
  if (!txt) return null;        // corps vide → null

  if (ct.includes('application/json')) {
    try { return JSON.parse(txt); } catch { return null; }
  }
  // Pas du JSON → retourne le texte brut
  return txt;
}

// Appel générique (gère erreurs et JSON optionnel)
async function apiRequest(path, method = 'GET', body = null) {
  const user = getUser();
  const headers = { 'Content-Type': 'application/json' };
  if (user && user.id) headers['X-User-Id'] = user.id;

  const options = { method, headers };
  if (body !== null && body !== undefined) options.body = JSON.stringify(body);

  const url = apiUrl(path);

  const res = await fetch(url, options);
  if (!res.ok) {
    // Essaye de lire une erreur JSON/texte sans planter si vide
    let detail = '';
    try {
      const parsed = await safeParse(res);
      detail = typeof parsed === 'string' ? parsed : (parsed && parsed.error) || '';
    } catch {}
    const msg = detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return await safeParse(res);
}

// Déconnexion
function logout() {
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Menu latéral (mobile)
function setNavState(open) {
  const nav = document.querySelector('.nav');
  const backdrop = document.querySelector('.nav-backdrop');
  if (!nav) return;
  const shouldOpen = Boolean(open);
  if (shouldOpen) {
    nav.classList.add('open');
  } else {
    nav.classList.remove('open');
  }
  if (backdrop) {
    backdrop.classList.toggle('visible', shouldOpen);
  }
  if (document.body) {
    document.body.classList.toggle('no-scroll', shouldOpen && window.innerWidth <= 768);
  }
}

function toggleNav(force) {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  if (typeof force === 'boolean') {
    setNavState(force);
    return;
  }
  setNavState(!nav.classList.contains('open'));
}

function closeNav() {
  setNavState(false);
}

function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const links = nav.querySelectorAll('a');
  links.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeNav();
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      closeNav();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      setNavState(false);
    }
  });
}

document.addEventListener('DOMContentLoaded', initNav);

// Format YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getToday() {
  return formatDate(new Date());
}

// Demain YYYY-MM-DD
function getTomorrow() {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return formatDate(t);
}

// Ping optionnel (debug)
async function pingBackend() {
  try { return await apiRequest('/api/health'); } catch { return null; }
}

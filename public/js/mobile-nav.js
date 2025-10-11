(function () {
  const btn = document.getElementById('burgerBtn');
  const nav = document.getElementById('sideNav');
  if (!btn || !nav) return;

  function toggle() {
    const open = nav.classList.toggle('sidebar--open');
    btn.setAttribute('aria-expanded', String(open));
    nav.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('no-scroll', open);
  }

  btn.addEventListener('click', toggle);

  // Fermer au clic en dehors
  document.addEventListener('click', (e) => {
    if (!nav.classList.contains('sidebar--open')) return;
    const inside = nav.contains(e.target) || btn.contains(e.target);
    if (!inside) toggle();
  });
})();

(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var btn = document.getElementById('burgerBtn');
    var side = document.getElementById('sideNav');
    if (!btn || !side) return;

    btn.addEventListener('click', function () {
      var open = side.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      // verrouille le scroll quand le menu est ouvert sur mobile
      document.body.classList.toggle('no-scroll', open);
    });
  });
})();

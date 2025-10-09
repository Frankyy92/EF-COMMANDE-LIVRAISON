// orderflow-pro — mobile/tablet nav toggle (safe, no deps)
document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('navToggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    document.body.classList.toggle('nav-open');
  });
});
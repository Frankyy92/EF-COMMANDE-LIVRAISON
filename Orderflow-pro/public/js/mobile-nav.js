(function(){
  const btn = document.querySelector('[data-burger]');
  if(!btn) return;
  btn.addEventListener('click', function(){
    document.body.classList.toggle('nav-open');
  });
})();

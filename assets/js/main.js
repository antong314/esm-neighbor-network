document.addEventListener('DOMContentLoaded',function(){
  var t=document.querySelector('.nav-toggle'),n=document.querySelector('nav.main');
  if(t&&n){t.addEventListener('click',function(){var o=n.classList.toggle('open');t.setAttribute('aria-expanded',o)});}
});

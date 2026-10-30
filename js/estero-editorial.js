const header = document.querySelector('.site-header');
function updateHeader() {
  header?.classList.toggle('is-scrolled', window.scrollY > 32);
}
window.addEventListener('scroll', updateHeader, { passive:true });
updateHeader();

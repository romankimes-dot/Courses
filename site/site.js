// Site de présentation : apparition au défilement, en-tête souligné, onglets de la page d'installation

const io = 'IntersectionObserver' in window && new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

const top_ = document.querySelector('.top');
addEventListener('scroll', () => top_.classList.toggle('scrolled', scrollY > 8), { passive: true });

// Installation : l'onglet du téléphone qui visite est ouvert d'office
const tabs = document.querySelectorAll('.tabs [role=tab]');
if (tabs.length) {
  const show = id => tabs.forEach(t => {
    const on = t.dataset.p === id;
    t.setAttribute('aria-selected', on);
    document.getElementById(t.dataset.p).classList.toggle('on', on);
  });
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.p)));
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  show(ios ? 'iphone' : /Android/.test(ua) ? 'android' : 'ordi');
}

// Page d'installation : l'onglet du téléphone qui visite est ouvert d'office
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

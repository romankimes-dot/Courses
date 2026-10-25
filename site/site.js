// Site de présentation : démo des deux téléphones, déroulé qui suit le défilement, état réseau de la grille, onglets de la page d'installation

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- Démo : la même liste sur deux téléphones ----------
const demo = document.getElementById('demo');
if (demo) {
  const AISLES = ['Fruits & légumes', 'Boulangerie', 'Crèmerie'];
  const start = () => [
    { id: 'tom', name: 'Tomates', note: '1 kg', aisle: 0, by: 'Hugo', img: 'tomato' },
    { id: 'ban', name: 'Bananes', aisle: 0, by: 'Léa', img: 'banana' },
    { id: 'pain', name: 'Baguette', aisle: 1, by: 'Léa', img: 'loaf-baguette' },
    { id: 'lait', name: 'Lait', note: '6', aisle: 2, by: 'Hugo', img: 'carton' },
    { id: 'yao', name: 'Fromage', aisle: 2, by: 'Léa', img: 'cheese' },
    { id: 'avo', name: 'Avocats', aisle: 0, by: 'Hugo', img: 'avocado' },
  ];
  let items = start(), flash = {};
  const screens = [...demo.querySelectorAll('.screen')];
  const check = '<svg viewBox="0 0 24 24" width="80%" height="80%" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  const row = (i, me) => `
    <div class="row${i.done ? ' done' : ''}${flash[me] === i.id ? ' flash' : ''}" data-id="${i.id}">
      <span class="box">${i.done ? check : ''}</span>
      <img class="th" src="img/p/${i.img}.png" alt="">
      <span class="nm">${esc(i.name)}${i.note ? ` <small>${esc(i.note)}</small>` : ''}
        ${i.done ? (i.doneBy !== me ? ` <small>· pris par ${i.doneBy}</small>` : '') : ` <small>· ${i.by}</small>`}
        ${i.isNew && i.by !== me && !i.done ? ' <small class="tag">nouveau</small>' : ''}</span>
    </div>`;

  const draw = (scr, busy) => {
    const me = scr.dataset.me, todo = items.filter(i => !i.done), cart = items.filter(i => i.done);
    scr.innerHTML = `
      <div class="bar"><b>Maison</b><span class="sync${busy ? ' busy' : ''}">${busy ? 'Envoi…' : 'À jour'}</span></div>
      <div class="add">Ajouter… (lait, œufs)<i>+</i></div>
      <div class="rows">
        ${AISLES.map((a, k) => {
          const its = todo.filter(i => i.aisle === k);
          return its.length ? `<h4>${a}</h4><div class="card">${its.map(i => row(i, me)).join('')}</div>` : '';
        }).join('')}
        ${cart.length ? `<h4>Dans le caddie · ${cart.length}</h4><div class="card">${cart.map(i => row(i, me)).join('')}</div>` : ''}
      </div>
      <div class="tabs-ui"><span>Liste</span><span>Repas</span><span>Dépenses</span></div>`;
  };
  const drawAll = () => screens.forEach(s => draw(s));

  // Un changement fait sur un téléphone : « Envoi… » chez lui, puis l'autre le reçoit
  function change(who, fn) {
    fn();
    const mine = screens.find(s => s.dataset.me === who), other = screens.find(s => s.dataset.me !== who);
    draw(mine, true);
    setTimeout(() => { draw(mine); flash[other.dataset.me] = null; draw(other); }, 500);
  }
  const toggle = (who, id) => change(who, () => {
    const i = items.find(x => x.id === id);
    Object.assign(i, i.done ? { done: false, doneBy: null } : { done: true, doneBy: who });
  });

  // Scénario joué tout seul tant qu'on ne touche à rien
  const script = [
    [1800, () => change('Hugo', () => items.push({ id: 'oeufs', name: 'Œufs', aisle: 2, by: 'Hugo', img: 'egg', isNew: true }))],
    [2600, () => toggle('Hugo', 'lait')],
    [2400, () => toggle('Léa', 'ban')],
    [2400, () => toggle('Hugo', 'pain')],
    [2400, () => toggle('Hugo', 'avo')],
    [2600, () => toggle('Léa', 'tom')],
    [4200, () => { items = start(); drawAll(); }],
  ];
  let step = 0, timer = null, idleUntil = 0;
  const next = () => {
    const [wait, fn] = script[step];
    timer = setTimeout(() => {
      if (Date.now() >= idleUntil) { fn(); step = (step + 1) % script.length; }
      next();
    }, wait);
  };

  demo.addEventListener('click', e => {
    const r = e.target.closest('.row');
    if (!r) return;
    idleUntil = Date.now() + 9000;
    toggle(r.closest('.screen').dataset.me, r.dataset.id);
  });
  drawAll();
  // La démo ne tourne que lorsqu'elle est visible
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !timer) next();
    if (!e.isIntersecting && timer) { clearTimeout(timer); timer = null; }
  }).observe(demo);
}

// ---------- Déroulé : l'écran du téléphone suit l'étape lue ----------
const steps = document.querySelectorAll('.flow .step');
if (steps.length) {
  const shots = document.querySelectorAll('.flow-phone img');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const k = [...steps].indexOf(e.target);
    steps.forEach((s, j) => s.classList.toggle('on', j === k));
    shots.forEach((s, j) => s.classList.toggle('on', j === k));
  }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
}

// ---------- Grille : « Hors ligne » puis « À jour » ----------
const net = document.getElementById('netStatus');
if (net) {
  let ok = false;
  setInterval(() => {
    ok = !ok;
    net.classList.toggle('ok', ok);
    net.lastElementChild.textContent = ok ? 'À jour' : 'Hors ligne · 3 en attente';
  }, 2600);
}

// ---------- Installation : l'onglet du téléphone qui visite est ouvert d'office ----------
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

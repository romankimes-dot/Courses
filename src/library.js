// Idées de recettes : une petite bibliothèque de recettes simples, fournie avec l'app (aucun serveur).
// On parcourt, on regarde les ingrédients (déjà dans mes articles ou nouveaux), on adopte : la recette est
// copiée dans Mes recettes et devient la sienne. Les ingrédients sont reconnus par findItem (accents,
// majuscules et pluriels ignorés) ; les nouveaux sont créés hors liste, rayon deviné.

const LIBRARY = [
  ['Pâtes carbonara', 'Plats', 'Pâtes:500 g, Lardons:200 g, Œufs:4, Parmesan:50 g, Crème fraîche:20 cl'],
  ['Pâtes bolognaise', 'Plats', 'Pâtes:500 g, Viande hachée:400 g, Coulis de tomate:1 bocal, Oignons:1, Parmesan'],
  ['Chili con carne', 'Plats', 'Viande hachée:500 g, Haricots rouges:1 boîte, Tomates concassées:1 boîte, Oignons:2, Riz:300 g'],
  ['Poulet curry coco', 'Plats', 'Poulet:600 g, Lait de coco:40 cl, Curry, Oignons:1, Riz:300 g'],
  ['Hachis parmentier', 'Plats', 'Viande hachée:500 g, Pommes de terre:1 kg, Lait:20 cl, Beurre, Gruyère râpé'],
  ['Gratin dauphinois', 'Plats', 'Pommes de terre:1 kg, Crème fraîche:40 cl, Lait:20 cl, Ail'],
  ['Quiche lorraine', 'Plats', 'Pâte brisée:1, Lardons:200 g, Œufs:3, Crème fraîche:20 cl, Gruyère râpé'],
  ['Saumon riz brocolis', 'Plats', 'Saumon:2 pavés, Riz:300 g, Brocolis:1, Citrons:1'],
  ['Tartiflette', 'Plats', 'Pommes de terre:1 kg, Reblochon:1, Lardons:200 g, Oignons:1, Crème fraîche:20 cl'],
  ['Poulet rôti pommes de terre', 'Plats', 'Poulet:1, Pommes de terre:1 kg, Ail, Thym'],
  ['Risotto aux champignons', 'Plats', 'Riz arborio:300 g, Champignons:250 g, Oignons:1, Bouillon:1 l, Parmesan:50 g'],
  ['Omelette', 'Rapide', 'Œufs:6, Gruyère râpé, Ciboulette'],
  ['Croque-monsieur', 'Rapide', 'Pain de mie:1 paquet, Jambon:4 tranches, Gruyère râpé, Beurre'],
  ['Pâtes au pesto', 'Rapide', 'Pâtes:500 g, Pesto:1 pot, Parmesan, Tomates cerises'],
  ['Wraps poulet crudités', 'Rapide', 'Tortillas:1 paquet, Poulet:300 g, Salade:1, Tomates:2, Fromage blanc'],
  ['Salade niçoise', 'Rapide', 'Salade:1, Thon:1 boîte, Œufs:3, Tomates:3, Olives, Haricots verts'],
  ['Pizza maison', 'Rapide', 'Pâte à pizza:1, Coulis de tomate:1 bocal, Mozzarella:1, Jambon:4 tranches, Champignons'],
  ['Burgers maison', 'Rapide', 'Pains burger:4, Steaks hachés:4, Cheddar:4 tranches, Salade:1, Tomates:2, Oignons:1'],
  ['Gnocchis tomate mozzarella', 'Rapide', 'Gnocchis:500 g, Coulis de tomate:1 bocal, Mozzarella:1, Basilic'],
  ['Purée jambon', 'Enfants', 'Pommes de terre:1 kg, Lait:20 cl, Beurre, Jambon:4 tranches'],
  ['Coquillettes jambon fromage', 'Enfants', 'Coquillettes:500 g, Jambon:4 tranches, Gruyère râpé, Beurre'],
  ['Nuggets frites', 'Enfants', 'Nuggets:1 boîte, Frites surgelées:1 sachet, Ketchup'],
  ['Poisson pané haricots verts', 'Enfants', 'Poisson pané:1 boîte, Haricots verts:500 g, Beurre'],
  ['Soupe de légumes', 'Soupes', 'Poireaux:2, Carottes:3, Pommes de terre:3, Oignons:1, Bouillon:1 l'],
  ['Velouté de potiron', 'Soupes', 'Potiron:1 kg, Pommes de terre:2, Oignons:1, Crème fraîche:20 cl, Bouillon:1 l'],
  ['Soupe à l\'oignon', 'Soupes', 'Oignons:6, Beurre, Bouillon:1 l, Pain:1, Gruyère râpé'],
  ['Gaspacho', 'Soupes', 'Tomates:1 kg, Concombre:1, Poivrons:1, Ail, Huile d\'olive'],
  ['Crêpes', 'Desserts', 'Farine:250 g, Œufs:4, Lait:50 cl, Beurre, Sucre'],
  ['Gâteau au yaourt', 'Desserts', 'Yaourt nature:1, Farine:3 pots, Sucre:2 pots, Œufs:3, Huile:1 pot, Levure chimique:1 sachet'],
  ['Mousse au chocolat', 'Desserts', 'Chocolat noir:200 g, Œufs:6, Sucre'],
  ['Tarte aux pommes', 'Desserts', 'Pâte brisée:1, Pommes:5, Sucre, Beurre'],
  ['Salade de fruits', 'Desserts', 'Pommes:2, Bananes:2, Oranges:2, Kiwis:2, Sucre'],
  ['Pancakes', 'Petit-déjeuner', 'Farine:250 g, Lait:30 cl, Œufs:2, Levure chimique:1 sachet, Sucre, Sirop d\'érable'],
  ['Porridge', 'Petit-déjeuner', 'Flocons d\'avoine:500 g, Lait:50 cl, Bananes:2, Miel'],
  ['Pain perdu', 'Petit-déjeuner', 'Pain:1, Œufs:3, Lait:25 cl, Sucre, Beurre'],
].map(([name, cat, list]) => ({
  name, cat,
  items: list.split(', ').map(x => { const [n, qty] = x.split(':'); return { name: n, qty: qty || '' }; }),
}));

let libDraft = '', libOpen = null;
const adopted = l => cookbook().some(r => sameKey(r.name) === sameKey(l.name));

function libItems() {
  const k = sameKey(libDraft);
  const shown = LIBRARY.filter(l => !k || [l.name, l.cat, ...l.items.map(x => x.name)].some(t => sameKey(t).includes(k)));
  if (!shown.length) return `<p class="hint center">Aucune idée pour « ${esc(libDraft)} ».</p>`;
  const cats = [...new Set(shown.map(l => l.cat))];
  return cats.map(cat => `
    <section><h3>${esc(cat)} <small>${shown.filter(l => l.cat === cat).length}</small></h3>
      ${shown.filter(l => l.cat === cat).map(libCard).join('')}
    </section>`).join('');
}

function libCard(l) {
  const id = LIBRARY.indexOf(l), done = adopted(l);
  if (libOpen !== id) return `
    <div class="row" data-a="libOpen" data-id="${id}">
      <span class="name">${esc(l.name)}${done ? ` <small class="tag">${icon.check} dans mes recettes</small>` : ''}<br><small>${l.items.map(x => esc(x.name)).join(' · ')}</small></span>${icon.right}
    </div>`;
  const known = l.items.filter(x => findItem(x.name)), fresh = l.items.filter(x => !findItem(x.name));
  const aisle = n => S.aisles.find(a => a.id === guessAisle(n))?.name || '';
  return `
    <section class="card">
      <div class="bar"><strong class="grow">${esc(l.name)}</strong><button class="ghost" data-a="libOpen" data-id="${id}" title="Fermer">${icon.x}</button></div>
      ${known.length ? `<p class="small">Déjà dans vos articles : ${known.map(x => `${esc(findItem(x.name).name)}${x.qty ? ` <small>${esc(x.qty)}</small>` : ''}`).join(', ')}</p>` : ''}
      ${fresh.length ? `<p class="small">Nouveaux : ${fresh.map(x => `${esc(x.name)} <small>(${esc(aisle(x.name))})</small>`).join(', ')}</p>` : ''}
      ${done ? `<p class="hint">${icon.check} Déjà dans Mes recettes.</p>` : `<button class="accent wide" data-a="libAdopt" data-id="${id}">${icon.plus} Ajouter à mes recettes</button>`}
    </section>`;
}

views.library = () => `
  <button class="ghost back" data-a="go" data-v="recipes">${icon.back} Mes recettes</button>
  <h2>Idées de recettes</h2>
  <p class="hint">Des recettes simples à adopter : elles rejoignent Mes recettes, où vous pouvez tout modifier.</p>
  <form id="libSearch" class="addtop">
    <input name="name" value="${esc(libDraft)}" placeholder="Chercher (nom, ingrédient)…" autocomplete="off">
  </form>
  <div id="libItems">${libItems()}</div>`;

Object.assign(actions, {
  libOpen: ({ id }) => { libOpen = libOpen === +id ? null : +id; },
  libAdopt: ({ id }) => {
    const l = LIBRARY[+id];
    if (adopted(l)) return;
    const r = { id: uid(), name: l.name, cat: l.cat, items: [], qty: {} };
    for (const x of l.items) {
      let i = findItem(x.name);
      if (!i) S.items.push(i = { id: uid(), name: x.name, aisle: guessAisle(x.name), freq: false, need: false, done: false });
      if (!r.items.includes(i.id)) r.items.push(i.id);
      if (x.qty) r.qty[i.id] = x.qty;
    }
    S.recipes.push(r);
    toast(`${l.name} ajoutée à Mes recettes`, false);
  },
});

document.addEventListener('input', e => {
  if (!e.target.closest('#libSearch')) return;
  libDraft = e.target.value;
  const box = document.getElementById('libItems');
  if (box) box.innerHTML = libItems();
});

// Idées de recettes : une bibliothèque de recettes simples (une centaine, rangées par type), fournie avec l'app (aucun serveur).
// On parcourt, on regarde les ingrédients (déjà dans mes articles ou nouveaux), on adopte : la recette est
// copiée dans Mes recettes et devient la sienne. Les ingrédients sont reconnus par findItem (accents,
// majuscules et pluriels ignorés) ; les nouveaux sont créés hors liste, rayon deviné.

const LIBRARY = [
  ["Pâtes carbonara", "Plats", "Pâtes:500 g, Lardons:200 g, Œufs:4, Parmesan:50 g, Crème fraîche:20 cl"],
  ["Pâtes bolognaise", "Plats", "Pâtes:500 g, Viande hachée:400 g, Coulis de tomate:1 bocal, Oignons:1, Parmesan"],
  ["Chili con carne", "Plats", "Viande hachée:500 g, Haricots rouges:1 boîte, Tomates concassées:1 boîte, Oignons:2, Riz:300 g"],
  ["Poulet curry coco", "Plats", "Poulet:600 g, Lait de coco:40 cl, Curry, Oignons:1, Riz:300 g"],
  ["Hachis parmentier", "Plats", "Viande hachée:500 g, Pommes de terre:1 kg, Lait:20 cl, Beurre, Gruyère râpé"],
  ["Gratin dauphinois", "Plats", "Pommes de terre:1 kg, Crème fraîche:40 cl, Lait:20 cl, Ail"],
  ["Quiche lorraine", "Plats", "Pâte brisée:1, Lardons:200 g, Œufs:3, Crème fraîche:20 cl, Gruyère râpé"],
  ["Tartiflette", "Plats", "Pommes de terre:1 kg, Reblochon:1, Lardons:200 g, Oignons:1, Crème fraîche:20 cl"],
  ["Poulet rôti pommes de terre", "Plats", "Poulet:1, Pommes de terre:1 kg, Ail, Thym"],
  ["Risotto aux champignons", "Plats", "Riz arborio:300 g, Champignons:250 g, Oignons:1, Bouillon:1 l, Parmesan:50 g"],
  ["Blanquette de veau", "Plats", "Veau:800 g, Carottes:3, Champignons:250 g, Crème fraîche:20 cl, Riz:300 g, Oignons:1"],
  ["Bœuf bourguignon", "Plats", "Bœuf à braiser:800 g, Carottes:3, Oignons:2, Vin rouge:75 cl, Lardons:150 g, Pommes de terre:1 kg"],
  ["Pot-au-feu", "Plats", "Bœuf à pot-au-feu:1 kg, Carottes:4, Poireaux:3, Navets:3, Pommes de terre:1 kg"],
  ["Lasagnes bolognaise", "Plats", "Lasagnes:1 boîte, Viande hachée:500 g, Coulis de tomate:1 bocal, Béchamel:1 brique, Gruyère râpé, Oignons:1"],
  ["Gratin de coquillettes au jambon", "Plats", "Coquillettes:400 g, Jambon:4 tranches, Béchamel:1 brique, Gruyère râpé"],
  ["Cassoulet", "Plats", "Haricots blancs:2 boîtes, Saucisses de Toulouse:4, Confit de canard:2, Oignons:1, Coulis de tomate:1 bocal"],
  ["Couscous", "Plats", "Semoule:400 g, Merguez:6, Poulet:4 cuisses, Carottes:3, Courgettes:2, Pois chiches:1 boîte"],
  ["Paëlla", "Plats", "Riz rond:400 g, Poulet:400 g, Chorizo:150 g, Crevettes:300 g, Poivrons:2, Petits pois:200 g"],
  ["Endives au jambon", "Plats", "Endives:6, Jambon:6 tranches, Béchamel:1 brique, Gruyère râpé"],
  ["Porc au caramel", "Plats", "Porc:600 g, Oignons:1, Sauce soja, Miel, Riz:300 g"],
  ["Poulet basquaise", "Plats", "Poulet:4 cuisses, Poivrons:3, Tomates concassées:1 boîte, Oignons:2, Riz:300 g"],
  ["Rôti de porc haricots verts", "Plats", "Rôti de porc:1, Haricots verts:500 g, Moutarde, Ail"],
  ["Tajine de poulet", "Plats", "Poulet:4 cuisses, Carottes:3, Olives, Citrons:1, Semoule:300 g, Oignons:2"],
  ["Moussaka", "Plats", "Aubergines:3, Viande hachée:500 g, Coulis de tomate:1 bocal, Béchamel:1 brique, Gruyère râpé"],
  ["Parmentier de canard", "Plats", "Confit de canard:4, Pommes de terre:1 kg, Lait:20 cl, Beurre"],
  ["Saucisses aux lentilles", "Plats", "Saucisses de Toulouse:4, Lentilles:400 g, Carottes:2, Oignons:1"],
  ["Poulet au citron", "Plats", "Poulet:4 cuisses, Citrons:2, Ail, Thym, Pommes de terre:800 g"],
  ["Gratin de courgettes", "Plats", "Courgettes:4, Œufs:3, Crème fraîche:20 cl, Gruyère râpé"],
  ["Omelette", "Rapide", "Œufs:6, Gruyère râpé, Ciboulette"],
  ["Croque-monsieur", "Rapide", "Pain de mie:1 paquet, Jambon:4 tranches, Gruyère râpé, Beurre"],
  ["Pâtes au pesto", "Rapide", "Pâtes:500 g, Pesto:1 pot, Parmesan, Tomates cerises"],
  ["Wraps poulet crudités", "Rapide", "Tortillas:1 paquet, Poulet:300 g, Salade:1, Tomates:2, Fromage blanc"],
  ["Pizza maison", "Rapide", "Pâte à pizza:1, Coulis de tomate:1 bocal, Mozzarella:1, Jambon:4 tranches, Champignons"],
  ["Burgers maison", "Rapide", "Pains burger:4, Steaks hachés:4, Cheddar:4 tranches, Salade:1, Tomates:2, Oignons:1"],
  ["Gnocchis tomate mozzarella", "Rapide", "Gnocchis:500 g, Coulis de tomate:1 bocal, Mozzarella:1, Basilic"],
  ["Œufs cocotte", "Rapide", "Œufs:6, Crème fraîche:10 cl, Gruyère râpé"],
  ["Quesadillas", "Rapide", "Tortillas:1 paquet, Poulet:200 g, Gruyère râpé, Poivrons:1"],
  ["Tartines d'avocat", "Rapide", "Pain:1, Avocats:2, Citrons:1, Œufs:2"],
  ["Nouilles sautées", "Rapide", "Nouilles:300 g, Poulet:200 g, Carottes:2, Sauce soja, Oignons:1"],
  ["Pâtes au thon", "Rapide", "Pâtes:500 g, Thon:1 boîte, Coulis de tomate:1 bocal, Olives"],
  ["Croque-madame", "Rapide", "Pain de mie:1 paquet, Jambon:4 tranches, Gruyère râpé, Œufs:4, Beurre"],
  ["Saucisses purée", "Rapide", "Saucisses:6, Pommes de terre:1 kg, Lait:20 cl, Beurre"],
  ["Steak frites", "Rapide", "Steaks hachés:4, Frites surgelées:1 sachet, Salade:1"],
  ["Pitas poulet", "Rapide", "Pains pita:4, Poulet:300 g, Salade:1, Tomates:2, Yaourt nature:1"],
  ["Riz cantonais", "Rapide", "Riz:300 g, Jambon:4 tranches, Œufs:3, Petits pois:200 g, Sauce soja"],
  ["Curry de pois chiches", "Végétarien", "Pois chiches:2 boîtes, Lait de coco:40 cl, Oignons:1, Curry, Riz:300 g"],
  ["Lasagnes aux légumes", "Végétarien", "Lasagnes:1 boîte, Courgettes:2, Aubergines:1, Coulis de tomate:1 bocal, Mozzarella:1"],
  ["Ratatouille", "Végétarien", "Aubergines:2, Courgettes:2, Poivrons:2, Tomates:4, Oignons:1"],
  ["Gratin de chou-fleur", "Végétarien", "Chou-fleur:1, Béchamel:1 brique, Gruyère râpé"],
  ["Tarte aux légumes", "Végétarien", "Pâte brisée:1, Courgettes:2, Tomates:3, Moutarde, Œufs:2"],
  ["Dahl de lentilles corail", "Végétarien", "Lentilles corail:300 g, Lait de coco:40 cl, Oignons:1, Curry, Tomates concassées:1 boîte"],
  ["Chili sin carne", "Végétarien", "Haricots rouges:2 boîtes, Maïs:1 boîte, Poivrons:1, Tomates concassées:1 boîte, Riz:300 g"],
  ["Pâtes aux légumes grillés", "Végétarien", "Pâtes:500 g, Courgettes:2, Poivrons:2, Ail, Huile d'olive"],
  ["Falafels", "Végétarien", "Pois chiches:2 boîtes, Persil, Ail, Farine:3 c. à soupe, Cumin"],
  ["Shakshuka", "Végétarien", "Œufs:6, Tomates concassées:1 boîte, Poivrons:1, Oignons:1, Cumin"],
  ["Risotto aux courgettes", "Végétarien", "Riz arborio:300 g, Courgettes:3, Parmesan:50 g, Bouillon:1 l, Oignons:1"],
  ["Quiche aux poireaux", "Végétarien", "Pâte brisée:1, Poireaux:3, Œufs:3, Crème fraîche:20 cl, Gruyère râpé"],
  ["Gratin de pâtes aux épinards", "Végétarien", "Pâtes:400 g, Épinards:500 g, Crème fraîche:20 cl, Gruyère râpé"],
  ["Galettes de légumes", "Végétarien", "Courgettes:3, Carottes:2, Œufs:2, Farine:4 c. à soupe, Gruyère râpé"],
  ["Saumon riz brocolis", "Poisson", "Saumon:2 pavés, Riz:300 g, Brocolis:1, Citrons:1"],
  ["Cabillaud purée", "Poisson", "Cabillaud:4 filets, Pommes de terre:1 kg, Lait:20 cl, Beurre, Citrons:1"],
  ["Moules frites", "Poisson", "Moules:2 kg, Frites surgelées:1 sachet, Oignons:1, Vin blanc:25 cl, Crème fraîche:10 cl"],
  ["Papillotes de saumon", "Poisson", "Saumon:4 pavés, Courgettes:2, Citrons:1, Aneth"],
  ["Gratin de poisson", "Poisson", "Colin:600 g, Pommes de terre:800 g, Crème fraîche:20 cl, Gruyère râpé"],
  ["Crevettes à l'ail", "Poisson", "Crevettes:500 g, Ail, Persil, Riz:300 g"],
  ["Pâtes au saumon fumé", "Poisson", "Pâtes:500 g, Saumon fumé:200 g, Crème fraîche:20 cl, Aneth"],
  ["Dorade au four", "Poisson", "Dorade:2, Pommes de terre:800 g, Citrons:1, Thym"],
  ["Salade niçoise", "Salades", "Salade:1, Thon:1 boîte, Œufs:3, Tomates:3, Olives, Haricots verts"],
  ["Taboulé", "Salades", "Semoule:300 g, Tomates:3, Concombre:1, Menthe, Citrons:1, Huile d'olive"],
  ["Salade de pâtes", "Salades", "Pâtes:300 g, Tomates cerises, Mozzarella:1, Thon:1 boîte, Olives, Maïs:1 boîte"],
  ["Salade César", "Salades", "Salade:1, Poulet:300 g, Parmesan:50 g, Pain:1, Sauce césar"],
  ["Salade de chèvre chaud", "Salades", "Salade:1, Fromage de chèvre:1 bûche, Pain:1, Miel, Noix"],
  ["Salade de lentilles", "Salades", "Lentilles:300 g, Carottes:2, Oignons:1, Vinaigre, Persil"],
  ["Salade grecque", "Salades", "Tomates:4, Concombre:1, Feta:200 g, Olives, Oignons:1"],
  ["Salade de riz", "Salades", "Riz:300 g, Maïs:1 boîte, Thon:1 boîte, Tomates:2, Œufs:3"],
  ["Carottes râpées", "Salades", "Carottes:6, Citrons:1, Huile d'olive"],
  ["Salade de quinoa", "Salades", "Quinoa:300 g, Avocats:2, Tomates:2, Concombre:1, Citrons:1"],
  ["Soupe de légumes", "Soupes", "Poireaux:2, Carottes:3, Pommes de terre:3, Oignons:1, Bouillon:1 l"],
  ["Velouté de potiron", "Soupes", "Potiron:1 kg, Pommes de terre:2, Oignons:1, Crème fraîche:20 cl, Bouillon:1 l"],
  ["Soupe à l'oignon", "Soupes", "Oignons:6, Beurre, Bouillon:1 l, Pain:1, Gruyère râpé"],
  ["Gaspacho", "Soupes", "Tomates:1 kg, Concombre:1, Poivrons:1, Ail, Huile d'olive"],
  ["Soupe de tomates", "Soupes", "Tomates:1 kg, Oignons:1, Basilic, Bouillon:50 cl, Crème fraîche:10 cl"],
  ["Soupe de courgettes", "Soupes", "Courgettes:4, Pommes de terre:1, Oignons:1, Bouillon:1 l, Fromage frais:1"],
  ["Soupe de carottes", "Soupes", "Carottes:1 kg, Oignons:1, Crème fraîche:10 cl, Cumin, Bouillon:1 l"],
  ["Soupe au pistou", "Soupes", "Haricots verts:200 g, Courgettes:2, Pommes de terre:2, Pesto:1 pot, Coquillettes:100 g"],
  ["Purée jambon", "Enfants", "Pommes de terre:1 kg, Lait:20 cl, Beurre, Jambon:4 tranches"],
  ["Coquillettes jambon fromage", "Enfants", "Coquillettes:500 g, Jambon:4 tranches, Gruyère râpé, Beurre"],
  ["Nuggets frites", "Enfants", "Nuggets:1 boîte, Frites surgelées:1 sachet, Ketchup"],
  ["Poisson pané haricots verts", "Enfants", "Poisson pané:1 boîte, Haricots verts:500 g, Beurre"],
  ["Mini pizzas", "Enfants", "Pâte à pizza:1, Coulis de tomate:1 bocal, Gruyère râpé, Jambon:4 tranches"],
  ["Boulettes de viande", "Enfants", "Viande hachée:500 g, Œufs:1, Chapelure, Coulis de tomate:1 bocal, Pâtes:400 g"],
  ["Purée de carottes", "Enfants", "Carottes:1 kg, Pommes de terre:2, Lait:20 cl, Beurre"],
  ["Poulet pané", "Enfants", "Poulet:400 g, Chapelure, Œufs:2, Haricots verts:500 g"],
  ["Crêpes", "Desserts", "Farine:250 g, Œufs:4, Lait:50 cl, Beurre, Sucre"],
  ["Gâteau au yaourt", "Desserts", "Yaourt nature:1, Farine:3 pots, Sucre:2 pots, Œufs:3, Huile:1 pot, Levure chimique:1 sachet"],
  ["Mousse au chocolat", "Desserts", "Chocolat noir:200 g, Œufs:6, Sucre"],
  ["Tarte aux pommes", "Desserts", "Pâte brisée:1, Pommes:5, Sucre, Beurre"],
  ["Salade de fruits", "Desserts", "Pommes:2, Bananes:2, Oranges:2, Kiwis:2, Sucre"],
  ["Riz au lait", "Desserts", "Riz rond:200 g, Lait:1 l, Sucre, Vanille"],
  ["Clafoutis aux cerises", "Desserts", "Cerises:500 g, Œufs:3, Farine:100 g, Lait:25 cl, Sucre"],
  ["Tarte au citron", "Desserts", "Pâte sablée:1, Citrons:4, Œufs:3, Sucre, Beurre"],
  ["Compote de pommes", "Desserts", "Pommes:1 kg, Sucre, Cannelle"],
  ["Brownie", "Desserts", "Chocolat noir:200 g, Beurre:150 g, Sucre, Œufs:3, Farine:80 g"],
  ["Fondant au chocolat", "Desserts", "Chocolat noir:200 g, Beurre:100 g, Sucre, Œufs:4, Farine"],
  ["Panna cotta", "Desserts", "Crème liquide:50 cl, Sucre, Gélatine, Fruits rouges:250 g"],
  ["Crumble aux pommes", "Desserts", "Pommes:6, Farine:150 g, Beurre:100 g, Sucre"],
  ["Crème brûlée", "Desserts", "Crème liquide:50 cl, Œufs:5, Sucre, Vanille"],
  ["Cookies", "Desserts", "Farine:250 g, Beurre:125 g, Sucre, Œufs:1, Pépites de chocolat:200 g"],
  ["Madeleines", "Desserts", "Œufs:3, Sucre, Farine, Beurre, Citrons:1"],
  ["Tiramisu", "Desserts", "Mascarpone:250 g, Œufs:3, Biscuits à la cuillère:1 paquet, Café, Cacao"],
  ["Tarte tatin", "Desserts", "Pommes:8, Pâte feuilletée:1, Sucre, Beurre"],
  ["Pancakes", "Petit-déjeuner", "Farine:250 g, Lait:30 cl, Œufs:2, Levure chimique:1 sachet, Sucre, Sirop d'érable"],
  ["Porridge", "Petit-déjeuner", "Flocons d'avoine:500 g, Lait:50 cl, Bananes:2, Miel"],
  ["Pain perdu", "Petit-déjeuner", "Pain:1, Œufs:3, Lait:25 cl, Sucre, Beurre"],
  ["Œufs brouillés", "Petit-déjeuner", "Œufs:6, Beurre, Pain:1"],
  ["Yaourt granola", "Petit-déjeuner", "Yaourt nature:4, Granola:1 paquet, Miel, Fruits rouges:250 g"],
  ["Smoothie banane fraise", "Petit-déjeuner", "Bananes:3, Lait:50 cl, Fraises:250 g, Miel"],
  ["Gaufres", "Petit-déjeuner", "Farine:250 g, Œufs:2, Lait:30 cl, Beurre, Sucre"],
  ["Tartines beurre confiture", "Petit-déjeuner", "Pain:1, Beurre, Confiture"],
  ["Planche de charcuterie", "Apéro", "Saucisson:1, Jambon cru:6 tranches, Comté:200 g, Cornichons, Pain:1"],
  ["Guacamole", "Apéro", "Avocats:3, Citrons:1, Tomates:1, Oignons:1, Chips"],
  ["Houmous", "Apéro", "Pois chiches:1 boîte, Citrons:1, Ail, Purée de sésame, Huile d'olive"],
  ["Tzatziki", "Apéro", "Yaourt grec:2, Concombre:1, Ail, Menthe"],
  ["Œufs mimosa", "Apéro", "Œufs:6, Mayonnaise, Ciboulette"],
  ["Cake salé", "Apéro", "Farine:250 g, Œufs:4, Lardons:150 g, Olives, Gruyère râpé, Levure chimique:1 sachet"],
  ["Feuilletés saucisse", "Apéro", "Pâte feuilletée:2, Saucisses:6, Moutarde"],
  ["Brochettes tomate mozzarella", "Apéro", "Tomates cerises, Mozzarella billes:2, Basilic"],
  ["Crudités et dips", "Apéro", "Carottes:4, Concombre:1, Radis:1 botte, Fromage blanc, Ciboulette"],
  ["Bruschetta", "Apéro", "Pain:1, Tomates:4, Ail, Basilic, Huile d'olive"],
  ["Toasts saumon fumé", "Apéro", "Pain de mie:1 paquet, Saumon fumé:4 tranches, Fromage frais:1, Aneth"],
].map(([name, cat, list]) => ({
  name, cat,
  items: list.split(', ').map(x => { const [n, qty] = x.split(':'); return { name: n, qty: qty || '' }; }),
}));

let libDraft = '', libOpen = null, libCat = ''; // recherche, recette ouverte, type choisi (vide = toutes)
const adopted = l => cookbook().some(r => sameKey(r.name) === sameKey(l.name));

const libMatches = () => {
  const k = sameKey(libDraft);
  return LIBRARY.filter(l => !k || [l.name, l.cat, ...l.items.map(x => x.name)].some(t => sameKey(t).includes(k)));
};
// Boutons de type (Toutes, Plats, Desserts…) avec le nombre de recettes ; ceux sans résultat pour la recherche disparaissent
function libFilters() {
  const found = libMatches(), cats = [...new Set(LIBRARY.map(l => l.cat))].filter(c => found.some(l => l.cat === c));
  if (libCat && !cats.includes(libCat)) libCat = '';
  return `<button class="chip ${libCat ? '' : 'on'}" data-a="libCat" data-v="">Toutes <small>${found.length}</small></button>`
    + cats.map(c => `<button class="chip ${libCat === c ? 'on' : ''}" data-a="libCat" data-v="${esc(c)}">${esc(c)} <small>${found.filter(l => l.cat === c).length}</small></button>`).join('');
}
function libItems() {
  const shown = libMatches().filter(l => !libCat || l.cat === libCat);
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
  <div id="libFilters" class="chips filters">${libFilters()}</div>
  <div id="libItems">${libItems()}</div>`;

Object.assign(actions, {
  libOpen: ({ id }) => { libOpen = libOpen === +id ? null : +id; },
  libCat: ({ v }) => { libCat = v; libOpen = null; },
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
  const box = document.getElementById('libItems'), fl = document.getElementById('libFilters');
  if (fl) fl.innerHTML = libFilters();
  if (box) box.innerHTML = libItems();
});

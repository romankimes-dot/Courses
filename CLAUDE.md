# Courses

Liste de courses partagée du foyer : PWA statique (HTML/CSS/JS, sans build), hors-ligne d'abord,
synchro Supabase, hébergée sur GitHub Pages (https://romankimes-dot.github.io/Courses/).

**Avant toute évolution, lire `docs/besoins.md`** (vision, demandes du propriétaire, décisions prises,
retours du panel de test et backlog) **puis `docs/analyse-v2.md`** (revue à six voix d'octobre 2026 : constats priorisés, décisions en attente).

## Le propriétaire
- Échanger en français, réponses courtes et directes.
- Il itère vite par idées successives ; construire, tester, puis montrer.
- Fusionner dans `main` seulement quand il le demande.

## Code
- `index.html` : coquille ; en-tête (sélecteur de listes, 🔔, ⚙️) ; onglets Liste / Repas / Dépenses.
- `src/lists.js` : plusieurs listes ; `K(nom)` donne la clé de stockage de la liste courante (à utiliser pour tout stockage propre à une liste).
- `src/app.js` : état `S`, vues (`views.*`), actions (`actions.*`, déclenchées par `data-a`), rendu `render()`. La liste unique : `views.list` (un seul geste, toucher = caddie) ; `views.catalog` = Mes articles (indispensables, paniers = recettes `kind: 'basket'`) ; `views.recipes` = Mes recettes.
- `src/feed.js` : activité 🔔 et notifications ; `src/meals.js` : repas de la semaine ; `src/money.js` : partage des dépenses (option de liste `S.settings.split`, désactivée = compte joint).
- `src/sync.js` : synchro par enregistrement (`records()` / `fromRecords()`), file d'attente, fusion des doublons.
- `src/sheet.js` : fiche produit ; `src/trip.js` : fiche ticket (montant, part perso, articles ajoutés après coup). (Scan de ticket mis de côté : retiré, voir `docs/besoins.md`.)
- `sw.js` : cache hors-ligne (incrémenter `CACHE` quand on ajoute un fichier).
- `supabase/schema.sql` : table `records` + fonctions `push` / `pull` (à exécuter dans le SQL Editor).
- Toute donnée venant de la synchro ou d'un import passe par `clean()` : garder ce filtre à jour si on ajoute des champs.
- Style : commentaires et textes en français ; même idiome que l'existant.

## Tester
`tests/README.md` : faux serveur de synchro local + scénarios Playwright (deux téléphones, hors-ligne, courses à deux…).

# Courses

Liste de courses partagée du foyer : PWA statique (HTML/CSS/JS, sans build), hors-ligne d'abord,
synchro Supabase, hébergée sur GitHub Pages (https://romankimes-dot.github.io/Courses/).

**Avant toute évolution, lire `docs/besoins.md`** : vision, demandes du propriétaire, décisions prises,
retours du panel de test et backlog à arbitrer.

## Le propriétaire
- Échanger en français, réponses courtes et directes.
- Il itère vite par idées successives ; construire, tester, puis montrer.
- Fusionner dans `main` seulement quand il le demande.

## Code
- `index.html` : coquille, barre d'onglets (Liste / Courses / Budget) et ⚙️.
- `src/app.js` : état `S`, vues (`views.*`), actions (`actions.*`, déclenchées par `data-a`), rendu `render()`.
- `src/sync.js` : synchro par enregistrement (`records()` / `fromRecords()`), file d'attente, fusion des doublons.
- `src/scan.js` : scan de ticket (Tesseract.js) et page de validation ; `src/sheet.js` : fiche produit.
- `sw.js` : cache hors-ligne (incrémenter `CACHE` quand on ajoute un fichier).
- `supabase/schema.sql` : table `records` + fonctions `push` / `pull` (à exécuter dans le SQL Editor).
- Toute donnée venant de la synchro ou d'un import passe par `clean()` : garder ce filtre à jour si on ajoute des champs.
- Style : commentaires et textes en français ; même idiome que l'existant.

## Tester
`tests/README.md` : faux serveur de synchro local + scénarios Playwright (deux téléphones, hors-ligne, courses à deux…).

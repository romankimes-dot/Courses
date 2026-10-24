# Tests

Scénarios de bout en bout dans Chromium (Playwright), contre un faux serveur de synchro local.

```sh
node tests/mock-server.js &          # sert l'app + push/pull sur http://localhost:8766
for t in tests/*.js; do [ "$t" = tests/mock-server.js ] || node "$t"; done
```

Chaque scénario affiche un résumé JSON ; `errs: []` = aucune erreur JavaScript dans la page.
Un dossier optionnel en argument reçoit les captures d'écran.

| Fichier | Vérifie |
|---|---|
| `parcours-a-deux.js` | accueil, rejoindre, ajout multiple, « J'y vais », « nouveau » pendant les courses, terminer, annuler, budget |
| `hors-ligne.js` | ajout et coche hors-ligne, rechargement sans réseau, fusion au retour du réseau |
| `fiabilite.js` | horloge décalée, doublons hors-ligne, « Annuler » ciblé, données malformées écartées |
| `rejoindre-et-pas-trouve.js` | prénom demandé, accents (cafe = Café), rayon deviné, ✓ dans le panier, « pas trouvé » |
| `courses-a-deux.js` | deux personnes en courses, chacune termine son panier, quantités, « déjà sur la liste » |
| `indispensables-et-panier.js` | ⭐ indispensables, panier en bas, ordre des rayons appris |

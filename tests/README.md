# Tests

Scénarios de bout en bout dans Chromium (Playwright), contre un faux serveur de synchro local.

```sh
node tests/mock-server.js &          # sert l'app + push/pull sur http://localhost:8766
for t in tests/[a-z]*.js; do [ "$t" = tests/mock-server.js ] || node "$t"; done
```

Chaque scénario affiche un résumé JSON ; `errs: []` = aucune erreur JavaScript dans la page.
Un dossier optionnel en argument reçoit les captures d'écran.

| Fichier | Vérifie |
|---|---|
| `propositions-et-vider.js` | propositions dès les premières lettres, quantité gardée, vider la liste + Annuler |
| `mes-articles.js` | tous les articles, recherche, ⭐ indispensable sans l'ajouter à la liste |
| `recettes-et-indispensables.js` | beaucoup de recettes (recherche, catégories, ingrédients piochés ou créés sur place) et d'indispensables (filtre par rayon, tout ajouter) |
| `icones-et-indispensable.js` | aucun emoji natif à l'écran ; fenêtre « Nouvel article » : sur la liste ou non, indispensable ou non, annuler |
| `liste-unique.js` | ajout multiple et quantités, glisser pour retirer + Annuler, J'y vais, caddie, terminer |
| `plusieurs-listes.js` | créer et changer de liste, rejoindre un lien sans écraser sa liste |
| `repas.js` | recette avec quantités, posée sur deux jours, ingrédients cumulés ajoutés |
| `tickets-et-suggestions.js` | ticket modifié (montant, parts hors partage attribuées à un membre, articles ajoutés après coup), pré-remplissage de la liste et refus |
| `idees-filtres.js` | 130 idées de recettes, boutons de type avec compteurs, combinés à la recherche |
| `idees-recettes.js` | bibliothèque : parcourir, chercher, aperçu des articles connus/nouveaux, adopter sans doublon |
| `paniers.js` | paniers créés dans Mes articles, ajoutés en décochant ou d'un toucher depuis la liste (Annuler) |
| `beaucoup-de-tickets.js` | 45 tickets : dépense à la main au-dessus, pagination par 20 |
| `budget-comparatif.js` | chiffres : ce mois, mois dernier, au même jour le mois dernier |
| `depenses.js` | compte joint par défaut, option partage : qui doit quoi, remboursement, dépense à la main |
| `activite.js` | fil d'activité : ajout d'un autre, départ en courses, article pris pour moi |
| `parcours-a-deux.js` | accueil, rejoindre, ajout multiple, « J'y vais », « nouveau » pendant les courses, terminer, annuler, budget |
| `hors-ligne.js` | ajout et coche hors-ligne, rechargement sans réseau, fusion au retour du réseau |
| `fiabilite.js` | horloge décalée, doublons hors-ligne, « Annuler » ciblé, données malformées écartées |
| `rejoindre-et-pas-trouve.js` | prénom demandé, accents (cafe = Café), rayon deviné, ✓ dans le panier, « pas trouvé » |
| `plan-editeur.js` | éditeur de plan : panneaux qui restent dépliés (taille, rayons), palette, peindre en glissant, entrée, gomme, aperçu |
| `moitie-ordre.js` | Début / Fin coupent la liste dans les trois cas : sans plan, plan en ordre des rayons, plan en circuit le plus court |
| `moitie-auto.js` | à deux : la 2e personne reçoit l'autre moitié du circuit, avertie si elle prend la même |
| `courses-a-deux.js` | deux personnes en courses, chacune termine son panier, quantités, « déjà sur la liste » |
| `installer.js` | installer sur l'écran d'accueil : guide iPhone (accueil, liste, Réglages), bouton natif Android, « Plus tard », lien `?installer`, rien une fois installée |
| `indispensables-et-panier.js` | ⭐ indispensables, panier en bas, ordre des rayons appris |

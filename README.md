# Courses

Liste de courses partagée, pensée pour un supermarché sans réseau : tout fonctionne hors-ligne,
les modifications se synchronisent dès que le réseau revient.

Trois onglets :

- **Liste** : une seule liste, avant et pendant les courses, remplie à plusieurs (« ajouté par »). Ajout de plusieurs
  articles d'un coup (« lait, œufs, 2 kg tomates »), propositions dès les premières lettres, indispensables en haut,
  paniers (ex. Bébé) ajoutés d'un toucher, suggestions et pré-remplissage selon le rythme d'achat.
  Toucher = dans le caddie, glisser = retirer. « J'y vais » : magasin, ordre des rayons appris, circuit, mode à deux.
  Mes articles (Tous / Indispensables / Paniers).
- **Repas** : recettes posées sur la semaine, ingrédients mis sur la liste d'un geste ; Mes recettes (recherche, catégories).
- **Dépenses** : dépensé ce mois, budget, tickets modifiables (montant, date, articles ajoutés après coup) ;
  partage des dépenses (qui doit quoi, parts hors partage) en option, désactivé pour un compte joint.

En-tête : plusieurs listes, activité, réglages. Fiche produit (›) : rayon, précision, indispensable, photo, habitudes.
Besoins, décisions et backlog : [`docs/besoins.md`](docs/besoins.md).

## Lancer

App statique : ouvrir via n'importe quel serveur web (ex. GitHub Pages), puis « Ajouter à l'écran d'accueil ».
Ouvrir l'app une fois avec du réseau suffit pour qu'elle fonctionne ensuite hors-ligne.

## Partage (Supabase, gratuit)

1. Créer un projet sur supabase.com.
2. SQL Editor : exécuter `supabase/schema.sql`.
3. Dans l'app, onglet Réglages > Partage : coller l'URL du projet et la clé publique (`publishable` ou `anon`, dans Project Settings > API Keys).
4. « Copier le lien d'invitation » et l'envoyer aux autres. Le lien contient le code secret de la liste.

Synchro : chaque modification est mise en file d'attente sur le téléphone et envoyée quand le réseau
est là ; en cas de conflit sur un même article, la modification la plus récente gagne.

## Pour aller plus loin

- `docs/besoins.md` : vision, demandes, décisions, retours du panel et backlog.
- `tests/` : scénarios de bout en bout.

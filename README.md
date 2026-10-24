# Courses

Liste de courses partagée, pensée pour un supermarché sans réseau : tout fonctionne hors-ligne,
les modifications se synchronisent dès que le réseau revient.

Trois onglets, trois moments :

- **📝 Liste** (avant) : ce qu'il faut acheter, à remplir à plusieurs (« ajouté par »), ajout de plusieurs
  articles d'un coup (« lait, œufs, pain »), suggestions selon le rythme d'achat, ⭐ indispensables
  toujours en haut, basiques et recettes, envoi de la liste par message, « J'y vais » visible par les autres.
- **🛒 Courses** (pendant) : magasin, ordre des rayons (appris selon l'ordre où l'on coche), cases en grand,
  articles cochés rayés dans « Dans le panier » en bas, commerces, plan et circuit (avancé), mode à deux.
- **💶 Budget** (après) : dépensé ce mois, scan de ticket gratuit avec page de validation qui apprend,
  prix suivis, conso estimée.
- **⚙️ Réglages** : prénom, apparence (auto/clair/sombre), magasins, rayons, plan, commerces, partage.

Fiche produit (›) : rayon, précision, indispensable, photo, historique de prix. « Annuler » après une suppression.

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

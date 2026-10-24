# Courses

Liste de courses partagée, pensée pour un supermarché sans réseau : tout fonctionne hors-ligne,
les modifications se synchronisent dès que le réseau revient.

- **Préparer** : basiques par rayon, tout cocher / tout décocher, suggestions selon le rythme d'achat.
- **Magasin** : plan 3D, circuit optimisé, mode à deux (deux circuits équilibrés).
- **Liste** : liste simple.
- **Rayons** : ordre des rayons, plan du magasin, partage, export/import.

## Lancer

App statique : ouvrir via n'importe quel serveur web (ex. GitHub Pages), puis « Ajouter à l'écran d'accueil ».
Ouvrir l'app une fois avec du réseau suffit pour qu'elle fonctionne ensuite hors-ligne.

## Partage (Supabase, gratuit)

1. Créer un projet sur supabase.com.
2. SQL Editor : exécuter `supabase/schema.sql`.
3. Dans l'app, onglet Rayons > Partage : coller l'URL du projet et la clé `anon` (Project Settings > API).
4. « Copier le lien d'invitation » et l'envoyer aux autres. Le lien contient le code secret de la liste.

Synchro : chaque modification est mise en file d'attente sur le téléphone et envoyée quand le réseau
est là ; en cas de conflit sur un même article, la modification la plus récente gagne.

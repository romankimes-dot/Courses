# Courses : besoins, décisions et suite

Synthèse des demandes du propriétaire (fil de conception d'octobre 2026), des choix faits et des retours du panel de test.
À lire avant toute évolution. Le *pourquoi* de chaque fonction est ici ; le *comment* est dans le code.

## 1. La vision, en ses mots

- Une app **partageable avec quelques personnes** (le foyer) pour aider à faire les courses.
- Partir de **la liste classique des articles achetés fréquemment**, organisés **par rayons de mon supermarché**.
- Pouvoir **cocher ce qu'il faut** *ou* **décocher ce qu'on a** (ou les deux), selon l'humeur.
- Un **circuit optimal** dans le magasin, et aussi **une liste simple** si on veut.
- « On explorera en construisant » : itérer vite, tester, améliorer.

## 2. Ses demandes, dans l'ordre où elles sont venues

| # | Demande | Où c'est dans l'app |
|---|---|---|
| 1 | Liste de base fréquente, par rayons, cocher/décocher, circuit, liste simple | Liste > « Mes basiques » (Tout ajouter / Tout vider), Courses |
| 2 | Étudier le marché des apps de courses/todo collaboratives, s'inspirer de Bring! | Analyse faite : Bring!, Listonic, AnyList, OurGroceries, Keep, Rappels |
| 3 | **Suggestions selon la fréquence d'achat** (ex. la litière achetée tous les 14 jours revient d'elle-même) | Liste > « À racheter ? » (rythme moyen entre achats validés) |
| 4 | **Cartographier approximativement le supermarché** pour savoir où sont les produits ; vue **« canon », en fausse 3D** | Réglages > Plan du magasin (avancé) ; vue isométrique dans Courses |
| 5 | **Option circuit optimisé** ; **partager la liste en deux** quand on est deux → **deux circuits** | Courses : Circuit optimisé / Ordre des rayons ; Seul / Circuit 1 / Circuit 2 (aussi sans plan : « À deux : début / fin ») |
| 6 | **Scanner le ticket** pour remplir l'historique ; **suivi des prix** par article, **panier moyen**, **budget mensuel** à partir de la conso moyenne et des dépenses | Budget > Scanner un ticket ; prix suivis, conso estimée, budget |
| 7 | **Le supermarché n'a pas de réseau** : l'app doit marcher hors-ligne, les ajouts partent quand le réseau revient | Service worker + file d'attente de synchro |
| 8 | **Photo de l'article** liée à la liste | Fiche produit (›), vignette en courses |
| 9 | **Recettes** : ajouter une recette = ajouter tous ses articles, en décochant ce qu'on a déjà | Liste > « Une recette » |
| 10 | Articles **hors supermarché** : boulanger, boucher, fromager, caviste… | Commerces (Réglages), onglets par commerce en Courses |
| 11 | **Compléter la liste à plusieurs** quand on pense à un truc ; **cocher ce qu'on met dans le caddie** ; « de façon aisée et intuitive » | Barre « J'ajoute… » toujours en bas, « ajouté par », grandes cases |
| 12 | **Plusieurs magasins**, et des **magasins inconnus non cartographiés** (vacances) | 📍 choix du magasin ; « Autre magasin (ordre standard) » |
| 13 | Une **étape de validation** de ce qui n'a jamais été validé, à la lecture du ticket : **une page facile à vivre** | Page de validation du scan : libellés appris, seules les nouvelles lignes sont à vérifier |
| 14 | **Option sans abonnement** pour lire les tickets | Choix : OCR gratuit sur le téléphone (Tesseract.js). L'API Claude (Haiku) reste une option payante à l'usage, non activée |
| 15 | Supabase gratuit se met en pause après 7 jours sans activité, « c'est short » | Ping automatique (GitHub Actions, tous les 3 jours) |
| 16 | **Fiches produits** (changer de rayon…), **parcours utilisateur à éclaircir**, **choisir l'apparence** | Fiche › ; 3 onglets Liste / Courses / Budget ; Réglages > Apparence (auto/clair/sombre) et taille du texte |
| 17 | Refonte complète + **une dizaine d'utilisateurs testeurs**, **un contradicteur**, **un expert en organisation familiale**, et améliorer d'après leurs critiques | Voir §4 |
| 18 | Une liste de base, mais **les Babybel et Danonino du petit et les fruits et légumes toujours en haut** | ⭐ Indispensables (épinglés en haut des basiques et de la liste) |
| 19 | **La liste change d'ordre selon comment on coche** : un article coché passe rayé / dans le panier en bas | « 🧺 Dans le panier » en bas ; ordre des rayons appris d'après l'ordre où l'on coche |
| 20 | Garder cette synthèse dans GitHub pour la reprendre dans d'autres fils | Ce fichier + `CLAUDE.md` |

## 3. Décisions prises

- **Technique** : PWA statique (HTML/CSS/JS sans build), hébergée sur GitHub Pages (`https://romankimes-dot.github.io/Courses/`).
- **Hors-ligne d'abord** : tout est stocké sur le téléphone ; synchro par enregistrement (article, rayon, magasin, recette, passage en caisse, libellé de ticket…) avec file d'attente ; en cas de conflit, la modification la plus récente gagne (datée après la dernière version vue du serveur, pour résister aux horloges décalées) ; doublons de même nom fusionnés.
- **Partage sans comptes** : Supabase (projet `lxvtsxjsjyeyppybfrqx`, région Paris), une liste = un code secret long dans le lien d'invitation ; table accessible seulement via les fonctions `push`/`pull` (`supabase/schema.sql`). Toute donnée reçue est nettoyée (`clean()` dans `src/app.js`).
- **Parcours** : 3 moments, Liste (avant) / Courses (pendant) / Budget (après), Réglages derrière ⚙️. Le plan du magasin et les chiffres détaillés sont repliés (« avancé ») : utiles mais pas au premier jour.
- **Prénom par téléphone**, affiché sur les ajouts ; « J'y vais » visible par les autres ; chacun ne termine que son propre panier.
- **Scan gratuit** (Tesseract.js) + page de validation qui apprend ; pas d'abonnement.

## 4. Retours du panel (octobre 2026)

Panel : expert en organisation familiale ; 10 personas testant réellement l'app (mère solo pressée, retraité peu à l'aise, ado, couple qui suit son budget, retraitée malvoyante, coloc de 4, parent en garde alternée, cuisinier, conjointe cœliaque, aidant d'un parent âgé) ; un contradicteur (synchro, sécurité, complexité).

**Corrigé suite au panel** : bandeau « Annuler » qui bloquait les onglets ; « Terminer » qui avalait les coches d'un autre ou d'un autre commerce ; horloges décalées (listes divergentes) ; données malformées reçues par la synchro ; « Annuler » qui effaçait les ajouts des autres ; doublons « cafe / Café », « oeufs / Œufs » ; nouveaux articles tous en « Divers » (rayon deviné) ; prénom jamais demandé à qui rejoint ; deux champs d'ajout ; double « Annuler » à la fin des courses ; « pas trouvé » signalé à l'auteur ; consigne « si absent, prendre… » ; ✓ « dans le panier » visible depuis Liste ; vocabulaire (« en attente », « non cartographié », « Préparer ») ; taille du texte ; quantités (« 2 kg tomates ») ; « déjà sur la liste (ajouté par X) » ; plusieurs personnes en courses ; mode à deux sans plan ; confirmation avant de vider / réinitialiser / importer une liste partagée.

**Principal risque relevé par l'expert** : que l'app reste l'outil d'une seule personne. Indicateur à suivre : nombre de personnes qui *ajoutent* au moins un article par semaine (objectif ≥ 2 par foyer).

## 5. À décider / à faire (backlog)

Demandés par plusieurs personas, à arbitrer par le propriétaire :

1. **Plusieurs listes**, chacune avec ses membres (« Pour Maman », « semaine avec les enfants », vacances). Aujourd'hui : une seule liste par téléphone.
2. **Ce qu'on partage** : budget privé par défaut, lecture seule, protéger photos et passages en caisse ; **révoquer un accès** (changer le code de la liste).
3. **Partage des dépenses** (qui a payé, soldes, dépense saisie à la main), type Tricount, pour les colocs.
4. **Menus de la semaine** : recettes posées sur des jours, quantités et portions additionnées, mémoire « j'en ai déjà ».
5. **Notifications** (« X part faire les courses », « tes céréales sont prises ») : nécessite un service push côté serveur.
6. **Synchro plus fine** : fusion champ par champ (aujourd'hui l'article entier), contrôles côté serveur (dates dans le futur, taille), photos hors de la synchro (Supabase Storage).
7. **Scan** : reconnaître le magasin depuis l'en-tête du ticket, ne pas remplacer en silence un montant saisi, essayer l'API Claude si l'OCR gratuit déçoit sur de vraies photos.
8. Divers : ordre des rayons par glisser-déposer, dictée vocale, raccourci écran d'accueil vers l'ajout, cibles tactiles de 44 px partout, dévoiler les fonctions avancées avec l'usage (budget après 3 courses…).

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
| 21 | Après le panel, prendre : **plusieurs listes**, **partage des dépenses**, **menus de la semaine**, **notifications** | 🏠 sélecteur de listes ; Dépenses > Partage ; onglet Repas ; 🔔 Activité |
| 22 | « J'ai l'impression qu'on a subi une régression, le parcours n'est pas clair » | Refonte v3 : une seule liste, un seul geste (voir §3) |
| 23 | Propositions dès les premières lettres ; vider la liste d'un clic ; boutons d'outils réguliers | Propositions sous le champ ; outils Articles / Envoyer / Vider |
| 24 | Voir tous ses articles et en mettre en indispensable sans les ajouter ; proposer « indispensable » à la création | Liste > Articles (Mes articles) |
| 25 | Pas d'emojis natifs dans l'app (ceux tapés par l'utilisateur restent) | Icônes au trait (`src/icons.js`) |
| 26 | Indispensables gérés dans Mes articles, plus de puces d'indispensables sur la liste (mais « indispensable » toujours proposé à la création d'un article) ; **liste d'indispensables longue** et **beaucoup de recettes** : rechercher, organiser, rester simple | Mes articles > filtre Indispensables (par rayon, recherche, Tout ajouter) ; Repas > Mes recettes (recherche nom/catégorie/ingrédient, rangées par catégorie) |
| 28 | À la création d'un article, ne pas forcément l'ajouter à la liste : choisir liste et/ou indispensable | Fenêtre « Nouvel article » : rayon, Ajouter à la liste, Indispensable (Annuler = rien n'est créé) |
| 29 | Le scan a lu le ticket sans reconnaître les articles ni le bon total : « soit à améliorer clairement, soit à mettre de côté » | **Mis de côté** : scan retiré de l'app (`src/scan.js` reste dans l'historique Git). Le montant se saisit en terminant les courses |
| 30 | « Je ne veux pas être en mode Tricount » : Raphaëlle et moi avons un compte joint | Partage des dépenses devenu une **option de la liste** (Réglages > Cette liste), désactivée par défaut : on suit juste le budget commun |
| 31 | Dans une recette, appeler les produits existants, avec l'option d'en créer sans sortir de la recette | Champ « Ajouter un ingrédient… » : propositions dès les premières lettres, « + Créer » (article créé hors liste) |
| 32 | Dépenses partagées : à chaque ticket, ignorer une partie de la somme (« un paquet de bonbons perso ») ; pouvoir modifier le ticket | Toucher un passage dans Dépenses : fiche Ticket (lieu, montant, payé par, **part perso hors partage**) |
| 33 | Tous modes : **ajouter des articles au ticket après coup** (pris en plus de la liste) | Fiche Ticket > Articles : propositions dès les premières lettres ou création ; comptent dans l'historique d'achat |
| 34 | Suggestions selon l'historique et les habitudes ; **pré-remplir la liste si on le souhaite** | Puces « à racheter » (rythme moyen entre achats, dès 2 achats) + option Réglages > Cette liste > « Pré-remplir la liste », **active par défaut** (marqué « suggéré » ; retiré, il attend le prochain cycle) |
| 35 | Dépense à la main : indiquer la date d'achat | Champ Date d'achat (dépense à la main et fiche Ticket) ; passages triés par date |
| 27 | Ne pas avoir à rouvrir la liste toutes les 3 secondes (veille de l'iPhone) | Écran gardé allumé tant que la liste est affichée (Wake Lock ; iPhone : iOS 18.4 et +) |

## 3. Décisions prises

- **Technique** : PWA statique (HTML/CSS/JS sans build), hébergée sur GitHub Pages (`https://romankimes-dot.github.io/Courses/`).
- **Hors-ligne d'abord** : tout est stocké sur le téléphone ; synchro par enregistrement (article, rayon, magasin, recette, passage en caisse, libellé de ticket…) avec file d'attente ; en cas de conflit, la modification la plus récente gagne (datée après la dernière version vue du serveur, pour résister aux horloges décalées) ; doublons de même nom fusionnés.
- **Partage sans comptes** : Supabase (projet `lxvtsxjsjyeyppybfrqx`, région Paris), une liste = un code secret long dans le lien d'invitation ; table accessible seulement via les fonctions `push`/`pull` (`supabase/schema.sql`). Toute donnée reçue est nettoyée (`clean()` dans `src/app.js`).
- **Parcours (v3, octobre 2026)** : la v2 avait deux écrans pour la même liste (Liste et Courses) avec deux gestes différents, les basiques cachés et 4 barres empilées : ressenti de régression. Désormais **une seule liste**, utilisée avant et pendant les courses, **un seul geste** : toucher = dans le caddie (rayé, en bas), glisser à gauche = retirer (avec Annuler), › = fiche. « J'y vais » passe la même liste en mode magasin (choix du magasin, à deux, plan replié). Onglets : **Liste / Repas / Dépenses** ; en-tête : sélecteur de listes, 🔔 activité, ⚙️ réglages. Le plan du magasin et les chiffres détaillés restent repliés (« avancé »).
- **Plusieurs listes** : chacune a son stockage sur le téléphone (clés suffixées, `src/lists.js`), son code de partage, ses membres et ses dépenses. Ouvrir un lien d'invitation n'écrase jamais une liste déjà utilisée : une nouvelle liste est créée.
- **Dépenses** : par défaut, compte joint (budget commun seulement). Option « Partager les dépenses » par liste : qui a payé, parts égales, remboursements suggérés.
- **Repas** : recettes avec quantités, posées sur les 7 prochains jours ; un geste met les ingrédients sur la liste (quantités cumulées, on décoche ce qu'on a).
- **Notifications** : fil d'activité 🔔 (ajouts des autres, départ en courses, articles pris pour moi, pas trouvés, dépenses) + notification du téléphone si autorisée, **tant que l'app est ouverte ou en arrière-plan**. App complètement fermée : nécessite un service push côté serveur (non fait).
- **Prénom par téléphone**, affiché sur les ajouts ; « J'y vais » visible par les autres ; chacun ne termine que son propre panier.
- **Scan de ticket** : essayé (Tesseract.js gratuit), résultat décevant sur un vrai ticket, mis de côté. À reprendre seulement avec une vraie piste (photos de tickets réels, ou API payante).

## 4. Retours du panel (octobre 2026)

Panel : expert en organisation familiale ; 10 personas testant réellement l'app (mère solo pressée, retraité peu à l'aise, ado, couple qui suit son budget, retraitée malvoyante, coloc de 4, parent en garde alternée, cuisinier, conjointe cœliaque, aidant d'un parent âgé) ; un contradicteur (synchro, sécurité, complexité).

**Corrigé suite au panel** : bandeau « Annuler » qui bloquait les onglets ; « Terminer » qui avalait les coches d'un autre ou d'un autre commerce ; horloges décalées (listes divergentes) ; données malformées reçues par la synchro ; « Annuler » qui effaçait les ajouts des autres ; doublons « cafe / Café », « oeufs / Œufs » ; nouveaux articles tous en « Divers » (rayon deviné) ; prénom jamais demandé à qui rejoint ; deux champs d'ajout ; double « Annuler » à la fin des courses ; « pas trouvé » signalé à l'auteur ; consigne « si absent, prendre… » ; ✓ « dans le panier » visible depuis Liste ; vocabulaire (« en attente », « non cartographié », « Préparer ») ; taille du texte ; quantités (« 2 kg tomates ») ; « déjà sur la liste (ajouté par X) » ; plusieurs personnes en courses ; mode à deux sans plan ; confirmation avant de vider / réinitialiser / importer une liste partagée.

**Principal risque relevé par l'expert** : que l'app reste l'outil d'une seule personne. Indicateur à suivre : nombre de personnes qui *ajoutent* au moins un article par semaine (objectif ≥ 2 par foyer).

## 5. À décider / à faire (backlog)

Demandés par plusieurs personas, à arbitrer par le propriétaire :

1. ~~Plusieurs listes~~ : fait (v3).
2. **Ce qu'on partage** : lecture seule, protéger photos et passages en caisse ; **révoquer un accès** (changer le code de la liste). Le cas « ex en garde alternée » est couvert par une liste séparée.
3. ~~Partage des dépenses~~ : fait (parts égales). Reste : parts inégales, exclure quelqu'un d'une dépense.
4. ~~Menus de la semaine~~ : fait. Reste : nombre de personnes / portions, mémoire « j'en ai déjà ».
5. Notifications : fil d'activité et notifications app ouverte faits. Reste : **push app fermée** (Supabase Edge Function + Web Push, clés VAPID).
6. **Synchro plus fine** : fusion champ par champ (aujourd'hui l'article entier), contrôles côté serveur (dates dans le futur, taille), photos hors de la synchro (Supabase Storage).
7. **Scan (mis de côté)** : s'il revient, reconnaître le magasin depuis l'en-tête du ticket, ne pas remplacer en silence un montant saisi, essayer l'API Claude si l'OCR gratuit déçoit sur de vraies photos.
8. Divers : ordre des rayons par glisser-déposer, dictée vocale, raccourci écran d'accueil vers l'ajout, cibles tactiles de 44 px partout, dévoiler les fonctions avancées avec l'usage (budget après 3 courses…).

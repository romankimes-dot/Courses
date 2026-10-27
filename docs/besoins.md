# Courses : besoins, décisions et suite

Synthèse des demandes du propriétaire (fil de conception d'octobre 2026), des choix faits et des retours du panel de test.
À lire avant toute évolution. Le *pourquoi* de chaque fonction est ici ; le *comment* est dans le code.

## 1. La vision, en ses mots

- Une app **partageable avec quelques personnes** (le foyer : Raphaëlle et lui, compte joint, un petit) pour aider à faire les courses.
- Partir de **la liste classique des articles achetés fréquemment**, organisés **par rayons de mon supermarché**.
- Pouvoir **cocher ce qu'il faut** *ou* **décocher ce qu'on a** (ou les deux), selon l'humeur.
- Un **circuit optimal** dans le magasin, et aussi **une liste simple** si on veut.
- « On explorera en construisant » : itérer vite, tester, améliorer. **Garder la vue simple et facile d'utilisation.**

## 2. L'app aujourd'hui (carte rapide)

- **Liste** (onglet 1) : une seule liste, avant et pendant les courses. Champ d'ajout en haut (propositions dès les premières lettres ;
  un article inconnu ouvre la fenêtre « Nouvel article » : rayon, sur la liste ou non, indispensable ou non). Puces des **paniers**
  (ajout d'un toucher) et puces **« à racheter »**. Indispensables en haut, rayons, puis « Dans le caddie » en bas.
  Toucher = dans le caddie ; glisser à gauche = retirer (Annuler) ; › = fiche produit. « J'y vais » = mode magasin (magasin, à deux, plan).
  Outils : Articles / Envoyer / Vider. Écran gardé allumé tant que la liste est affichée.
- **Mes articles** (Liste > Articles) : filtres **Tous / Indispensables / Paniers** ; recherche ; Modifier (☆ et fiche).
- **Repas** (onglet 2) : semaine, recettes posées sur les jours, ingrédients mis sur la liste d'un geste ; **Mes recettes**
  (recherche nom/catégorie/ingrédient, catégories, ingrédients piochés ou créés sur place).
- **Dépenses** (onglet 3) : dépensé ce mois, budget, conso estimée ; passages en caisse triés par date ; **fiche Ticket** (lieu, date,
  montant, articles ajoutés/retirés après coup) ; dépense à la main datée. Option **partage des dépenses** (qui doit quoi, parts hors partage).
- **En-tête** : sélecteur de listes (plusieurs listes), 🔔 activité, ⚙️ réglages (cette liste : nom, partage, **pré-remplir la liste**,
  **partager les dépenses** ; vous ; notifications ; magasins, rayons, commerces, plan ; apparence ; données).

## 3. Ses demandes, dans l'ordre où elles sont venues

La colonne de droite indique où c'est **aujourd'hui** (les premières demandes ont été réorganisées par les refontes).

| # | Demande | Où c'est dans l'app |
|---|---|---|
| 1 | Liste de base fréquente, par rayons, cocher/décocher, circuit, liste simple | Liste unique par rayons ; Mes articles (Tout ajouter / Tout retirer) ; circuit en mode « J'y vais » |
| 2 | Étudier le marché des apps de courses/todo collaboratives, s'inspirer de Bring! | Analyse faite : Bring!, Listonic, AnyList, OurGroceries, Keep, Rappels |
| 3 | **Suggestions selon la fréquence d'achat** (ex. la litière tous les 14 jours revient d'elle-même) | Puces « à racheter » + pré-remplissage (n° 34) |
| 4 | **Cartographier approximativement le supermarché** ; vue **« canon », en fausse 3D** | Réglages > Plan du magasin (avancé) ; vue isométrique en mode magasin |
| 5 | **Circuit optimisé** ; **partager la liste en deux** quand on est deux → **deux circuits** | Mode magasin : Tout le magasin / Début / Fin (explication et rayons de ma part affichés) ; Circuit le plus court / Ordre des rayons |
| 6 | **Scanner le ticket** ; **suivi des prix**, **panier moyen**, **budget mensuel** | Budget, panier moyen, conso estimée dans Dépenses ; scan mis de côté (n° 29) |
| 7 | **Le supermarché n'a pas de réseau** : marcher hors-ligne, envoyer au retour du réseau | Service worker + file d'attente de synchro |
| 8 | **Photo de l'article** liée à la liste | Fiche produit (›), vignette sur la liste |
| 9 | **Recettes** : tous les articles d'un coup, en décochant ce qu'on a | Repas > Mes recettes |
| 10 | Articles **hors supermarché** : boulanger, boucher, fromager, caviste… | Commerces (Réglages), sections par commerce sur la liste |
| 11 | **Compléter la liste à plusieurs** ; **cocher ce qu'on met dans le caddie** ; « aisé et intuitif » | « ajouté par », grandes cases, activité 🔔 |
| 12 | **Plusieurs magasins**, **magasins inconnus** (vacances) | Choix du magasin en mode magasin ; « Autre magasin (ordre standard) » |
| 13 | **Étape de validation** du ticket scanné, « une page facile à vivre » | Retirée avec le scan (n° 29) |
| 14 | **Option sans abonnement** pour lire les tickets | OCR gratuit essayé puis mis de côté (n° 29) |
| 15 | Supabase gratuit se met en pause après 7 jours sans activité | Ping automatique (GitHub Actions, tous les 3 jours) |
| 16 | **Fiches produits**, **parcours à éclaircir**, **choisir l'apparence** | Fiche › ; Réglages > Apparence (auto/clair/sombre) et taille du texte |
| 17 | Refonte + **une dizaine de testeurs**, **un contradicteur**, **un expert en organisation familiale** | Voir §5 |
| 18 | **Babybel, Danonino du petit, fruits et légumes toujours en haut** | Indispensables (en haut de la liste quand il en faut) |
| 19 | Un article coché passe **rayé / dans le panier en bas** ; l'ordre suit la façon de cocher | « Dans le caddie » en bas ; ordre des rayons appris en cochant |
| 20 | Garder cette synthèse dans GitHub pour d'autres fils | Ce fichier + `CLAUDE.md` |
| 21 | Après le panel : **plusieurs listes**, **partage des dépenses**, **menus de la semaine**, **notifications** | Sélecteur de listes ; option partage ; onglet Repas ; 🔔 Activité |
| 22 | « Régression, le parcours n'est pas clair » | Refonte v3 : une seule liste, un seul geste (§4) |
| 23 | Propositions dès les premières lettres ; vider la liste d'un clic ; boutons d'outils réguliers | Propositions sous le champ ; outils Articles / Envoyer / Vider |
| 24 | Voir tous ses articles, mettre en indispensable sans ajouter à la liste | Mes articles |
| 25 | Pas d'emojis natifs dans l'app (ceux tapés par l'utilisateur restent) | Icônes au trait (`src/icons.js`) |
| 26 | Indispensables gérés dans Mes articles (pas de puces sur la liste) ; **longue liste d'indispensables**, **beaucoup de recettes** : rechercher, organiser | Mes articles > Indispensables (par rayon, recherche, Tout ajouter) ; Mes recettes (recherche, catégories) |
| 27 | Ne pas avoir à rouvrir la liste toutes les 3 secondes (veille de l'iPhone) | Écran gardé allumé sur la liste (Wake Lock ; iPhone : iOS 18.4 et +) |
| 28 | À la création d'un article, choisir : sur la liste et/ou indispensable | Fenêtre « Nouvel article » (Annuler = rien n'est créé) |
| 29 | Le scan a lu le ticket sans reconnaître les articles ni le total : « améliorer clairement ou mettre de côté » | **Mis de côté** : retiré de l'app (`src/scan.js` dans l'historique Git) |
| 30 | « Pas en mode Tricount » : compte joint avec Raphaëlle | Partage des dépenses = option de liste, **désactivée par défaut** |
| 31 | Recette : appeler les produits existants, en créer sans sortir de la recette | « Ajouter un ingrédient… » : propositions + « Créer » (hors liste, sans bandeau) |
| 32 | Mode partagé : ignorer une partie d'un ticket (« mes bonbons ») ; modifier le ticket | Fiche Ticket > Hors partage |
| 33 | Tous modes : **ajouter des articles au ticket après coup** | Fiche Ticket > Articles (comptent dans l'historique d'achat) |
| 34 | Suggestions sur l'historique ; **pré-remplir la liste** ; puis **activé par défaut** | Réglages > Cette liste > « Pré-remplir la liste » (marqué « suggéré » ; retiré, il attend le cycle suivant) |
| 35 | Dépense à la main : **date d'achat** | Champ Date (dépense à la main, fiche Ticket) |
| 36 | **Paniers préenregistrés** (ex. Bébé : Danonino, couches, tomates cerises, pompotes) | Mes articles > Paniers ; puce par panier sur la liste |
| 38 | **Bibliothèque de recettes préenregistrées**, simples, à parcourir et adopter ; reconnaître les articles déjà créés | Repas > Mes recettes > Idées de recettes (35 recettes, 6 catégories, recherche) ; aperçu « déjà dans vos articles / nouveaux » ; adopter = copie dans Mes recettes |
| 39 | Puce d'un panier sur la liste : décocher ce qu'on a déjà, comme dans la vue panier | Fenêtre du panier avec cases (déjà sur la liste grisé), puis Ajouter (Annuler possible) |
| 40 | Repas : un calendrier du mois en cases plutôt qu'une liste de jours | Repas : calendrier mensuel (mois précédent/suivant), toucher une case = ses repas et « + repas » |
| 41 | Toucher le nom pour modifier, sans icône dédiée | Recettes et paniers (nom = modifier), Mes articles en mode Modifier (nom = fiche) ; icônes ✎ et › retirées |
| 42 | « Vert et blanc, ça fait très Cookidoo » : chercher un visuel qui plaît et repose, sans le style habituel de Claude | Recherche (couleur préférée, Pantone 2026, apps réelles) puis maquettes : retenu **Bleu calme** (fond Cloud Dancer #F0EEE9, bleu #1F5FCC), police **Lexend** (fournie, hors-ligne), **cartes par rayon** ; icônes au trait inchangées ; mode sombre bleu nuit |
| 43 | Dépenses : dépense à la main au-dessus de la liste (des dizaines de tickets) ; dans les chiffres, une case du mois en cours avec comparatif du mois dernier | Dépenses : partage et « Ajouter une dépense » au-dessus des tickets ; tickets par 20 avec « Voir les plus anciens » ; chiffres : Ce mois-ci, Mois dernier, Au même jour le mois dernier (écart en € et %) |
| 44 | **Un max de recettes** dans les idées, avec filtre par type en boutons | Idées de recettes : 130 recettes, 10 types (Plats, Rapide, Végétarien, Poisson, Salades, Soupes, Enfants, Desserts, Petit-déjeuner, Apéro), boutons avec compteurs, combinés à la recherche |
| 45 | Retirer l'option « article de base » devenue obsolète (Mes articles montre tout ; indispensables, paniers et pré-remplissage l'ont remplacée) | Case supprimée de la fiche produit ; « Tout ajouter / Tout retirer » retirés de l'onglet Tous (« Tout ajouter » reste dans Indispensables, « Vider » sur la liste) |
| 46 | « C'est un lien, pas une app » : savoir l'ajouter à l'écran d'accueil ; puis **un site vraiment canon** avec lien vers l'app et page d'installation | Guide d'installation dans l'app (carte en haut de la liste, accueil sur iPhone, Réglages ; bouton natif sur Android) ; site vitrine `site/` (présentation + `installer.html`, captures réelles, QR code) ; puis « moins marqué IA » : style éditorial sobre (titres serif, texte à la première personne, planche de captures, « ce qu'elle ne fait pas »), sans pastilles, dégradés ni cartes à icônes ; puis « page d'exposé » : v3 actuelle (démo interactive de deux téléphones synchronisés, section magasin sombre avec le vrai plan 3D, grille de vrais morceaux d'interface, « Pas de compte. Pas de pub. Pas de store. ») ; puis « pas assez de nourriture », « de la 3D stylée et animée, pas des dessins d'enfants » : produits en 3D (Kenney Food Kit, CC0, three.js hébergé dans le dépôt) qui flottent autour du titre, rayon de produits qui défile, vignettes 3D dans la démo et la grille, panier bleu qui se remplit en bas de page |
| 47 | **CGU simples mais serrées** pour se protéger | `site/cgu.html` : conditions (en l'état, sauvegarde à sa charge, lien = clé, contenus sous la responsabilité de l'utilisateur, usages interdits, infos indicatives, responsabilité limitée, droit français), confidentialité (RGPD, Supabase Paris, GitHub, 12 mois sans activité), mentions légales (éditeur particulier anonyme) ; acceptation sur l'accueil, lien dans Réglages. **Contact à fournir** (adresse dédiée, pas d'issue GitHub : publique) |
| 48 | « Début / Fin ne change rien » | Corrigé : avec un plan réglé sur « Ordre des rayons », le partage à deux était ignoré ; il coupe maintenant la liste là où les articles s'équilibrent (test `moitie-ordre.js`) |
| 49 | Site : mouvement doux même avec « Réduire les animations », toujours en clair, montrer le déroulé (liste à plusieurs, J'y vais et circuit, cocher, budget commun ou partagé, sans citer d'autre app) ; page courte, vendeuse, sobre « à la Apple ou Dyson » | Page resserrée : 3D autour du titre, démo deux téléphones, rayon de produits, déroulé en 4 étapes (téléphone fixe qui suit le défilement ; carrousel sur téléphone), 3 tuiles, panier final ; section magasin sombre et tuiles secondaires retirées |
| 50 | Éditeur de magasin « un peu compliqué », le panneau se referme à chaque changement de taille | Les panneaux dépliés le restent à chaque mise à jour de l'écran (plan, rayons, commerces, chiffres, plan en courses) ; palette de rayons colorés au lieu d'une liste déroulante ; on peint en glissant le doigt ; aperçu 3D du circuit sous la grille ; numéros retirés des cases (l'ordre se lit dans l'aperçu) |
| 51 | « Donner envie de l'utiliser » | Liste : barre de progression et mascotte panier, coche animée + haptique (Android ; interrupteur natif sur iPhone), vol vers le caddie, confettis à « Terminer », fondu des onglets, compteur du budget ; tout coupé avec « Réduire les animations ». Essayés puis retirés : dictée vocale (peu fiable), lien dans « Envoyer », carte image. Refusés : séries, sons, thèmes, todo (brouille le plan du magasin) |
| 52 | Voir l'autre en courses ; exporter le budget | Bulle « X est en courses · n pris · encore n · vient de prendre … » ; Dépenses > « Exporter l'historique par mois » (CSV pour tableur) |
| 53 | Localiser un article en magasin | En courses, avec un plan : « Où est… ? » ; le rayon s'allume sur le plan (balise) avec son numéro d'arrêt |
| 54 | « La plus fluide possible » | Revue mesurée (CPU ×4) : affichage avant l'enregistrement, pas d'enregistrement de synchro hors partage, vignettes en `blob:`, synchro sans fermer le clavier (le champ d'ajout est gardé), animations non rejouées, glisser sans retard, pas de zoom au double toucher. Cocher : ≈ 320 → 100 ms avec 40 photos |
| 37 | Mode partagé : **attribuer une part à un participant** (modifiable) | Fiche Ticket > Hors partage : « X € pour [membre] », plusieurs parts |

## 4. Décisions prises

- **Technique** : PWA statique (HTML/CSS/JS sans build), hébergée sur GitHub Pages (`https://romankimes-dot.github.io/Courses/`).
  Mise à jour : bandeau « Nouvelle version · Recharger » (incrémenter `CACHE` dans `sw.js` à chaque changement).
- **Hors-ligne d'abord** : tout est stocké sur le téléphone ; synchro par enregistrement (article, rayon, magasin, recette/panier,
  passage en caisse, membre…) avec file d'attente ; la modification la plus récente gagne (datée après la dernière version vue du serveur,
  contre les horloges décalées) ; doublons de même nom fusionnés.
- **Partage sans comptes** : Supabase (projet `lxvtsxjsjyeyppybfrqx`, région Paris), une liste = un code secret long dans le lien
  d'invitation ; table accessible seulement via `push`/`pull` (`supabase/schema.sql`). Toute donnée reçue passe par `clean()`.
  Les membres sont enregistrés dès qu'ils rejoignent (`member:<prénom>`).
- **Parcours (v3)** : **une seule liste**, avant et pendant les courses, **un seul geste** (toucher = caddie). Onglets **Liste / Repas /
  Dépenses**. Le plan du magasin et les chiffres détaillés restent repliés (« avancé »).
- **Indispensables, paniers, recettes** : les indispensables se gèrent dans Mes articles (pas depuis la liste, sauf à la création d'un
  article). Un **panier** est une recette `kind: 'basket'` (même moteur : nom + articles + quantités), rangé dans Mes articles ; les
  **recettes** vivent dans Repas.
- **Suggestions** : rythme moyen entre achats validés (dès 2 achats : « Terminer » ou articles ajoutés à un ticket). Puce « à racheter »
  à 80 % du délai ; **pré-remplissage** (actif par défaut) à 100 %, marqué « suggéré », refus mémorisé jusqu'au cycle suivant.
- **Dépenses** : par défaut **compte joint** (budget commun seulement). Option « Partager les dépenses » par liste : qui a payé, parts
  égales, **parts hors partage attribuées à un membre**, remboursements suggérés. Tickets modifiables après coup (montant, date, articles).
- **Scan de ticket** : essayé (Tesseract.js gratuit), décevant sur un vrai ticket, **mis de côté**. À reprendre seulement avec une vraie
  piste (photos de tickets réels, ou API payante).
- **Repas** : recettes avec quantités, posées sur les 7 prochains jours ; un geste met les ingrédients sur la liste (quantités cumulées).
- **Notifications** : fil d'activité 🔔 + notification du téléphone si autorisée, **app ouverte ou en arrière-plan** seulement.
- **Interface** : pas d'emojis natifs (icônes au trait) ; exemples de noms bienveillants (« Pour Tata, Parrain », jamais « Maman »).

## 5. Retours du panel (octobre 2026)

Panel : expert en organisation familiale ; 10 personas (mère solo pressée, retraité peu à l'aise, ado, couple qui suit son budget,
retraitée malvoyante, coloc de 4, parent en garde alternée, cuisinier, conjointe cœliaque, aidant d'un parent âgé) ; un contradicteur.

**Corrigé suite au panel** : bandeau « Annuler » qui bloquait les onglets ; « Terminer » qui avalait les coches d'un autre ; horloges
décalées ; données malformées reçues par la synchro ; « Annuler » qui effaçait les ajouts des autres ; doublons « cafe / Café » ;
rayon deviné ; prénom demandé à qui rejoint ; « pas trouvé » signalé à l'auteur ; consigne « si absent, prendre… » ; taille du texte ;
quantités (« 2 kg tomates ») ; « déjà sur la liste (ajouté par X) » ; plusieurs personnes en courses ; confirmations avant de vider.

**Principal risque relevé par l'expert** : que l'app reste l'outil d'une seule personne. Indicateur : nombre de personnes qui *ajoutent*
au moins un article par semaine (objectif ≥ 2 par foyer).

## 6. Pistes notées par le propriétaire (sans suite pour l'instant)

- **Évaluer l'app** : 2 semaines de vraies courses à deux (qui ajoute, oublis, temps en magasin) ; test « à froid » par Raphaëlle ;
  nouveau panel virtuel ; revue technique (sécurité, accessibilité, hors-ligne sur iPhone réel).
- **Commercialiser** (test, achat unique de quelques euros, sans abonnement ni mises à jour payantes) : Play Store d'abord via
  PWABuilder (25 $ une fois), 1,99–2,99 € ; iPhone ensuite (99 $/an) ; il faudra un nom, une icône, une politique de confidentialité
  (données sur Supabase), et une version non publique (le dépôt et GitHub Pages sont publics aujourd'hui).

## 7. À décider / à faire (backlog)

**Voir d'abord `docs/analyse-v2.md`** (25 octobre 2026) : seconde phase de tests à six voix, constats priorisés et décisions à prendre ;
elle précise et remplace en partie cette liste.

1. **Ce qu'on partage** : lecture seule ; **révoquer un accès** (changer le code de la liste).
2. Dépenses partagées : parts inégales globales (ex. 60/40), exclure quelqu'un d'une dépense.
3. Repas : nombre de personnes / portions, mémoire « j'en ai déjà ».
4. Notifications **app fermée** (Supabase Edge Function + Web Push, clés VAPID).
5. **Synchro plus fine** : fusion champ par champ, contrôles côté serveur, photos hors de la synchro (Supabase Storage).
6. Scan de ticket (mis de côté, voir §4).
7. Divers : ordre des rayons par glisser-déposer, dictée vocale, raccourci écran d'accueil vers l'ajout, cibles tactiles de 44 px partout,
   renommer un membre.

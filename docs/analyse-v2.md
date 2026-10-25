# Analyse v2 : l'app sous tous les angles (25 octobre 2026)

Seconde phase de tests, après la v3 « une seule liste » et les ajouts d'octobre (paniers, tickets, pré-remplissage).
Le propriétaire juge l'app « déjà optimale pour son usage » et envisage un test de commercialisation (achat unique),
puis une marque d'édition « Simple App ». Cette analyse ne corrige rien : elle constate, il arbitre.

## 0. Méthode et consommation

Chef d'orchestre (cette conversation) + 6 agents frais, chacun avec un périmètre, un plafond d'appels d'outils et un rapport
de 600 mots max au même format (verdict ; constats Bloquant / Important / Mineur avec preuve et correctif ; à ne pas casser).

| Vague | Rôle | Modèle | Appels | Jetons |
|---|---|---|---|---|
| 1 | Développeur et sécurité (un seul agent) | standard | 20 | 142 k |
| 1 | UX sur téléphone (390 px et 320 px, grand texte, sombre) | léger | 18 | 101 k |
| 1 | 5 personas testeurs (Playwright, 2 à 3 téléphones) | léger | 19 | 99 k |
| 1 | Marketeur (4 recherches web max) | standard | 8 | 81 k |
| 1 | Éditeur « Simple App » (8 recherches web max) | standard | 12 | 77 k |
| 2 | Contradicteur (les 4 rapports + 2 vérifications) | standard | 5 | 75 k |
| | **Total agents** | | 82 | **≈ 575 k** |

Le chef d'orchestre n'a lu aucun fichier source : il a rédigé les briefs, relayé les rapports et écrit cette synthèse.

## 1. Verdict d'ensemble

**Pour le foyer, l'app tient sa promesse** : parcours nominaux solides, synchro cohérente à 2 et 3 téléphones, aucun crash,
calcul « qui doit quoi » exact, geste cœur excellent (courses : 6 touchers). Les testeurs et l'UX confirment la thèse du
propriétaire *pour son usage*.

**Pour un acheteur inconnu, elle ne l'est pas encore**, pour quatre raisons qui ne se voient pas en l'utilisant à deux :
1. **Deux pertes de données silencieuses** : mémoire du téléphone saturée par les photos (le téléphone croit être « à jour »
   et perd des lignes au rechargement) ; article modifié par deux personnes dont l'une hors-ligne (l'achat est oublié,
   l'article revient sur la liste).
2. **Les tickets retiennent des noms, pas des articles** : renommer « Riz » en « Riz basmati » casse le lien avec l'historique.
3. **Accessibilité** : cibles tactiles de 28 à 36 px, réglages qui débordent en grand texte, retirer un article impossible sans glisser.
4. **Rien n'est prêt pour la distribution** : serveur sans garde-fous, lien d'invitation trop puissant, pas de révocation,
   dépôt public (l'app est déjà gratuite), pas de politique de confidentialité, nom introuvable en store.

## 2. Les points qui comptent, par ordre

Gravité : B = bloquant, I = important, M = mineur. Effort : F = quelques heures, M = une journée, É = plusieurs jours.
« Pour » : F = le foyer dès maintenant, T = le test à 50 foyers, V = la vente.

| # | Constat | Source | Gravité | Effort | Pour |
|---|---|---|---|---|---|
| 1 | Mémoire pleine : `seq` écrit avant `save()`, lignes perdues au rechargement ; photos `data:` en localStorage (quota ~5 Mo, `snap` double le volume) | Dev | B | M | F |
| 2 | Tickets par nom (`trips.names`) : renommage casse ticket ↔ historique ; suppression laisse ligne fantôme et quantité orpheline ; `delItem` du catalogue ne nettoie rien | Testeurs, Dev | B | M | F |
| 3 | Fusion par enregistrement entier : « Terminer » chez A pendant une précision hors-ligne chez B → article de retour, achat perdu ; idem `settings` et `plan`. *Contradicteur : conflit rare, ne pas construire un CRDT maison ; à revoir seulement si le cas se produit en usage réel* | Dev | I | É | — |
| 4 | « Remboursé » possible par n'importe quel membre, sans confirmation. *Contradicteur : dans le modèle de confiance du foyer ; une confirmation suffit* | Testeurs | M | F | F |
| 4b | Sur iPhone, Safari efface le stockage d'un site **non installé** après 7 jours sans visite : inviter à installer sur l'écran d'accueil, et le dire à qui rejoint | Contradicteur | B | F | F |
| 5 | Cibles tactiles < 44 px (›, OK, ☆, ×, cloche, réglages, puces) ; en très grand texte à 320 px, barres de réglages, filtres et en-tête débordent. *Une journée de CSS* | UX, Testeurs | I | M | T |
| 6 | Retirer un article sans glisser : seulement via › puis la fiche | Testeurs, UX | I | F | T |
| 7 | Jargon développeur dans Réglages (« Serveur de partage », clé publique, plan avancé) | UX | I | F | T |
| 8 | Paniers invisibles tant qu'aucun n'existe ; 12 gestes pour en créer un ; pas de « Enregistrer comme panier » depuis la liste | UX | I | M | T |
| 9 | Repas : sept « + repas » identiques sans explication après la première recette ; pas de retour après l'ajout des ingrédients | UX | I | F | T |
| 10 | **Parcours de qui rejoint** (prénom, astuce, puis « Invitez le foyer » : trois bandeaux, « Sans réseau » affiché quelques secondes) : *le vrai bloquant UX selon le contradicteur* ; libellés de validation incohérents (OK / Terminé / Terminer / Créer / Ajouter) | UX, Testeurs | B | F | T |
| 11 | Serveur : `push` sans plafond (taille, lignes, débit) avec clé publique ; le lien d'invitation transporte url et clé (lien = code seul). *Le `u` géant est dans le modèle de confiance : écrêter côté serveur quand on touche au SQL* | Dev | I | M | T |
| 12 | Pas de révocation d'accès (changer le code de la liste) ni d'effacement d'un foyer à la demande ; continuité du service (Supabase gratuit au nom d'un particulier) non pensée. *« Changer de téléphone = tout perdre » est infirmé : Exporter/Importer existent, le lien se régénère* | Dev, Marketeur, Contradicteur | B | M | V |
| 12b | Mesurer le risque n° 1 (outil d'une seule personne) : compteur « 2e contributeur » calculé depuis la table `records` ; le rythme d'achat ne se voit qu'après 4 à 6 semaines, donc un test à 50 foyers doit durer 8 semaines | Contradicteur | I | F | T |
| 13 | Dépôt et GitHub Pages publics : l'app est déjà gratuite, et le lien d'invitation pointe sur cet hébergement (domaine propre nécessaire avant de fermer la version web) ; politique de confidentialité absente ; manifest sans PNG 192/512 ; activer le partage familial des stores pour ne pas faire payer deux fois un couple | Marketeur, Dev, Éditeur, Contradicteur | B | F | V |
| 14 | Nom « Courses » introuvable en store (candidats : Cabas, Pense-Courses, Mes Rayons, Panier Commun ; « Nos Courses » pris) | Marketeur | B | F | V |
| 15 | Aucun test n'asserte ni ne tourne en CI : toute régression passe en silence | Dev | I | M | V |
| 16 | Mineurs : « Sans réseau » affiché à l'arrivée par lien ; puce « à racheter » sans motif ; « 3 bouteille » ; « Annuler » qui masque la barre d'onglets à 320 px ; état vide « Indispensables » peu guidant | Testeurs, UX | M | F | T |

## 3. Décisions à prendre

1. **Corriger maintenant ce qui touche le foyer** : points 1 (mémoire pleine), 2 (tickets par id), 4b (installer sur l'écran
   d'accueil) et 4 (confirmation « Remboursé ») : deux à trois jours. Recommandé : oui, puis **geler** le développement.
2. **Deux semaines de vraies courses avec Raphaëlle, sans rien développer** (son test « à froid » était déjà prévu) : compter
   qui ajoute. C'est la réponse à la seule question qui compte : l'app est-elle l'outil d'une personne ou du foyer ?
3. **Ensuite seulement, le chantier « distribuable »** (points 5 à 15), puis un test **gratuit** à 50 foyers sur 8 semaines,
   avec le compteur « 2e contributeur » côté serveur ; vendre après un go (≥ 50 % de foyers actifs en S8, dont ≥ 50 % à deux
   contributeurs), pas avant.
4. **Le nom** : choisir avant toute page publique.
5. **Simple App** : statut (micro-entrepreneur sous son nom, ou société pour afficher la marque), adresse publique
   (domiciliation), sort de la version web (vitrine + démo, dépôt privé, domaine propre). Voir §4.5.
6. **Ne pas construire** : comptes utilisateurs, fusion champ par champ, notifications app fermée, scan par API (§4.6).
7. **Les tests** : passer les scénarios en vrais tests (assertions + GitHub Actions) avant le chantier distribuable.

## 4. Rapports condensés

### 4.1 Développeur et sécurité

*Sécurité.* Aucune XSS : tout ce qui vient de la synchro passe par `clean()` puis `esc()`, attributs compris. Le modèle
« code = pouvoir total, serveur sans garde-fous » tient pour un foyer, pas pour vendre.
- Important · `schema.sql` : `push` accepte tout foyer ≥ 32 caractères, sans limite de taille, de lignes ni de débit ; la clé
  publishable étant publique, n'importe qui peut remplir les 500 Mo gratuits sans connaître aucun code → plafonner dans `push`.
- Important · `u` vient du client : ≥ 2^53, l'enregistrement devient inécrasable → écrêter côté serveur à `now()` + 1 jour.
- Important · le lien d'invitation porte aussi `url` et `key` : un lien forgé branche le téléphone sur un serveur tiers → code seul dans le lien.
- Important · pas de révocation : qui a eu le lien lit et écrit pour toujours.
- Clé publishable acceptable si : RLS partout, seules `push`/`pull` exécutables par `anon`, aucun bucket Storage ouvert, plafonds ci-dessus.

*Développeur.* `render()` liste = 10 ms avec 500 articles et 100 tickets, un toucher complet 33 ms : rien à optimiser.
- Bloquant · `seq` écrit avant `save()` : rejoué, un téléphone passe de 327 à 26 articles après rechargement, un ajout perdu,
  tout en affichant « À jour » → n'écrire `seq`/`seen` qu'après un `save()` réussi ; photos hors de localStorage.
- Important · enregistrement entier : rejoué, « Terminer » chez A + précision hors-ligne chez B → Pâtes revient, historique perdu → fusion champ par champ pour `item`.
- Important · tests sans assertion ni CI ; non couverts : schéma SQL réel, quota, mise à jour du SW, renommage vs tickets, conflits settings/plan.
- Important · tickets par nom ; `delItem` ne nettoie ni recettes ni alias.
- Mineur / store · manifest : icône SVG seule, pas de PNG 192/512 maskable, pas d'`apple-touch-icon`, pas de politique de confidentialité.
- À ne pas casser : hors-ligne complet sans CDN + bandeau « Nouvelle version » ; règle `seen + 1` ; `dedupe()` après chaque pull.

### 4.2 UX

Geste cœur excellent, premier lancement clair, catalogue préchargé. Pas vendable à un inconnu en l'état.
- Bloquant · très grand texte à 320 px : boutons des rayons et magasins jusqu'à 423 px sur 320 ; « Maiso… » ; « Paniers » coupé.
- Bloquant · cibles : › 36×39, « Plus tard » 82×30, OK 36×28, ☆ 41×36, × du ticket 36×30, cloche et réglages 40×35, puces 34 de haut.
- Important · jargon dans Réglages ; paniers invisibles (12 gestes pour en créer un, 1 pour l'utiliser) ; sept « + repas » de
  179×29 sans explication ; libellés de validation incohérents ; parcours de qui rejoint (3 bandeaux) ; « hors partage » inexpliqué.
- Mineur · cases 22×22 ; état vide « Indispensables » ; accueil : « Créer la liste du foyer » sans explication du partage ;
  aide avec icônes seules ; « Annuler » qui masque les onglets.
- À ne pas casser : le geste unique et la fenêtre « Nouvel article » ; le démarrage en une minute ; panier en 1 toucher avec Annuler.

### 4.3 Testeurs (5 personas)

Nominal solide, aucune erreur JavaScript.
- Raphaëlle (compte joint) : réussi. « Pain · Roman nouveau », 38,20 € vus par Roman, aucun « qui doit quoi ». Mineur : « Sans réseau » quelques secondes à l'arrivée.
- Jeune parent : réussi avec friction. Panier, puce, courses OK ; suggestion directe à 100 % du délai, puce « à racheter » entre 80 et 100 % ; snooze persistant. Mineur : puce sans motif.
- Coloc de 4 (3 téléphones, partage) : réussi. Calcul à la main (Léo +11, Tom −2, Zoé −9) identique à l'affichage, remboursement OK. Important : « Remboursé » par n'importe qui.
- Retraité (très grand, sombre, toucher seul) : réussi avec friction. Important : retirer un article demande › puis la fiche ; champs des réglages qui débordent.
- Cuisinier (12 recettes) : réussi avec friction. Cumuls justes. **Bloquant : renommer « Riz » laisse le ticket avec « Riz »** ;
  Important : suppression → ligne fantôme et quantité orpheline ; Mineur : « 3 bouteille ».
- À ne pas casser : le calcul de partage ; la synchro multi-téléphones ; le refus mémorisé des suggestions ; les cumuls de la semaine.

### 4.4 Marketeur

Vendable à un petit nombre de foyers si l'on vend ce que Bring! ne vend pas. Test à 50 foyers d'abord.
- Bloquant · dépôt public ; perte totale si on change de téléphone sans son lien ; nom ; politique de confidentialité.
- Trois différenciateurs : la liste s'écrit presque seule (rythme, indispensables, paniers) ; le magasin tel qu'il est
  (ordre appris, à deux, hors-ligne) ; liste + repas + dépenses du compte joint sans compte ni pub. Moins bien : pas d'App Store,
  pas de notification app fermée, pas d'import de recettes, français seulement.
- Cibles : jeunes parents (panier Bébé, charge mentale) ; couples à compte joint qui suivent un budget ; colocs et garde alternée.
- Pitch : « La liste de courses du foyer qui se remplit toute seule, marche sans réseau au supermarché et tient le budget, sans compte ni pub. »
- Prix : 2,99 € en achat unique (Play rembourse 48 h). Coût caché : Supabase Pro 25 $/mois ≈ 130 ventes nettes par an ; 50 foyers tiennent sur le gratuit si les photos sortent de la synchro.
- Test : couples recrutés via entourage, crèche, école ; mesurer foyers à ≥ 2 contributeurs/semaine et tickets en S4 ; go / no-go chiffré (§3).
- Fiche : 5 captures (liste pré-remplie avec puce Bébé ; en magasin hors-ligne ; à deux ①② ; recette → liste ; Dépenses et ticket).
- À ne pas casser : une liste, un geste ; pré-remplissage et paniers ; sans compte, sans pub.

### 4.5 Éditeur « Simple App »

- Marque vs nom : Apple Individuel affiche le nom légal ; Organisation exige une société + D-U-N-S (entreprise individuelle refusée).
  Google : nom de développeur libre, mais nom légal + adresse affichés dès qu'on vend ; test fermé 14 jours avec 12 à 20 testeurs
  pour un compte personnel (à vérifier dans la Console). DSA : adresse et contact publics → domiciliation 10–30 €/mois.
- Statut : micro-entrepreneur, vente d'apps généralement en BNC (à confirmer URSSAF) ; franchise de TVA 37 500 € (à confirmer) ;
  Apple et Google sont vendeurs légaux dans l'UE (B2B intracommunautaire : numéro de TVA intracom et DES probablement requis, à vérifier).
- Frais : Apple 99 $/an, 15 % en Small Business Program ; Google 25 $ une fois, 15 % effectif dans l'EEE ; INPI 190 € ; domaine ; D-U-N-S gratuit.
- Technique : Android via PWABuilder / Trusted Web Activity (assetlinks.json sur le domaine ; publier payante d'emblée) ;
  iOS via Capacitor plutôt qu'un wrapper (refus 4.2 « site emballé ») ; dépôt privé, site vitrine + démo limitée.
- Obligations : politique de confidentialité (Supabase Paris), Data safety et App Privacy cohérents, CGU minimales, mentions légales.
- Feuille de route : (a) préparer 4–6 semaines, 250–400 € ; (b) Android 4–8 semaines ; (c) iOS 6–12 semaines, prévoir 1–2 refus ;
  (d) portefeuille 2027 : 2 ou 3 apps simples sans serveur ni compte (« sans abonnement, sans pub »).
- Trois décisions d'abord : statut ; nom (« Simple App » est générique, protection faible) ; sort de la version web.

### 4.6 Contradicteur

*La thèse « déjà optimale pour mon usage »* : vraie pour l'auteur, fausse pour un acheteur. Le verdict repose sur N = 1,
le concepteur ; le produit vendu est un produit de couple dont le second membre n'a pas encore tranché (test « à froid » prévu).

*Ce que personne n'a dit.*
- Une app de foyer vendue à l'unité se paie deux fois (deux comptes store) sauf partage familial activé ; et le lien d'invitation
  pointe sur l'hébergement web public : « version non publique » et « inviter le foyer » se contredisent sans domaine propre.
- Le différenciateur n° 1 (rythme d'achat) n'apparaît qu'après deux achats validés par article, soit 4 à 6 semaines : un test
  à 50 foyers mesuré en S4 montre à peine la fonction phare.
- Sur iPhone, Safari efface le stockage d'un site **non installé sur l'écran d'accueil** après 7 jours sans visite : « tout sur le
  téléphone » devient « tout perdu en silence » pour qui n'a pas installé.
- Le vrai risque nommé par l'expert du panel (outil d'une seule personne, objectif ≥ 2 contributeurs) n'est repris par aucun
  rapport, et personne ne dit comment le mesurer.
- Vendre, c'est devenir responsable de traitement de 50 foyers (prénoms, habitudes, photos) sur un projet Supabase gratuit au nom
  d'un particulier, maintenu éveillé par un ping : continuité si le hobby s'arrête, effacement à la demande, non chiffrés.

*Surestimé.* « Changer de téléphone = tout perdre » (Exporter/Importer existent, le lien se régénère depuis tout téléphone membre,
le serveur garde tout) ; « Remboursé » par n'importe qui et le `u` géant (la menace est un membre du foyer, qui peut déjà tout
vider : cohérent avec le modèle de confiance, la rotation du code suffit) ; cibles tactiles en « bloquant » (une journée de CSS ;
le vrai bloquant UX est le parcours de qui rejoint).

*Vérifié.* Perte de données au quota : **confirmée** (séquence écrite avant la sauvegarde). « Tout perdre sans son lien » :
**infirmé en partie** (export JSON complet, import, lien recalculé à la demande).

*À ne pas construire.* Des comptes utilisateurs (tuent « sans compte », alourdissent le RGPD, n'apportent rien que l'export et la
rotation du code ne donnent) ; la fusion champ par champ (un CRDT maison pour un conflit rare : corriger d'abord l'ordre
sauvegarde/séquence) ; notifications app fermée et scan par API (coût serveur qu'un achat unique à 2,99 € ne couvre pas).

*Le risque unique.* Que l'app reste l'outil d'une seule personne : tout ce qui a été jugé « optimal » l'a été par celui qui l'a construite.

*Une semaine, dans l'ordre.* 1) Inverser sauvegarde/séquence, afficher « stockage plein » au lieu de « À jour », installer l'app sur
l'écran d'accueil des deux téléphones. 2) Deux semaines de vraies courses avec Raphaëlle en test à froid, sans rien développer :
compter qui ajoute. 3) Si ≥ 2 contributeurs à la maison seulement : distribuer gratuitement à 50 foyers avec un lien allégé (code
seul), une limite de taille côté SQL et un compteur « 2e contributeur » calculé depuis la table `records` ; vendre après, pas avant.

## 5. Business plan et modèle retenu (piste du propriétaire, 25 octobre 2026)

Hypothèses (ordres de grandeur, non vérifiés) : prix 2,99 € TTC ≈ 2,49 € HT, commission des stores 15 % → **≈ 2,10 € net par vente**.

| Scénario | Ventes par an | Revenu net (avant cotisations) |
|---|---|---|
| Prudent (bouche-à-oreille, un store) | 100 | ≈ 210 € |
| Réaliste (test à 50 foyers réussi) | 500 | ≈ 1 050 € |
| Optimiste | 2 000 | ≈ 4 200 € |

Une seule app sans acquisition rapporte peu : le revenu annexe visé vient du portefeuille de 2 ou 3 apps et de l'expérience acquise.

Dépenses : Google Play 25 $ une fois (équilibre à ≈ 20 ventes) ; Apple 99 $/an (≈ 45 ventes/an pour l'amortir) ; domaine ≈ 15 €/an ;
adresse publique DSA : 0 € (adresse perso) ou 120 à 360 €/an (domiciliation) ; Supabase 0 € puis 25 $/mois (≈ 130 ventes/an) ;
INPI 190 € (facultatif) ; textes légaux 0 € (rédigés par le propriétaire, expert-comptable).

**Statut** : pas de société. Micro-entrepreneur (cotisations ≈ 26 %, plafond 77 700 €), « Simple App » déclaré comme nom commercial ;
les stores affichent le nom légal et l'adresse. Société (SASU/EURL) quand une deuxième app existe ou que le revenu le justifie.
À vérifier : TVA intracommunautaire sur les ventes via Apple et Google, BNC ou BIC, compatibilité avec l'activité d'expert-comptable.

**Modèle retenu pour étude : gratuit en solo, déblocage « Foyer » pour collaborer**
- Gratuit : 1 utilisateur, 100 % local, sans serveur, donc aucune panne possible. Un téléchargement gratuit est bien plus fréquent qu'un achat.
- Payant : déblocage unique de la collaboration (3,99 à 4,99 €), payé par le créateur de la liste ; la personne invitée rejoint gratuitement
  (un couple ne paie pas deux fois, chaque invitation fait de la publicité). Le coût serveur n'existe que pour les foyers qui collaborent.
- Pas d'abonnement pour l'instant (support continu), **pas de publicités** (contredisent « sans pub », consentement RGPD, formulaires
  plus lourds, revenu faible), **pas d'anglais** avant le test à deux (dictionnaire de rayons à refaire par langue).
- Conséquences techniques : achat intégré (Play Billing via TWA ; StoreKit sur iPhone) ; un drapeau « débloqué » enregistré sur la liste
  et vérifié côté serveur, sans compte utilisateur. Règles d'achat intégré, TVA et fraude à vérifier avant de s'y engager.

**Principe « zéro entretien »** (le propriétaire ne veut ni mises à jour à répétition ni surveillance de serveur) :
- Android seulement, via TWA : l'app chargée est le site, donc les évolutions passent par GitHub sans mise à jour de store ; rebuild d'environ
  1 h par an si Google exige une version d'Android plus récente (à vérifier).
- iPhone : version web installée sur l'écran d'accueil ; pas d'App Store (compte annuel, Xcode, Mac, refus possibles = la vraie charge).
- Supabase géré (aucun serveur à soi), plafond de dépense activé, contrôle de santé automatique (GitHub Actions, e-mail seulement en cas de panne).
- Fiche : « application terminée, correctifs de sécurité seulement » ; CGU : « service tant que l'application est commercialisée ».

## 6. Suite proposée

1. **Semaine 1, pour le foyer** : points 1, 2, 4, 4b (mémoire pleine, tickets par id, « Remboursé » confirmé, invitation à
   installer sur l'écran d'accueil), tests avec assertions. Puis gel.
2. **Semaines 2 et 3** : usage réel à deux, sans développement. Décision à la fin : foyer ou personne seule.
3. **Si foyer** : chantier distribuable dans l'ordre 10 (qui rejoint), 5 à 9 (accessibilité, réglages, paniers, repas), 11 (lien
   = code seul, plafonds SQL), 12 et 12b (révocation, effacement, compteur), 13 à 15 (dépôt privé, domaine, confidentialité,
   nom, manifest, CI).
4. **En parallèle, décisions Simple App** : statut, nom, adresse, version web.
5. **Puis** : test gratuit à 50 foyers sur Android pendant 8 semaines ; après un go, prix à 2,99 € et Apple.

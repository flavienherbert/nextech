# Raccourci iPhone « Envoyer au robot »

Version de test du 23 novembre 2026. C'est **la seule action** que vous faites pour lancer le robot sur une campagne.

## 1. Comment l'utiliser

1. Dans WhatsApp, touchez le lien de la campagne. Si la page s'ouvre dans WhatsApp, touchez l'icône pour **l'ouvrir dans Safari**.
   - Le Raccourci ne fonctionne que dans Safari, la seule application où vous êtes connecté à Content Rewards.
2. Vérifiez que vous êtes connecté et **inscrit à la campagne**. Rejoindre une campagne reste votre geste à vous, jamais celui du robot.
3. Touchez **Partager**, puis **« Envoyer au robot »**.
4. Un résumé s'affiche, par exemple : `4 812 caractères · 2 lien(s) Drive · 1 Doc/Sheet`.
   - S'il commence par ⚠️, l'information n'est pas complète : corrigez (inscrivez-vous, ouvrez la bonne page) et relancez.
   - Sinon, touchez **OK** pour envoyer.

## 2. Ce qui est transmis, et ce qui ne l'est jamais

| Transmis | Jamais transmis |
|---|---|
| L'adresse de la page (le lien de la campagne) | Cookies, identifiants, jetons de session |
| Le texte complet de la page, **y compris les sections repliées** présentes dans la page | Le stockage local du navigateur |
| Tous les liens de la page : boutons, cadres intégrés et adresses écrites en clair dans le texte | Tout ce qui n'est pas sur la page affichée |
| Le titre et les intertitres de la page | |

Le script ne clique sur rien, ne charge rien et ne se connecte à rien : il lit ce que vous voyez. C'est l'équivalent d'un copier-coller complet, lancé par vous. Il n'y a donc **ni connexion automatisée, ni cookie réutilisé, ni contournement** (voir `ETAPE-0.md`, vérification des conditions d'utilisation).

## 3. Ce que le robot vérifie à la réception

Le robot ne complète jamais une information absente. Il constate et vous prévient.

| Élément | Si absent |
|---|---|
| Lien de campagne `contentrewards.com/c/campaigns/…` | **Arrêt** et message |
| Sections encore verrouillées (« Visible once you join ») | **Arrêt** : « rejoignez la campagne, puis renvoyez » |
| Nom de la campagne | **Arrêt** |
| Texte complet (au moins 500 caractères) | **Arrêt** |
| Liens Google Drive (dossiers et fichiers, `resourcekey` conservé) | **Arrêt** si aucun ; **à vérifier** s'il n'y en a qu'un (clips prêts ou vidéos longues manquants) |
| Nombre de fichiers annoncés par la page, comparé aux liens capturés | **À vérifier** si moins de liens que de fichiers annoncés |
| Liens Google Docs et Sheets | Signalé comme « aucun trouvé » |
| Rémunération par plateforme (par 1 000 vues, minimum, maximum) et budget | **À vérifier** : « non trouvé », jamais estimé |
| Nombre de règles annoncé (« Content requirements : N rules ») | L'agent 1 devra citer autant de règles, chacune avec sa phrase d'origine |
| Conditions de validation (seuils de vues, de pourcentage, d'engagement) | **À vérifier** si aucune n'est repérée |
| Mention publicitaire | **Toujours « à vérifier »**. Indice trouvé : à confirmer par l'agent 1. Rien trouvé : à vérifier par vous selon les obligations applicables, jamais considérée comme inutile |
| Liens courts (bit.ly…) ou hébergeurs non pris en charge (Dropbox, WeTransfer…) | **À vérifier** |

## 4. Tests faits le 23/11/2026 (sur ordinateur, sans iPhone)

- **Méthode.** Navigateur Chromium sur ordinateur, **réseau coupé : aucune requête envoyée à Content Rewards**. Pour la page publique, j'ai utilisé la copie enregistrée pendant l'audit ; les autres pages de test ont été fabriquées.
- **Résultats.** 4 cas, 4 résultats conformes à l'attendu.

| Page testée | Résumé affiché | Verdict du robot |
|---|---|---|
| Vraie page publique, non connecté | ⚠️ sections verrouillées · 0 lien Drive | **Incomplet** : arrêt, avec la consigne de rejoindre la campagne. Rémunérations (3 plateformes) et budget bien lus, « 1 fichier annoncé, 0 capturé » signalé |
| Page de test « inscrit » : 2 liens Drive, 1 Doc, 1 Sheet écrit en clair dans une section repliée, 1 lien court | 2 liens Drive · 2 Doc/Sheet | **Complet avec points à vérifier** (mention publicitaire, lien court) |
| La même avec « #pub » dans un texte masqué | identique | Mention publicitaire : « indice trouvé, à confirmer » |
| Page de test où les fichiers sont des boutons sans lien | ⚠️ aucun lien Drive | **Incomplet** : « 2 fichiers annoncés, 0 lien Drive capturé » |

**Point vérifié.** Les règles placées dans une section **repliée** ou **masquée** n'apparaissent pas dans le texte affiché, mais **sont bien capturées** par le texte complet. Sans cela, 3 règles sur 9 auraient été perdues dans le cas de test.

**Limites restantes, que seul l'essai sur votre iPhone peut lever :**
1. Le test a tourné sur Chromium, pas sur Safari. Le script n'utilise que des fonctions standard, gérées par Safari depuis des années.
2. Je n'ai jamais vu la vraie page d'une campagne **rejointe**. Si Content Rewards ne charge les règles ou les fichiers **qu'après un toucher** (contenu absent de la page tant qu'on n'a pas ouvert la section), ils ne sont pas capturés. Le robot le **détecte** en comparant avec les nombres annoncés et vous prévient ; vous ouvrez alors la section avant de relancer.
3. Un fichier que Content Rewards héberge lui-même, et non sur Drive, ne pourra pas être téléchargé par le robot sans votre session. Il sera signalé, jamais contourné.
4. Au premier lancement, iOS demande l'autorisation d'exécuter le script sur contentrewards.com : répondez « Toujours autoriser ».

## 5. Construire la version de test (10 min, sur iPhone)

Pendant la version de test, la capture est **enregistrée dans votre Drive** pour que je l'analyse avec vous. À la phase 3, la dernière action sera remplacée par un envoi direct au robot.

1. *Réglages* → *Apps* → *Raccourcis* → *Avancé* : activez **« Autoriser l'exécution de scripts »**.
2. Dans Google Drive, créez un dossier **`CAPTURES ROBOT`**.
3. Dans l'app **Raccourcis**, touchez **+** et nommez le raccourci **« Envoyer au robot »**.
4. Touchez l'icône **ⓘ** : activez **« Afficher dans la feuille de partage »**. Dans *Types acceptés*, ne gardez que **« Pages web Safari »**.
5. Ajoutez l'action **« Exécuter JavaScript sur la page web »**, avec « Entrée du raccourci » en entrée. Effacez le script proposé et collez celui du § 6. Pour le copier : ouvrez ce document dans Safari sur github.com, bouton « Raw », puis sélectionnez le script.
6. Ajoutez **« Obtenir le dictionnaire à partir de »**, avec « Résultat JavaScript » en entrée.
7. Ajoutez **« Obtenir la valeur du dictionnaire »**, clé : `resume`.
8. Ajoutez **« Afficher l'alerte »** avec « Valeur du dictionnaire » comme message. Laissez activé « Afficher le bouton Annuler » : *Annuler* arrête tout.
9. Ajoutez **« Définir le nom »**, avec « Résultat JavaScript » en entrée et le nom `capture.json`.
10. Ajoutez **« Partager »** avec le fichier nommé. À l'exécution, choisissez **Drive**, puis le dossier `CAPTURES ROBOT`.

## 6. Script (version `capture-1`)

À coller tel quel dans l'action « Exécuter JavaScript sur la page web » :

```javascript
// Raccourci iPhone « Envoyer au robot » : script de l'action « Exécuter JavaScript sur la page web ».
// Il lit UNIQUEMENT ce que la page affiche déjà : texte (y compris les sections repliées présentes dans la page)
// et liens. Il ne clique sur rien, ne charge rien, ne lit ni cookie, ni stockage local, ni jeton.
// Il renvoie une chaîne JSON au Raccourci via completion().
(function () {
  var VERSION = "capture-1";
  var LIMITE = 500000; // caractères ; au-delà, le champ « tronque » le signale (jamais de coupe silencieuse)

  function propre(s) {
    return (s || "").replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  // Texte tel qu'affiché (mise en page conservée)
  var texteVisible = propre(document.body ? document.body.innerText : "");

  // Texte complet du document, y compris les éléments masqués (accordéons repliés, onglets inactifs)
  var morceaux = [];
  var marcheur = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
      var p = n.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      var t = p.tagName;
      if (t === "SCRIPT" || t === "STYLE" || t === "NOSCRIPT" || t === "TEMPLATE") return NodeFilter.FILTER_REJECT;
      return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  var noeud;
  while ((noeud = marcheur.nextNode())) morceaux.push(noeud.nodeValue.trim());
  var texteComplet = propre(morceaux.join("\n"));

  // Tous les liens : balises <a>, attributs data-*, cadres intégrés, et adresses écrites en clair dans le texte
  var liens = [];
  var vus = {};
  function ajouter(url, texte, source) {
    if (!url) return;
    try { url = new URL(url, location.href).href; } catch (e) { return; }
    if (!/^https?:/i.test(url)) return;
    var cle = url + "|" + source;
    if (vus[cle]) return;
    vus[cle] = true;
    liens.push({ url: url, texte: propre(texte).slice(0, 300), source: source });
  }
  var ancres = document.querySelectorAll("a[href]");
  for (var i = 0; i < ancres.length; i++) {
    var a = ancres[i];
    ajouter(a.getAttribute("href"), a.innerText || a.textContent || a.getAttribute("aria-label") || a.title, "lien");
  }
  var donnees = document.querySelectorAll("[data-href],[data-url]");
  for (var j = 0; j < donnees.length; j++) {
    var d = donnees[j];
    ajouter(d.getAttribute("data-href") || d.getAttribute("data-url"), d.textContent, "attribut");
  }
  var cadres = document.querySelectorAll("iframe[src]");
  for (var k = 0; k < cadres.length; k++) ajouter(cadres[k].getAttribute("src"), cadres[k].title, "cadre");
  var enClair = texteComplet.match(/https?:\/\/[^\s"'<>()\]]+/g) || [];
  for (var m = 0; m < enClair.length; m++) ajouter(enClair[m].replace(/[.,;:!?]+$/, ""), "", "texte");

  var titres = [];
  var h = document.querySelectorAll("h1,h2,h3");
  for (var q = 0; q < h.length; q++) titres.push({ niveau: h[q].tagName, texte: propre(h[q].textContent).slice(0, 300) });

  // Résumé affiché sur l'iPhone avant l'envoi, pour voir tout de suite si la capture est incomplète
  var nDrive = 0, nDocs = 0, idsVus = {};
  for (var z = 0; z < liens.length; z++) {
    var id = (liens[z].url.match(/(?:\/folders\/|\/file\/d\/|\/d\/|[?&]id=)([A-Za-z0-9_-]{10,})/) || [])[1];
    if (!id || idsVus[id]) continue;
    idsVus[id] = true;
    if (/drive\.google\.com|drive\.usercontent\.google\.com/.test(liens[z].url)) nDrive++;
    else if (/docs\.google\.com/.test(liens[z].url)) nDocs++;
  }
  var verrouille = /visible once you join|join to unlock|hidden until you join/i.test(texteComplet);
  var resume = (verrouille ? "⚠️ SECTIONS VERROUILLÉES : rejoignez la campagne puis relancez\n" : "") +
    texteComplet.length + " caractères · " + nDrive + " lien(s) Drive · " + nDocs + " Doc/Sheet" +
    (nDrive === 0 ? "\n⚠️ Aucun lien Drive trouvé" : "");

  var resultat = {
    version: VERSION,
    resume: resume,
    capture_le: new Date().toISOString(),
    url: location.href,
    titre_page: document.title,
    langue: document.documentElement.lang || "",
    titres: titres,
    texte_visible: texteVisible.slice(0, LIMITE),
    texte_complet: texteComplet.slice(0, LIMITE),
    tronque: texteVisible.length > LIMITE || texteComplet.length > LIMITE,
    liens: liens
  };
  var sortie = JSON.stringify(resultat);
  if (typeof completion === "function") completion(sortie); else return sortie;
})();
```

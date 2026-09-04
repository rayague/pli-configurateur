/**
 * ============================================================================
 * PLI · scene.js
 * ----------------------------------------------------------------------------
 * LA SCÈNE, ET LA RÈGLE QUI LA GOUVERNE.
 *
 *     RIEN NE BOUGE TANT QUE L'UTILISATEUR N'AGIT PAS.
 *
 * Pas de rotation automatique, pas de caméra qui dérive. C'est le tic numéro
 * un des configurateurs, et il vole le contrôle au visiteur — l'inverse
 * exact de ce que ce projet doit prouver.
 *
 * ON NE DESSINE PAS EN CONTINU
 *
 * La plupart des scènes Three.js appellent `requestAnimationFrame` en boucle
 * infinie et redessinent soixante fois par seconde une image identique. Sur
 * un téléphone, ça chauffe et ça vide la batterie pendant qu'on lit du texte.
 *
 * Ici, la boucle N'EXISTE PAS au repos. `demander()` programme UNE image ;
 * tant que personne ne demande, aucun `requestAnimationFrame` n'est en vol,
 * et le processeur graphique est libre.
 *
 * C'est trois lignes de plus et presque personne ne le fait.
 *
 * L'INERTIE, ET POURQUOI ELLE EST INDISPENSABLE
 *
 * Un objet qui s'arrête net au relâchement du doigt n'a pas de masse. Il
 * paraît dessiné, pas fabriqué. L'amortissement exponentiel sur ~600 ms est
 * ce qui fait croire à de l'acier.
 * ============================================================================
 */

import {
  Scene, PerspectiveCamera, WebGLRenderer, Color, Mesh,
  PlaneGeometry, ShadowMaterial,
  DirectionalLight, AmbientLight, PMREMGenerator
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const ATELIER = 0x151719;

/* Trois distances, pas de zoom libre. Un configurateur où l'on peut se
   perdre dans l'espace est un configurateur où l'on se perd. */
export const CADRAGES = {
  /* « ensemble » s'adapte à la taille du meuble : `marge` est la part de
     champ laissée autour, `hauteur` une fraction de la hauteur de l'objet.
     Les deux gros plans, eux, sont à distance fixe — on veut voir le pli
     de la même façon quelle que soit la configuration. */
  ensemble: { marge: 1.04, hauteur: 0.20, cible: 0.00 },
  pli:      { fixe: true, distance: 0.80, hauteur: 0.16, cible: 0.02 },
  fixation: { fixe: true, distance: 0.46, hauteur: 0.08, cible: -0.03 }
};

const REDUIT = matchMedia('(prefers-reduced-motion: reduce)').matches;


export function creerScene(toile) {
  /* ── le rendu ──────────────────────────────────────────────────────────
     L'anticrénelage est ce qui fait « propre » : sur des arêtes droites,
     son absence se voit immédiatement. Le ratio de pixels est plafonné à
     2 — au-delà on paie quatre fois le coût sans que personne ne voie la
     différence.                                                          */

  let rendu;
  try {
    rendu = new WebGLRenderer({ canvas: toile, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;                      /* pas de WebGL : l'appelant se replie */
  }
  if (!rendu.getContext()) return null;

  const mobile = innerWidth < 768;

  rendu.setPixelRatio(Math.min(devicePixelRatio, 2));
  rendu.shadowMap.enabled = true;
  rendu.shadowMap.type = 2;           /* PCFSoftShadowMap : arêtes douces  */

  const scene = new Scene();
  scene.background = new Color(ATELIER);

  /* ── la caméra ─────────────────────────────────────────────────────────*/

  const camera = new PerspectiveCamera(38, 1, 0.05, 40);
  let cadrage = { ...CADRAGES.ensemble };
  let azimut = -0.42;                 /* trois quarts : on voit deux faces */
  let boite = { largeur: 1.2, hauteur: 1.44, profond: 0.28 };

  /* LA DISTANCE N'EST PAS UNE CONSTANTE.

     Une étagère 1 × 2 fait 40 cm de large et 72 de haut ; une 5 × 6 fait
     2 m sur 2,16. Une distance fixe cadre bien l'une et coupe l'autre —
     et c'est exactement ce qui s'était passé au premier rendu.

     On calcule donc ce qu'il faut pour contenir l'objet dans le champ,
     verticalement ET horizontalement. L'horizontale se mesure sur la
     DIAGONALE du plan, pas sur la largeur : l'objet tourne, et de trois
     quarts il occupe plus que sa face.                                   */

  function distanceUtile() {
    if (cadrage.fixe) return cadrage.distance;

    /* On cadre sur la SPHÈRE englobante, pas sur la boîte.

       Une première version calculait la distance sur la hauteur et la
       largeur séparément. Elle oubliait deux choses : que la caméra est
       surélevée — donc le bas de l'objet s'écarte de l'axe optique — et
       que l'objet tourne. Le bas de l'étagère sortait du cadre.

       Une sphère est la même vue de partout. Si elle tient dans le champ,
       l'objet tient, quel que soit l'azimut et quelle que soit la hauteur
       de caméra. C'est deux lignes de moins et un cas d'erreur en moins. */

    const rayon = Math.hypot(boite.largeur, boite.hauteur, boite.profond) / 2;
    const demiV = (camera.fov * Math.PI) / 360;
    const demiH = Math.atan(Math.tan(demiV) * Math.max(0.4, camera.aspect));
    return (rayon / Math.sin(Math.min(demiV, demiH))) * cadrage.marge;
  }

  function placerCamera() {
    const d = distanceUtile();
    const h = cadrage.fixe ? cadrage.hauteur : boite.hauteur * cadrage.hauteur;
    camera.position.set(Math.sin(azimut) * d, h, Math.cos(azimut) * d);
    camera.lookAt(0, cadrage.cible, 0);
  }

  /* ── les lumières : 80 % du résultat ───────────────────────────────────

     Une principale chaude en haut à droite, qui sculpte et porte l'ombre.
     Un contre-jour FROID derrière-gauche, qui détache la silhouette du
     fond sombre — sans lui, l'objet se fond dans le noir et la scène
     paraît plate. Un remplissage faible pour que les faces d'ombre ne
     soient pas des trous.                                                */

  const principale = new DirectionalLight(0xFFF1E0, 1.9);
  principale.position.set(2.2, 2.8, 1.9);
  principale.castShadow = true;
  principale.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  principale.shadow.camera.near = 0.5;
  principale.shadow.camera.far = 12;
  principale.shadow.bias = -0.0009;
  principale.shadow.normalBias = 0.015;
  scene.add(principale);

  /* LE CONTRE-JOUR EST CE QUI SAUVE LA SCÈNE.

     Sur fond --atelier, un objet en acier noir éclairé seulement de face
     devient une silhouette : on ne distingue plus l'arête du fond. Une
     source froide placée DERRIÈRE et à l'opposé dessine un liseré sur
     chaque arête tournée vers elle. C'est ce liseré qui donne le volume,
     et il coûte une lumière. */
  const contre = new DirectionalLight(0xAECDF0, 2.2);
  contre.position.set(-2.6, 1.4, -2.4);
  scene.add(contre);

  /* Un remplissage par le bas, très faible : sans lui, les dessous de
     tablette sont des trous noirs et le meuble paraît découpé. */
  const dessous = new DirectionalLight(0x6B7A8A, 0.45);
  dessous.position.set(-0.6, -2.0, 1.2);
  scene.add(dessous);

  scene.add(new AmbientLight(0x4C5866, 0.30));

  /* ── le sol : invisible, sauf là où l'objet pose ────────────────────────

     Un objet sans ombre portée flotte, et l'œil le lit comme une image
     détourée plutôt que comme une chose posée quelque part.

     `ShadowMaterial` ne peint QUE l'ombre : le plan reste invisible sur le
     fond sombre, et seul le contact apparaît. C'est ce qui ancre le meuble
     sans ajouter de décor. */

  const sol = new Mesh(
    new PlaneGeometry(14, 14),
    new ShadowMaterial({ opacity: 0.42 })
  );
  sol.rotation.x = -Math.PI / 2;
  sol.receiveShadow = true;
  scene.add(sol);

  /* ── l'environnement, sans aucun fichier ───────────────────────────────
     Trois lignes, et l'acier cesse d'être une couleur pour devenir une
     surface. C'est le meilleur rapport qualité/effort de toute la scène. */

  const pmrem = new PMREMGenerator(rendu);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  /* ── on ne dessine que sur demande ─────────────────────────────────────*/

  let planifie = false;
  let avant = null;

  function dessiner() {
    planifie = false;
    if (avant) avant();
    rendu.render(scene, camera);
  }

  function demander() {
    if (planifie) return;
    planifie = true;
    requestAnimationFrame(dessiner);
  }

  /* ── la taille ─────────────────────────────────────────────────────────*/

  function redimensionner() {
    const l = toile.clientWidth || 1, h = toile.clientHeight || 1;
    rendu.setSize(l, h, false);
    camera.aspect = l / h;
    camera.updateProjectionMatrix();
    placerCamera();
    demander();
  }

  const observateur = new ResizeObserver(redimensionner);
  observateur.observe(toile);

  /* ── la rotation : à la main, jamais OrbitControls ─────────────────────

     OrbitControls donnerait la rotation libre, le zoom à la molette et le
     déplacement au clic droit — trois libertés dont ce produit n'a pas
     besoin et qui permettent de mettre l'étagère à l'envers.

     Contrainte à l'axe Y. On ne peut pas casser le cadrage.              */

  const SENSIBILITE = 0.0075;         /* radians par pixel                 */
  const TAU = 0.13;                   /* constante d'amortissement, en s   */
  const SEUIL = 0.0006;               /* en dessous, on considère l'arrêt  */

  let tient = false, dernierX = 0, dernierT = 0, vitesse = 0;
  let glisse = false;
  let pointeur = null;   /* releasePointerCapture EXIGE son identifiant */

  function auDebut(ev) {
    tient = true; glisse = false;
    dernierX = ev.clientX; dernierT = performance.now();
    vitesse = 0;
    pointeur = ev.pointerId;
    try { toile.setPointerCapture(ev.pointerId); } catch (e) {}
    toile.classList.add('tenue');
  }

  function auMouvement(ev) {
    if (!tient) return;
    const dx = ev.clientX - dernierX;
    if (!glisse && Math.abs(dx) < 3) return;    /* un clic n'est pas un glissé */
    glisse = true;

    const t = performance.now();
    const dt = Math.max(1, t - dernierT) / 1000;

    azimut -= dx * SENSIBILITE;
    vitesse = REDUIT ? 0 : (-dx * SENSIBILITE) / dt;

    dernierX = ev.clientX; dernierT = t;
    placerCamera();
    demander();
    ev.preventDefault();
  }

  let inertieEnCours = false;

  function amortir() {
    let precedent = performance.now();

    function pas(t) {
      const dt = Math.min(0.05, (t - precedent) / 1000);
      precedent = t;

      azimut += vitesse * dt;
      vitesse *= Math.exp(-dt / TAU);

      placerCamera();
      rendu.render(scene, camera);

      if (Math.abs(vitesse) > SEUIL) requestAnimationFrame(pas);
      else { inertieEnCours = false; vitesse = 0; }
    }

    if (!inertieEnCours) { inertieEnCours = true; requestAnimationFrame(pas); }
  }

  function relacher() {
    if (!tient) return;
    tient = false;
    toile.classList.remove('tenue');
    if (pointeur !== null) { try { toile.releasePointerCapture(pointeur); } catch (e) {} pointeur = null; }
    if (Math.abs(vitesse) > SEUIL && !REDUIT) amortir();
  }

  toile.addEventListener('pointerdown', auDebut);
  toile.addEventListener('pointermove', auMouvement, { passive: false });
  toile.addEventListener('pointerup', relacher);
  toile.addEventListener('pointercancel', relacher);
  toile.addEventListener('pointerleave', relacher);

  /* Le clavier tourne aussi : la 3D n'est pas réservée aux souris. */
  toile.addEventListener('keydown', ev => {
    const pas = ev.shiftKey ? 0.35 : 0.12;
    if (ev.key === 'ArrowLeft')  { azimut += pas; placerCamera(); demander(); ev.preventDefault(); }
    if (ev.key === 'ArrowRight') { azimut -= pas; placerCamera(); demander(); ev.preventDefault(); }
  });

  redimensionner();

  return {
    scene, camera, rendu, demander,

    /* Ce qui doit être recalculé juste avant chaque image. */
    avantChaqueImage(f) { avant = f; },

    cadrer(nom) {
      const c = CADRAGES[nom]; if (!c) return;
      cadrage = { ...c };
      placerCamera();
      demander();
    },

    /* L'objet a changé de taille : le sol descend avec lui, le volume
       d'ombre se resserre dessus, et la caméra recule ce qu'il faut.

       Le volume d'ombre suit les cotes RÉELLES : un volume trop large
       étale les 2048 pixels de la carte sur du vide et rend les ombres
       molles ; trop étroit, il les coupe net au bord. */
    encadrer({ largeur, hauteur, profond }) {
      boite = { largeur, hauteur, profond };
      sol.position.y = -hauteur / 2;

      const rayon = Math.hypot(largeur, hauteur, profond) / 2 + 0.15;
      const o = principale.shadow.camera;
      o.left = -rayon; o.right = rayon; o.top = rayon; o.bottom = -rayon;
      o.far = rayon * 6;
      o.updateProjectionMatrix();

      placerCamera();
      demander();
    },

    get azimut() { return azimut; },
    set azimut(v) { azimut = v; placerCamera(); demander(); },

    /* Combien d'appels de dessin la dernière image a-t-elle coûté. Le
       budget du projet est de cinquante ; on veut le savoir, pas
       l'espérer. */
    stats() {
      const i = rendu.info;
      return { appels: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries };
    },

    detruire() {
      observateur.disconnect();
      rendu.dispose();
    }
  };
}

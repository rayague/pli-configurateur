/**
 * ============================================================================
 * PLI · module.js
 * ----------------------------------------------------------------------------
 * LA GÉOMÉTRIE, ET LE GESTE QUI LA FABRIQUE.
 *
 * Aucun fichier de modèle. Une étagère en acier plié, ce sont des plaques et
 * des angles droits : la décrire en code coûte moins cher que l'exporter, et
 * la rend paramétrique par nature. Changer une dimension ne demande aucun
 * ré-export — c'est exactement ce qu'un configurateur doit être.
 *
 * UN MODULE EST UNE TÔLE PLIÉE DEUX FOIS
 *
 * Le procédé de PLI : la matière n'est ni coupée ni soudée, elle est repliée
 * sur elle-même. Le module reproduit ça littéralement — une seule bande de
 * tôle, deux plis :
 *
 *        déplié (p = 0)                    plié (p = 1)
 *
 *     ┌───┬─────────┬───┐              ┌─┐         ┌─┐
 *     │ G │  base   │ D │              │G│         │D│
 *     └───┴─────────┴───┘              └─┴─────────┴─┘
 *                                          base
 *
 * Les deux flancs pivotent sur l'arête de la base. C'est le pli, et c'est
 * une simple rotation autour de Z : la géométrie est translatée pour que
 * son origine SOIT la ligne de pli, et la matrice d'instance fait le reste.
 *
 * POURQUOI QUATRE MAILLAGES POUR TRENTE MODULES
 *
 * Un `InstancedMesh` par pièce — base, flanc gauche, flanc droit, tablette —
 * et chaque module n'est qu'une matrice dans ces quatre tableaux.
 *
 * Trente modules coûtent donc QUATRE appels de dessin, pas cent vingt. Le
 * budget du projet en autorise cinquante ; on en consomme quatre, et ce
 * chiffre ne bouge pas quand la configuration grandit.
 *
 * Corollaire : le pli d'un module ne touche que sa matrice. Ceux qui ne
 * changent pas ne sont pas recalculés, et surtout ils ne rebougent pas —
 * c'est la règle la plus importante du configurateur.
 * ============================================================================
 */

import {
  BoxGeometry, InstancedMesh, MeshStandardMaterial,
  Matrix4, Vector3, Quaternion, Euler, DynamicDrawUsage, Group
} from 'three';

/* ── les cotes, en mètres ────────────────────────────────────────────────
   Ce sont des dimensions de meuble réel, pas des unités arbitraires : la
   caméra, les lumières et les ombres se règlent une fois pour toutes si
   l'échelle est vraie.                                                    */

export const COTES = {
  largeur:   0.40,   /* largeur d'une case                                 */
  hauteur:   0.36,   /* hauteur d'une case, flanc compris                  */
  profond:   0.28,   /* profondeur du meuble                               */
  tole:      0.006,  /* épaisseur de la tôle. 4 mm réels, 6 pour la lire   */
  tablette:  0.018   /* chêne massif, 18 mm                                */
};

/* Le flanc monte jusqu'au haut de la case, moins l'épaisseur de la base. */
const HAUT_FLANC = COTES.hauteur - COTES.tole;

/* La tablette est en retrait de l'épaisseur des flancs : on voit l'arête
   d'acier de chaque côté du bois. C'est ce détail qui dit « inséré » plutôt
   que « posé ». */
const LARG_TABLETTE = COTES.largeur - 2 * COTES.tole;


/* ── les finitions ───────────────────────────────────────────────────────
   L'acier thermolaqué est MAT. Une rugosité basse donnerait du chrome, et
   du chrome sur du mobilier français en acier plié, ça sonne faux.        */

export const ACIERS = {
  noir:   { nom: 'Noir',        couleur: 0x1E2124, rugosite: 0.68, metal: 0.18 },
  casse:  { nom: 'Blanc cassé', couleur: 0xE4E2DC, rugosite: 0.72, metal: 0.10 },
  rouge:  { nom: 'Rouge de repérage', couleur: 0xD8452F, rugosite: 0.66, metal: 0.14 }
};

export const TABLETTES = {
  chene:  { nom: 'Chêne',  couleur: 0xC89B62, rugosite: 0.76, metal: 0.0 },
  frene:  { nom: 'Frêne',  couleur: 0xDCC9A6, rugosite: 0.78, metal: 0.0 },
  acier:  { nom: 'Acier',  couleur: 0x8A9196, rugosite: 0.62, metal: 0.30 }
};


/* ── les géométries, créées une seule fois ───────────────────────────────

   Chaque pièce est translatée pour que son origine tombe là où on veut
   pivoter ou positionner :

     base      centrée — elle ne tourne pas
     flanc G   origine sur l'arête gauche, la pièce part vers −x
     flanc D   origine sur l'arête droite, la pièce part vers +x
     tablette  centrée

   Une géométrie dont l'origine est au bon endroit rend l'animation
   triviale. Une géométrie centrée obligerait à composer une translation
   avec chaque rotation, à chaque image, pour chaque module.              */

function geometries() {
  const base = new BoxGeometry(COTES.largeur, COTES.tole, COTES.profond);

  const flancG = new BoxGeometry(HAUT_FLANC, COTES.tole, COTES.profond);
  flancG.translate(-HAUT_FLANC / 2, 0, 0);

  const flancD = new BoxGeometry(HAUT_FLANC, COTES.tole, COTES.profond);
  flancD.translate(HAUT_FLANC / 2, 0, 0);

  const tablette = new BoxGeometry(LARG_TABLETTE, COTES.tablette, COTES.profond);

  return { base, flancG, flancD, tablette };
}


/* ── l'étagère ───────────────────────────────────────────────────────────*/

export function creerEtagere({ max = 30 } = {}) {
  const g = geometries();

  const acier = new MeshStandardMaterial({
    color: ACIERS.noir.couleur, roughness: ACIERS.noir.rugosite, metalness: ACIERS.noir.metal
  });
  const bois = new MeshStandardMaterial({
    color: TABLETTES.chene.couleur, roughness: TABLETTES.chene.rugosite, metalness: TABLETTES.chene.metal
  });

  const groupe = new Group();
  const pieces = {};

  for (const [nom, geo, mat] of [
    ['base', g.base, acier], ['flancG', g.flancG, acier],
    ['flancD', g.flancD, acier], ['tablette', g.tablette, bois]
  ]) {
    const m = new InstancedMesh(geo, mat, max);
    m.instanceMatrix.setUsage(DynamicDrawUsage);   /* on réécrit souvent */
    m.castShadow = true;
    m.receiveShadow = true;
    m.count = 0;
    m.frustumCulled = false;   /* la boîte englobante bouge à chaque pli */
    pieces[nom] = m;
    groupe.add(m);
  }

  /* Objets réutilisés d'une image à l'autre : en allouer à chaque module,
     à chaque image, c'est du ramassage de miettes en pleine rotation. */
  const M = new Matrix4();
  const P = new Vector3();
  const Q = new Quaternion();
  const E = new Euler();
  const S = new Vector3(1, 1, 1);

  /* La tablette n'apparaît que sur la fin du pli : la tôle se forme
     d'abord, le bois se pose ensuite. Avant 60 %, elle n'existe pas. */
  const partTablette = p => (p <= 0.6 ? 0 : (p - 0.6) / 0.4);

  /* Écrit les quatre matrices d'UN module. Ne touche à rien d'autre. */
  function poser(i, colonne, rangee, pli, cfg) {
    const L = COTES.largeur, H = COTES.hauteur, e = COTES.tole;

    const X = (colonne - (cfg.colonnes - 1) / 2) * L;
    const Y = rangee * H - (cfg.rangees * H) / 2 + e / 2;

    /* la base : elle ne tourne jamais */
    P.set(X, Y, 0); Q.identity(); S.set(1, 1, 1);
    pieces.base.setMatrixAt(i, M.compose(P, Q, S));

    /* les flancs : la rotation EST le pli.
       0 → couché dans le plan de la base.  1 → dressé à 90°. */
    const angle = (Math.PI / 2) * pli;

    P.set(X - L / 2, Y, 0);
    E.set(0, 0, -angle); Q.setFromEuler(E);
    pieces.flancG.setMatrixAt(i, M.compose(P, Q, S));

    P.set(X + L / 2, Y, 0);
    E.set(0, 0, angle); Q.setFromEuler(E);
    pieces.flancD.setMatrixAt(i, M.compose(P, Q, S));

    /* la tablette : posée sur la base, une fois la tôle formée */
    const t = partTablette(pli);
    P.set(X, Y + e / 2 + COTES.tablette / 2, 0);
    Q.identity();
    S.set(t, t, t);
    pieces.tablette.setMatrixAt(i, M.compose(P, Q, S));
  }

  return {
    groupe, pieces, acier, bois, poser,

    /* Combien de modules sont dessinés. En dessous, les matrices restent
       en mémoire mais ne sont pas envoyées à la carte. */
    definirNombre(n) {
      for (const m of Object.values(pieces)) m.count = n;
    },

    /* Une seule montée vers la carte graphique par image, pas une par
       module : c'est ce qui fait la différence à trente modules. */
    valider() {
      for (const m of Object.values(pieces)) m.instanceMatrix.needsUpdate = true;
    },

    finition(nomAcier, nomTablette) {
      const a = ACIERS[nomAcier] || ACIERS.noir;
      const t = TABLETTES[nomTablette] || TABLETTES.chene;
      acier.color.setHex(a.couleur); acier.roughness = a.rugosite; acier.metalness = a.metal;
      bois.color.setHex(t.couleur);  bois.roughness = t.rugosite;  bois.metalness = t.metal;
    },

    dimensions(cfg) {
      return {
        largeur: Math.round(cfg.colonnes * COTES.largeur * 1000),
        hauteur: Math.round(cfg.rangees * COTES.hauteur * 1000),
        profond: Math.round(COTES.profond * 1000)
      };
    },

    liberer() {
      for (const m of Object.values(pieces)) { m.geometry.dispose(); m.dispose(); }
      acier.dispose(); bois.dispose();
    }
  };
}

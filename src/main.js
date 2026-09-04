/**
 * ============================================================================
 * PLI · main.js
 * ----------------------------------------------------------------------------
 * CE QUI SE PLIE, ET CE QUI NE BOUGE PAS.
 *
 * La règle la plus importante du configurateur tient en une phrase :
 *
 *     LES MODULES QUI NE CHANGENT PAS NE REBOUGENT PAS.
 *
 * Un configurateur qui rejoue toute la scène à chaque clic est fatigant, il
 * paraît lent même quand il est rapide, et il empêche de comparer deux
 * configurations voisines — on ne voit plus ce qui a changé.
 *
 * D'où la structure : chaque module garde SON état de pli. Ajouter une
 * colonne plie les six nouveaux modules et ne touche pas aux vingt-quatre
 * autres. Changer la finition ne plie rien du tout : c'est une couleur de
 * matériau, pas une transformation.
 *
 * L'ANIMATION NE DÉCORE PAS, ELLE EXPLIQUE
 *
 * La tôle ne se matérialise pas : elle se plie, en 400 ms. Le visiteur
 * comprend le procédé de fabrication en jouant avec le produit, ce qu'aucune
 * photo de catalogue ne fait.
 *
 * En mouvement réduit, les modules apparaissent pliés, sans geste. On ne
 * garde pas l'animation « en plus court » : on l'enlève.
 * ============================================================================
 */

import gsap from 'gsap';
import { creerScene } from './scene.js';
import { creerEtagere, COTES } from './module.js';
import { creerEtat, MODULES_MAX } from './config.js';

const REDUIT = matchMedia('(prefers-reduced-motion: reduce)').matches;

const DUREE_PLI = 0.4;      /* le geste, en secondes                       */
const CASCADE   = 0.05;     /* décalage d'un module au suivant             */

export function demarrer(toile) {
  const vue = creerScene(toile);
  if (!vue) return null;                    /* pas de WebGL : repli ailleurs */

  const etagere = creerEtagere({ max: MODULES_MAX });
  vue.scene.add(etagere.groupe);

  const etat = creerEtat();

  /* clé "colonne,rangée" → { c, r, pli, sortant } */
  const modules = new Map();
  const cle = (c, r) => c + ',' + r;

  /* Une seule écriture de matrices par image, juste avant le dessin. */
  vue.avantChaqueImage(() => {
    let i = 0;
    const cfg = etat.valeur;
    for (const m of modules.values()) etagere.poser(i++, m.c, m.r, m.pli, cfg);
    etagere.definirNombre(i);
    etagere.valider();
  });

  /* ── le pli ────────────────────────────────────────────────────────────*/

  function plier(m, vers, retard) {
    gsap.killTweensOf(m);

    if (REDUIT) {
      m.pli = vers;
      vue.demander();
      if (vers === 0) modules.delete(cle(m.c, m.r));
      return;
    }

    gsap.to(m, {
      pli: vers,
      duration: DUREE_PLI,
      delay: retard,
      ease: vers === 1 ? 'power3.out' : 'power2.in',
      onUpdate: vue.demander,
      onComplete: () => {
        vue.demander();
        if (vers === 0) modules.delete(cle(m.c, m.r));
      }
    });
  }

  /* Reconstruit l'ensemble des modules voulus, et ne touche qu'à la
     différence. C'est ici que vit la règle. */
  function accorder(cfg, premiere = false) {
    const voulus = new Set();
    for (let c = 0; c < cfg.colonnes; c++)
      for (let r = 0; r < cfg.rangees; r++) voulus.add(cle(c, r));

    /* ce qui arrive */
    let rang = 0;
    for (let c = 0; c < cfg.colonnes; c++) {
      for (let r = 0; r < cfg.rangees; r++) {
        const k = cle(c, r);
        if (modules.has(k)) { modules.get(k).sortant = false; continue; }
        const m = { c, r, pli: 0, sortant: false };
        modules.set(k, m);
        plier(m, 1, (premiere ? rang : rang) * CASCADE);
        rang++;
      }
    }

    /* ce qui part */
    for (const [k, m] of modules) {
      if (voulus.has(k) || m.sortant) continue;
      m.sortant = true;
      plier(m, 0, 0);
    }

    /* Le cadrage suit la taille du meuble. Une distance fixe cadrerait
       bien une étagère et couperait la suivante — cinq colonnes sur six
       rangées font cinq fois le volume d'une seule case. */
    vue.encadrer({
      largeur: cfg.colonnes * COTES.largeur,
      hauteur: cfg.rangees * COTES.hauteur,
      profond: COTES.profond
    });

    vue.demander();
  }

  /* ── les réactions ─────────────────────────────────────────────────────*/

  etat.ecouter((cfg, change) => {
    /* La finition ne plie rien : c'est une couleur, pas une géométrie. */
    if (change.includes('acier') || change.includes('tablette')) {
      etagere.finition(cfg.acier, cfg.tablette);
      vue.demander();
    }
    if (change.includes('colonnes') || change.includes('rangees')) {
      accorder(cfg);
    }
  });

  const depart = etat.valeur;
  etagere.finition(depart.acier, depart.tablette);
  accorder(depart, true);

  return {
    vue, etat, etagere,
    modules,
    dimensions: () => etagere.dimensions(etat.valeur),
    nombreModules: () => etat.valeur.colonnes * etat.valeur.rangees,
    cotes: COTES
  };
}

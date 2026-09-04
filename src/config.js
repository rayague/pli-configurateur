/**
 * ============================================================================
 * PLI · config.js
 * ----------------------------------------------------------------------------
 * L'ÉTAT, ET SON ADRESSE.
 *
 * Une configuration qui ne vit que dans la mémoire de l'onglet n'est pas une
 * configuration : c'est un brouillon. Le visiteur compose son étagère, ferme
 * l'onglet, et tout est perdu.
 *
 * Ici l'état EST l'URL :
 *
 *     ?c=3&r=4&a=noir&t=chene
 *
 * Il s'envoie par message, se met en favori, se rouvre le lendemain intact.
 * C'est ce qui transforme un joli objet 3D en outil commercial — et c'est
 * aussi ce qui sépare « il fait de jolies pages » de « il construit des
 * produits ».
 *
 * TOUTE VALEUR VENANT DE L'URL EST SUSPECTE
 *
 * Une URL se modifie à la main, se tronque au copier-coller, se fait mal
 * encoder par une messagerie. `?c=999` ne doit pas produire neuf cents
 * modules ni une page blanche : il doit produire cinq colonnes, en silence.
 *
 * On ne fait donc jamais confiance à ce qui entre. Chaque valeur est bornée
 * ou remplacée par son défaut, et la page s'ouvre toujours sur quelque chose
 * de valide.
 *
 * L'ÉCRITURE NE CRÉE PAS D'HISTORIQUE
 *
 * `replaceState`, jamais `pushState` : quarante clics sur « + » ne doivent
 * pas obliger à quarante retours en arrière pour quitter la page.
 * ============================================================================
 */

import { ACIERS, TABLETTES } from './module.js';

export const BORNES = {
  colonnes: { min: 1, max: 5, defaut: 3 },
  rangees:  { min: 2, max: 6, defaut: 4 }
};

export const DEFAUT = {
  colonnes: BORNES.colonnes.defaut,
  rangees:  BORNES.rangees.defaut,
  acier:    'noir',
  tablette: 'chene'
};

/* Le budget du projet : trente modules affichés au maximum. 5 × 6 = 30,
   donc les bornes le garantissent déjà — mais on le dit ici pour que la
   prochaine personne qui voudra « juste une colonne de plus » tombe sur
   la raison avant de toucher aux bornes. */
export const MODULES_MAX = BORNES.colonnes.max * BORNES.rangees.max;

const entier = (v, b) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return b.defaut;
  return Math.min(b.max, Math.max(b.min, n));
};

const parmi = (v, table, defaut) =>
  (typeof v === 'string' && Object.prototype.hasOwnProperty.call(table, v)) ? v : defaut;


export function lireURL(recherche = location.search) {
  const p = new URLSearchParams(recherche);
  return {
    colonnes: entier(p.get('c'), BORNES.colonnes),
    rangees:  entier(p.get('r'), BORNES.rangees),
    acier:    parmi(p.get('a'), ACIERS, DEFAUT.acier),
    tablette: parmi(p.get('t'), TABLETTES, DEFAUT.tablette)
  };
}

export function versParametres(cfg) {
  return 'c=' + cfg.colonnes + '&r=' + cfg.rangees + '&a=' + cfg.acier + '&t=' + cfg.tablette;
}

export function lienPartage(cfg) {
  return location.origin + location.pathname + '?' + versParametres(cfg);
}

export function ecrireURL(cfg) {
  history.replaceState(null, '', '?' + versParametres(cfg));
}


/* ── le magasin ──────────────────────────────────────────────────────────
   Un seul endroit change l'état, et tout le monde en est prévenu. Deux
   composants qui modifient la même configuration chacun de leur côté, ce
   sont deux vérités qui divergent au premier clic rapide.               */

export function creerEtat(depart = lireURL()) {
  let cfg = { ...DEFAUT, ...depart };
  const ecouteurs = new Set();

  return {
    get valeur() { return { ...cfg }; },

    ecouter(f) { ecouteurs.add(f); return () => ecouteurs.delete(f); },

    /* Renvoie ce qui a REELLEMENT change. L'appelant en a besoin : si
       seule la finition bouge, aucun module ne doit se replier. */
    definir(bout) {
      const avant = cfg;
      const apres = { ...cfg, ...bout };

      apres.colonnes = entier(apres.colonnes, BORNES.colonnes);
      apres.rangees  = entier(apres.rangees,  BORNES.rangees);
      apres.acier    = parmi(apres.acier, ACIERS, DEFAUT.acier);
      apres.tablette = parmi(apres.tablette, TABLETTES, DEFAUT.tablette);

      const change = Object.keys(apres).filter(k => apres[k] !== avant[k]);
      if (!change.length) return [];

      cfg = apres;
      ecrireURL(cfg);
      for (const f of ecouteurs) f({ ...cfg }, change);
      return change;
    }
  };
}

/**
 * ============================================================================
 * PLI · banc.js
 * ----------------------------------------------------------------------------
 * LE BANC D'ESSAI DE LA SEMAINE 1.
 *
 * Ce fichier ne fait pas partie du site. Il existe pour répondre à une seule
 * question — la scène tient-elle ? — avant qu'on ne dépense une journée à
 * l'habiller.
 *
 * Les commandes sont de vrais `<input type="radio">` dans de vrais
 * `<fieldset>`, même à ce stade. Pas parce que le banc a besoin d'être
 * accessible, mais parce que le panneau définitif le sera, et que remplacer
 * des `<div>` cliquables par des champs de formulaire en semaine 3 se paie
 * toujours plus cher que de commencer correctement.
 *
 * La 3D n'est qu'une visualisation. L'état vit dans les champs et dans
 * l'URL — c'est ce qui permet à la page de fonctionner sans WebGL du tout.
 * ============================================================================
 */

import gsap from 'gsap';
import { demarrer } from './main.js';
import { ACIERS, TABLETTES } from './module.js';
import { BORNES } from './config.js';

const toile = document.getElementById('scene');
const pilote = demarrer(toile);

if (!pilote) {
  /* Pas de contexte WebGL. Le repli complet arrive en semaine 4 ; ici on
     dit au moins la vérité au lieu d'afficher un cadre noir. */
  toile.replaceWith(Object.assign(document.createElement('p'), {
    className: 'sans-webgl',
    textContent: "Cette carte graphique ne fournit pas de contexte 3D. La configuration reste utilisable en dessous."
  }));
} else {
  construireCommandes();
  rafraichir();
  pilote.etat.ecouter(rafraichir);
}


function champ(parent, nom, valeur, libelle, coche) {
  const l = document.createElement('label');
  const i = document.createElement('input');
  i.type = 'radio'; i.name = nom; i.value = valeur; i.checked = coche;
  const s = document.createElement('span');
  s.textContent = libelle;
  l.append(i, s);
  parent.append(l);
  i.addEventListener('change', () => {
    if (!i.checked) return;
    const n = /^\d+$/.test(valeur) ? Number(valeur) : valeur;
    pilote.etat.definir({ [nom]: n });
  });
}

function construireCommandes() {
  const cfg = pilote.etat.valeur;

  const fc = document.getElementById('f-colonnes');
  for (let n = BORNES.colonnes.min; n <= BORNES.colonnes.max; n++)
    champ(fc, 'colonnes', String(n), String(n), n === cfg.colonnes);

  const fr = document.getElementById('f-rangees');
  for (let n = BORNES.rangees.min; n <= BORNES.rangees.max; n++)
    champ(fr, 'rangees', String(n), String(n), n === cfg.rangees);

  const fa = document.getElementById('f-acier');
  for (const [k, v] of Object.entries(ACIERS))
    champ(fa, 'acier', k, v.nom, k === cfg.acier);

  const ft = document.getElementById('f-tablette');
  for (const [k, v] of Object.entries(TABLETTES))
    champ(ft, 'tablette', k, v.nom, k === cfg.tablette);
}

function rafraichir() {
  const d = pilote.dimensions();
  document.getElementById('m-dim').textContent = d.largeur + ' × ' + d.hauteur + ' × ' + d.profond + ' mm';
  document.getElementById('m-mod').textContent = pilote.nombreModules();

  /* Les statistiques ne valent qu'APRÈS une image : on les lit à la
     suivante, sinon on affiche celles d'avant. */
  requestAnimationFrame(() => {
    const s = pilote.vue.stats();
    document.getElementById('m-app').textContent = s.appels;
  });
}

/* Un point d'entrée pour les sondes automatisées : mesurer depuis le
   navigateur vaut mieux que regarder et croire.

   GSAP est exposé pour qu'une sonde puisse AVANCER LE TEMPS au lieu de
   l'attendre. Chrome sans fenêtre étrangle `requestAnimationFrame` à deux
   images par seconde : un test qui patiente jusqu'à la fin d'une animation
   y mesure le navigateur, pas le produit. Mesuré, et appris à la dure —
   une première sonde avait conclu que la cascade était cassée alors que
   c'était elle qui ne tournait pas. */
window.PLI = pilote;
window.PLI_GSAP = gsap;

/* Le lecteur d URL, expose pour que les sondes eprouvent les entrees
   malformees sans avoir a recharger la page a chaque essai. */
import * as urls from './config.js';
window.PLI_URL = urls;

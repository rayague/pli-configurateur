# PLI — configurateur

Configurateur produit en 3D temps réel pour **PLI**, fabricant de mobilier
modulaire en acier plié et chêne massif. Une page, mobile d'abord.

Troisième projet vitrine du studio **Pineapple Effect**.

> **En cours.** Fin de semaine 1 sur 4 : l'étagère se génère, s'éclaire, se
> tourne et se plie. L'interface, les sections de contenu et le repli sans
> WebGL arrivent aux semaines 3 et 4.

---

## Ce que ce projet doit prouver

Les deux vitrines précédentes sont des documents qu'on fait défiler : le
visiteur subit le rythme. **Celui-ci est piloté.** Il assemble, choisit,
tourne autour, et repart avec un lien qui contient sa configuration.

Trois compétences qu'aucune page qui défile ne démontre : la gestion d'état,
la performance sous interaction — tenir 60 fps pendant qu'un utilisateur fait
tourner un objet est plus dur qu'au scroll, parce que le scroll est
prévisible et l'utilisateur non — et la 3D temps réel.

---

## Les deux décisions qui évitent le naufrage

Un WebGL moyen se repère instantanément, et entrer en comparaison directe
avec des studios qui ont dix ans d'avance est perdu d'avance. Deux
contraintes désamorcent ça.

**Géométrie simple.** Pas de chaussure, pas de flacon : de l'organique, c'est
six mois d'apprentissage. Une étagère en acier plié, ce sont des boîtes et
des plans. Toute la beauté vient de la lumière et des matériaux.

**Géométrie générée dans le code.** Aucun fichier de modèle — pas de glTF,
pas de Blender. La configuration est littéralement une boucle qui construit
des boîtes. On gagne six semaines d'apprentissage 3D, le résultat est plus
léger que n'importe quel modèle importé, et le produit devient paramétrique
par nature : changer une dimension ne demande aucun ré-export.

---

## La règle qui commande tout

> **Rien ne bouge tant que l'utilisateur n'agit pas.**

Pas de rotation automatique, pas de caméra qui dérive. C'est le tic numéro un
des configurateurs, et il vole le contrôle au visiteur — l'inverse exact de
ce que ce projet doit prouver.

Et son corollaire, qui gouverne le configurateur :

> **Ce qui ne change pas ne rebouge pas.**

Chaque module garde son propre état de pli. Ajouter une colonne plie les
nouveaux modules et ne touche pas aux autres. Un configurateur qui rejoue
toute la scène à chaque clic est fatigant, paraît lent même quand il est
rapide, et empêche de comparer deux configurations voisines.

---

## Ce qui est mesuré, pas estimé

| Poste | Mesure | Budget |
|---|---|---|
| Poids total gzip | **149 Ko** (dont ~147 pour Three.js) | 400 Ko |
| Appels de dessin | **4**, quel que soit le nombre de modules | 50 |
| Anciens modules déplacés à l'ajout d'une colonne | **0** | 0 |
| Modules repliés au changement de finition | **0** | 0 |
| `requestAnimationFrame` en vol au repos | **0** | 0 |

**Quatre appels de dessin.** Un `InstancedMesh` par pièce — base, flanc
gauche, flanc droit, tablette — et chaque module n'est qu'une matrice dans
ces quatre tableaux. Trente modules coûtent quatre appels, pas cent vingt, et
ce chiffre ne bouge pas quand la configuration grandit.

**Le pli est une rotation d'instance.** Les géométries de flanc sont
translatées pour que leur origine *soit* la ligne de pli. Plier devient une
rotation autour de Z, sans jamais toucher un sommet.

**Le rendu n'existe pas au repos.** Pas de boucle infinie : `demander()`
programme une image, et trois demandes consécutives n'en programment qu'une.
Un configurateur immobile ne doit consommer aucun processeur — c'est trois
lignes de plus, et presque personne ne le fait.

---

## L'état est dans l'URL

```
?c=3&r=4&a=noir&t=chene
```

Une configuration qui ne vit que dans la mémoire de l'onglet est un
brouillon. Celle-ci s'envoie par message, se met en favori, se rouvre le
lendemain intacte.

**Et tout ce qui vient de l'URL est suspect.** Une adresse se modifie à la
main, se tronque au copier-coller, se fait mal encoder par une messagerie.
Chaque valeur est donc bornée ou remplacée par son défaut :

| Entrée | Résultat |
|---|---|
| `?c=999&r=-4` | 5 colonnes, 2 rangées |
| `?c=abc` | les défauts |
| `?a=chrome&t=marbre` | noir, chêne |
| *(rien)* | les défauts |

La page s'ouvre toujours sur quelque chose de valide.

---

## Lancer le projet

```bash
npm install
```

```bash
npm run dev
```

`index.html` est pour l'instant le **banc d'essai** de la semaine 1 : laid en
interface, correct en rendu. C'est volontaire — habiller une scène dont on
n'a pas encore prouvé qu'elle tient soixante images par seconde, c'est
décorer avant de savoir si le mur porte.

---

## Pile technique

`Vite` · `HTML/CSS/JS vanilla` · `Three.js` · `GSAP` · `Lenis`

Three.js uniquement pour la scène. Pas de React Three Fiber : pas de React
dans le projet.

| Module | Rôle |
|---|---|
| `src/scene.js` | caméra, lumières, rendu à la demande, rotation à la main |
| `src/module.js` | géométrie générée, les quatre `InstancedMesh`, le pli |
| `src/config.js` | l'état, son encodage dans l'URL, et sa validation |
| `src/banc.js` | le banc d'essai — ne fera pas partie du site |

La rotation est écrite à la main plutôt qu'avec `OrbitControls` : celui-ci
donnerait la rotation libre, le zoom à la molette et le déplacement au clic
droit — trois libertés dont ce produit n'a pas besoin, et qui permettent de
mettre l'étagère à l'envers.

---

## Une note sur la mesure

Une première sonde automatisée a conclu que la cascade d'apparition était
cassée. Elle ne l'était pas : **Chrome sans fenêtre étrangle
`requestAnimationFrame` à deux images par seconde**, mesuré. La sonde
mesurait le navigateur, pas le produit — et son verdict « 0 image rendue au
repos » était un faux positif pour la même raison.

Elle avance maintenant la timeline GSAP au lieu de l'attendre, et compte les
`requestAnimationFrame` **programmés** plutôt que les images rendues. C'est
exactement ce que le rendu à la demande promet : ne rien demander quand rien
ne change.

---

## Ce qui reste

- **Semaine 2** — le liseré du contre-jour ne prend pas encore sur l'acier
  noir ; les trois finitions d'acier et les trois essences ; les fps mesurés
  sur un vrai téléphone.
- **Semaine 3** — le panneau de configuration au clavier, les sections de
  contenu, la copie française.
- **Semaine 4** — la signature, le repli sans WebGL, `prefers-reduced-motion`,
  et le déploiement.

Un défaut visible dès maintenant : **le haut du meuble n'est pas fini.** Les
flancs de la rangée supérieure montent sans rien porter. C'est cohérent avec
le modèle — la tablette est au bas de chaque case — mais ça se voit. Il
faudra une tablette de couronnement, ou des flancs plus courts en dernière
rangée.

// Catalogue des cas décrits dans la conception MireDo, chacun rendu par le même moteur.

export type CaseStatus = "Validé" | "Provisoire" | "À clarifier";
export interface Case {
  id: string;
  title: string;
  status: CaseStatus;
  doc: string;
  explain: string;
  mrd: string;
  show?: "timing" | "pitch" | "path";
}
export interface CaseSection {
  id: string;
  title: string;
  cases: Case[];
}

const H = (extra = "") => `noms: aucun\n${extra}`;

export const CASE_SECTIONS: CaseSection[] = [
  {
    id: "hauteur",
    title: "Hauteur, altérations et octaves",
    cases: [
      {
        id: "degres",
        title: "Les sept degrés d r m f s l t",
        status: "Validé",
        doc: "01 - Hauteur et degrés",
        explain: "Degrés relatifs à la référence tonale déclarée (ici C). En 7/4 aucune séparation « ! ».",
        mrd: `${H("ton: C\nmesure: 7/4")}\n[V] |d:r:m:f:s:l:t|`,
        show: "pitch",
      },
      {
        id: "montantes",
        title: "Altérations ascendantes (voyelle i)",
        status: "Validé",
        doc: "02 - Altérations chromatiques",
        explain: "di ri mi fi si li ti : chaque degré élevé d'un demi-ton.",
        mrd: `${H("ton: C\nmesure: 7/4")}\n[V] |di:ri:mi:fi:si:li:ti|`,
        show: "pitch",
      },
      {
        id: "descendantes",
        title: "Altérations descendantes, formes rares incluses",
        status: "Provisoire",
        doc: "02 - Altérations chromatiques",
        explain: "Voyelles a, e, o selon la convention. te, ta et to sont acceptées pour t abaissé ; les formes rares sont analysées et conservées.",
        mrd: `${H("ton: C\nmesure: 6/4")}\n[V] |te:ta:to!ra:ma:la|de:fa:se!lo:ro:me|`,
        show: "pitch",
      },
      {
        id: "enharmonie",
        title: "Équivalences de hauteur sans réécriture",
        status: "Validé",
        doc: "02 - Altérations chromatiques",
        explain: "mi et f, de et t₁ sonnent pareil mais restent écrits tels quels. Cliquez une note dans le Studio pour voir ses équivalences.",
        mrd: `${H("ton: C\nmesure: 4/4")}\n[V] |mi:f!de:t_1|`,
        show: "pitch",
      },
      {
        id: "octaves",
        title: "Octaves numériques et rendu exposant / indice",
        status: "Validé",
        doc: "03 - Octaves et représentation",
        explain: "d1 r1 m2 d_1 s_2 di_1 di1 ; la valeur stockée reste numérique, le rendu est typographique.",
        mrd: `${H("ton: C\nmesure: 7/4")}\n[V] |d1:r1:m2:d_1:s_2:di_1:di1|`,
        show: "pitch",
      },
      {
        id: "octaves-trad",
        title: "Même passage en rendu traditionnel (apostrophes / virgules)",
        status: "Provisoire",
        doc: "03 - Octaves et représentation",
        explain: "Thème de rendu alternatif inspiré des imprimés ; la saisie reste numérique.",
        mrd: `${H("ton: C\nmesure: 7/4\noctaves: traditionnel")}\n[V] |d1:r1:m2:d_1:s_2:di_1:di1|`,
      },
      {
        id: "ref-ab",
        title: "Référence Ab : d = La bémol",
        status: "Validé",
        doc: "04 - Référence tonale et mode",
        explain: "La référence est désignée par A–G avec b ou #. Aucun mode majeur/mineur n'est imposé.",
        mrd: `${H("ton: Ab\nmesure: 4/4")}\n[V] |d:m!s:d1|`,
        show: "pitch",
      },
      {
        id: "liberte",
        title: "Liberté du compositeur : Ré bémol écrit avec Do comme référence",
        status: "Validé",
        doc: "04 - Référence tonale et mode",
        explain: "di di di f avec la référence C produit les mêmes hauteurs que d d d m en Db. MireDo accepte sans corriger.",
        mrd: `${H("ton: C\nmesure: 4/4")}\n[V] |di:di!di:f|`,
        show: "pitch",
      },
    ],
  },
  {
    id: "rythme",
    title: "Mesure, unités et subdivisions",
    cases: [
      {
        id: "signatures",
        title: "2/4 · 3/4 · 4/4 · 6/4 · 9/8 : dispositions habituelles",
        status: "Validé",
        doc: "05 - Rythme et durée",
        explain: "« ! » sépare les moitiés (4/4, 6/4) ou les groupes de trois (9/8) ; jamais en 2/4, 3/4, 5/4, 7/4.",
        mrd: `${H("mesure: 9/8")}\n[V] |d:d:d!d:d:d!d:d:d|r:r:r!r:r:r!r:r:r|`,
      },
      {
        id: "disposition",
        title: "9/8 avec disposition 3/4 choisie par le compositeur",
        status: "Validé",
        doc: "05 - Rythme et durée",
        explain: "La signature reste 9/8 ; la disposition s'applique à toute la partition.",
        mrd: `${H("mesure: 9/8\ndisposition: 3/4")}\n[V] |d:r:m|f:m:r|d:-:-|`,
        show: "timing",
      },
      {
        id: "point",
        title: "Division binaire « . » et subdivision silencieuse",
        status: "Validé",
        doc: "05 - Rythme et durée",
        explain: "Exemple de la conception : .d:d.d|d:d:d| — la première demi-unité est silencieuse.",
        mrd: `${H("mesure: 3/4")}\n[V] :.d:d.d|d:d:d|`,
        show: "timing",
      },
      {
        id: "d-point",
        title: "|d.:::| — la note occupe une demi-unité",
        status: "Validé",
        doc: "05 - Rythme et durée",
        explain: "La durée vient de la place dans la subdivision, pas du séparateur « : ».",
        mrd: `${H("mesure: 4/4")}\n[V] |d.:!:|`,
        show: "timing",
      },
      {
        id: "compact",
        title: "Plusieurs notes collées dans une unité",
        status: "Validé",
        doc: "05 - Rythme et durée",
        explain: ":dd: :ddd: :dddd: :dddddd: — l'unité est partagée également.",
        mrd: `${H("mesure: 4/4\ntriolets: texte")}\n[V] |dd:ddd!dddd:dddddd|`,
        show: "timing",
      },
      {
        id: "triolet",
        title: "Triolet :d.d.d: et sextolet :,,.,,: avec courbe",
        status: "Provisoire",
        doc: "05 - Rythme et durée",
        explain: "Rendu possible sans séparateurs avec une courbe ; la saisie reste celle de la conception.",
        mrd: `${H("mesure: 2/4")}\n[V] |d.r.m:s,l,t.d1,r1,m1|`,
        show: "timing",
      },
      {
        id: "prolongation",
        title: "Prolongation « - » : :s.-,f: et |d:-!-.:|",
        status: "Validé",
        doc: "05 - Rythme et durée",
        explain: "Chaque « - » ajoute la durée de sa subdivision ; il peut traverser « ! » et les barres.",
        mrd: `${H("mesure: 4/4")}\n[V] |s.-,f:d!-:-|-.:!:|`,
        show: "timing",
      },
      {
        id: "prolongation-invalide",
        title: "Prolongation sans note précédente : invalide",
        status: "Validé",
        doc: "05 - Rythme et durée",
        explain: "Le moteur signale l'erreur et la marque en rouge.",
        mrd: `${H("mesure: 4/4")}\n[V] |-:d!:-|`,
      },
      {
        id: "silences",
        title: "Silences implicites et contretemps",
        status: "À clarifier",
        doc: "05 - Rythme et durée",
        explain: "|.d::| est un contretemps. Lecture provisoire de |d,.d:| : « . » divise d'abord, « , » ensuite (d ¼, silence ¼, d ½) — la conception décrit ce cas autrement, il reste ouvert.",
        mrd: `${H("mesure: 3/4")}\n[V] |.d::|d,.d::|`,
        show: "timing",
      },
    ],
  },
  {
    id: "barres",
    title: "Doubles barres et changements de tonalité",
    cases: [
      {
        id: "tonalite-sans",
        title: "Changement de tonalité sans double barre, avec transition (l₁)",
        status: "Validé",
        doc: "05 - Rythme et durée § 9",
        explain: "Exemple de la conception : |d:d!(l_1)s_1:s_1| de C vers D. (l₁) aide la lecture et n'est pas jouée.",
        mrd: `${H("ton: C\nmesure: 4/4\nlibelle-ton: Do =")}\n[V] |d:d!{ton:D}(l_1)s_1:s_1|`,
        show: "pitch",
      },
      {
        id: "tonalite-avec",
        title: "Même changement avec double barre au milieu de la mesure",
        status: "Validé",
        doc: "05 - Rythme et durée § 9",
        explain: "La double barre facultative ne ferme pas la mesure ; elle n'est jamais insérée automatiquement.",
        mrd: `${H("ton: C\nmesure: 4/4\nlibelle-ton: Do =")}\n[V] |d:d!d||{ton:D}(l_1)s_1|`,
      },
      {
        id: "ffpm",
        title: "Double barre de prolongation de mesure (option FFPM)",
        status: "À clarifier",
        doc: "05 - Rythme et durée § 9",
        explain: "Désactivée par défaut. Interprétation provisoire : avec l'option, « || » prolonge la mesure au lieu de la fermer.",
        mrd: `${H("mesure: 4/4\nffpm: oui")}\n[V] |d:r!m:f||s:-|d:-!-:-|`,
      },
    ],
  },
  {
    id: "voix",
    title: "Voix, portées et paroles",
    cases: [
      {
        id: "satb",
        title: "SATB par défaut, crochet et barres alignées",
        status: "Validé",
        doc: "06 - Voix et portées",
        explain: "Les barres traversent toutes les portées ; le crochet relie le système. Paroles uniques sous l'ensemble.",
        mrd: `noms: tous\nton: F\nmesure: 3/4\nvoix: S=0; A=0; T=-1; B=-1\n[S] |m:r:d|r:-:-|\n[A] |d:t_1:d|t_1:-:-|\n[T] |s:s:m|s:-:-|\n[B] |d_1:s_1:l_1|s_1:-:-|\n[paroles] Ho a- nao re- ny`,
      },
      {
        id: "voix-libres",
        title: "Voix nommées librement, références de portée, clés classiques",
        status: "Validé",
        doc: "06 - Voix et portées",
        explain: "Le nom, la référence (0 = Sol, −1 = Fa, autres valeurs) et le registre restent séparés. Crochet masqué ici.",
        mrd: `noms: tous\ncles: classique\ncrochet: non\nmesure: 2/4\nvoix: Voix 1=0; Voix 2=+1; Basse=-1\n[Voix 1] |d:m|s:-|\n[Voix 2] |m:s|d1:-|\n[Basse] |d_1:d_1|m_1:-|`,
      },
      {
        id: "entre",
        title: "Paroles entre deux groupes de portées",
        status: "Validé",
        doc: "06 - Voix et portées § 7",
        explain: "S A au-dessus, T B en dessous ; les barres ne traversent pas la ligne de paroles.",
        mrd: `noms: tous\nparoles: entre\ngroupes: S A / T B\nmesure: 4/4\nvoix: S=0; A=0; T=-1; B=-1\n[S] |s:s!l:s|d1:-!-:-|\n[A] |m:m!f:m|m:-!-:-|\n[T] |d:d!d:d|s:-!-:-|\n[B] |d_1:d_1!f_1:d_1|d_1:-!-:-|\n[paroles] Ha- le- lu- ia, A- men`,
      },
      {
        id: "voix-propre",
        title: "Paroles propres à une voix et soulignement (même syllabe)",
        status: "Validé",
        doc: "06 - Voix et portées § 7",
        explain: "d(a) r d t d(men) : les quatre notes de « a » sont soulignées par le compositeur, jamais automatiquement.",
        mrd: `noms: tous\nmesure: 4/4\nvoix: S=0; B=-1\n[S] |[d.r:d.t_1]!d:-|\n[B] |d_1:s_1!d_1.s_1:d_1|\n[paroles] A- _ _ _ men\n[paroles:B] A- men, a- men!`,
      },
    ],
  },
  {
    id: "reprises",
    title: "Reprises et indications musicales",
    cases: [
      {
        id: "dc-fine",
        title: "D.C. al Fine",
        status: "Validé",
        doc: "07 - Reprises et indications",
        explain: "Retour au début puis arrêt à Fine. Le parcours n'est pas l'ordre linéaire des mesures.",
        mrd: `${H("mesure: 2/4")}\n[V] |d:r|m:-{fine}||s:f|m:r{dc al fine}||`,
        show: "path",
      },
      {
        id: "ds-coda",
        title: "D.S._1 al Coda avec To Coda",
        status: "Validé",
        doc: "07 - Reprises et indications",
        explain: "Repères Segno identifiés (S_1, S_2…). Retour au Segno 1, puis saut vers la Coda à To Coda.",
        mrd: `${H("mesure: 2/4")}\n[V] |d:d|{segno:1}r:m|{tocoda}f:s|l:t{ds:1 al coda}|| {coda}d1:-||`,
        show: "path",
      },
      {
        id: "ds-fine",
        title: "Deux Segno distincts et D.S._2 al Fine",
        status: "Provisoire",
        doc: "07 - Reprises et indications",
        explain: "Graphie exacte de saisie encore à confirmer par la conception.",
        mrd: `${H("mesure: 2/4")}\n[V] {segno:1}|d:r|{segno:2}m:f{fine}|s:l{ds:2 al fine}||`,
        show: "path",
      },
      {
        id: "nuances",
        title: "Nuances, tempo, point d'orgue, articulations",
        status: "Validé",
        doc: "07 - Reprises et indications § 5",
        explain: "Mêmes sens qu'en solfège classique ; MireDo les représente et les transmet à la lecture.",
        mrd: `${H("mesure: 4/4\nexpression: Andante")}\n[V] |{pp}d:{cresc}r!m:{f}f|{stacc}s:{stacc}s!{>}l:{ten}t|{rit.}d1:-!{^}d1:-|`,
      },
    ],
  },
  {
    id: "accords",
    title: "Degrés et symboles d'accords",
    cases: [
      {
        id: "accords",
        title: "Chiffres romains, accords latins et accords Sol-fa relatifs",
        status: "Validé",
        doc: "08 - Degrés et symboles d'accords",
        explain: "Avec la référence G, Dom7 désigne Gm7 (survolez l'accord). Tous sont facultatifs et ne remplacent pas les notes.",
        mrd: `${H("ton: G\nmesure: 4/4")}\n[V] |<I>d:<Gm7>m!<Dom7>s:<V>s_1|<Fa>f:l!<Re7>r:<IV>f|`,
      },
    ],
  },
];

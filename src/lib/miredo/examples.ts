// Partitions d'exemple au format texte de démonstration MireDo.

export const SCORE_446 = `% Partition réelle n°446 — transcrite depuis la photo du dossier « 01 - Vision »
titre: 446. Atolotro anao ny tenako, ry Raiko
gauche: J. Andrianaivoravelona Z., 1877 - 1961
info: 13.12.13.12
droite: H.P. Main, 1839 - 1925
ton: Ab
libelle-ton: Do dia
mesure: 4/4
tempo: 76
voix: S=0; A=0; T=-1; B=-1
octaves: traditionnel
noms: aucun

% Système 1 — anacrouse, puis demi-mesure terminée par une double barre
[S] :s_1 |s_1:d!d:r |m:-!-:m |s:m!d:r |m:m!-|| //
[A] :m_1 |m_1:m_1!s_1:s_1 |s_1:-!-:s_1 |s_1:s_1!s_1:s_1 |s_1:s_1!-||
[T] :d |d:d!d:t_1 |d:-!-:d |r:d!d:t_1 |d:d!-||
[B] :d_1 |d_1:d_1!m_1:s_1 |d:-!-:d |t_1:d!m_1:s_1 |d:d!-||

% Système 2 — changement vers Eb avec indication de transition (…), retour en Ab
[S] {ton:Eb}(m)l |s:s!l:t |d1:s!-:f |m:f!r:d |{ton:Ab}(d)s_1:-!-|| //
[A] (s_1)d |d:d!d:f |m:d!-:d |d:r!t_1:d |(d)s_1:-!-||
[T] (d)f |s:s!f:s |s:m!-:l |s:s!f:m |(m)t_1:-!-||
[B] (d)f |m:m!f:r |d:-!-:f_1 |s_1:s_1!s_1:s_1 |(d)s_1:-!-||

% Système 3
[S] s_1 |s_1:s_1!d:t_1 |l_1:-!-:l_1 |f:m!r:d |t_1:t_1!-|| //
[A] r_1 |s_1:f_1!m_1:s_1 |f_1:-!-:s_1 |f_1:l_1!l_1:l_1 |s_1:s_1!-||
[T] t_1 |d:t_1!d:d |d:-!-:di |r:di!r:r |r:r!-||
[B] f_1 |m_1:r_1!d_1:m_1 |f_1:-!-:m_1 |r_1:m_1!f_1:fi_1 |s_1:s_1!-||

% Système 4 — notes soulignées (même syllabe)
[S] t_1 |d:t_1!d:r |[m:s]!-:d |m:d!r:-.d |d:-!-||
[A] s_1 |s_1:s_1!s_1:s_1 |s_1:-!-:s_1 |s_1:s_1!f_1:-.m_1 |m_1:-!-||
[T] r |d:r!d:t_1 |[d:m]!-:m |d:d!t_1:-.d |d:-!-||
[B] f_1 |m_1:f_1!m_1:s_1 |d:-!-:d |d:m_1!s_1:-.d_1 |d_1:-!-||

[paroles] A- to- lo- tro A- nao ny te- na- ko, ry Rai- ko,
[paroles] Fa Hi- a- nao no te- _ na lo- ha- ra- non- tsoa;
[paroles] I- zao to- nto- lo 'zao ma- ni- nto- na ny sai- ko
[paroles] Hi- ha- ta- ka‿a- mi- nao, _ ho ba- bo- ny to- koa.
`;

export const SCORE_DEMO = `% Démonstration : réunit les cas décrits dans la conception MireDo
titre: Démonstration MireDo
gauche: Partition d'essai — subdivisions, reprises, accords
droite: Rendu HTML · CSS · JS
ton: G
libelle-ton: Do =
mesure: 4/4
tempo: 84
expression: Moderato
voix: S=0; A=0; T=-1; B=-1
paroles: entre
groupes: S A / T B

[S] {p}{segno:1}<I> :s_1 |<Do>d:d.r!m:[m.f] |<Lam>{cresc}s:d1.t.l!s:s.-,f |<Rem7>m:fsl!s:- |{f}{tocoda}<Dom7>{^}d1:-!-:ta |
[S] <Fa>l:.l!{>}s.s:{stacc}m |{rit.}<D7>r:-.d!t_1:-{ds:1 al coda}|| /// {coda}{a tempo}<I>d1:t!{^}d1:-||

[A] :m_1 |s_1:s_1.t_1!d:[d.r] |m:m!r:r |d:r!t_1:- |m:-!-:m |
[A] f:.f!m.m:{stacc}d |d:-.d!t_1:-|| m:r!m:-||

[T] :d |m:m!s:s |d:d!t_1:t_1 |s:s!f:- |m:-!-:m |
[T] d:-!-.: |r:-.f!r:-|| s:s!s:-||

[B] :d_1 |d_1:d_1!d_1:d_1 |d:l_1!s_1:s_1 |d:t_1!s_1:- |d_1:-!-:d_1 |
[B] f_1:-!d_1:- |s_1:-!s_2:-|| d:s_1!d_1:-||

[paroles] Ve- nez, chan- tons en- sem- _ ble, un chant nou- veau pour le
[paroles] jour qui se lè- ve, Gloi- re à toi, Sei- gneur Dieu de la paix. A- _ men.
[paroles 2] Lou- ons, lou- ons le Sei- _ gneur, tous les peu- ples de la terre
[paroles:T] @5 Ah
`;

export const SCORE_NEW = `titre: Nouvelle partition
gauche: Paroles
droite: Musique
ton: C
mesure: 4/4
tempo: 80
voix: S=0; A=0; T=-1; B=-1

[S] |d:r!m:f |s:-!-:- |
[A] |d:t_1!d:r |m:-!-:- |
[T] |m:s!s:l |d1:-!-:- |
[B] |d_1:s_1!d_1:t_1 |d_1:-!-:- |

[paroles] Do re mi fa sol
`;

export const EXAMPLES = [
  { id: "446", label: "446 · Atolotro anao (photo réelle)", text: SCORE_446 },
  { id: "demo", label: "Démonstration complète", text: SCORE_DEMO },
  { id: "new", label: "Nouvelle partition SATB", text: SCORE_NEW },
] as const;

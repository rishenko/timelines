"""
The Earth and Life events (pilot, 2026-11-23): what happened, where, and every date claim with its source.

Rules (Kevin, via the coordinator): the headline date is the mainstream, best-documented, least-contested record, never the
earliest or most extreme claim; every other candidate stays a claim with a note. Each event wants two independent sources: an ICS
boundary, a peer-reviewed paper (abstract, or an open-access full text, cached in $TIMELINES_DATA/europepmc/), a museum page
(Smithsonian, cached in $TIMELINES_DATA/smithsonian/) or an encyclopaedic page (a Wikipedia sentence from the dump), with at least
one that is not Wikipedia; Wikipedia never counts as two. An event short of that carries `flag`, and the review file says why.

Claim kinds (the text comes from the cached source: `needle` is a distinctive phrase, and the sentence holding it is quoted;
a needle the source doesn't hold stops the build):
  P(doi, needle, ma, pm, note)       a paper's abstract (Europe PMC record cached by DOI)
  OA(pmcid, doi, needle, ...)         an open-access paper's full text (Europe PMC XML cached by PMC id)
  W(article, needle, ma, pm, note)    an English Wikipedia sentence, read from the dump
  SI(page, needle, ma, pm, note)      a Smithsonian Human Origins page
  I(key, note)                        a figure printed on the ICS chart (ics_2026_06.json: boundaries or stage_boundaries)
`ma` is the age in Ma (a decimal string); `pm` its ± in Ma. R(lo, hi) is a range written as its midpoint ± half.
"""
from decimal import Decimal


def R(lo, hi):
    lo, hi = Decimal(lo), Decimal(hi)
    return str((lo + hi) / 2), str((hi - lo) / 2)


def claim(kind, source, needle, ma, pm=None, note=None, alt=False, **kw):
    """`alt`: a contested or different candidate kept beside the headline date; it does not count as a source for it."""
    return {'kind': kind, 'source': source, 'needle': needle, 'ma': ma, 'pm': pm, 'note': note, 'alt': alt, **kw}


def P(doi, needle, ma, pm=None, note=None, alt=False):
    return claim('paper', doi, needle, ma, pm, note, alt)


def OA(pmcid, doi, needle, ma, pm=None, note=None, alt=False):
    return claim('oa', pmcid, needle, ma, pm, note, alt, doi=doi)


def W(article, needle, ma, pm=None, note=None, alt=False):
    return claim('wikipedia', article, needle, ma, pm, note, alt)


def SI(page, needle, ma, pm=None, note=None, alt=False):
    return claim('smithsonian', page, needle, ma, pm, note, alt)


def I(key, note=None, ma=None):
    return claim('ics', key, None, ma, None, note)


# (id, row, title, descr, locality, best Ma, best ± Ma (or None), circa, end Ma (or None), claims, flag)
EVENTS = [
    dict(id='earliest-life-dresser', row='life', title='Earliest convincing evidence of life: the Dresser Formation',
         descr='Stromatolites and other traces of microbial life in hot-spring and shallow deposits of the Dresser Formation, in the Pilbara of Western Australia.',
         locality='Pilbara Craton, Western Australia', best='3480', pm=None, circa=False,
         claims=[
             P('10.1038/ncomms15263', "3.48 Ga Dresser Formation", '3480', None, 'The Dresser Formation is described as hosting "some of Earth\'s earliest convincing evidence of life".'),
             P('10.1038/nature19355', 'generally accepted multidisciplinary evidence for oldest life remains in the 3,480-Myr-old Dresser Formation', '3480', None,
               'The authors of the older Isua claim say the Dresser Formation is the previous most convincing and generally accepted evidence: the mainstream record.'),
             P('10.1038/nature19355', 'The presence of the ISB stromatolites demonstrates', '3700', None, 'An older candidate (Isua, Greenland), described by its authors as a new discovery and disputed since; kept as a claim.', alt=True),
             P('10.1073/pnas.1517557112', 'terrestrial biosphere had emerged by 4.1 Ga', '4100', None, 'Possibly biogenic carbon in a single zircon (Jack Hills, Western Australia); "potentially biogenic" in the paper\'s own title.', alt=True),
             W('Earliest known life forms', '3.465-billion-year-old Apex chert', '3465', None, 'Microfossils from the Apex chert, in the same region.', alt=True),
         ]),
    dict(id='great-oxidation-event', row='earth', title='Great Oxidation Event',
         descr='The first sustained rise of free oxygen in the atmosphere, recorded in rocks of the Kaapvaal Craton of South Africa and elsewhere.',
         locality='Global; dated in the Kaapvaal Craton, South Africa', best='2400', pm=None, circa=True,
         claims=[
             W('Timeline of the evolutionary history of life', 'Great Oxidation Event 2.4 billion years ago', '2400', None, 'The rounded figure the timeline gives.'),
             W('Great Oxidation Event', 'approximately 2.46–2.426 billion years ago', *R('2426', '2460'), note='The onset, as a range.'),
             P('10.1073/pnas.1608824114', '2,460 and 2,426 Ma', *R('2426', '2460'), note='U-Pb dating of the Ongeluk Formation magmatism, Kaapvaal Craton: the rise of oxygen was not monotonic.'),
             P('10.1126/sciadv.1600134', 'constrain the GOE to 2.33 billion years ago', '2330', None, 'A later date for the rapid rise, from sulfur isotopes in South African drill core; the paper says the oxygenation was rapid.', alt=True),
         ]),
    dict(id='earliest-eukaryotes', row='life', title='Earliest eukaryotes',
         descr='The last common ancestor of living eukaryotes lived around 1.7–1.9 billion years ago; the oldest fossils that may be eukaryotes come from the Ruyang Group of North China.',
         locality='North China (Ruyang Group fossils); a molecular-clock estimate', best='1772.5', pm='93.5', circa=True,
         claims=[
             P('10.1073/pnas.1110633108', 'last common ancestor lived between 1866 and 1679 Ma', *R('1679', '1866'), note='A multigene molecular-clock range.'),
             W('Eukaryote', 'Ruyang Group of China, dating to approximately 1.8-1.6 billion years ago', *R('1600', '1800'), note='"May be the oldest known eukaryotes."'),
         ]),
    dict(id='ediacaran-biota-podolia', row='life', title='Ediacaran biota of Podolia',
         descr='A diverse assemblage of body and trace fossils of the Ediacaran biota, precisely dated by uranium-lead on volcanic ash in Podolia, Ukraine.',
         locality='Podolia, Ukraine (the biota is also known from South Australia, the White Sea, Newfoundland and Mexico)', best='556.78', pm='0.18', circa=False,
         claims=[
             P('10.1038/s41598-018-38448-9', 'occurred as early as 556.78', '556.78', '0.18', 'A U-Pb age on ash beds in the Podolian sections.'),
             W('Ediacaran biota', 'approximately 555 million years in age', '555', None, 'A diverse community found in Sonora, Mexico, roughly coeval with the Ediacara Hills and the White Sea.'),
         ]),
    dict(id='cambrian-explosion-start', row='earth', title='Start of the Cambrian (the Cambrian explosion)',
         descr='The base of the Cambrian Period, the Fortunian, 538.8 Ma by the ICS chart; the diversification of most animal phyla followed in the next 13–25 million years.',
         locality='Global boundary', best='538.8', pm='0.6', circa=False,
         claims=[
             I('phanerozoic-base', 'The base of the Phanerozoic, Paleozoic and Cambrian: 538.8 ± 0.6 Ma.'),
             W('Cambrian explosion', 'in 2022 it was changed again to 538.8 Ma', '538.8', None, 'Wikipedia reports the ICS figure: not an independent dating.'),
         ],
         flag='Both sources give the same ICS figure: one independent dating.'),
    dict(id='qingjiang-biota', row='life', title='Qingjiang biota',
         descr='A Burgess Shale-type fossil site with soft-bodied animals, one of the largest early Cambrian faunas.',
         locality='South China', best='518', pm=None, circa=True,
         claims=[
             P('10.1126/science.aau8800', 'the Qingjiang biota (~518 million years old)', '518', None, 'About 518 million years old, as the paper reports.'),
             W('Cambrian explosion', 'dated to around 518 Mya', '518', None, 'The article\'s account of the site\'s remains.'),
         ]),
    dict(id='burgess-shale', row='life', title='Burgess Shale',
         descr='A Middle Cambrian fossil deposit famed for the preservation of soft-bodied animals.',
         locality='The Canadian Rockies, British Columbia, Canada', best='506.5', pm='1.5', circa=False,
         claims=[W('Burgess Shale', 'Middle Cambrian around 508 to 505 million years ago', *R('505', '508'))],
         flag='One source with a figure (Wikipedia).'),
    dict(id='earliest-land-plants', row='life', title='Earliest evidence of land plants (cryptospores)',
         descr='Fossil spores of early land plants in Middle Ordovician rocks of Argentina, on the margin of Gondwana.',
         locality='Argentina (eastern Gondwana)', best='472', pm='1', circa=False,
         claims=[
             P('10.1111/j.1469-8137.2010.03433.x', '473-471 Ma', *R('471', '473'), note='Cryptospores in Middle Ordovician samples.'),
             W('Evolutionary history of plants', 'in Upper Ordovician rocks about 455 million years ago', '455', None, 'Trilete spores similar to those of vascular plants, which come later.', alt=True),
         ]),
    dict(id='tiktaalik', row='life', title='Tiktaalik, a fish with tetrapod features',
         descr='A lobe-finned fish with a mobile neck and wrist joint, a transitional form between fish and limbed tetrapods, from the Late Devonian of Arctic Canada.',
         locality='Ellesmere Island, Nunavut, Arctic Canada', best='375', pm=None, circa=True,
         claims=[
             W('Tiktaalik', 'lived approximately 375 million years ago', '375', None, 'Estimated ages in the article: 375, 379 and 383 Ma.'),
             P('10.1038/nature08623', 'approximately 18 million years older than the earliest tetrapod body fossils', *R('387.95', '393.47'),
               note='Tetrapod trackways from Poland, older than Tiktaalik: a contested earlier record of tetrapods on land. The paper gives the age as early Middle Devonian (Eifelian), 393.47 to 387.95 Ma on the ICS chart; kept as a claim.', alt=True),
         ],
         flag='The paper that describes Tiktaalik gives no age in its abstract; the 375 Ma figure rests on Wikipedia.'),
    dict(id='earliest-amniotes-joggins', row='life', title='Earliest amniotes: Hylonomus and the Joggins reptiles',
         descr='The oldest known amniotes, the reptile Hylonomus and a possible early synapsid, come from the Joggins Fossil Cliffs of Nova Scotia.',
         locality='Joggins, Nova Scotia, Canada', best='314.5', pm='1.5', circa=True,
         claims=[
             OA('PMC6894558', '10.1098/rsos.191191', 'known from the classic locality of Joggins, Nova Scotia, Canada (313–316 Ma)', *R('313', '316'), note='A 2019 paper on the oldest parareptile.'),
             W('Hylonomus', 'Fossilized footprints found in New Brunswick have been attributed to Hylonomus, at an estimated age of 315 million years', '315', None, 'Footprints, not the body fossils.'),
         ]),
    dict(id='earliest-dinosaurs-ischigualasto', row='life', title='Earliest dinosaurs: Ischigualasto',
         descr='Some of the oldest known dinosaurs, small carnivores and herbivores, lived in the Ischigualasto Formation of Argentina.',
         locality='Ischigualasto, Argentina', best='230.5', pm='0.5', circa=False,
         claims=[
             P('10.1126/science.1198467', 'Some 230 million years ago in the Late Triassic', '230', None, 'The earliest dinosaurs were the dominant terrestrial carnivores and small herbivores in southwestern Pangaea.'),
             W('Dinosaur', 'radiometrically dated at 231–230 million years old', *R('230', '231')),
         ]),
    dict(id='earliest-eutherian-eomaia', row='life', title='Earliest known eutherian mammal (Eomaia)',
         descr='A skeleton of an Early Cretaceous placental-lineage mammal, with its fur preserved, from the Yixian Formation.',
         locality='Yixian Formation, northeastern China', best='125', pm=None, circa=True,
         claims=[P('10.1038/416816a', 'We estimate its age to be about 125 million years', '125', None, 'Extends the date of the oldest eutherian records with skull and skeleton by about 40–50 Myr.')],
         flag='One source with a figure (the describing paper); Wikipedia\'s article has no extractable date.'),
    dict(id='archaeopteryx', row='life', title='Archaeopteryx',
         descr='A feathered, bird-like dinosaur from the Solnhofen limestone of Bavaria, long taken as a link between dinosaurs and birds.',
         locality='Solnhofen, Bavaria, Germany', best='150', pm=None, circa=True,
         claims=[W('Archaeopteryx', 'lived in the Late Jurassic around 150 million years ago', '150')],
         flag='One source with a figure (Wikipedia).'),
    dict(id='early-flowering-plants-archaefructus', row='life', title='Early flowering plants: Archaefructus',
         descr='Archaefructus, an aquatic Early Cretaceous flowering plant from the Yixian Formation, among the oldest well-preserved angiosperm fossils.',
         locality='Yixian Formation, northeastern China', best='125', pm=None, circa=True,
         claims=[
             OA('PMC4200517', '10.1038/ncomms5956', 'Early Cretaceous (~125 million years ago)', '125', None, 'Archaefructus, with waterlilies and a relative of buttercup, "or even earlier".'),
             W('Archaefructus', 'now understood to be approximately 125 million years old', '125'),
         ]),
    dict(id='earliest-grasses-phytoliths', row='life', title='Earliest grasses: phytoliths in dinosaur coprolites',
         descr='Silica plant fragments in titanosaur dung from India show that several lineages of grasses had already evolved in the latest Cretaceous.',
         locality='India (central India, then part of Gondwana)', best='72.2', pm='0.2', circa=True, end='66.0', end_key='paleogene-base',
         claims=[
             P('10.1126/science.1118806', 'present on the Indian subcontinent during the latest Cretaceous', '69.1', '3.1', 'The "latest Cretaceous" is the Maastrichtian (72.2 ± 0.2 to 66.0 Ma on the ICS chart); no figure in the abstract.'),
             I('maastrichtian-base', 'The base of the Maastrichtian, the start of "the latest Cretaceous".'),
             OA('PMC2669172', '10.1371/journal.pone.0005297', 'before Cretaceous/Tertiary (K/T) boundary of 65 Ma', '65', None, 'Grasses already diversified before the K/T boundary (65 Ma in that paper; the ICS now gives 66.0 Ma).'),
         ]),
    dict(id='sahelanthropus', row='humans', title='Sahelanthropus, earliest probable hominin',
         descr='A skull and other remains from the Toros-Menalla locality of Chad, the earliest fossils widely considered to be on the human side of the split from the chimpanzee lineage.',
         locality='Toros-Menalla, Chad', best='6.5', pm='0.5', circa=True,
         claims=[
             P('10.1038/nature00879', 'fossils are between 6 and 7 million years old', *R('6', '7'), note='The first description, dated from the animals found with it.'),
             P('10.1038/nature00880', 'biochronological age between 6 and 7 million years', *R('6', '7')),
             SI('sahelanthropus-tchadensis', 'This species lived sometime between 7 and 6 million years ago', *R('6', '7')),
             W('Sahelanthropus', 'approximate date of 7.2–6.8 million years ago', *R('6.8', '7.2'), note='A later radiometric estimate the article reports.'),
         ]),
    dict(id='ardipithecus-ramidus', row='humans', title='Ardipithecus ramidus',
         descr='A hominin partial skeleton ("Ardi") and more than 110 specimens from the Afar Rift of Ethiopia, with a mix of tree-climbing and upright walking.',
         locality='Afar Rift, Ethiopia', best='4.4', pm=None, circa=False,
         claims=[
             P('10.1126/science.1175802', '4.4-million-year-old sediments', '4.4'),
             SI('ardipithecus-ramidus', 'About 4.4 million years ago', '4.4'),
             W('Ardipithecus', 'dated to between 4.35 and 4.45 million years old', *R('4.35', '4.45')),
         ]),
    dict(id='earliest-homo-sapiens', row='humans', title='Earliest Homo sapiens (Jebel Irhoud)',
         descr='The oldest fossils attributed to our species, from the Middle Stone Age site of Jebel Irhoud in Morocco, with an older, more elongated braincase than later humans.',
         locality='Jebel Irhoud, Morocco', best='0.3', pm='0.034', circa=True,
         claims=[
             P('10.1038/nature22336', 'In combination with an age of 315', '0.315', '0.034', 'Thermoluminescence dating of the site.'),
             P('10.1038/nature22335', 'places these Middle Stone Age artefacts and fossils at 315', '0.315', '0.034'),
             P('10.1038/nature22335', 'approximately 195 thousand years old', '0.195', None, 'The earliest fossil attributed to a modern form of Homo sapiens before these finds (Omo Kibish, Ethiopia).', alt=True),
             SI('homo-sapiens', 'Homo sapiens evolved in Africa', '0.3'),
             W('Homo sapiens', 'emerged around 300,000 years ago', '0.3'),
         ]),

    # ---- the five mass extinctions of the Phanerozoic (the pilot's first events; ids kept) ----
    dict(id='late-ordovician-extinction', row='life', title='Late Ordovician mass extinction',
         descr='The first of the "big five" mass extinctions: about 85% of marine species were lost, in pulses around the Hirnantian.',
         locality='Global (marine); dated in sections of South China among others', best='445.2', pm='0.9', circa=False,
         claims=[
             W('Ordovician–Silurian extinction events', 'roughly 445 million years ago', '445', None, '"Roughly 445 million years ago": a rounded figure.'),
             I('hirnantian-base', 'The base of the Hirnantian, where the article places the first pulse.'),
             P('10.1038/s41467-020-16228-2', 'first pulse of the Late Ordovician mass extinction about 445 million years ago', '445'),
             P('10.1038/s41598-022-08941-3', '445 Ma; Hirnantian stage', '445', None, 'The two pulses are in the Hirnantian.'),
         ]),
    dict(id='kellwasser-extinction', row='life', title='Late Devonian extinction (Kellwasser event)',
         descr='A mass extinction at the Frasnian–Famennian boundary, thought to have followed global anoxia.',
         locality='Global (marine)', best='372.15', pm='0.46', circa=False,
         claims=[
             W('Late Devonian extinction', '372.15 million years ago', '372.15'),
             I('famennian-base', 'The Frasnian–Famennian boundary on the ICS chart.'),
             P('10.1038/s41598-018-27847-7', 'A new age of 372.36', '372.36', '0.053', 'A uranium-lead age on a bentonite at the boundary.'),
             P('10.1038/s41598-020-69097-6', 'high-precision age of 371.870', '371.870', '0.108', 'From cyclostratigraphy anchored to dated ash beds.'),
         ]),
    dict(id='hangenberg-extinction', row='life', title='Late Devonian extinction (Hangenberg event)',
         descr='A second extinction, at the end of the Devonian, as the world passed into the Carboniferous.',
         locality='Global (marine and terrestrial)', best='358.86', pm='0.19', circa=False,
         claims=[
             W('Late Devonian extinction', '358.86 million years ago', '358.86'),
             I('carboniferous-base', 'The Devonian–Carboniferous boundary on the ICS chart.'),
             P('10.1126/sciadv.aba0768', 'Devonian-Carboniferous boundary (359 million years ago)', '359'),
             P('10.1038/s41598-021-85043-6', 'Hangenberg Crisis, 359 Ma', '359'),
         ]),
    dict(id='end-permian-extinction', row='life', title='End-Permian mass extinction',
         descr='The most severe extinction of the Phanerozoic, at the Permian–Triassic boundary; the loss of most marine and many land species took about 60,000 years.',
         locality='Global; dated at Meishan, China', best='251.902', pm='0.024', circa=False,
         claims=[
             W('Permian–Triassic extinction event', 'around 251.902 million years ago', '251.902'),
             I('triassic-base', 'The Permian–Triassic boundary on the ICS chart.'),
             W('Permian–Triassic extinction event', 'The extinction occurred between 251.941', '251.941', '0.037', 'The start of the extinction interval the article gives (it runs to 251.880 ± 0.031 Ma).'),
             P('10.1073/pnas.1317692111', 'between 251.941', '251.941', '0.037', 'The start of the extinction interval; it ends at 251.880 ± 0.031 Ma. Uranium-lead dates from the Meishan section.'),
         ]),
    dict(id='end-triassic-extinction', row='life', title='End-Triassic mass extinction',
         descr='An extinction at the Triassic–Jurassic boundary, linked to volcanism in the Central Atlantic Magmatic Province.',
         locality='Global (marine and terrestrial)', best='201.4', pm='0.2', circa=False,
         claims=[
             I('jurassic-base', 'The Triassic–Jurassic boundary on the ICS chart.'),
             P('10.1073/pnas.2000095117', 'Triassic-Jurassic (T-J) boundary (201 Ma)', '201', None, 'A rounded figure: the paper says the extinction and the volcanism were synchronous at the boundary.'),
         ]),
    dict(id='cretaceous-paleogene-extinction', row='life', title='Cretaceous–Paleogene extinction (K–Pg)',
         descr='The extinction that ended the non-avian dinosaurs, at the Cretaceous–Paleogene boundary, following the Chicxulub impact.',
         locality='Global; the Chicxulub impact crater is in Mexico', best='66.00', pm=None, circa=False,
         claims=[
             W('Cretaceous–Paleogene extinction event', 'Chicxulub impact 66.0 Mya', '66.0', None, 'The age the article gives for the Chicxulub impact.'),
             I('paleogene-base', 'The Cretaceous–Paleogene boundary on the ICS chart.'),
             P('10.1073/pnas.1319253111', 'Cretaceous-Paleogene boundary, ∼ 66 Ma', '66'),
             W('Cretaceous–Paleogene extinction event', 'around 65.5 million years ago', '65.5', None, "The article's own lead gives this older figure.", alt=True),
         ]),
]

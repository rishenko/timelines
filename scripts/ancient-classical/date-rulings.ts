// Headline-date rulings for three Ancient rows (2026-11-24; Kevin: "accept both" on the Fable date adjudication,
// Workbench "2026-11-24 Timelines date adjudication (Fable)"). Every quotation was checked against the 2026-11-01
// Wikipedia dump (raw wikitext; none of the pages carries an AI notice) on 2026-11-24.
//   Pazyryk culture: the headline stays the 6th century BCE (c. 550 BCE), the convention the article's infobox and lead
//     give ("6th to 3rd centuries BC"; Kevin's pick over c. 500 BCE). The article's 5th-century burials (Pazyryk, Katanda,
//     Shibe, Tuekta) are added as a claim, and the infobox's end-of-6th-century claim (501 BCE) already is c. 500 BCE.
//     The ruling also cites Dashkovskiy (2022) and Molodin (2025); their wording could not be read from the pages
//     (paywalled), so they are not cited here.
//   Dʿmt: the end moves from 350 to 400 BCE, the figure the article's History section gives; the 4th-century infobox
//     claim stays, and the lead's 6th-century hypothesis for the kingdom's span is added.
//   Satavahana dynasty: the headline stays at c. 117 BCE (the late 2nd century BCE, which the lead gives as what most
//     modern scholars believe); the ruling adds the chronologies as claims, quoting the article and its list page.
// It changes only these three rows' spans (and adds one source, the list page). Re-runnable.
//   node scripts/ancient-classical/date-rulings.ts && npm run data -- build ancient-classical
import { C, R, open } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-classical.json', '2026-11-24');
ed.wikipedia('wp-list-of-satavahana-kings', 'List of Satavahana kings', 'List_of_Satavahana_kings');

const span = (id: string) => {
  const t = ed.data.tracks.find((x: { id: string }) => x.id === id);
  if (!t?.span) throw new Error(`no row ${id} with a span`);
  return t.span;
};
/** Puts claims in front of (`first`) and behind (`after`) the ones already there, and not repeating a (year, location) pair. */
const withClaims = (old: ReturnType<typeof C>[] | undefined, first: ReturnType<typeof C>[], after: ReturnType<typeof C>[] = []) => {
  const seen = new Set([...first, ...after].map((c) => `${c.year}|${c.source.sourceLocation}`));
  return [...first, ...(old ?? []).filter((c) => !seen.has(`${c.year}|${c.source.sourceLocation}`)), ...after];
};

// Pazyryk culture
{
  const s = span('pazyryk');
  s.start = 'c. 550 BCE'; // the 6th century: unchanged
  s.startDates = withClaims(s.startDates, [], [
    R(500, 401, 'wp-pazyryk', "text: 'some of the Altai burials, notably those of the 5th century BC at Pazyryk and neighbouring sites, such as Katanda, Shibe, and Tuekta'", {
      note: 'By the 5th century BCE: the article dates its best-known burials to the 5th century BC. With the infobox\'s end-of-6th-century claim (501 BCE), the culture is under way by c. 500 BCE.',
    }),
  ]);
}

// Dʿmt
{
  const s = span('dmt');
  s.end = '400 BCE';
  s.endDates = withClaims(s.endDates, [
    C(400, 'wp-dmt-classical', "History ('approximately 800/700–400 BC')", { note: 'The culture of Dʿmt, dated on four radiometric dates from the Domestic Site at Aksum.' }),
    R(600, 501, 'wp-dmt-classical', "lead ('a timeframe spanning from the end of the 8th century BC to the 6th century BC is a hypothesis')", {
      note: 'A hypothesis for the kingdom named in the inscriptions, which is earlier than the end of the culture.',
    }),
  ]);
}

// Satavahana dynasty
{
  const s = span('satavahana');
  s.startDates = withClaims(s.startDates, [
    C(120, 'wp-list-of-satavahana-kings', "Ollett (2017): 'Vasisthiputra Sri Chimuka Satavahana (ca. 120–96 BCE)'", { note: 'Simuka, the first king, on the chronology the list follows.' }),
    R(160, 150, 'wp-list-of-satavahana-kings', "'Bhandare regards Simuka to have ruled since around 160–150 BCE'"),
    C(271, 'wp-satavahana', "'the beginning of the Satavahana rule is dated variously from 271 BCE to 30 BCE'", { note: 'The earliest date the article gives (the Puranic long chronology).' }),
    C(30, 'wp-satavahana', "'the beginning of the Satavahana rule is dated variously from 271 BCE to 30 BCE'", { note: 'The latest date the article gives (the short chronology).' }),
  ]);
}

ed.save();

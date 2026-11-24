// Headline-date rulings for three Ancient rows (2026-11-24; Kevin: "accept both" on the Fable date adjudication,
// Workbench "2026-11-24 Timelines date adjudication (Fable)"). Every quotation was checked against the 2026-11-01
// Wikipedia dump (raw wikitext; none of the pages carries an AI notice) on 2026-11-24.
//   Pazyryk culture: the start moves from c. 550 to c. 500 BCE, the turn of the 6th and 5th centuries: the infobox's
//     "6th to 3rd centuries BC" convention stays as the two 6th-century claims, and the article's 5th-century burials
//     (Pazyryk, Katanda, Shibe, Tuekta) are the new claim. The ruling also cites Dashkovskiy (2022) and Molodin
//     (2025); their wording could not be read from the pages (paywalled), so they are not cited here.
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
/** Replaces one claim list, keeping the claims already there after the new ones, and not repeating a (year, location) pair. */
const withClaims = (old: ReturnType<typeof C>[] | undefined, first: ReturnType<typeof C>[]) => {
  const seen = new Set(first.map((c) => `${c.year}|${c.source.sourceLocation}`));
  return [...first, ...(old ?? []).filter((c) => !seen.has(`${c.year}|${c.source.sourceLocation}`))];
};

// Pazyryk culture
{
  const s = span('pazyryk');
  s.start = 'c. 500 BCE';
  s.startDates = withClaims(s.startDates, [
    R(500, 401, 'wp-pazyryk', "text: 'some of the Altai burials, notably those of the 5th century BC at Pazyryk and neighbouring sites, such as Katanda, Shibe, and Tuekta'", {
      note: 'The article dates its best-known burials to the 5th century BC; the infobox convention ("6th to 3rd centuries BC") starts the culture in the 6th. The row starts at their meeting, c. 500 BCE.',
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

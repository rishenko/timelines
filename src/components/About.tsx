import './about.css';
import { DATA_VERSION, REPO as REPO_URL } from '../lib/cite.ts';

/** The address of the same page without ?page=about: back to the timeline the reader came from (or the default one). */
export function backUrl(search: string, pathname: string): string {
  const q = new URLSearchParams(search);
  q.delete('page');
  const rest = q.toString();
  return rest ? `${pathname}?${rest}` : pathname;
}

/**
 * About this data (docs/feature-audit.md item 1): how the timelines were made and what to trust, for readers
 * who weigh a source before they use it. Opened with `?page=about` (Boot), from the footer's "About this data" link.
 * Its claims follow the README's "Data sources and AI use" and docs/data-format.md; change them together.
 */
export function About({ search = window.location.search, pathname = window.location.pathname }: { search?: string; pathname?: string }) {
  return (
    <main className="about">
      <p>
        <a href={backUrl(search, pathname)}>← Back to the timeline</a>
      </p>
      <h1>About this data</h1>
      <p className="lead">
        The timelines were compiled with the help of an AI assistant. The aim is to find several highly reputable
        sources and stick to them. This page says what each source supplies and how the data was made, so you can
        judge how far to trust it.
      </p>

      <p className="muted">
        Data version {DATA_VERSION.sha}
        {DATA_VERSION.date ? ` (${DATA_VERSION.date})` : ''}: the commit this site was built from. It changes with
        every update to the site.
      </p>

      <h2>Sources</h2>
      <ul>
        <li>
          <strong>English Wikipedia</strong>: nearly all the events, dates and rows. Each cites its article with the
          section or sentence it was read from, and the date the page was read (Ancient and Classical World) or the
          Wikipedia dump it came from (Medieval World and Modern States).
        </li>
        <li>
          <strong>Books and papers</strong>, only where Wikipedia cites them, marked <em>Cited via Wikipedia (not
          checked)</em>: they have not been checked against the books themselves.
        </li>
        <li>
          <strong><a href="https://perio.do/">PeriodO</a></strong>: the period definitions behind the regional Ages
          lines in Ancient and Classical World (for example the UCLA Encyclopedia of Egyptology for the Nile Valley).
          South Asia and China use Wikipedia alone.
        </li>
        <li>
          <strong>Cliopatria</strong> (Seshat Global History Databank): the map borders in Ancient and Classical
          World, and one date claim in Medieval World (Srivijaya’s end, 1293), kept beside Wikipedia’s.
        </li>
        <li>
          <strong>
            <a href="https://stratigraphy.org/chart">International Chronostratigraphic Chart</a> (International
            Commission on Stratigraphy, v2026/06)
          </strong>
          : the boundary ages and colour codes of the geological time scale in Earth and Life (every eon, era and
          period, with the chart’s ± where it gives one); each boundary cites the chart. © ICS, all rights reserved.
          Cite: Cohen, K.M., Harper, D.A.T., Gibbard, P.L. &amp; Car, N. (2025, updated), The ICS International
          Chronostratigraphic Chart this decade, Episodes 48: 105–115. We take the numbers only; the chart’s image and
          layout are not reproduced.
        </li>
        <li>
          <strong>Peer-reviewed papers</strong>, cited directly (from their abstracts, or for open-access papers their
          full text): in Earth and Life, the dating studies behind its events, such as Burgess, Bowring &amp; Shen
          (2014, PNAS) for the end-Permian extinction.
        </li>
        <li>
          <strong>
            <a href="https://humanorigins.si.edu/">Smithsonian Institution’s Human Origins Program</a>
          </strong>
          : the age ranges of the human lineage’s events in Earth and Life (Sahelanthropus, Ardipithecus, Homo
          sapiens).
        </li>
        <li>
          <strong>Natural Earth</strong>: the land on the event maps.
        </li>
        <li>
          <strong>Wikimedia Commons</strong>: the map images shown with some rows, each with its author and licence.
        </li>
        <li>
          <strong>Wikidata</strong>: identifiers, a location for the map on some rows, and the names of rulers to look up. Never a date: reign dates come from Wikipedia. Where Wikidata&apos;s term differs by more than a month, the reign is marked for checking, and an open Wikidata term marks a modern reign as ongoing.
        </li>
      </ul>

      <h2>Method</h2>
      <ul>
        <li>
          <strong>Disagreeing sources stay disagreeing.</strong> When pages give different dates, each is kept as a
          date claim. The uncertain range you see on an event is worked out from those claims and their stated
          margins, not typed in. Where scholars hold rival dating systems (Egypt, Mesopotamia, the Aegean, China), the{' '}
          <em>Dating</em> menu switches between them.
        </li>
        <li>
          <strong>Two ways of building.</strong> The Ancient and Classical World was read from the cited articles by
          the assistant, which transcribed their dates and wrote the descriptions as summaries. Medieval World and
          Modern States were built by programs from a copy of the English Wikipedia dump (1 November 2026): each date
          cites the infobox field, heading or sentence it came from, and each build lists every article it read.
        </li>
        <li>
          <strong>Descriptions.</strong> Most Medieval World descriptions restate sentences from the cited articles, each
          checked against its sentence, and an event with no such sentence has none; 35 early ones (the Byzantine
          events) are the assistant’s own summaries. In Ancient and Classical World and Modern States they are the
          assistant’s own summaries.
        </li>
      </ul>

      <h2>Pages we don’t use</h2>
      <p>
        We don’t use a Wikipedia page flagged for AI-generated text, and a check refuses any link to a page on our list
        of flagged pages. If a page we cite gains the flag, its data is removed. A page with a translation notice is
        allowed, and the event’s description says so.
      </p>

      <h2>Known gaps</h2>
      <ul>
        <li>
          Coverage follows Wikipedia’s: well-documented states and periods have more events than poorly documented
          ones, and Wikipedia itself can be wrong or one-sided.
        </li>
        <li>
          Classifying events into categories and placing rows in regions are judgement calls made by rules; some are
          debatable.
        </li>
      </ul>

      <h2>Licences</h2>
      <p>
        The app’s code is <a href={`${REPO_URL}/blob/main/LICENSE`}>MIT</a>. The timeline data and event maps are{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>: reuse them with credit to this project
        and to the sources each timeline cites. Third-party material keeps its own licence (see{' '}
        <a href={`${REPO_URL}/blob/main/LICENSE-DATA.md`}>the data licence</a>). Quoted Wikipedia text (the sentences in
        source locators, and descriptions that closely follow a cited sentence) stays under CC BY-SA 4.0, attributed
        through the linked article; everything else in the data is CC BY 4.0. Event-map borders are from{' '}
        <a href="https://github.com/Seshat-Global-History-Databank/cliopatria">Cliopatria</a> (Seshat Global History
        Databank, CC BY 4.0) on land from Natural Earth (public domain).
      </p>

      <h2>Report a problem or cite this</h2>
      <p>
        Found an error? Each event’s details have a <em>Report a problem</em> link that opens a pre-filled issue on{' '}
        <a href={`${REPO_URL}/issues`}>the project’s issue tracker</a> (you need a GitHub account), or open one there
        yourself with the event’s name and timeline. To cite a timeline or an event, use its <em>Cite this</em>{' '}
        button (the timeline menu, or the event’s details): the citation names the data version above, so a reader can
        tell which version you used.
      </p>
      <p>
        The code, the generators and the full documentation are at <a href={REPO_URL}>github.com/rishenko/timelines</a>.
      </p>
    </main>
  );
}

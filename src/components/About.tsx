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
        The timelines were compiled with the help of an AI assistant, from English Wikipedia. Nothing here has been
        reviewed by a specialist yet. This page says how the data was made, so you can judge how far to trust it.
      </p>

      <p className="muted">
        Data version {DATA_VERSION.sha}
        {DATA_VERSION.date ? ` (${DATA_VERSION.date})` : ''}: the commit this site was built from. The data changes
        between versions.
      </p>

      <h2>Method</h2>
      <ul>
        <li>
          <strong>Wikipedia only.</strong> Every date, row and event comes from an English Wikipedia article, and cites
          it with the section or sentence it was read from and the date the page was read. No date was invented.
        </li>
        <li>
          <strong>Books and papers</strong> appear only where Wikipedia cites them, and are marked{' '}
          <em>Cited via Wikipedia (not checked)</em>. Nobody has checked them against the books themselves.
        </li>
        <li>
          <strong>Disagreeing sources stay disagreeing.</strong> When pages give different dates, each is kept as a
          date claim. The uncertain range you see on an event is worked out from those claims and their stated
          margins, not typed in. Where scholars hold rival dating systems (Egypt, Mesopotamia, China), the{' '}
          <em>Dating</em> menu switches between them.
        </li>
        <li>
          <strong>Two ways of building.</strong> The Ancient and Classical World was read from the cited articles by
          the assistant, which transcribed their dates and wrote the descriptions as summaries. Medieval World and
          Modern States were built by programs from a copy of the English Wikipedia dump (1 November 2026): each date
          cites the infobox field, heading or sentence it came from, and each build lists every article it read.
        </li>
        <li>
          <strong>Descriptions.</strong> In Medieval World they restate sentences from the cited articles, and an
          event with no such sentence has none. In the other two they are the assistant’s own summaries.
        </li>
      </ul>

      <h2>Pages we don’t use</h2>
      <p>
        A Wikipedia page flagged for AI-generated text is never cited, linked or read, and the project’s checks refuse
        any link to one. If a page we cite gains the flag, its data is removed. A page with a translation notice is
        allowed, and the event’s description says so.
      </p>

      <h2>Known gaps</h2>
      <ul>
        <li>No specialist has reviewed any timeline. Treat the data as a well-cited starting point, not a final word.</li>
        <li>
          Coverage follows Wikipedia’s: well-documented states and periods have more events than poorly documented
          ones, and Wikipedia itself can be wrong or one-sided.
        </li>
        <li>
          Classifying events into categories and placing rows in regions are judgement calls made by rules and then
          read through by the author; some are debatable.
        </li>
      </ul>

      <h2>Licences</h2>
      <p>
        The app’s code is <a href={`${REPO_URL}/blob/main/LICENSE`}>MIT</a>. The timeline data and event maps are{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>: reuse them with credit to this project
        and to the sources each timeline cites. Third-party material keeps its own licence (see{' '}
        <a href={`${REPO_URL}/blob/main/LICENSE-DATA.md`}>the data licence</a>). Wikipedia text is CC BY-SA; the
        timelines quote only dates and short phrases, and link each article. Event-map borders are from{' '}
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

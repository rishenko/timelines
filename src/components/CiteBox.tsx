import { useState } from 'react';
import type { Citation } from '../lib/cite.ts';

/** A citation in Chicago style and as BibTeX, each with a Copy button (docs/feature-audit.md item 6). */
export function CiteBox({ cite }: { cite: Citation }) {
  const [copied, setCopied] = useState<'chicago' | 'bibtex' | null>(null);
  const copy = async (k: 'chicago' | 'bibtex') => {
    await navigator.clipboard.writeText(cite[k]);
    setCopied(k);
  };
  return (
    <div className="cite-box">
      <p className="cite-label">Chicago</p>
      <p className="cite-text">{cite.chicago}</p>
      <button type="button" onClick={() => void copy('chicago')}>
        {copied === 'chicago' ? 'Copied' : 'Copy'}
        <span className="sr-only"> the Chicago citation</span>
      </button>
      <p className="cite-label">BibTeX</p>
      <pre className="cite-text">{cite.bibtex}</pre>
      <button type="button" onClick={() => void copy('bibtex')}>
        {copied === 'bibtex' ? 'Copied' : 'Copy'}
        <span className="sr-only"> the BibTeX entry</span>
      </button>
      <p className="muted cite-note">The data version is the commit this site was built from; it changes when the data does.</p>
    </div>
  );
}

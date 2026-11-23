import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AI_LIST, flaggedCitations, loadFlagged, trimProse, wikiTitle } from './ai-flagged.ts';

describe('AI-flagged citations', () => {
  it('reads a Wikipedia link as the dump writes its title', () => {
    expect(wikiTitle('https://en.wikipedia.org/wiki/Callisto_(mythology)')).toBe('Callisto (mythology)');
    expect(wikiTitle('https://en.m.wikipedia.org/wiki/Battle_of_Qarqar#Sources')).toBe('Battle of Qarqar');
    expect(wikiTitle('https://en.wikipedia.org/wiki/%C3%87atalh%C3%B6y%C3%BCk')).toBe('Çatalhöyük');
    expect(wikiTitle('https://en.wikipedia.org/wiki/aegeus')).toBe('Aegeus');
    expect(wikiTitle('https://en.wikipedia.org/w/index.php?title=Buy_now,_pay_later&oldid=1')).toBe('Buy now, pay later');
    expect(wikiTitle('https://de.wikipedia.org/wiki/Aegeus')).toBeNull();
    expect(wikiTitle('https://example.org/wiki/Aegeus')).toBeNull();
  });

  it('trims a link in prose to the link: closing punctuation and an enclosing parenthesis go, a title\'s own stay', () => {
    expect(trimProse('https://en.wikipedia.org/wiki/Miranda_Hobbs).')).toBe('https://en.wikipedia.org/wiki/Miranda_Hobbs');
    expect(trimProse('https://en.wikipedia.org/wiki/Callisto_(mythology)')).toBe('https://en.wikipedia.org/wiki/Callisto_(mythology)');
    expect(trimProse('https://en.wikipedia.org/wiki/Callisto_(mythology)),')).toBe('https://en.wikipedia.org/wiki/Callisto_(mythology)');
    expect(trimProse('https://en.wikipedia.org/wiki/Fine_page;')).toBe('https://en.wikipedia.org/wiki/Fine_page');
  });

  it('finds a link to a flagged page anywhere in a data file, and names where', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ai-flag-'));
    mkdirSync(join(dir, 'sub'));
    writeFileSync(join(dir, 'a.json'), JSON.stringify({ events: [{ sources: [{ url: 'https://en.wikipedia.org/wiki/Fine_page' }] }] }));
    writeFileSync(
      join(dir, 'sub', 'b.json'),
      JSON.stringify({
        tracks: [{ note: 'see https://en.wikipedia.org/wiki/Flagged_page.', aside: '(as in https://en.wikipedia.org/wiki/Flagged_page).', url: 'https://en.wikipedia.org/wiki/Flagged_page' }],
      }),
    );
    const hits = flaggedCitations(new Set(['Flagged page']), dir);
    expect(hits.map((h) => h.at).sort()).toEqual(['tracks[0].aside', 'tracks[0].note', 'tracks[0].url']);
    expect(hits[0].file).toBe(join(dir, 'sub', 'b.json'));
  });

  it('the committed list names its dump and has titles', () => {
    const { titles, dump } = loadFlagged(AI_LIST);
    expect(dump).toMatch(/^enwiki-\d{8}$/);
    expect(titles.size).toBeGreaterThan(1000);
  });
});

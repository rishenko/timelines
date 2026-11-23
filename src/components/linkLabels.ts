import type { LinkKind } from '../types.ts';

/** How each link kind reads: in the editor, from the source event, and from the target event. */
export const LINK_LABEL: Record<LinkKind, { form: string; out: string; in: string }> = {
  causes: { form: 'leads to', out: 'Leads to', in: 'Caused by' },
  'part-of': { form: 'is part of', out: 'Part of', in: 'Includes' },
  related: { form: 'related to', out: 'Related', in: 'Related' },
  succeeds: { form: 'succeeds', out: 'Succeeds', in: 'Succeeded by' },
  conquers: { form: 'conquers', out: 'Conquers', in: 'Conquered by' },
  // symmetric: co-rulers' reigns, allies acting together (Wikidata P1706)
  with: { form: 'together with', out: 'With', in: 'With' },
};

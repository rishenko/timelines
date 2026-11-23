/**
 * Where the schema keeps the before-present (deep time) settings, read in one place (schema v9). If the fields move or
 * are renamed, only this file, types.ts and the docs change.
 */
import type { BeforePresent, Calendar } from '../types.ts';

/** The calendar's before-present display, or null for a calendar that shows its era labels. */
export const beforePresent = (cal: Calendar | undefined): BeforePresent | null => cal?.beforePresent ?? null;

/** The share of its age an uncited "c." fades by, or null (use `meta.circaFade` years). */
export const circaShare = (cal: Calendar | undefined): number | null => cal?.beforePresent?.circaShare ?? null;

// A conflict event must not sit beside the same event under another title (Red Turban Rebellion / Rebellions, Ōnin War, the Fatimid conquest of
// Egypt "and foundation of Cairo"): pipelines/v2/emit.py shares main's event instead. This applies the emitter's own rule (title words, a start
// within 2 years) to every compiled timeline, so a duplicate from any branch fails here.
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const GENERIC = new Set(['war', 'wars', 'rebellion', 'rebellions', 'conquest', 'conquests', 'invasion', 'invasions', 'battle', 'siege', 'of', 'and', 'the', 'in', 'to'])

export function titleKey(t: string): Set<string> {
  const plain = t.normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase()
  const words = (plain.match(/[a-z0-9]+/g) ?? []).filter((w) => !GENERIC.has(w))
  return new Set(words.map((w) => (w.endsWith('s') && w.length > 3 ? w.slice(0, -1) : w)))
}

const subset = (a: Set<string>, b: Set<string>) => [...a].every((w) => b.has(w))

export function sameEvent(a: { title: string; start: number }, b: { title: string; start: number }): boolean {
  if (Math.abs(a.start - b.start) > 2) return false
  const x = titleKey(a.title)
  const y = titleKey(b.title)
  if (!x.size || !y.size) return false
  const equal = x.size === y.size && subset(x, y)
  return equal || (Math.min(x.size, y.size) >= 2 && (subset(x, y) || subset(y, x)))
}

describe('conflict events are not duplicated', () => {
  test('the title rule', () => {
    expect(sameEvent({ title: 'Ōnin War', start: 1467 }, { title: 'Onin War', start: 1467 })).toBe(true)
    expect(sameEvent({ title: 'Red Turban Rebellions', start: 1351 }, { title: 'Red Turban Rebellion', start: 1351 })).toBe(true)
    expect(sameEvent({ title: 'Fatimid conquest of Egypt', start: 969 }, { title: 'Fatimid conquest of Egypt and foundation of Cairo', start: 969 })).toBe(true)
    expect(sameEvent({ title: 'Battle of Tours', start: 732 }, { title: 'Battle of Poitiers', start: 732 })).toBe(false)
    expect(sameEvent({ title: 'Korean War', start: 1950 }, { title: 'Korean War', start: 1990 })).toBe(false)
  })

  const dir = 'public/timelines'
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json') && x !== 'index.json')) {
    test(`${f}: no conflict-* event has a twin`, () => {
      const events: { uuid: string; title: string; start: number }[] = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).events ?? []
      const twins: string[] = []
      for (const e of events.filter((x) => x.uuid.startsWith('conflict-'))) {
        for (const o of events) {
          if (o.uuid !== e.uuid && sameEvent(e, o)) twins.push(`${e.uuid} ~ ${o.uuid}`)
        }
      }
      expect(twins).toEqual([])
    })
  }
})

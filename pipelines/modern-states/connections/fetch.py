"""Caches wikitext + plain text for the claim pages from the local Wikipedia dump (settings: TIMELINES_DATA,
TIMELINES_WP_DUMP, or --data DIR / --dump NAME) into pipelines/out/connections-cache/ (not committed).
Run from the repo root: pipelines/.venv/bin/python -I pipelines/modern-states/connections/fetch.py"""
import sys, json, pathlib, re
HERE = pathlib.Path(__file__).resolve().parent
PIPELINES = HERE.parent.parent
sys.path.insert(0, str(PIPELINES / 'common'))
from settings import take_flags  # noqa: E402
take_flags(sys.argv[1:])  # before wp_dump, which reads the paths once
import settings, wp_dump, mwparserfromhell as mw  # noqa: E402
PAGES = ["NATO", "Member states of NATO", "Enlargement of NATO", "Warsaw Pact", "Comecon", "Non-Aligned Movement",
         "Member states of the Non-Aligned Movement", "Southeast Asia Treaty Organization", "Central Treaty Organization",
         "Belgrade Conference", "Reformation", "Age of Enlightenment", "Abolitionism",
         "Ninety-five Theses", "Peace of Augsburg", "Peace of Westphalia", "Slave Trade Act 1807", "Slavery Abolition Act 1833",
         "Lei Áurea", "Thirteenth Amendment to the United States Constitution", "Encyclopédie", "Diet of Worms", "Council of Trent",
         "Act of Supremacy 1534", "Haitian Revolution", "Declaration of the Rights of Man and of the Citizen",
         "Somerset v Stewart", "Brussels Conference Act of 1890", "Abolition of slavery timeline"]
CACHE = PIPELINES / 'out' / 'connections-cache'; CACHE.mkdir(parents=True, exist_ok=True); meta = {}
def plain(code):
    t = mw.parse(code).strip_code(normalize=True, collapse=True, keep_template_params=False)
    return re.sub(r'\s+', ' ', t)
for p in PAGES:
    r = wp_dump.page(p)
    if not r: print('MISSING', p); continue
    f = r['title'].replace(' ', '_').replace('/', '%2F')
    (CACHE / (f + '.wiki')).write_text(r['text'], encoding='utf-8'); (CACHE / (f + '.txt')).write_text(plain(r['text']), encoding='utf-8')
    meta[p] = dict(title=r['title'], redirect_from=r['redirect_from'], aiFlagged=wp_dump.ai_flagged(r['text']),
                   chars=len(r['text']))
    print(p, '->', r['title'], 'AI-FLAG' if meta[p]['aiFlagged'] else '', len(r['text']))
(CACHE / 'pages.json').write_text(json.dumps(dict(dump=settings.DUMP_NAME, pages=meta), indent=1), encoding='utf-8')

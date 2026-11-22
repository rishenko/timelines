"""
Where the pipelines find their inputs. Every generator reads these, so a path is set in one place:
  TIMELINES_DATA     folder holding the downloaded data (default ~/data); the Wikipedia dump and its index are in
                     its wikipedia/ folder
  TIMELINES_WP_DUMP  which dump to read (default enwiki-20261101, the dump every committed timeline was built from)
Set them in the environment, or pass --data DIR / --dump NAME to a generator.
"""
import os


def _load():
    global DATA, WIKIPEDIA, DUMP_NAME, DUMP, DUMP_INDEX
    DATA = os.path.expanduser(os.environ.get('TIMELINES_DATA', '~/data'))
    WIKIPEDIA = os.path.join(DATA, 'wikipedia')
    DUMP_NAME = os.environ.get('TIMELINES_WP_DUMP', 'enwiki-20261101')
    DUMP = os.path.join(WIKIPEDIA, f'{DUMP_NAME}-pages-articles-multistream.xml.bz2')
    DUMP_INDEX = os.path.join(WIKIPEDIA, f'{DUMP_NAME}-pages-articles-multistream-index.txt.bz2')


_load()


def take_flags(argv):
    """Removes --data DIR and --dump NAME from argv, applies them, and returns the rest. Call it before importing
    wp_dump (or anything that imports it), which reads the paths once."""
    rest = []
    it = iter(argv)
    for a in it:
        if a in ('--data', '--dump'):
            os.environ['TIMELINES_DATA' if a == '--data' else 'TIMELINES_WP_DUMP'] = next(it)
        else:
            rest.append(a)
    _load()
    return rest

"""wp_dump keeps the revision id and timestamp of the page it reads (wave 2 A1). No dump is needed: the index and the stream are faked.
python3 -I test_wp_dump.py   (from this folder, as CI runs it)"""
import os
import sqlite3
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wp_dump  # noqa: E402

XML = '''<mediawiki>
  <page>
    <title>Old Name</title>
    <ns>0</ns>
    <id>1</id>
    <redirect title="New Name" />
    <revision>
      <id>111</id>
      <parentid>110</parentid>
      <timestamp>2020-01-01T00:00:00Z</timestamp>
      <text bytes="20" xml:space="preserve">#REDIRECT [[New Name]]</text>
    </revision>
  </page>
  <page>
    <title>New Name</title>
    <ns>0</ns>
    <id>2</id>
    <revision>
      <id>222</id>
      <timestamp>2026-10-26T06:31:19Z</timestamp>
      <text bytes="9" xml:space="preserve">Body &amp; more</text>
    </revision>
  </page>
</mediawiki>'''


class Revision(unittest.TestCase):
    def setUp(self):
        db = sqlite3.connect(':memory:')
        db.execute('CREATE TABLE page (title TEXT, offset INTEGER, id INTEGER)')
        db.executemany('INSERT INTO page VALUES (?,?,?)', [('Old Name', 0, 1), ('New Name', 0, 2)])
        self._saved = (wp_dump._conn, wp_dump._stream)
        wp_dump._conn, wp_dump._stream = db, lambda offset: XML

    def tearDown(self):
        wp_dump._conn, wp_dump._stream = self._saved

    def test_page_carries_revision_and_timestamp(self):
        p = wp_dump.page('New Name')
        self.assertEqual((p['revision'], p['timestamp'], p['text']), (222, '2026-10-26T06:31:19Z', 'Body & more'))

    def test_a_followed_redirect_reports_the_target_revision(self):
        p = wp_dump.page('Old Name')
        self.assertEqual((p['title'], p['redirect_from'], p['revision']), ('New Name', 'Old Name', 222))

    def test_page_revision(self):
        self.assertEqual(wp_dump.page_revision('Old Name'), (222, '2026-10-26T06:31:19Z'))
        self.assertIsNone(wp_dump.page_revision('Nowhere'))


if __name__ == '__main__':
    unittest.main()

"""Code finds the data through data_root.py: a string literal naming ~/data, or an expanduser of ~ joined to 'data', fails here.
(Docstrings and comments may still name ~/data; data_root.py and its tests are the one place the default lives.)"""
import ast
import os
import unittest

PIPELINES = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ALLOWED = {'data_root.py', 'test_data_root.py', 'test_no_literal_data_path.py'}


def _docstring_nodes(tree):
    out = set()
    for n in ast.walk(tree):
        if isinstance(n, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and n.body and isinstance(n.body[0], ast.Expr) \
                and isinstance(n.body[0].value, ast.Constant):
            out.add(id(n.body[0].value))
    return out


def offences(path):
    with open(path, encoding='utf-8') as f:
        tree = ast.parse(f.read(), path)
    skip = _docstring_nodes(tree)
    bad = []
    for n in ast.walk(tree):
        if isinstance(n, ast.Constant) and isinstance(n.value, str) and id(n) not in skip:
            v = n.value.replace('\\', '/')
            if v == '~/data' or v.startswith('~/data/'):
                bad.append((n.lineno, n.value))
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'expanduser' and n.args \
                and isinstance(n.args[0], ast.Constant) and n.args[0].value == '~':
            bad.append((n.lineno, "expanduser('~')"))
    return bad


class NoLiteralDataPath(unittest.TestCase):
    def test_pipelines_use_data_root(self):
        found = []
        for dirpath, dirs, files in os.walk(PIPELINES):
            dirs[:] = [d for d in dirs if d not in ('.venv', 'node_modules', '__pycache__')]
            for name in files:
                if name.endswith('.py') and name not in ALLOWED:
                    p = os.path.join(dirpath, name)
                    found += [f'{os.path.relpath(p, PIPELINES)}:{ln} {what}' for ln, what in offences(p)]
        self.assertEqual(found, [], 'use data_root.root() / data_root.where(<folder>) instead')


if __name__ == '__main__':
    unittest.main()

"""
A Python file's shape without reading all of it: the module docstring, then each class and function with its
signature, line number and the first line of its docstring (methods indented under their class).

    python3 -I pipelines/extract/outline.py FILE [FILE...]
"""
import ast
import sys


def first_line(node):
    doc = ast.get_docstring(node)
    return doc.strip().splitlines()[0] if doc else ''


def outline(src):
    """Lines of the outline of Python source text."""
    tree = ast.parse(src)
    out = [l for l in (ast.get_docstring(tree) or '').strip().splitlines()]

    def walk(body, depth):
        for n in body:
            pad = '    ' * depth
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                ret = f' -> {ast.unparse(n.returns)}' if n.returns else ''
                head = f'{pad}{n.lineno}: {"async " if isinstance(n, ast.AsyncFunctionDef) else ""}def {n.name}({ast.unparse(n.args)}){ret}'
                out.append(head + (f'  # {first_line(n)}' if first_line(n) else ''))
                walk(n.body, depth + 1)  # nested defs
            elif isinstance(n, ast.ClassDef):
                bases = f'({", ".join(ast.unparse(b) for b in n.bases)})' if n.bases else ''
                out.append(f'{pad}{n.lineno}: class {n.name}{bases}' + (f'  # {first_line(n)}' if first_line(n) else ''))
                walk(n.body, depth + 1)
            elif isinstance(n, ast.If) and depth == 0:  # if __name__ == '__main__': and guarded defs
                walk(n.body, depth)

    walk(tree.body, 0)
    return out


if __name__ == '__main__':
    for i, path in enumerate(sys.argv[1:]):
        if len(sys.argv) > 2:
            print(('\n' if i else '') + f'== {path}')
        print('\n'.join(outline(open(path, encoding='utf8').read())))

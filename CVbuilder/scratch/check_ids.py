import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

with open('js/editor.js', 'r', encoding='utf-8') as f:
    editor_js = f.read()

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

ids_app = set(re.findall(r"el\(['\"]([^'\"]+)['\"]\)", app_js))
ids_editor = set(re.findall(r"el\(['\"]([^'\"]+)['\"]\)", editor_js))
all_referenced_ids = ids_app.union(ids_editor)

html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html))

print("Referenced IDs not found in HTML:")
for i in sorted(all_referenced_ids):
    if i not in html_ids:
        print("  -", i)

print("\nHTML IDs duplicated in HTML:")
import collections
html_id_counts = collections.Counter(re.findall(r'id=["\']([^"\']+)["\']', html))
for i, count in html_id_counts.items():
    if count > 1:
        print(f"  - {i} (appears {count} times)")

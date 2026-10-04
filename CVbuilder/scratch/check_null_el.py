import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

# find all el('xyz').something
matches = re.findall(r"el\(['\"]([^'\"]+)['\"]\)\.([a-zA-Z0-9_$]+)", code)
print("Found property accesses on el():")
for el_id, prop in matches:
    print(f"  - el('{el_id}').{prop}")

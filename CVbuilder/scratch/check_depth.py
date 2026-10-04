import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

backdrops = [(m.start(), m.group(1)) for m in re.finditer(r'<div[^>]*id=["\']([^"\']+)["\'][^>]*class=["\'][^"\']*modal-backdrop[^"\']*["\']', html)]

print(f"Total modal backdrops found: {len(backdrops)}\n")
for pos, modal_id in backdrops:
    before = html[:pos]
    open_divs = len(re.findall(r'<div[\s>]', before))
    close_divs = len(re.findall(r'</div>', before))
    depth = open_divs - close_divs
    print(f"Modal ID '{modal_id}' at pos {pos}: nesting depth = {depth} {'[TOP-LEVEL]' if depth == 1 else '[NESTED BUG!]'}")

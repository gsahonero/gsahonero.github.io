from bs4 import BeautifulSoup
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find all modal-backdrop divs and check their parent
pattern = r'<div[^>]*id=["\']([^"\']+)["\'][^>]*class=["\'][^"\']*modal-backdrop[^"\']*["\']'
matches = re.findall(pattern, html)
print("Found modal backdrops in index.html:")
for m in matches:
    print(" -", m)

# Let's check if addSectionModal is inside diagnosticsModal
diag_idx = html.find('id="diagnosticsModal"')
add_idx = html.find('id="addSectionModal"')
help_idx = html.find('id="helpScratchModal"')

print(f"\nPos diagnosticsModal: {diag_idx}")
print(f"Pos addSectionModal: {add_idx}")
print(f"Pos helpScratchModal: {help_idx}")

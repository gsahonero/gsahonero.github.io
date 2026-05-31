import os
import json
import re
from scholarly import scholarly, ProxyGenerator # <-- Import ProxyGenerator

# --- CONFIGURATION ---
SCHOLAR_ID = "Jfq_wNsAAAAJ" 
DATA_DIR = "_data"
PDF_DIR = "assets/papers"

# --- PROXY SETUP ---
print("Setting up proxies to bypass Google Scholar blocks...")
pg = ProxyGenerator()
# Use free proxies (Note: this might take a moment to initialize)
success = pg.FreeProxies() 
if success:
    scholarly.use_proxy(pg)
    print("Proxies successfully configured.")
else:
    print("Warning: Could not configure free proxies. Continuing without them, but might get blocked.")

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^À-ſ\w\s-]', '', text) 
    return re.sub(r'[-\s]+', '-', text).strip('-')

print(f"Fetching data for Scholar ID: {SCHOLAR_ID}...")
author = scholarly.search_author_id(SCHOLAR_ID)

# Fill only the basic publications list first
scholarly.fill(author, sections=['publications'])
total_pubs = len(author.get('publications', []))
print(f"Found {total_pubs} publications. Starting detailed fetch...")

publications = []

for i, pub in enumerate(author['publications']):
    temp_title = pub.get('bib', {}).get('title', 'Unknown Title')
    print(f"[{i+1}/{total_pubs}] Fetching details for: {temp_title}...") # <-- Critical for debugging
    
    try:
        scholarly.fill(pub) 
    except Exception as e:
        print(f"Failed to fetch detailed data for '{temp_title}': {e}")
        continue # Skip to the next one if blocked

    bib = pub['bib']
    title = bib.get('title', 'Untitled')

    # Robust author extraction
    authors_list = []
    bib_authors_str = bib.get('author')
    if bib_authors_str and isinstance(bib_authors_str, str):
        authors_list = [a.strip() for a in re.split(r'\s*and\s*|,\s*', bib_authors_str) if a.strip()]

    if not authors_list:
        pub_authors = pub.get('author')
        if isinstance(pub_authors, list):
            for author_obj in pub_authors:
                if isinstance(author_obj, dict) and 'name' in author_obj:
                    authors_list.append(author_obj['name'])

    authors_string = ', '.join(authors_list)

    slug = slugify(title)
    short_slug = slug[:30]

    pdf_path = None
    if os.path.exists(PDF_DIR):
        for filename in os.listdir(PDF_DIR):
            if filename.endswith(".pdf") and short_slug in filename:
                pdf_path = f"/{PDF_DIR}/{filename}"
                break

    publications.append({
        "title": title,
        "authors": authors_string,
        "year": bib.get('pub_year', ''),
        "journal": bib.get('citation', ''),
        "url": pub.get('pub_url', f"https://scholar.google.com/citations?view_op=view_citation&hl=en&user={SCHOLAR_ID}&citation_for_view={SCHOLAR_ID}:{pub.get('author_pub_id', '')}"),
        "pdf": pdf_path
    })

os.makedirs(DATA_DIR, exist_ok=True)

with open(f"{DATA_DIR}/publications.json", "w", encoding="utf-8") as f:
    json.dump(publications, f, indent=4, ensure_ascii=False)

print(f"Successfully saved {len(publications)} publications.")
import os
import json
import re
from scholarly import scholarly

# --- CONFIGURATION ---
SCHOLAR_ID = "Jfq_wNsAAAAJ" # <-- Insert your 12-character ID here
DATA_DIR = "_data"
PDF_DIR = "assets/papers"

def slugify(text):
    """Converts a title to a clean, lowercase slug for PDF matching."""
    text = text.lower()
    # Keep only alphanumeric and spaces, then replace spaces with hyphens
    text = re.sub(r'[^À-ſ\w\s-]', '', text) # Reverted to original, correct regex
    return re.sub(r'[-\s]+', '-', text).strip('-')


print(f"Fetching data for Scholar ID: {SCHOLAR_ID}...")
author = scholarly.search_author_id(SCHOLAR_ID)
scholarly.fill(author, sections=['publications'])

publications = []

for pub in author['publications']:
    scholarly.fill(pub) # Fill the individual publication details
    bib = pub['bib']
    # print(bib) # Keep this for debugging if needed, but remove for final
    title = bib.get('title', 'Untitled')

    # Robust author extraction
    authors_list = []
    # First, try to get from bib['author'] if it exists and is a string
    bib_authors_str = bib.get('author')
    if bib_authors_str and isinstance(bib_authors_str, str):
        # Scholarly bib['author'] uses "and" as a separator, not always comma
        # This regex splits by " and " while handling multiple authors cleanly
        authors_list = [a.strip() for a in re.split(r'\s*and\s*|,\s*', bib_authors_str) if a.strip()]

    # If bib['author'] didn't yield anything or wasn't a string, try pub['author'] (which is a list of dicts)
    if not authors_list:
        pub_authors = pub.get('author')
        if isinstance(pub_authors, list):
            for author_obj in pub_authors:
                if isinstance(author_obj, dict) and 'name' in author_obj:
                    authors_list.append(author_obj['name'])

    authors_string = ', '.join(authors_list)

    # Create a slug to check for local PDF
    slug = slugify(title)
    # We check the first 30 characters to allow for shorter file names
    short_slug = slug[:30]

    # Check if a matching PDF exists in the assets folder
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
        "url": pub.get('pub_url', f"https://scholar.google.com/citations?view_op=view_citation&hl=en&user={SCHOLAR_ID}&citation_for_view={SCHOLAR_ID}:{pub['author_pub_id']}"),
        "pdf": pdf_path
    })

# Ensure the _data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

with open(f"{DATA_DIR}/publications.json", "w", encoding="utf-8") as f:
    json.dump(publications, f, indent=4, ensure_ascii=False)

print(f"Successfully saved {len(publications)} publications.")
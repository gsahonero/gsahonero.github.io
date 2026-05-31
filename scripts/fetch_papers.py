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
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text).strip('-')

def main():
    print(f"Fetching data for Scholar ID: {SCHOLAR_ID}...")
    author = scholarly.search_author_id(SCHOLAR_ID)
    scholarly.fill(author, sections=['publications'])
    
    publications = []
    
    for pub in author['publications']:
        bib = pub['bib']
        title = bib.get('title', 'Untitled')
        
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
            "authors": bib.get('author', ''),
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

if __name__ == "__main__":
    main()
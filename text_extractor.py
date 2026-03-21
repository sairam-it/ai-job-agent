# test_extractor.py
# Purpose : Standalone test for pdf_extractor.py
# Run with: python test_extractor.py
# Depends : phase1_matching/pdf_extractor.py, data/sample_resume.pdf

from phase1_matching.pdf_extractor import extract_text

RESUME_PATH = "data/sample_resume.pdf"

print("=" * 50)
print("  TESTING: pdf_extractor.py")
print("=" * 50)

try:
    raw_text = extract_text(RESUME_PATH)

    print(f"\n[✓] Extraction successful!")
    print(f"[i] Total characters extracted : {len(raw_text)}")
    print(f"[i] Total lines extracted      : {len(raw_text.splitlines())}")
    print("\n--- Extracted text ---\n")
    print(raw_text[:])
    

except FileNotFoundError:
    print(f"\n[✗] ERROR: Resume file not found at '{RESUME_PATH}'")
    print("    → Make sure sample_resume.pdf is inside the data/ folder")

except Exception as e:
    print(f"\n[✗] ERROR: Something went wrong — {e}")

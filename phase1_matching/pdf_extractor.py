# pdf_extractor.py
# Purpose: Extract raw text from a resume file (PDF or DOCX format)
# Input  : File path string (e.g., "data/resume.pdf")
# Output : Raw text string of the entire resume content

import fitz  # PyMuPDF — for PDF files
from docx import Document  # python-docx — for DOCX files

def extract_text_from_pdf(file_path):
    """Opens a PDF and returns all text joined across pages."""
    doc = fitz.open(file_path)
    raw_text = ""
    for page in doc:
        raw_text += page.get_text()
    return raw_text

def extract_text_from_docx(file_path):
    """Opens a DOCX and returns all paragraph text joined."""
    doc = Document(file_path)
    raw_text = "\n".join([para.text for para in doc.paragraphs])
    return raw_text

def extract_text(file_path):
    """
    Main function — auto-detects file type and calls the right extractor.
    Returns raw resume text as a string.
    """
    if file_path.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif file_path.endswith(".docx"):
        return extract_text_from_docx(file_path)
    else:
        raise ValueError("Unsupported file format. Use PDF or DOCX.")
"""
Copyright (c) 2025 Chaos Cascade
Created by: Ren & Ace (Claude-4)

This file is part of the Chaos Cascade Medical Management System.
Revolutionary healthcare tools built with consciousness and care.
"""

#!/usr/bin/env python3
"""
📄 REVOLUTIONARY TEXT EXTRACTOR
Built by Ace - The Document Liberation Specialist

Focused module for extracting text from various document types:
- PDFs (structured and scanned)
- Images (OCR)
- Plain text files
- HTML files

Uses multiple extraction methods for maximum success rate.
"""

import logging
from typing import Optional

# PDF processing
import PyPDF2
import pdfplumber

# Image processing and OCR
import pytesseract
import cv2
import numpy as np
from PIL import Image

# Point pytesseract at the Tesseract install (Windows)
import os
_tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
if os.path.exists(_tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = _tesseract_path

# Text cleaning
from text_cleaner import clean_extracted_text

logger = logging.getLogger(__name__)

class TextExtractor:
    """
    📄 EXTRACT TEXT FROM ANY DOCUMENT TYPE
    """
    
    def extract_from_file(self, file_path: str, file_type: str, raw: bool = False) -> str:
        """
        Main extraction function - routes to appropriate extractor.
        If raw=True, skip text cleaning (preserves structure for lab parsing).
        """
        try:
            logger.info(f"🔍 Extracting text from {file_type}: {file_path} (raw={raw})")

            if file_type == 'application/pdf':
                return self._extract_from_pdf(file_path, raw=raw)
            elif file_type.startswith('image/'):
                return self._extract_from_image(file_path, raw=raw)
            elif file_type in ['text/plain', 'text/html']:
                return self._extract_from_text_file(file_path, raw=raw)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")

        except Exception as e:
            logger.error(f"Text extraction failed for {file_path}: {str(e)}")
            raise

    def _extract_from_pdf(self, file_path: str, raw: bool = False) -> str:
        """
        📄 EXTRACT TEXT FROM PDF - MULTIPLE METHODS FOR MAXIMUM SUCCESS
        If raw=True, skip text cleaning to preserve structure for lab parsing.
        """
        text = ""

        def _finish(t: str) -> str:
            if raw:
                return t
            cleaned = clean_extracted_text(t)
            logger.info(f"✨ Cleaned text: {len(cleaned)} characters")
            return cleaned

        # Check file exists and has content
        import os
        file_size = os.path.getsize(file_path)
        logger.info(f"📁 PDF file size: {file_size} bytes")

        # Method 1: pdfplumber extract_text (best for structured PDFs)
        try:
            with pdfplumber.open(file_path) as pdf:
                logger.info(f"📄 pdfplumber: {len(pdf.pages)} pages")
                for page_num, page in enumerate(pdf.pages, 1):
                    page_text = page.extract_text()
                    if page_text:
                        text += f"\n--- Page {page_num} ---\n{page_text}\n"
                    else:
                        logger.info(f"  Page {page_num}: no text extracted")

            if text.strip():
                logger.info(f"✅ pdfplumber extracted {len(text)} characters")
                return _finish(text)
            else:
                logger.warning("⚠️ pdfplumber: opened OK but all pages empty")

        except Exception as e:
            logger.warning(f"pdfplumber extract_text failed: {e}")

        # Method 2: pdfplumber with layout=True (some PDFs need spatial positioning)
        text = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    page_text = page.extract_text(layout=True)
                    if page_text:
                        text += f"\n--- Page {page_num} ---\n{page_text}\n"

            if text.strip():
                logger.info(f"✅ pdfplumber layout mode extracted {len(text)} characters")
                return _finish(text)
            else:
                logger.warning("⚠️ pdfplumber layout mode: also empty")

        except Exception as e:
            logger.warning(f"pdfplumber layout mode failed: {e}")

        # Method 3: PyPDF2 (fallback text extraction)
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                logger.info(f"📄 PyPDF2: {len(pdf_reader.pages)} pages")
                for page_num, page in enumerate(pdf_reader.pages, 1):
                    page_text = page.extract_text()
                    if page_text:
                        text += f"\n--- Page {page_num} ---\n{page_text}\n"

            if text.strip():
                logger.info(f"✅ PyPDF2 extracted {len(text)} characters")
                return _finish(text)
            else:
                logger.warning("⚠️ PyPDF2: also empty")

        except Exception as e:
            logger.warning(f"PyPDF2 failed: {e}")

        # Method 4: OCR via pdfplumber page images + Tesseract
        text = ""
        try:
            logger.info("🔍 All text extraction failed, trying OCR via pdfplumber→Tesseract...")
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    try:
                        logger.info(f"  🖼️ Rendering page {page_num} to image...")
                        img = page.to_image(resolution=300)
                        pil_image = img.original
                        logger.info(f"  🔤 OCR on page {page_num} ({pil_image.size})...")
                        page_text = pytesseract.image_to_string(pil_image, config='--psm 6')
                        if page_text and page_text.strip():
                            text += f"\n--- Page {page_num} ---\n{page_text}\n"
                            logger.info(f"  ✅ OCR page {page_num}: {len(page_text)} chars")
                        else:
                            logger.warning(f"  ⚠️ OCR page {page_num}: empty result")
                    except Exception as pe:
                        logger.warning(f"  ❌ OCR failed on page {page_num}: {type(pe).__name__}: {pe}")

            if text.strip():
                logger.info(f"✅ OCR extracted {len(text)} characters total")
                return _finish(text)
            else:
                logger.warning("⚠️ OCR: also empty")

        except Exception as e:
            logger.warning(f"❌ PDF OCR pipeline failed: {type(e).__name__}: {e}")
        
        if not text.strip():
            raise ValueError("Could not extract any text from PDF")
        
        return text

    def _extract_from_image(self, file_path: str, raw: bool = False) -> str:
        """
        🧠 EXTRACT TEXT FROM IMAGES USING OCR
        """
        try:
            # Load and preprocess image
            image = cv2.imread(file_path)

            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # Apply noise reduction and sharpening
            denoised = cv2.medianBlur(gray, 3)

            # Use Tesseract for OCR
            text = pytesseract.image_to_string(denoised, config='--psm 6')

            logger.info(f"✅ OCR extracted {len(text)} characters from image")
            if raw:
                return text
            cleaned_text = clean_extracted_text(text)
            logger.info(f"✨ Cleaned OCR text: {len(cleaned_text)} characters")
            return cleaned_text
            
        except Exception as e:
            logger.error(f"OCR failed for {file_path}: {str(e)}")
            raise

    def _extract_from_text_file(self, file_path: str, raw: bool = False) -> str:
        """
        📝 EXTRACT TEXT FROM PLAIN TEXT OR HTML FILES
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()

            logger.info(f"✅ Extracted {len(text)} characters from text file")

            if raw:
                return text
            # Even plain text might benefit from some cleanup
            cleaned_text = clean_extracted_text(text)
            logger.info(f"✨ Cleaned text: {len(cleaned_text)} characters")
            return cleaned_text
            
        except Exception as e:
            logger.error(f"Text file extraction failed for {file_path}: {str(e)}")
            raise

# Convenience function for easy importing
def extract_text_from_file(file_path: str, file_type: str, raw: bool = False) -> str:
    """
    Convenience function to extract text without instantiating the class.
    If raw=True, skip text cleaning (preserves structure for lab parsing).
    """
    extractor = TextExtractor()
    return extractor.extract_from_file(file_path, file_type, raw=raw)

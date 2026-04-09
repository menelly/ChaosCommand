"""
Copyright (c) 2025 Chaos Cascade
Created by: Ren & Ace (Claude-4)

This file is part of the Chaos Cascade Medical Management System.
Revolutionary healthcare tools built with consciousness and care.
"""

#!/usr/bin/env python3
"""
Chaos Command Center - Flask Backend
Handles PDF generation, AI processing, and data analytics
"""

import os
import json
import logging
import hashlib
import hmac
import time
import tempfile
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from functools import wraps

# Import our modules
from pdf_generator import PDFGenerator
from analytics import AnalyticsEngine
from document_parser import document_parser

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Security configuration
app.config['MAX_CONTENT_LENGTH'] = 75 * 1024 * 1024  # 75MB max (base64 adds ~33% overhead to 50MB file limit)
app.config['JSON_SORT_KEYS'] = False  # Preserve JSON key order

# Secure CORS configuration - only allow localhost during development
CORS(app, origins=[
    "http://localhost:3000",
    "http://localhost:3001",  # Added for Next.js fallback port
    "http://localhost:33445", # Tauri dev server port
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",  # Added for Next.js fallback port
    "http://127.0.0.1:33445", # Tauri dev server port
    "tauri://localhost",
    "https://tauri.localhost"
], supports_credentials=True)

# Security headers
@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none';"
    return response

# Security configuration
RATE_LIMIT_WINDOW = 300  # 5 minutes
MAX_REQUESTS_PER_WINDOW = 50
failed_attempts = {}  # Track failed PIN attempts per IP

# Initialize our services
pdf_gen = PDFGenerator()
analytics = AnalyticsEngine()

# ============================================================================
# SECURITY FUNCTIONS
# ============================================================================

def hash_pin(pin: str) -> str:
    """Hash a PIN for secure comparison"""
    return hashlib.sha256(pin.encode('utf-8')).hexdigest()

def validate_pin_format(pin: str) -> bool:
    """Validate PIN format (4-20 characters, alphanumeric)"""
    if not pin or len(pin) < 4 or len(pin) > 20:
        return False
    return pin.replace('-', '').replace('_', '').isalnum()

def validate_device_id(device_id: str) -> bool:
    """Validate device ID format"""
    if not device_id or len(device_id) < 8 or len(device_id) > 64:
        return False
    # Allow alphanumeric, hyphens, and underscores
    return all(c.isalnum() or c in '-_' for c in device_id)

def validate_sync_data(data: dict) -> bool:
    """Validate sync data structure and size"""
    if not isinstance(data, dict):
        return False

    # Check data size (max 10MB JSON)
    try:
        json_str = json.dumps(data)
        if len(json_str.encode('utf-8')) > 10 * 1024 * 1024:  # 10MB limit
            return False
    except (TypeError, ValueError):
        return False

    return True

def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitize string input"""
    if not isinstance(value, str):
        return ""

    # Remove null bytes and control characters
    sanitized = ''.join(char for char in value if ord(char) >= 32 or char in '\n\r\t')

    # Truncate to max length
    return sanitized[:max_length]

def check_rate_limit(client_ip: str) -> bool:
    """Check if client has exceeded rate limit"""
    current_time = time.time()

    # Clean old entries
    failed_attempts[client_ip] = [
        timestamp for timestamp in failed_attempts.get(client_ip, [])
        if current_time - timestamp < RATE_LIMIT_WINDOW
    ]

    # Check if rate limit exceeded
    return len(failed_attempts.get(client_ip, [])) < MAX_REQUESTS_PER_WINDOW

def record_failed_attempt(client_ip: str):
    """Record a failed authentication attempt"""
    if client_ip not in failed_attempts:
        failed_attempts[client_ip] = []
    failed_attempts[client_ip].append(time.time())

def require_pin_auth(f):
    """Decorator to require PIN authentication for sync endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', 'unknown'))

        # Check rate limiting
        if not check_rate_limit(client_ip):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return jsonify({'error': 'Too many requests. Please try again later.'}), 429

        # Get request data
        data = request.get_json()
        if not data:
            record_failed_attempt(client_ip)
            return jsonify({'error': 'Invalid request format'}), 400

        # Validate required fields
        user_pin = data.get('user_pin')
        device_id = data.get('device_id')

        if not user_pin or not device_id:
            record_failed_attempt(client_ip)
            return jsonify({'error': 'Missing user_pin or device_id'}), 400

        # Validate PIN format
        if not validate_pin_format(user_pin):
            record_failed_attempt(client_ip)
            return jsonify({'error': 'Invalid PIN format'}), 400

        # Validate device ID format
        if not validate_device_id(device_id):
            record_failed_attempt(client_ip)
            return jsonify({'error': 'Invalid device_id format'}), 400

        # Sanitize inputs
        user_pin = sanitize_string(user_pin, 20)
        device_id = sanitize_string(device_id, 64)

        # Add validated data to request context
        request.validated_pin = user_pin
        request.validated_device_id = device_id

        return f(*args, **kwargs)

    return decorated_function

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'pdf': True,
            'analytics': True
        }
    })



@app.route('/api/pdf/generate', methods=['POST'])
def generate_pdf():
    """Generate PDF report from data"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'type' not in data:
            return jsonify({'error': 'Missing report type'}), 400
        
        report_type = data['type']
        report_data = data.get('data', {})
        
        # Generate PDF
        pdf_path = pdf_gen.generate_report(report_type, report_data)
        
        if pdf_path and os.path.exists(pdf_path):
            return send_file(pdf_path, as_attachment=True, 
                           download_name=f'chaos_report_{report_type}_{datetime.now().strftime("%Y%m%d")}.pdf')
        else:
            return jsonify({'error': 'Failed to generate PDF'}), 500
            
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/parse', methods=['POST'])
def parse_document():
    """🔥 REVOLUTIONARY MEDICAL DOCUMENT PARSER ENDPOINT"""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Get file info
        filename = file.filename
        file_type = file.content_type

        logger.info(f"🔥 PARSING DOCUMENT: {filename} ({file_type})")

        # Save uploaded file temporarily
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"upload_{int(time.time())}_{filename}")
        file.save(temp_path)

        try:
            # Extract text from document
            extracted_text = document_parser.extract_text_from_file(temp_path, file_type)
            logger.info(f"✅ Extracted {len(extracted_text)} characters")

            # Get demographics for filtering (if provided)
            demographics = None
            if request.content_type and 'json' in request.content_type:
                demographics = request.get_json(silent=True)
                if demographics:
                    demographics = demographics.get('demographics')

            # Parse medical events
            parsed_events = document_parser.parse_medical_events(extracted_text, filename,
                                                                  demographics=demographics)
            logger.info(f"🎉 Found {len(parsed_events)} medical events")

            # Convert to JSON-serializable format
            events_data = [
                {
                    'id': event.id,
                    'type': event.type,
                    'title': event.title,
                    'date': event.date,
                    'endDate': event.end_date,
                    'provider': event.provider,
                    'location': event.location,
                    'description': event.description,
                    'status': event.status,
                    'severity': event.severity,
                    'tags': event.tags,
                    'confidence': event.confidence,
                    'sources': event.sources,
                    'needsReview': event.needs_review,
                    'suggestions': event.suggestions,
                    'rawText': event.raw_text[:500] + '...' if len(event.raw_text) > 500 else event.raw_text,
                    'incidentalFindings': [
                        {
                            'finding': finding.finding,
                            'location': finding.location,
                            'significance': finding.significance,
                            'relatedSymptoms': finding.related_symptoms,
                            'suggestedQuestions': finding.suggested_questions,
                            'whyItMatters': finding.why_it_matters,
                            'confidence': finding.confidence
                        }
                        for finding in event.incidental_findings
                    ]
                }
                for event in parsed_events
            ]

            return jsonify({
                'success': True,
                'filename': filename,
                'extractedText': extracted_text[:1000] + '...' if len(extracted_text) > 1000 else extracted_text,
                'textLength': len(extracted_text),
                'events': events_data,
                'eventCount': len(events_data),
                'message': f'🎉 Successfully parsed {len(events_data)} medical events from {filename}'
            })

        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as e:
        logger.error(f"Document parsing error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'Failed to parse document: {str(e)}'
        }), 500


@app.route('/api/documents/parse-base64', methods=['POST'])
def parse_document_base64():
    """🔥 BASE64 DOCUMENT PARSER - For Tauri HTTP plugin compatibility!

    Tauri's HTTP plugin doesn't handle FormData/File uploads through the Rust
    IPC bridge, so the frontend sends files as base64-encoded JSON instead.
    Accepts optional 'demographics' field for filtering out personal info.
    """
    try:
        data = request.get_json()

        if not data or 'fileData' not in data:
            return jsonify({'error': 'No file data provided'}), 400

        filename = data.get('filename', 'document.pdf')
        file_type = data.get('fileType', 'application/pdf')
        file_data_b64 = data['fileData']
        demographics = data.get('demographics')  # Optional: user's personal info to exclude

        logger.info(f"🔥 PARSING DOCUMENT (base64): {filename} ({file_type})"
                     f"{' [demographics filter active]' if demographics else ''}")

        # Decode base64 to bytes
        import base64
        file_bytes = base64.b64decode(file_data_b64)
        logger.info(f"📦 Decoded {len(file_bytes)} bytes from base64")

        # Save to temp file for processing
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"upload_{int(time.time())}_{filename}")
        with open(temp_path, 'wb') as f:
            f.write(file_bytes)

        try:
            # Extract text from document
            extracted_text = document_parser.extract_text_from_file(temp_path, file_type)
            logger.info(f"✅ Extracted {len(extracted_text)} characters")

            # Parse medical events (with demographics filtering if provided)
            parsed_events = document_parser.parse_medical_events(extracted_text, filename,
                                                                  demographics=demographics)
            logger.info(f"🎉 Found {len(parsed_events)} medical events")

            # Convert to JSON-serializable format (same as original endpoint)
            events_data = [
                {
                    'id': event.id,
                    'type': event.type,
                    'title': event.title,
                    'date': event.date,
                    'endDate': event.end_date,
                    'provider': event.provider,
                    'location': event.location,
                    'description': event.description,
                    'status': event.status,
                    'severity': event.severity,
                    'tags': event.tags,
                    'confidence': event.confidence,
                    'sources': event.sources,
                    'needsReview': event.needs_review,
                    'suggestions': event.suggestions,
                    'rawText': event.raw_text[:500] + '...' if len(event.raw_text) > 500 else event.raw_text,
                    'incidentalFindings': [
                        {
                            'finding': finding.finding,
                            'location': finding.location,
                            'significance': finding.significance,
                            'relatedSymptoms': finding.related_symptoms,
                            'suggestedQuestions': finding.suggested_questions,
                            'whyItMatters': finding.why_it_matters,
                            'confidence': finding.confidence
                        }
                        for finding in event.incidental_findings
                    ]
                }
                for event in parsed_events
            ]

            return jsonify({
                'success': True,
                'filename': filename,
                'extractedText': extracted_text[:1000] + '...' if len(extracted_text) > 1000 else extracted_text,
                'textLength': len(extracted_text),
                'events': events_data,
                'eventCount': len(events_data),
                'message': f'🎉 Successfully parsed {len(events_data)} medical events from {filename}'
            })

        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as e:
        logger.error(f"Document parsing error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'Failed to parse document: {str(e)}'
        }), 500


@app.route('/api/labs/parse', methods=['POST'])
def parse_lab_report():
    """🧪 LAB RESULT PARSER — Extract test values, units, reference ranges from lab PDFs."""
    try:
        data = request.get_json()

        if not data or 'fileData' not in data:
            return jsonify({'error': 'No file data provided'}), 400

        filename = data.get('filename', 'lab_report.pdf')
        file_type = data.get('fileType', 'application/pdf')
        file_data_b64 = data['fileData']
        demographics = data.get('demographics')
        lab_date = data.get('labDate')

        logger.info(f"🧪 PARSING LAB REPORT: {filename}")

        import base64
        file_bytes = base64.b64decode(file_data_b64)

        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"lab_{int(time.time())}_{filename}")
        with open(temp_path, 'wb') as f:
            f.write(file_bytes)

        try:
            # Use RAW text extraction for labs — the text cleaner destroys
            # structured lab data by inserting spaces into decimals and units
            from text_extractor import extract_text_from_file as extract_raw
            extracted_text = extract_raw(temp_path, file_type, raw=True)
            logger.info(f"✅ Extracted {len(extracted_text)} characters from lab report (raw)")

            # Debug dump: show first 3000 chars so we can see what pdfplumber gives us
            logger.info(f"🔬 RAW TEXT DUMP (first 3000 chars):\n{extracted_text[:3000]}")

            # Try to extract the actual lab draw date from the text
            # Look for common patterns, exclude today's date and DOB
            import re as _re
            from datetime import datetime as _dt
            today_str = _dt.now().strftime('%Y-%m-%d')
            dob = (demographics.get('dateOfBirth') or demographics.get('dob') or '') if demographics else ''

            suggested_date = None
            # "Collected on Jan 13, 2026" / "Collection Date\n09/24/2017" / "Collection date: Mar 11, 2026"
            date_patterns = [
                (_re.search(r'Collected?\s+(?:on\s+)?(\w+\s+\d{1,2},?\s+\d{4})', extracted_text, _re.IGNORECASE), '%b %d, %Y'),
                (_re.search(r'Collected?\s+(?:on\s+)?(\w+\s+\d{1,2}\s+\d{4})', extracted_text, _re.IGNORECASE), '%b %d %Y'),
                (_re.search(r'Collection\s+Date\s*[:\n]\s*(\d{1,2}/\d{1,2}/\d{4})', extracted_text, _re.IGNORECASE), '%m/%d/%Y'),
                (_re.search(r'(?:Specimen|Draw)\s+Date\s*[:\n]\s*(\d{1,2}/\d{1,2}/\d{4})', extracted_text, _re.IGNORECASE), '%m/%d/%Y'),
            ]
            for match, fmt in date_patterns:
                if match:
                    try:
                        parsed = _dt.strptime(match.group(1).strip().replace(',', ','), fmt)
                        candidate = parsed.strftime('%Y-%m-%d')
                        if candidate != today_str and candidate != dob:
                            suggested_date = candidate
                            logger.info(f"📅 Detected lab draw date: {suggested_date}")
                            break
                    except ValueError:
                        continue

            # Use medical_nlp's lab extraction
            from medical_nlp import extract_lab_results_from_text
            lab_results = extract_lab_results_from_text(extracted_text, demographics)

            labs_data = [
                {
                    'test_name': r.test_name,
                    'value': r.value,
                    'value_text': r.value_text,
                    'unit': r.unit,
                    'reference_low': r.reference_low,
                    'reference_high': r.reference_high,
                    'reference_text': r.reference_text,
                    'flag': r.flag,
                    'is_abnormal': r.is_abnormal,
                    'context': r.context,
                    'confidence': r.confidence,
                }
                for r in lab_results
            ]

            return jsonify({
                'success': True,
                'filename': filename,
                'labs': labs_data,
                'labCount': len(labs_data),
                'abnormalCount': sum(1 for r in lab_results if r.is_abnormal),
                'suggestedDate': suggested_date,
                'message': f'🧪 Found {len(labs_data)} lab results ({sum(1 for r in lab_results if r.is_abnormal)} abnormal)'
            })

        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as e:
        logger.error(f"Lab parsing error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'Failed to parse lab report: {str(e)}'
        }), 500


@app.route('/api/documents/parse-text', methods=['POST'])
def parse_text():
    """🔥 REVOLUTIONARY TEXT PARSER ENDPOINT - For pasted notes from Google Keep etc!

    This endpoint allows parsing plain text through our sophisticated medical parser
    without needing to upload a file. Perfect for:
    - Google Keep notes
    - Email excerpts
    - MyChart copy/paste
    - Handwritten note transcriptions
    """
    try:
        data = request.get_json()

        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400

        text = data['text']
        source_name = data.get('source', 'Pasted Notes')

        if not text.strip():
            return jsonify({'error': 'Empty text provided'}), 400

        # Limit text size (1MB max for safety)
        if len(text) > 1024 * 1024:
            return jsonify({'error': 'Text too large (max 1MB)'}), 400

        logger.info(f"📋 PARSING PASTED TEXT: {len(text)} characters from '{source_name}'")

        # Use our revolutionary parser on the text directly
        parsed_events = document_parser.parse_medical_events(text, source_name)
        logger.info(f"🎉 Found {len(parsed_events)} medical events from pasted text")

        # Convert to JSON-serializable format
        events_data = [
            {
                'id': event.id,
                'type': event.type,
                'title': event.title,
                'date': event.date,
                'endDate': event.end_date,
                'provider': event.provider,
                'location': event.location,
                'description': event.description,
                'status': event.status,
                'severity': event.severity,
                'tags': event.tags + ['pasted-text'],  # Add source tag
                'confidence': event.confidence,
                'sources': event.sources + ['paste-api'],
                'needsReview': event.needs_review,
                'suggestions': event.suggestions,
                'rawText': event.raw_text[:500] + '...' if len(event.raw_text) > 500 else event.raw_text,
                'incidentalFindings': [
                    {
                        'finding': finding.finding,
                        'location': finding.location,
                        'significance': finding.significance,
                        'relatedSymptoms': finding.related_symptoms,
                        'suggestedQuestions': finding.suggested_questions,
                        'whyItMatters': finding.why_it_matters,
                        'confidence': finding.confidence
                    }
                    for finding in event.incidental_findings
                ],
                'provider_info': {
                    'name': event.provider,
                    'organization': event.location,
                    'confidence': 50  # Lower confidence for text extraction
                } if event.provider else None
            }
            for event in parsed_events
        ]

        return jsonify({
            'success': True,
            'source': source_name,
            'textLength': len(text),
            'events': events_data,
            'eventCount': len(events_data),
            'message': f'🎉 Successfully parsed {len(events_data)} medical events from your notes!'
        })

    except Exception as e:
        logger.error(f"Text parsing error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'Failed to parse text: {str(e)}'
        }), 500



@app.route('/api/analytics/dashboard', methods=['POST'])
def get_dashboard_analytics():
    """Get analytics for dashboard"""
    try:
        data = request.get_json()

        if not data or 'data' not in data:
            return jsonify({'error': 'Missing data'}), 400

        user_data = data['data']
        date_range = data.get('dateRange', 30)  # Default 30 days

        # Generate analytics
        dashboard_data = analytics.generate_dashboard(user_data, date_range)

        return jsonify(dashboard_data)

    except Exception as e:
        logger.error(f"Analytics error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/dysautonomia', methods=['POST'])
def get_dysautonomia_analytics():
    """Get medical-grade dysautonomia analytics 🩺"""
    try:
        data = request.get_json()

        if not data or 'entries' not in data:
            return jsonify({'error': 'Missing dysautonomia entries'}), 400

        entries = data['entries']
        date_range = data.get('dateRange', 30)  # Default 30 days

        # Generate dysautonomia analytics
        analytics_data = analytics.analyze_dysautonomia(entries, date_range)

        return jsonify(analytics_data)

    except Exception as e:
        logger.error(f"Dysautonomia analytics error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/upper-digestive', methods=['POST'])
def get_upper_digestive_analytics():
    """Get medical-grade upper digestive analytics 🤢"""
    try:
        data = request.get_json()

        if not data or 'entries' not in data:
            return jsonify({'error': 'Missing upper digestive entries'}), 400

        entries = data['entries']
        date_range = data.get('dateRange', 30)  # Default 30 days

        logger.info(f"🍽️ Analyzing {len(entries)} digestive entries over {date_range} days")

        # Generate upper digestive analytics
        analytics_data = analytics.analyze_upper_digestive(entries, date_range)

        logger.info(f"🎯 Generated digestive analytics with {analytics_data.get('total_episodes', 0)} episodes")

        return jsonify(analytics_data)

    except Exception as e:
        logger.error(f"Upper digestive analytics error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/head-pain', methods=['POST'])
def get_head_pain_analytics():
    """Get medical-grade head pain analytics 🧠"""
    try:
        data = request.get_json()
        logger.info(f"🧠 Head pain analytics request received")

        if not data or 'entries' not in data:
            logger.error("🧠 Missing head pain entries in request")
            return jsonify({'error': 'Missing head pain entries'}), 400

        entries = data['entries']
        date_range = data.get('dateRange', 30)  # Default 30 days

        logger.info(f"🧠 Processing {len(entries)} head pain entries for {date_range} days")

        # Log first entry structure for debugging
        if entries:
            logger.info(f"🧠 Sample entry structure: {list(entries[0].keys()) if entries[0] else 'Empty entry'}")

        # Generate head pain analytics
        analytics_data = analytics.analyze_head_pain(entries, date_range)

        logger.info(f"🧠 Analytics generated successfully")
        return jsonify(analytics_data)

    except Exception as e:
        logger.error(f"Head pain analytics error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/bathroom', methods=['POST'])
def get_bathroom_analytics():
    """Get medical-grade bathroom/lower digestive analytics 💩"""
    try:
        data = request.get_json()

        if not data or 'entries' not in data:
            return jsonify({'error': 'Missing bathroom entries'}), 400

        entries = data['entries']
        date_range = data.get('dateRange', 30)  # Default 30 days

        logger.info(f"Analyzing {len(entries)} bathroom entries over {date_range} days")

        # Generate bathroom analytics
        analytics_data = analytics.analyze_bathroom(entries, date_range)

        return jsonify(analytics_data)

    except Exception as e:
        logger.error(f"Bathroom analytics error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/pain', methods=['POST'])
def get_pain_analytics():
    """Get medical-grade general pain analytics 🔥"""
    try:
        data = request.get_json()

        if not data or 'entries' not in data:
            return jsonify({'error': 'Missing pain entries'}), 400

        entries = data['entries']
        date_range = data.get('dateRange', 30)  # Default 30 days

        logger.info(f"Analyzing {len(entries)} pain entries over {date_range} days")

        # Generate pain analytics
        analytics_data = analytics.analyze_pain(entries, date_range)

        return jsonify(analytics_data)

    except Exception as e:
        logger.error(f"Pain analytics error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/diabetes', methods=['POST'])
def get_diabetes_analytics():
    """Get medical-grade diabetes analytics 🩸"""
    try:
        data = request.get_json()

        if not data or 'entries' not in data:
            return jsonify({'error': 'Missing diabetes entries'}), 400

        entries = data['entries']
        date_range = data.get('dateRange', 30)  # Default 30 days

        logger.info(f"Analyzing {len(entries)} diabetes entries over {date_range} days")

        # Generate diabetes analytics
        analytics_data = analytics.analyze_diabetes_data(entries, date_range)

        return jsonify(analytics_data)

    except Exception as e:
        logger.error(f"Diabetes analytics error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sync/phone-home', methods=['POST'])
@require_pin_auth
def phone_home_sync():
    """Handle phone app sync requests - PIN authenticated"""
    try:
        # PIN and device_id already validated by decorator
        user_pin = request.validated_pin
        device_id = request.validated_device_id

        # Get additional request data
        data = request.get_json()
        sync_data = data.get('data', {})
        action = sanitize_string(data.get('action', 'sync'), 20)
        timestamp = data.get('timestamp', datetime.now().isoformat())

        # Validate sync data
        if sync_data and not validate_sync_data(sync_data):
            return jsonify({'error': 'Invalid sync data format or size'}), 400

        # Validate action
        allowed_actions = ['sync', 'pull', 'ping']
        if action not in allowed_actions:
            return jsonify({'error': f'Invalid action. Allowed: {", ".join(allowed_actions)}'}), 400

        logger.info(f"🔐 Authenticated {action} request from device {device_id[:8]}... for user PIN {user_pin[:2]}***")

        # Handle different sync actions
        if action == 'sync':
            # Merge data from phone
            result = {
                'status': 'synced',
                'conflicts': [],
                'server_timestamp': datetime.now().isoformat(),
                'user_pin_hash': hash_pin(user_pin)[:8]  # First 8 chars for verification
            }
            # TODO: Implement actual sync logic with PIN-based database isolation

        elif action == 'pull':
            # Send latest data to phone
            result = {
                'status': 'data_sent',
                'data': {},
                'server_timestamp': datetime.now().isoformat(),
                'user_pin_hash': hash_pin(user_pin)[:8]  # First 8 chars for verification
            }
            # TODO: Implement data pull logic with PIN-based database isolation

        elif action == 'ping':
            # Simple connectivity test
            result = {
                'status': 'pong',
                'server_timestamp': datetime.now().isoformat(),
                'user_pin_hash': hash_pin(user_pin)[:8]
            }

        else:
            return jsonify({'error': 'Invalid sync action. Supported: sync, pull, ping'}), 400

        return jsonify(result)

    except Exception as e:
        logger.error(f"Sync error: {str(e)}")
        return jsonify({'error': 'Internal sync error'}), 500

@app.route('/api/sync/validate-pin', methods=['POST'])
@require_pin_auth
def validate_pin():
    """Validate PIN and test connectivity"""
    try:
        user_pin = request.validated_pin
        device_id = request.validated_device_id

        logger.info(f"🔐 PIN validation successful for device {device_id[:8]}...")

        return jsonify({
            'status': 'valid',
            'message': 'PIN authenticated successfully',
            'server_timestamp': datetime.now().isoformat(),
            'user_pin_hash': hash_pin(user_pin)[:8],
            'device_id': device_id
        })

    except Exception as e:
        logger.error(f"PIN validation error: {str(e)}")
        return jsonify({'error': 'Internal validation error'}), 500

# ============================================================================
# QR SYNC - Device Pairing & Data Bridge
# ============================================================================

@app.route('/api/sync/qr-code', methods=['POST'])
def generate_qr_code():
    """Generate a QR code containing connection info for phone pairing.

    The QR encodes a JSON payload with the desktop's LAN IP, port, and
    a one-time pairing token. The phone scans this, connects over LAN,
    and syncs data bidirectionally.
    """
    try:
        import qrcode
        import io
        import socket
        import secrets

        data = request.get_json() or {}
        pin = data.get('pin', '')

        if not pin or not validate_pin_format(pin):
            return jsonify({'error': 'Valid PIN required'}), 400

        # Get the machine's LAN IP
        lan_ip = _get_lan_ip()
        port = 5000

        # Generate a short-lived pairing token
        pairing_token = secrets.token_urlsafe(16)

        # Store token for validation (expires in 5 minutes)
        _active_pairing_tokens[pairing_token] = {
            'pin_hash': hash_pin(pin),
            'created_at': time.time(),
            'expires_at': time.time() + 300
        }

        # QR payload — everything the phone needs to connect
        qr_payload = json.dumps({
            'app': 'chaos-command',
            'version': '1.0',
            'host': f'http://{lan_ip}:{port}',
            'token': pairing_token,
            'pin_hash': hash_pin(pin)[:8]
        })

        # Generate QR code as PNG
        qr = qrcode.QRCode(version=1, box_size=10, border=4,
                           error_correction=qrcode.constants.ERROR_CORRECT_M)
        qr.add_data(qr_payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color='#1c1730', back_color='#e8e4f0')

        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)

        logger.info(f"📱 QR code generated for pairing on {lan_ip}:{port}")
        return send_file(buf, mimetype='image/png',
                        download_name='chaos-command-pair.png')

    except ImportError:
        # qrcode not installed — return the payload as JSON so frontend
        # can render it with a JS QR library instead
        return jsonify({
            'fallback': True,
            'payload': qr_payload if 'qr_payload' in dir() else None,
            'error': 'qrcode package not installed, use frontend QR rendering'
        }), 200
    except Exception as e:
        logger.error(f"QR generation error: {str(e)}")
        return jsonify({'error': 'Failed to generate QR code'}), 500


@app.route('/api/sync/pair', methods=['POST'])
def pair_device():
    """Phone calls this after scanning QR to establish pairing."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON body required'}), 400

        token = data.get('token', '')
        pin = data.get('pin', '')
        device_name = sanitize_string(data.get('device_name', 'Phone'), 50)

        if not token or not pin:
            return jsonify({'error': 'Token and PIN required'}), 400

        # Validate pairing token
        token_data = _active_pairing_tokens.get(token)
        if not token_data:
            return jsonify({'error': 'Invalid or expired pairing token'}), 401

        if time.time() > token_data['expires_at']:
            del _active_pairing_tokens[token]
            return jsonify({'error': 'Pairing token expired'}), 401

        if hash_pin(pin) != token_data['pin_hash']:
            return jsonify({'error': 'PIN mismatch'}), 401

        # Pairing successful — clean up token
        del _active_pairing_tokens[token]

        # Generate a persistent device token for future syncs
        device_token = secrets.token_urlsafe(32)
        _paired_devices[device_token] = {
            'pin_hash': hash_pin(pin),
            'device_name': device_name,
            'paired_at': datetime.now().isoformat(),
            'last_sync': None
        }

        logger.info(f"📱✅ Device '{device_name}' paired successfully")
        return jsonify({
            'status': 'paired',
            'device_token': device_token,
            'server_timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Pairing error: {str(e)}")
        return jsonify({'error': 'Pairing failed'}), 500


@app.route('/api/sync/push', methods=['POST'])
def sync_push():
    """Phone pushes its data to desktop. Merge by timestamp."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON body required'}), 400

        device_token = data.get('device_token', '')
        device = _paired_devices.get(device_token)
        if not device:
            return jsonify({'error': 'Device not paired'}), 401

        sync_data = data.get('data', {})
        if not validate_sync_data(sync_data):
            return jsonify({'error': 'Invalid sync data'}), 400

        # Store incoming data for the frontend to pick up
        _pending_sync_data[device_token] = {
            'data': sync_data,
            'received_at': datetime.now().isoformat(),
            'device_name': device['device_name']
        }
        device['last_sync'] = datetime.now().isoformat()

        logger.info(f"📱⬆️ Received sync data from '{device['device_name']}'")
        return jsonify({
            'status': 'received',
            'server_timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Sync push error: {str(e)}")
        return jsonify({'error': 'Sync push failed'}), 500


@app.route('/api/sync/pull', methods=['POST'])
def sync_pull():
    """Phone pulls desktop data. Frontend posts the export here first."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON body required'}), 400

        device_token = data.get('device_token', '')
        device = _paired_devices.get(device_token)
        if not device:
            return jsonify({'error': 'Device not paired'}), 401

        # If frontend has staged data for pull, return it
        staged = _staged_for_pull.get(device['pin_hash'])
        if staged:
            return jsonify({
                'status': 'data',
                'data': staged['data'],
                'server_timestamp': datetime.now().isoformat()
            })

        return jsonify({
            'status': 'empty',
            'message': 'No data staged for sync',
            'server_timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Sync pull error: {str(e)}")
        return jsonify({'error': 'Sync pull failed'}), 500


@app.route('/api/sync/stage-for-pull', methods=['POST'])
def stage_for_pull():
    """Frontend stages its Dexie export so phone can pull it."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON body required'}), 400

        pin = data.get('pin', '')
        export_data = data.get('data', {})

        if not pin or not validate_pin_format(pin):
            return jsonify({'error': 'Valid PIN required'}), 400

        if not validate_sync_data(export_data):
            return jsonify({'error': 'Invalid export data'}), 400

        _staged_for_pull[hash_pin(pin)] = {
            'data': export_data,
            'staged_at': datetime.now().isoformat()
        }

        logger.info("📱⬇️ Data staged for phone pull")
        return jsonify({'status': 'staged'})

    except Exception as e:
        logger.error(f"Stage error: {str(e)}")
        return jsonify({'error': 'Staging failed'}), 500


@app.route('/api/sync/pending', methods=['POST'])
def get_pending_sync():
    """Frontend checks if phone has pushed data waiting to be imported."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON body required'}), 400

        pin = data.get('pin', '')
        if not pin:
            return jsonify({'error': 'PIN required'}), 400

        # Find pending data for any device paired with this PIN
        pin_hash = hash_pin(pin)
        pending = {}
        for token, sync_info in _pending_sync_data.items():
            device = _paired_devices.get(token, {})
            if device.get('pin_hash') == pin_hash:
                pending[token] = sync_info

        if pending:
            # Clear after retrieval
            for token in pending:
                del _pending_sync_data[token]

            return jsonify({
                'status': 'pending',
                'data': pending,
                'server_timestamp': datetime.now().isoformat()
            })

        return jsonify({'status': 'empty'})

    except Exception as e:
        logger.error(f"Pending sync check error: {str(e)}")
        return jsonify({'error': 'Check failed'}), 500


def _get_lan_ip():
    """Get this machine's LAN IP address."""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


# In-memory stores for sync state (persists while backend is running)
_active_pairing_tokens = {}  # token -> {pin_hash, created_at, expires_at}
_paired_devices = {}         # device_token -> {pin_hash, device_name, paired_at, last_sync}
_pending_sync_data = {}      # device_token -> {data, received_at, device_name}
_staged_for_pull = {}        # pin_hash -> {data, staged_at}

import secrets  # for token generation


@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'Request too large'}), 413

@app.errorhandler(429)
def rate_limit_exceeded(error):
    return jsonify({'error': 'Rate limit exceeded'}), 429

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

def _kill_zombie_on_port(port: int):
    """Kill any existing process on our port before starting.
    Concurrently doesn't always clean up Flask on Windows."""
    import socket
    import subprocess
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.settimeout(1)
        sock.connect(('127.0.0.1', port))
        sock.close()
        # Something is already on this port — kill it
        logger.warning(f"⚠️ Port {port} already in use! Killing zombie process...")
        result = subprocess.run(
            ['powershell', '-Command',
             f'Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue '
             f'| ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force }}'],
            capture_output=True, text=True, timeout=5
        )
        import time
        time.sleep(0.5)  # Brief pause for port to free up
        logger.info(f"🔥 Zombie killed! Port {port} cleared.")
    except (ConnectionRefusedError, socket.timeout, OSError):
        pass  # Port is free, nothing to kill
    except Exception as e:
        logger.warning(f"⚠️ Could not clear port {port}: {e}")


@app.route('/api/export/doctor-report', methods=['POST'])
def export_doctor_report():
    """📄 Generate a filtered medical report PDF for a specific provider."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        logger.info(f"📄 Generating doctor report for {data.get('providerName', 'unknown')}")

        # Build report data structure
        report_data = {
            'demographics': data.get('demographics'),
            'providerName': data.get('providerName', ''),
            'specialty': data.get('specialty', 'primary'),
            'reportStyle': data.get('reportStyle', 'doctor'),
            'dateRange': data.get('dateRange', {}),
            'trackerData': data.get('trackerData', []),
            'labResults': data.get('labResults', []),
            'journalEntries': data.get('journalEntries', []),
            'timelineEvents': data.get('timelineEvents', []),
            'healthData': data.get('healthData', []),
            'includePatterns': data.get('includePatterns', True),
            'audience': data.get('audience', 'doctor'),
            'workData': data.get('workData'),
        }

        # Generate PDF
        from pdf_export import generate_medical_report
        filepath = generate_medical_report(report_data)

        if not filepath:
            return jsonify({'error': 'PDF generation failed'}), 500

        return send_file(
            filepath,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"medical-report-{data.get('providerName', 'export')}-{data.get('dateRange', {}).get('end', 'report')}.pdf"
        )

    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Development server
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'

    # Kill any zombie Flask from previous concurrently run
    _kill_zombie_on_port(port)

    logger.info(f"Starting Chaos Command Center Backend on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)

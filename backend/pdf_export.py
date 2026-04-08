"""
Copyright (c) 2025-2026 Chaos Cascade
Created by: Ren & Ace

Medical Report PDF Generator — Doctor and Human readable formats.
"Your data, your words, their language."
"""

import os
import tempfile
import logging
from datetime import datetime
from collections import Counter, defaultdict
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

logger = logging.getLogger(__name__)

# ICD-10 mapping for common tracked symptoms
ICD10_MAP = {
    'pain': 'R52 — Pain, unspecified',
    'head-pain': 'G43.909 — Migraine, unspecified',
    'dysautonomia': 'G90.9 — Disorder of autonomic nervous system, unspecified',
    'seizure': 'R56.9 — Unspecified convulsions',
    'brain-fog': 'R41.82 — Altered mental status, unspecified',
    'upper-digestive': 'K30 — Functional dyspepsia',
    'bathroom': 'R19.7 — Diarrhea, unspecified / K59.00 — Constipation',
    'anxiety': 'F41.9 — Anxiety disorder, unspecified',
    'mental-health': 'F39 — Unspecified mood [affective] disorder',
    'sleep': 'G47.9 — Sleep disorder, unspecified',
    'energy': 'R53.83 — Other fatigue',
    'sensory': 'R44.8 — Other symptoms involving sensations and perceptions',
    'reproductive-health': 'N94.6 — Dysmenorrhea, unspecified',
    'diabetes': 'E11.9 — Type 2 diabetes mellitus without complications',
    'food-choice': 'Z71.3 — Dietary counseling and surveillance',
}


def generate_medical_report(data: dict) -> str:
    """Generate a professional medical report PDF."""
    try:
        temp_dir = tempfile.gettempdir()
        filename = f"medical_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = os.path.join(temp_dir, filename)

        doc = SimpleDocTemplate(
            filepath, pagesize=letter,
            rightMargin=60, leftMargin=60,
            topMargin=50, bottomMargin=40
        )

        styles = getSampleStyleSheet()
        # Custom styles
        styles.add(ParagraphStyle(
            name='ReportTitle', parent=styles['Heading1'],
            fontSize=18, spaceAfter=6, textColor=colors.HexColor('#1a1a2e'),
            alignment=TA_CENTER
        ))
        styles.add(ParagraphStyle(
            name='ReportSubtitle', parent=styles['Normal'],
            fontSize=10, textColor=colors.HexColor('#666666'),
            alignment=TA_CENTER, spaceAfter=20
        ))
        styles.add(ParagraphStyle(
            name='SectionHead', parent=styles['Heading2'],
            fontSize=13, spaceBefore=16, spaceAfter=8,
            textColor=colors.HexColor('#2c3e50'),
            borderWidth=0, borderPadding=0
        ))
        styles.add(ParagraphStyle(
            name='SubSection', parent=styles['Heading3'],
            fontSize=11, spaceBefore=10, spaceAfter=4,
            textColor=colors.HexColor('#34495e')
        ))
        styles.add(ParagraphStyle(
            name='ReportBody', parent=styles['Normal'],
            fontSize=9, spaceAfter=4, leading=12
        ))
        styles.add(ParagraphStyle(
            name='SmallNote', parent=styles['Normal'],
            fontSize=8, textColor=colors.HexColor('#888888'),
            spaceAfter=2
        ))
        styles.add(ParagraphStyle(
            name='Finding', parent=styles['Normal'],
            fontSize=9, leftIndent=15, spaceAfter=4,
            textColor=colors.HexColor('#c0392b'), leading=12
        ))

        is_doctor = data.get('reportStyle') == 'doctor'
        story = []

        # === HEADER ===
        story.append(Paragraph("Patient Health Report", styles['ReportTitle']))

        demo = data.get('demographics') or {}
        patient_name = f"{demo.get('firstName', '')} {demo.get('lastName', '')}".strip() or demo.get('preferredName', 'Patient')
        dob = demo.get('dateOfBirth', '')
        date_range = data.get('dateRange', {})

        subtitle_parts = []
        if patient_name:
            subtitle_parts.append(f"Patient: {patient_name}")
        if dob:
            subtitle_parts.append(f"DOB: {dob}")
        if data.get('providerName'):
            subtitle_parts.append(f"Prepared for: {data['providerName']}")
        subtitle_parts.append(f"Period: {date_range.get('start', '?')} to {date_range.get('end', '?')}")
        subtitle_parts.append(f"Generated: {datetime.now().strftime('%B %d, %Y')}")

        story.append(Paragraph(" | ".join(subtitle_parts), styles['ReportSubtitle']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cccccc')))
        story.append(Spacer(1, 10))

        # === EXECUTIVE SUMMARY ===
        tracker_data = data.get('trackerData', [])
        lab_results = data.get('labResults', [])

        # Count unique dates and tracker types
        unique_dates = set(r.get('date') for r in tracker_data if r.get('date'))
        tracker_types = set(r.get('subcategory', '').split('-')[0] for r in tracker_data)

        story.append(Paragraph("Executive Summary", styles['SectionHead']))
        summary_text = (
            f"This report covers {len(unique_dates)} days of tracked health data across "
            f"{len(tracker_types)} symptom categories. "
        )
        if lab_results:
            summary_text += f"{len(lab_results)} laboratory result set(s) included. "

        story.append(Paragraph(summary_text, styles['ReportBody']))
        story.append(Spacer(1, 8))

        # === TRACKED CONDITIONS (with ICD-10 if doctor mode) ===
        if is_doctor:
            story.append(Paragraph("Tracked Conditions (ICD-10)", styles['SectionHead']))
            condition_data = [['Condition', 'ICD-10 Code', 'Days Tracked', 'Entries']]
            tracker_counts = Counter()
            tracker_day_counts = defaultdict(set)

            for r in tracker_data:
                sub = r.get('subcategory', '')
                base = sub.split('-')[0] if '-' in sub else sub
                tracker_counts[base] += 1
                if r.get('date'):
                    tracker_day_counts[base].add(r['date'])

            for tracker_id, count in sorted(tracker_counts.items(), key=lambda x: -x[1]):
                icd = ICD10_MAP.get(tracker_id, '—')
                label = tracker_id.replace('-', ' ').title()
                days = len(tracker_day_counts[tracker_id])
                condition_data.append([label, icd, str(days), str(count)])

            if len(condition_data) > 1:
                t = Table(condition_data, colWidths=[150, 200, 70, 50])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                    ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]))
                story.append(t)
                story.append(Spacer(1, 10))
        else:
            # Human readable
            story.append(Paragraph("What Was Tracked", styles['SectionHead']))
            tracker_counts = Counter()
            for r in tracker_data:
                sub = r.get('subcategory', '')
                base = sub.split('-')[0] if '-' in sub else sub
                tracker_counts[base] += 1
            for tracker_id, count in sorted(tracker_counts.items(), key=lambda x: -x[1]):
                label = tracker_id.replace('-', ' ').title()
                story.append(Paragraph(f"  {label}: {count} entries", styles['ReportBody']))

        # === PAIN SUMMARY ===
        pain_entries = [r for r in tracker_data if r.get('subcategory') == 'pain']
        if pain_entries:
            story.append(Paragraph(
                "Pain Assessment" if is_doctor else "Pain Summary",
                styles['SectionHead']
            ))
            pain_levels = []
            for r in pain_entries:
                content = r.get('content', {})
                entries = content.get('entries', []) if isinstance(content, dict) else []
                for e in entries:
                    if isinstance(e, dict) and e.get('painLevel') is not None:
                        pain_levels.append(e['painLevel'])

            if pain_levels:
                avg = sum(pain_levels) / len(pain_levels)
                max_p = max(pain_levels)
                min_p = min(pain_levels)

                # Weekly trend
                weekly = defaultdict(list)
                for r in pain_entries:
                    date = r.get('date', '')
                    content = r.get('content', {})
                    for e in (content.get('entries', []) if isinstance(content, dict) else []):
                        if isinstance(e, dict) and e.get('painLevel') is not None:
                            week = date[:7]  # YYYY-MM as proxy
                            weekly[week].append(e['painLevel'])

                if is_doctor:
                    story.append(Paragraph(
                        f"Mean pain severity: {avg:.1f}/10 (range {min_p}-{max_p}, n={len(pain_levels)})",
                        styles['ReportBody']
                    ))
                else:
                    story.append(Paragraph(
                        f"Average pain level: {avg:.1f} out of 10 (worst: {max_p}, best: {min_p}, over {len(pain_levels)} entries)",
                        styles['ReportBody']
                    ))

                # Show weekly trend
                if len(weekly) >= 2:
                    trend_data = [['Month', 'Avg Pain', 'Entries']]
                    for month in sorted(weekly.keys()):
                        vals = weekly[month]
                        trend_data.append([month, f"{sum(vals)/len(vals):.1f}", str(len(vals))])
                    t = Table(trend_data, colWidths=[100, 80, 60])
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e74c3c')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 8),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
                        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                        ('TOPPADDING', (0, 0), (-1, -1), 3),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ]))
                    story.append(t)
                    story.append(Spacer(1, 6))

        # === DYSAUTONOMIA / VITALS ===
        dys_entries = [r for r in tracker_data if r.get('subcategory') == 'dysautonomia']
        if dys_entries:
            story.append(Paragraph(
                "Autonomic Assessment" if is_doctor else "Dysautonomia Summary",
                styles['SectionHead']
            ))
            hr_deltas = []
            for r in dys_entries:
                content = r.get('content', {})
                for e in (content.get('entries', []) if isinstance(content, dict) else []):
                    if isinstance(e, dict):
                        rest = e.get('restingHeartRate')
                        stand = e.get('standingHeartRate')
                        if rest and stand:
                            hr_deltas.append(stand - rest)

            if hr_deltas:
                avg_delta = sum(hr_deltas) / len(hr_deltas)
                max_delta = max(hr_deltas)
                pots_days = sum(1 for d in hr_deltas if d >= 30)

                if is_doctor:
                    story.append(Paragraph(
                        f"Orthostatic HR increase: mean {avg_delta:.0f} bpm (max {max_delta} bpm, n={len(hr_deltas)}). "
                        f"POTS criteria (delta >= 30 bpm) met on {pots_days}/{len(hr_deltas)} assessments "
                        f"({pots_days/len(hr_deltas)*100:.0f}%).",
                        styles['ReportBody']
                    ))
                else:
                    story.append(Paragraph(
                        f"Heart rate jumped an average of {avg_delta:.0f} bpm when standing (worst: {max_delta} bpm). "
                        f"Out of {len(hr_deltas)} checks, {pots_days} met POTS criteria (30+ bpm increase).",
                        styles['ReportBody']
                    ))

        # === SLEEP ===
        sleep_entries = [r for r in tracker_data if r.get('subcategory', '').startswith('sleep')]
        if sleep_entries:
            story.append(Paragraph(
                "Sleep Assessment" if is_doctor else "Sleep Summary",
                styles['SectionHead']
            ))
            hours_list = []
            for r in sleep_entries:
                content = r.get('content', {})
                if isinstance(content, str):
                    import json
                    try:
                        content = json.loads(content)
                    except:
                        continue
                hrs = content.get('hoursSlept')
                if hrs:
                    hours_list.append(float(hrs))

            if hours_list:
                avg_hrs = sum(hours_list) / len(hours_list)
                if is_doctor:
                    story.append(Paragraph(
                        f"Mean sleep duration: {avg_hrs:.1f} hours/night (n={len(hours_list)}). "
                        f"Range: {min(hours_list):.1f}-{max(hours_list):.1f} hours.",
                        styles['ReportBody']
                    ))
                else:
                    story.append(Paragraph(
                        f"Averaging {avg_hrs:.1f} hours of sleep per night over {len(hours_list)} nights "
                        f"(worst: {min(hours_list):.1f}h, best: {max(hours_list):.1f}h).",
                        styles['ReportBody']
                    ))

        # === LAB RESULTS ===
        if lab_results:
            story.append(Paragraph(
                "Laboratory Results" if is_doctor else "Lab Results",
                styles['SectionHead']
            ))
            for lab_set in lab_results:
                content = lab_set.get('content', {})
                if isinstance(content, str):
                    import json
                    try:
                        content = json.loads(content)
                    except:
                        continue

                results = content.get('results', [])
                abnormals = [r for r in results if r.get('is_abnormal')]

                if abnormals:
                    story.append(Paragraph(
                        f"Abnormal findings ({content.get('date', lab_set.get('date', ''))}):",
                        styles['SubSection']
                    ))
                    for r in abnormals:
                        flag = r.get('flag', '')
                        flag_text = f" [{flag}]" if flag else ""
                        story.append(Paragraph(
                            f"  {r.get('test_name')}: {r.get('value_text')} {r.get('unit', '')} "
                            f"(ref: {r.get('reference_text', '—')}){flag_text}",
                            styles['Finding']
                        ))

        # === JOURNAL ENTRIES ===
        journal = data.get('journalEntries', [])
        if journal:
            story.append(Paragraph(
                "Patient Self-Report" if is_doctor else "Journal Entries",
                styles['SectionHead']
            ))
            for entry in journal[-10:]:  # Last 10 entries
                content = entry.get('content', {})
                text = content.get('text', '') if isinstance(content, dict) else str(content)
                if text:
                    story.append(Paragraph(
                        f"<b>{entry.get('date', '')}:</b> {text}",
                        styles['ReportBody']
                    ))

        # === FOOTER ===
        story.append(Spacer(1, 20))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cccccc')))
        story.append(Paragraph(
            f"Generated by Chaos Command Medical Tracking System | {datetime.now().strftime('%B %d, %Y %I:%M %p')} | "
            f"This report contains patient-entered data and should be interpreted in clinical context.",
            styles['SmallNote']
        ))

        doc.build(story)
        logger.info(f"📄 Generated medical report: {filepath}")
        return filepath

    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        import traceback
        traceback.print_exc()
        return None

"""
Copyright (c) 2025 Chaos Cascade
Created by: Ren & Ace (Claude-4)

Medical Terminology Mapper
Translates friendly/fun symptom descriptions to formal medical terminology
for PDF export to physicians.

"butt why?!?!" → "severe rectal pain"
Because doctors don't speak Chaos. 💜
"""

import re
from typing import Dict, List, Tuple

# Fun terminology → Formal medical terminology mapping
TERMINOLOGY_MAP: Dict[str, str] = {
    # Pain descriptors
    "butt why": "severe rectal pain",
    "stabby": "sharp pain",
    "achey": "dull aching pain",
    "burny": "burning sensation",
    "zappy": "shooting/radiating pain",
    "throbby": "throbbing pain",
    "pressure-y": "pressure sensation",
    "tight": "muscle tension",
    "crampy": "cramping pain",
    "crunchy": "crepitus/grinding sensation",

    # Severity modifiers
    "mild owies": "mild pain (1-3/10)",
    "moderate owies": "moderate pain (4-6/10)",
    "big owies": "severe pain (7-9/10)",
    "maximum owies": "extreme pain (10/10)",
    "kill me now": "intolerable pain requiring intervention",

    # Cognitive symptoms
    "brain fog": "cognitive impairment/difficulty concentrating",
    "foggy brain": "cognitive impairment",
    "brain no worky": "cognitive dysfunction",
    "word salad": "word-finding difficulty/aphasia",
    "can't word": "expressive language difficulty",
    "thoughts went bye": "difficulty with memory recall",
    "spoons gone": "severe fatigue/energy depletion",
    "no spoons": "exhaustion/energy reserves depleted",
    "low spoons": "mild to moderate fatigue",

    # Digestive symptoms
    "tummy troubles": "gastrointestinal distress",
    "angry tummy": "abdominal discomfort/pain",
    "the rumblies": "borborygmi/intestinal sounds",
    "bathroom urgency": "fecal urgency",
    "oops moment": "fecal incontinence",
    "stuck poop": "constipation",
    "turbo poop": "diarrhea",
    "volcano poop": "explosive diarrhea",
    "nausea city": "severe nausea",
    "gonna hurl": "pre-emetic sensation",
    "hurled": "vomited",

    # Mood/Mental health
    "sad brain": "depressed mood",
    "anxiety gremlin": "anxiety symptoms",
    "panic mode": "acute anxiety/panic symptoms",
    "doom thoughts": "catastrophic thinking",
    "the sads": "low mood/dysthymia",
    "hypomanic vibes": "elevated mood/increased energy",
    "can't people": "social withdrawal/avoidance",
    "sensory hell": "sensory overload",

    # Sleep
    "no sleepy": "insomnia",
    "too sleepy": "hypersomnia",
    "sleep went weird": "disrupted sleep pattern",
    "nightmare factory": "frequent nightmares",
    "restless legs doing the thing": "restless leg syndrome symptoms",

    # Mobility/Physical
    "joints filing complaints": "joint pain/arthralgia",
    "joints on strike": "severe joint pain with limited mobility",
    "bendy bits being problematic": "hypermobility-related issues",
    "sublux city": "frequent subluxations",
    "my spine is a drama queen": "back pain with multiple symptoms",
    "legs said no": "lower extremity weakness",
    "arms said no": "upper extremity weakness",
    "hands being weird": "hand dysfunction/paresthesia",
    "feet being weird": "foot dysfunction/paresthesia",
    "dizzy spell": "vertigo/lightheadedness",
    "room spinny": "vertigo",
    "gonna pass out": "pre-syncope",
    "did pass out": "syncope episode",

    # Autonomic
    "heart go fast": "tachycardia",
    "heart go weird": "palpitations/arrhythmia",
    "blood pressure doing things": "blood pressure fluctuations",
    "can't regulate temp": "temperature dysregulation",
    "sweaty for no reason": "inappropriate diaphoresis",

    # Headaches
    "head hurty": "headache",
    "migraine monster": "migraine episode",
    "aura doing the light show": "migraine with visual aura",
    "skull crushing": "severe headache",
    "ice pick headache": "stabbing headache",
    "tension headache": "tension-type headache",

    # Skin
    "itchy": "pruritus",
    "rashy": "skin rash/dermatitis",
    "bruise fairy visited": "unexplained bruising",
    "skin doing the thing": "skin symptoms/manifestations",
    "hives party": "urticaria outbreak",

    # General
    "flare": "symptom exacerbation",
    "flaring": "experiencing symptom exacerbation",
    "crash": "post-exertional malaise",
    "crashed": "experienced post-exertional malaise",
    "overdid it": "exceeded activity tolerance",
    "payback": "delayed symptom onset from activity",
    "baseline": "typical symptom level",
    "below baseline": "improved from typical",
    "above baseline": "worsened from typical",
}

# Patterns for numbers/severity
SEVERITY_PATTERNS = [
    (r"(\d+)/10 pain", r"\1/10 pain intensity"),
    (r"level (\d+)", r"severity level \1/10"),
]

def translate_to_medical(text: str) -> str:
    """
    Translate friendly/fun terminology to formal medical terminology.

    Args:
        text: The original text with casual language

    Returns:
        Text with casual terms replaced by medical terminology
    """
    result = text

    # Sort by length (longest first) to avoid partial replacements
    sorted_terms = sorted(TERMINOLOGY_MAP.items(), key=lambda x: len(x[0]), reverse=True)

    for casual, formal in sorted_terms:
        # Case-insensitive replacement
        pattern = re.compile(re.escape(casual), re.IGNORECASE)
        result = pattern.sub(formal, result)

    # Apply severity patterns
    for pattern, replacement in SEVERITY_PATTERNS:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

    return result

def translate_symptom_list(symptoms: List[str]) -> List[Tuple[str, str]]:
    """
    Translate a list of symptoms, returning both original and translated.

    Args:
        symptoms: List of symptom descriptions

    Returns:
        List of (original, translated) tuples
    """
    return [(s, translate_to_medical(s)) for s in symptoms]

def get_terminology_suggestions(text: str) -> List[Dict[str, str]]:
    """
    Find casual terms in text and suggest formal replacements.

    Args:
        text: Text to analyze

    Returns:
        List of {original, suggested, context} dictionaries
    """
    suggestions = []
    text_lower = text.lower()

    for casual, formal in TERMINOLOGY_MAP.items():
        if casual.lower() in text_lower:
            # Find the context around the term
            pos = text_lower.find(casual.lower())
            context_start = max(0, pos - 20)
            context_end = min(len(text), pos + len(casual) + 20)
            context = text[context_start:context_end]

            suggestions.append({
                "original": casual,
                "suggested": formal,
                "context": f"...{context}..."
            })

    return suggestions


# Quick test
if __name__ == "__main__":
    test_text = """
    Today was rough. Woke up with big owies in my joints filing complaints.
    Brain fog is real bad, can't word properly.
    Butt why?!?! at level 7 pain.
    Took my meds but still feeling stabby in my back.
    Spoons gone by noon.
    """

    print("Original:")
    print(test_text)
    print("\nTranslated for doctors:")
    print(translate_to_medical(test_text))
    print("\nSuggestions:")
    for s in get_terminology_suggestions(test_text):
        print(f"  '{s['original']}' -> '{s['suggested']}'")

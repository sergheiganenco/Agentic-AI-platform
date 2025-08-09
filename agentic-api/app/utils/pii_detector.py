# utils/pii_detector.py
import re

PII_PATTERNS = [
    ("email", r"email|e[-_]?mail"),
    ("ssn", r"ssn|social.*security"),
    ("phone", r"phone|mobile|cell"),
    ("name", r"name|fullname|first.*name|last.*name"),
    # Extend as needed
]

def detect_pii_tags(column_name: str):
    tags = []
    for label, pattern in PII_PATTERNS:
        if re.search(pattern, column_name, re.IGNORECASE):
            tags.append("pii")
            tags.append(label)
    return tags

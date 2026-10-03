import re
from typing import Tuple

# North American Numbering Plan (NANP) validation
# Standard US/Canada 10-digit format: NXX-NXX-XXXX
# N = digits 2-9
# X = digits 0-9

NANP_PATTERN = re.compile(r"^[2-9][0-9]{2}[2-9][0-9]{6}$")

DUMMY_SEQUENCES = {
    "1234567890",
    "0123456789",
    "9876543210",
    "0000000000",
    "1111111111",
    "2222222222",
    "3333333333",
    "4444444444",
    "5555555555",
    "6666666666",
    "7777777777",
    "8888888888",
    "9999999999",
}

def validate_and_clean_us_phone(raw_phone: str) -> Tuple[bool, str]:
    """
    Validates a phone number against North American Numbering Plan (NANP) standards.
    Returns (is_valid, cleaned_digits_or_original).
    """
    if not raw_phone or not isinstance(raw_phone, str):
        return False, ""

    # Strip all non-digit characters
    digits = re.sub(r"\D", "", raw_phone)

    # Strip leading country code 1 if 11 digits
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]

    # Must be exactly 10 digits
    if len(digits) != 10:
        return False, digits

    # Reject known dummy sequences
    if digits in DUMMY_SEQUENCES:
        return False, digits

    # Reject reserved fictitious exchange 555-0100 through 555-0199
    if digits[3:6] == "555" and 100 <= int(digits[6:]) <= 199:
        return False, digits

    # Enforce NANP area code & exchange code rules:
    # Area code (digits 0..2): first digit must be 2-9
    # Exchange code (digits 3..5): first digit must be 2-9
    if not NANP_PATTERN.match(digits):
        return False, digits

    return True, digits

def format_us_phone(digits: str) -> str:
    """Formats 10 clean digits as (XXX) XXX-XXXX."""
    if len(digits) == 10:
        return f"({digits[0:3]}) {digits[3:6]}-{digits[6:10]}"
    return digits

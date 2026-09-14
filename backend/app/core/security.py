"""Zero-latency prompt injection defense and input sanitization."""

import re

TAG_SANITIZER_REGEX = re.compile(
    r"</?(?:property_context|system|instruction|prompt|assistant|human)[^>]*>",
    re.IGNORECASE,
)


def sanitize_user_input(user_text: str) -> str:
    """Removes XML-like control tags and system injection markers from user input with zero latency."""
    if not user_text:
        return ""
    cleaned = TAG_SANITIZER_REGEX.sub("", user_text)
    return cleaned.strip()

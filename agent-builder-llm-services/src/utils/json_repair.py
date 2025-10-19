"""JSON parsing and repair utilities."""

import json
import re
from typing import Any, Dict, Optional

from json_repair import repair_json as external_repair_json


def attempt_json_parse(content: str) -> tuple[Optional[Dict[str, Any]], bool, Optional[str]]:
    """Attempt to parse JSON with multiple strategies.
    
    Args:
        content: Raw content to parse
        
    Returns:
        Tuple of (parsed_json, was_repaired, error_message)
    """
    # Clean the content first
    cleaned_content = clean_json_content(content)
    
    # Try direct parsing first
    try:
        parsed = json.loads(cleaned_content)
        return parsed, False, None
    except json.JSONDecodeError as e:
        original_error = str(e)
    
    # Try repairing the JSON
    try:
        repaired_content = repair_json_content(cleaned_content)
        parsed = json.loads(repaired_content)
        return parsed, True, None
    except Exception as e:
        return None, False, f"JSON parsing failed: {original_error}. Repair failed: {str(e)}"


def clean_json_content(content: str) -> str:
    """Clean content before JSON parsing.
    
    Args:
        content: Raw content
        
    Returns:
        Cleaned content
    """
    # Remove common prefixes and suffixes
    content = content.strip()
    
    # Remove markdown code blocks
    content = re.sub(r'^```json\s*\n?', '', content, flags=re.IGNORECASE | re.MULTILINE)
    content = re.sub(r'^```\s*\n?', '', content, flags=re.MULTILINE)
    content = re.sub(r'\n?```\s*$', '', content, flags=re.MULTILINE)
    
    # Remove common response prefixes
    prefixes_to_remove = [
        r'here is the json:?\s*',
        r'here\'s the json:?\s*',
        r'the json is:?\s*',
        r'json:?\s*',
        r'response:?\s*',
        r'result:?\s*',
    ]
    
    for prefix in prefixes_to_remove:
        content = re.sub(f'^{prefix}', '', content, flags=re.IGNORECASE | re.MULTILINE)
    
    # Find JSON-like content
    json_match = extract_json_from_text(content)
    if json_match:
        content = json_match
    
    return content.strip()


def extract_json_from_text(text: str) -> Optional[str]:
    """Extract JSON object or array from text.
    
    Args:
        text: Text that may contain JSON
        
    Returns:
        Extracted JSON string or None
    """
    # Look for JSON object
    object_pattern = r'\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\}'
    object_matches = re.findall(object_pattern, text, re.DOTALL)
    
    if object_matches:
        # Return the longest match (most likely to be complete)
        return max(object_matches, key=len)
    
    # Look for JSON array
    array_pattern = r'\[(?:[^\[\]]|\[(?:[^\[\]]|\[[^\[\]]*\])*\])*\]'
    array_matches = re.findall(array_pattern, text, re.DOTALL)
    
    if array_matches:
        return max(array_matches, key=len)
    
    return None


def repair_json_content(content: str) -> str:
    """Repair malformed JSON content.
    
    Args:
        content: Malformed JSON content
        
    Returns:
        Repaired JSON string
    """
    # Try external json-repair library
    try:
        return external_repair_json(content)
    except Exception:
        pass
    
    # Fallback to manual repair strategies
    content = manual_json_repair(content)
    return content


def manual_json_repair(content: str) -> str:
    """Manual JSON repair strategies.
    
    Args:
        content: Malformed JSON content
        
    Returns:
        Repaired JSON string
    """
    # Fix common issues
    
    # Add missing quotes around keys
    content = re.sub(r'(\w+):', r'"\1":', content)
    
    # Fix single quotes to double quotes
    content = content.replace("'", '"')
    
    # Fix trailing commas
    content = re.sub(r',(\s*[}\]])', r'\1', content)
    
    # Fix missing commas between objects/arrays
    content = re.sub(r'([}\]])(\s*)([{\[])', r'\1,\2\3', content)
    
    # Fix missing commas between key-value pairs
    content = re.sub(r'(["\d\]}])(\s*)("[^"]+":)', r'\1,\2\3', content)
    
    # Ensure proper array/object closure
    open_braces = content.count('{')
    close_braces = content.count('}')
    if open_braces > close_braces:
        content += '}' * (open_braces - close_braces)
    
    open_brackets = content.count('[')
    close_brackets = content.count(']')
    if open_brackets > close_brackets:
        content += ']' * (open_brackets - close_brackets)
    
    return content


def validate_json_structure(data: Dict[str, Any], max_depth: int = 10) -> bool:
    """Validate JSON structure for safety.
    
    Args:
        data: Parsed JSON data
        max_depth: Maximum nesting depth allowed
        
    Returns:
        True if structure is valid
    """
    def check_depth(obj, current_depth=0):
        if current_depth > max_depth:
            return False
        
        if isinstance(obj, dict):
            return all(check_depth(v, current_depth + 1) for v in obj.values())
        elif isinstance(obj, list):
            return all(check_depth(item, current_depth + 1) for item in obj)
        else:
            return True
    
    return check_depth(data)
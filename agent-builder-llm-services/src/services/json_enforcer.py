"""JSON enforcement service with validation and repair."""

import json
from typing import Any, Dict, List, Optional

import jsonschema
from jsonschema import ValidationError as JSONSchemaValidationError

from ..core.observability import get_logger
from ..domain.interfaces import JSONEnforcer
from ..domain.schemas import Message, MessageRole, ValidationResult
from ..domain.errors import JSONParsingError
from ..utils.json_repair import attempt_json_parse, validate_json_structure


class DefaultJSONEnforcer(JSONEnforcer):
    """Default implementation of JSON enforcement strategy."""
    
    def __init__(self):
        """Initialize JSON enforcer."""
        self.logger = get_logger(self.__class__.__name__)
    
    def add_json_instructions(self, messages: List[Message]) -> List[Message]:
        """Add JSON formatting instructions to messages.
        
        Args:
            messages: Original messages
            
        Returns:
            Messages with JSON instructions added
        """
        enhanced_messages = messages.copy()
        
        # Create JSON instruction message
        json_instruction = (
            "Return JSON only. No prose before or after. "
            "Ensure the JSON is valid and properly formatted."
        )
        
        # Add or enhance system message
        system_message_found = False
        for i, msg in enumerate(enhanced_messages):
            if msg.role == MessageRole.SYSTEM:
                # Enhance existing system message
                enhanced_messages[i] = Message(
                    role=MessageRole.SYSTEM,
                    content=f"{msg.content}\n\n{json_instruction}"
                )
                system_message_found = True
                break
        
        if not system_message_found:
            # Insert new system message at the beginning
            enhanced_messages.insert(0, Message(
                role=MessageRole.SYSTEM,
                content=json_instruction
            ))
        
        return enhanced_messages
    
    async def parse_and_validate(
        self,
        content: str,
        json_schema: Optional[Dict[str, Any]] = None,
        strict: bool = True,
    ) -> Dict[str, Any]:
        """Parse content as JSON and validate against schema.
        
        Args:
            content: Raw content to parse
            json_schema: Optional JSON schema for validation
            strict: Whether to raise error on validation failure
            
        Returns:
            Dictionary with parsed JSON and validation results
        """
        self.logger.debug("Starting JSON parsing and validation", content_length=len(content))
        
        # Attempt to parse JSON with repair if needed
        parsed_json, was_repaired, parse_error = attempt_json_parse(content)
        
        if parsed_json is None:
            error_msg = f"Failed to parse JSON: {parse_error}"
            self.logger.error("JSON parsing failed", error=parse_error)
            
            if strict:
                raise JSONParsingError(
                    message=error_msg,
                    raw_content=content[:500],  # Limit logged content
                )
            
            return {
                "json": None,
                "validation": ValidationResult(valid=False, errors=[{"error": parse_error}]),
                "repaired": was_repaired,
                "raw_content": content,
            }
        
        # Validate JSON structure for safety
        if not validate_json_structure(parsed_json):
            error_msg = "JSON structure too deeply nested or complex"
            self.logger.warning("JSON structure validation failed")
            
            if strict:
                raise JSONParsingError(
                    message=error_msg,
                    raw_content=content[:500],
                )
            
            return {
                "json": parsed_json,
                "validation": ValidationResult(valid=False, errors=[{"error": error_msg}]),
                "repaired": was_repaired,
                "raw_content": content,
            }
        
        # Validate against schema if provided
        validation_result = ValidationResult(valid=True)
        
        if json_schema:
            validation_result = await self._validate_against_schema(parsed_json, json_schema)
            
            if not validation_result.valid and strict:
                error_msg = f"JSON schema validation failed: {validation_result.errors}"
                self.logger.error("Schema validation failed", errors=validation_result.errors)
                
                raise JSONParsingError(
                    message=error_msg,
                    raw_content=content[:500],
                    validation_errors=validation_result.errors,
                )
        
        self.logger.debug(
            "JSON parsing completed",
            was_repaired=was_repaired,
            schema_valid=validation_result.valid,
        )
        
        return {
            "json": parsed_json,
            "validation": validation_result,
            "repaired": was_repaired,
            "raw_content": content if not validation_result.valid else None,
        }
    
    async def repair_json(self, content: str) -> str:
        """Attempt to repair malformed JSON.
        
        Args:
            content: Malformed JSON content
            
        Returns:
            Repaired JSON string
        """
        self.logger.debug("Attempting JSON repair", content_length=len(content))
        
        from ..utils.json_repair import repair_json_content
        
        try:
            repaired = repair_json_content(content)
            self.logger.debug("JSON repair completed", original_length=len(content), repaired_length=len(repaired))
            return repaired
        except Exception as e:
            self.logger.error("JSON repair failed", error=str(e))
            raise JSONParsingError(f"JSON repair failed: {e}", raw_content=content[:500])
    
    async def _validate_against_schema(
        self, 
        data: Dict[str, Any], 
        schema: Dict[str, Any]
    ) -> ValidationResult:
        """Validate parsed JSON against schema.
        
        Args:
            data: Parsed JSON data
            schema: JSON schema
            
        Returns:
            Validation result
        """
        try:
            # Validate using jsonschema library
            jsonschema.validate(instance=data, schema=schema)
            
            self.logger.debug("Schema validation passed")
            return ValidationResult(valid=True)
            
        except JSONSchemaValidationError as e:
            error_details = {
                "message": e.message,
                "path": list(e.absolute_path),
                "schema_path": list(e.schema_path),
                "validator": e.validator,
            }
            
            self.logger.warning("Schema validation failed", error=error_details)
            
            return ValidationResult(
                valid=False,
                errors=[error_details]
            )
        
        except Exception as e:
            error_details = {
                "message": f"Schema validation error: {str(e)}",
                "type": type(e).__name__,
            }
            
            self.logger.error("Schema validation error", error=error_details)
            
            return ValidationResult(
                valid=False,
                errors=[error_details]
            )
    
    def create_json_schema_prompt(self, schema: Dict[str, Any]) -> str:
        """Create a prompt instruction for JSON schema compliance.
        
        Args:
            schema: JSON schema
            
        Returns:
            Prompt instruction string
        """
        prompt_parts = ["Return a JSON response that matches this exact schema:"]
        
        # Add schema
        prompt_parts.append(json.dumps(schema, indent=2))
        
        # Add specific requirements
        prompt_parts.extend([
            "",
            "Requirements:",
            "- Return ONLY valid JSON, no other text",
            "- Include all required fields",
            "- Use correct data types as specified",
            "- Follow any format constraints (min/max, patterns, etc.)",
        ])
        
        # Add field descriptions if available
        properties = schema.get("properties", {})
        if properties:
            prompt_parts.extend(["", "Field descriptions:"])
            for field_name, field_def in properties.items():
                description = field_def.get("description", "")
                field_type = field_def.get("type", "")
                if description:
                    prompt_parts.append(f"- {field_name} ({field_type}): {description}")
        
        return "\n".join(prompt_parts)
    
    def extract_schema_examples(self, schema: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract or generate example data from schema.
        
        Args:
            schema: JSON schema
            
        Returns:
            Example data object or None
        """
        try:
            # Check if schema has examples
            if "examples" in schema and schema["examples"]:
                return schema["examples"][0]
            
            # Generate simple example from schema
            return self._generate_example_from_schema(schema)
            
        except Exception as e:
            self.logger.warning("Failed to extract schema examples", error=str(e))
            return None
    
    def _generate_example_from_schema(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Generate example data from JSON schema.
        
        Args:
            schema: JSON schema
            
        Returns:
            Example data object
        """
        if schema.get("type") != "object":
            return {}
        
        example = {}
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        
        for field_name, field_def in properties.items():
            field_type = field_def.get("type", "string")
            
            # Generate example value based on type
            if field_type == "string":
                example[field_name] = field_def.get("example", "example_string")
            elif field_type == "integer":
                example[field_name] = field_def.get("example", 42)
            elif field_type == "number":
                example[field_name] = field_def.get("example", 3.14)
            elif field_type == "boolean":
                example[field_name] = field_def.get("example", True)
            elif field_type == "array":
                items_type = field_def.get("items", {}).get("type", "string")
                if items_type == "string":
                    example[field_name] = ["item1", "item2"]
                elif items_type == "integer":
                    example[field_name] = [1, 2, 3]
                else:
                    example[field_name] = []
            elif field_type == "object":
                example[field_name] = {}
            
            # Only include required fields in minimal example
            if field_name not in required:
                continue
        
        return example
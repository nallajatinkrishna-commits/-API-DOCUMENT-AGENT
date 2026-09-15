"""
Base data structures and abstract base class for API endpoint parsers.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class EndpointParameter(BaseModel):
    name: str
    type: str = "string"
    location: str = "query"  # path, query, body, header, cookie
    required: bool = True
    description: Optional[str] = None
    default_value: Optional[str] = None


class RequestBodyInfo(BaseModel):
    content_type: str = "application/json"
    schema_name: Optional[str] = None
    fields: List[EndpointParameter] = Field(default_factory=list)
    description: Optional[str] = None


class ResponseInfo(BaseModel):
    status_code: int = 200
    content_type: str = "application/json"
    type_annotation: Optional[str] = None
    description: Optional[str] = None


class EndpointInfo(BaseModel):
    id: str
    file_path: str
    framework: str  # fastapi, flask, express, unknown
    method: str  # GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
    path: str
    handler_name: str
    docstring: Optional[str] = None
    parameters: List[EndpointParameter] = Field(default_factory=list)
    request_body: Optional[RequestBodyInfo] = None
    response_info: Optional[ResponseInfo] = None
    auth_middleware: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    line_number: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()


class BaseParser(ABC):
    """
    Abstract interface for multi-language, multi-framework route parsers.
    """

    @property
    @abstractmethod
    def framework_name(self) -> str:
        """Name of the framework this parser handles (e.g., 'fastapi', 'flask', 'express')."""
        pass

    @abstractmethod
    def can_parse(self, filename: str, content: str) -> bool:
        """Check if this parser can handle the given file content."""
        pass

    @abstractmethod
    def parse(self, filename: str, content: str) -> List[EndpointInfo]:
        """Extract API endpoints from the source file content."""
        pass

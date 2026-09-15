"""
Parser manager for auto-detecting file frameworks and parsing project directories or multiple source files.
"""

from typing import List, Dict, Optional, Tuple
from backend.parsers.base import BaseParser, EndpointInfo
from backend.parsers.fastapi_parser import FastAPIParser
from backend.parsers.flask_parser import FlaskParser
from backend.parsers.express_parser import ExpressParser


class ParserManager:
    def __init__(self):
        self.parsers: List[BaseParser] = [
            FastAPIParser(),
            FlaskParser(),
            ExpressParser(),
        ]

    def register_parser(self, parser: BaseParser):
        """Allows registering custom framework parsers."""
        self.parsers.insert(0, parser)

    def parse_file(
        self, filename: str, content: str, framework_hint: Optional[str] = None
    ) -> Tuple[List[EndpointInfo], str]:
        """
        Parses a single file's content.
        Returns (endpoints, detected_framework).
        """
        if framework_hint and framework_hint != "auto":
            for parser in self.parsers:
                if parser.framework_name == framework_hint:
                    return parser.parse(filename, content), parser.framework_name

        for parser in self.parsers:
            if parser.can_parse(filename, content):
                endpoints = parser.parse(filename, content)
                if endpoints:
                    return endpoints, parser.framework_name

        return [], "unknown"

    def parse_project(
        self, files: Dict[str, str], framework_hint: Optional[str] = None
    ) -> Tuple[List[EndpointInfo], Dict[str, str]]:
        """
        Parses a collection of files (e.g., extracted zip or folder).
        files: dict mapping relative_file_path -> content string.
        Returns (all_endpoints, file_frameworks_map).
        """
        all_endpoints: List[EndpointInfo] = []
        frameworks_map: Dict[str, str] = {}

        for filepath, content in files.items():
            # Skip non-code / hidden files
            if any(filepath.startswith(p) for p in [".git/", "node_modules/", "__pycache__/", "venv/", ".venv/"]):
                continue

            endpoints, detected_fw = self.parse_file(filepath, content, framework_hint)
            if endpoints:
                all_endpoints.extend(endpoints)
                frameworks_map[filepath] = detected_fw

        return all_endpoints, frameworks_map

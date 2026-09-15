"""
Express JS/TS parser wrapper.
Executes `backend/parsers/js_ast_parser.js` via Node.js subprocess to perform AST-based route extraction,
with a fallback lightweight parser if Node.js is unavailable.
"""

import json
import os
import re
import subprocess
import tempfile
from typing import List, Dict, Any, Optional
from backend.parsers.base import (
    BaseParser,
    EndpointInfo,
    EndpointParameter,
    RequestBodyInfo,
    ResponseInfo,
)


class ExpressParser(BaseParser):
    def __init__(self):
        self._script_path = os.path.join(os.path.dirname(__file__), "js_ast_parser.js")

    @property
    def framework_name(self) -> str:
        return "express"

    def can_parse(self, filename: str, content: str) -> bool:
        exts = [".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"]
        if not any(filename.endswith(ext) for ext in exts):
            return False

        keywords = ["express", "Router(", "app.get", "app.post", "router.get", "router.post", ".use("]
        return any(kw in content for kw in keywords)

    def parse(self, filename: str, content: str) -> List[EndpointInfo]:
        # Try AST parsing via Node script first
        endpoints = self._parse_via_node(filename, content)
        if endpoints is not None:
            return endpoints

        # Fallback regex parser if Node fails
        return self._parse_fallback(filename, content)

    def _parse_via_node(self, filename: str, content: str) -> Optional[List[EndpointInfo]]:
        if not os.path.exists(self._script_path):
            return None

        temp_file = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False, encoding="utf-8") as f:
                f.write(content)
                temp_file = f.name

            # Run Node script
            res = subprocess.run(
                ["node", self._script_path, temp_file],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )

            if res.returncode != 0 and not res.stdout:
                return None

            data = json.loads(res.stdout)
            if "error" in data and not data.get("endpoints"):
                return None

            raw_endpoints = data.get("endpoints", [])
            endpoints: List[EndpointInfo] = []

            for item in raw_endpoints:
                params = [
                    EndpointParameter(
                        name=p["name"],
                        type=p.get("type", "string"),
                        location=p.get("location", "path"),
                        required=p.get("required", True),
                    )
                    for p in item.get("parameters", [])
                ]

                req_body = None
                if item.get("request_body"):
                    rb = item["request_body"]
                    req_body = RequestBodyInfo(
                        content_type=rb.get("content_type", "application/json"),
                        description=rb.get("description", "JSON request payload"),
                    )

                res_info = ResponseInfo(
                    status_code=item.get("response_info", {}).get("status_code", 200),
                    type_annotation=item.get("response_info", {}).get("type_annotation", "json"),
                    description=item.get("response_info", {}).get("description", "HTTP Response"),
                )

                endpoints.append(
                    EndpointInfo(
                        id=item["id"],
                        file_path=filename,
                        framework="express",
                        method=item["method"],
                        path=item["path"],
                        handler_name=item["handler_name"],
                        docstring=item.get("docstring"),
                        parameters=params,
                        request_body=req_body,
                        response_info=res_info,
                        auth_middleware=item.get("auth_middleware", []),
                        tags=item.get("tags", ["default"]),
                        line_number=item.get("line_number", 1),
                    )
                )

            return endpoints

        except Exception:
            return None
        finally:
            if temp_file and os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except Exception:
                    pass

    def _parse_fallback(self, filename: str, content: str) -> List[EndpointInfo]:
        """Simple regex fallback if Node AST script is unavailable."""
        endpoints: List[EndpointInfo] = []
        pattern = r"(app|router)\.(get|post|put|delete|patch)\s*\(\s*['\"`]([^'\"`]+)['\"`]\s*,\s*(?:([^,\)]+)\s*,\s*)*"
        matches = re.finditer(pattern, content, re.IGNORECASE)

        for match in matches:
            var_name = match.group(1)
            method = match.group(2).upper()
            raw_path = match.group(3)

            # extract path params
            path_params = []
            clean_path = re.sub(
                r":([a-zA-Z0-9_]+)",
                lambda m: (
                    path_params.append(
                        EndpointParameter(name=m.group(1), type="string", location="path", required=True)
                    )
                    or f"{{{m.group(1)}}}"
                ),
                raw_path,
            )

            ep_id = f"express_fb_{method}_{clean_path.replace('/', '_')}"
            endpoints.append(
                EndpointInfo(
                    id=ep_id,
                    file_path=filename,
                    framework="express",
                    method=method,
                    path=clean_path,
                    handler_name="route_handler",
                    docstring=None,
                    parameters=path_params,
                    request_body=RequestBodyInfo() if method in ["POST", "PUT", "PATCH"] else None,
                    response_info=ResponseInfo(),
                    auth_middleware=[],
                    tags=[var_name],
                    line_number=content[: match.start()].count("\n") + 1,
                )
            )

        return endpoints

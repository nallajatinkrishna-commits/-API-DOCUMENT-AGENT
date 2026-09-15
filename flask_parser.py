"""
Flask parser using Python's native `ast` module.
Extracts routes from @app.route and Blueprint @bp.route decorators,
resolving methods, url_prefix, path converters (<int:id>), docstrings, and auth decorators.
"""

import ast
import re
from typing import List, Dict, Any, Optional, Set
from backend.parsers.base import (
    BaseParser,
    EndpointInfo,
    EndpointParameter,
    RequestBodyInfo,
    ResponseInfo,
)


class FlaskParser(BaseParser):
    @property
    def framework_name(self) -> str:
        return "flask"

    def can_parse(self, filename: str, content: str) -> bool:
        if not filename.endswith(".py"):
            return False
        keywords = ["flask", "Blueprint", "@app.route", ".route(", "Flask("]
        return any(kw in content for kw in keywords)

    def parse(self, filename: str, content: str) -> List[EndpointInfo]:
        try:
            tree = ast.parse(content, filename=filename)
        except SyntaxError:
            return []

        endpoints: List[EndpointInfo] = []

        # 1. Collect Blueprints: bp = Blueprint('name', __name__, url_prefix='/prefix')
        bp_prefixes: Dict[str, str] = {}
        self._collect_blueprints(tree, bp_prefixes)

        # 2. Collect route functions
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                eps = self._parse_function(node, filename, bp_prefixes)
                if eps:
                    endpoints.extend(eps)

        return endpoints

    def _collect_blueprints(self, tree: ast.AST, bp_prefixes: Dict[str, str]):
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and isinstance(node.value, ast.Call):
                        func_name = self._get_name(node.value.func)
                        if func_name and "Blueprint" in func_name:
                            prefix = ""
                            for kw in node.value.keywords:
                                if kw.arg == "url_prefix" and isinstance(kw.value, ast.Constant):
                                    prefix = str(kw.value.value)
                            bp_prefixes[target.id] = prefix

    def _parse_function(
        self,
        node: ast.AST,
        filename: str,
        bp_prefixes: Dict[str, str],
    ) -> List[EndpointInfo]:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            return []

        endpoints: List[EndpointInfo] = []
        docstring = ast.get_docstring(node)

        for decorator in node.decorator_list:
            call_node = decorator if isinstance(decorator, ast.Call) else None
            func_expr = call_node.func if call_node else decorator
            func_str = self._node_to_string(func_expr)

            if ".route" not in func_str and "route" not in func_str:
                continue

            var_name = func_str.split(".")[0] if "." in func_str else "app"

            # Route path is first argument
            path = "/"
            if call_node and call_node.args and isinstance(call_node.args[0], ast.Constant):
                path = str(call_node.args[0].value)

            # Apply Blueprint prefix if present
            prefix = bp_prefixes.get(var_name, "")
            if prefix:
                full_path = (prefix.rstrip("/") + "/" + path.lstrip("/")).rstrip("/")
                if not full_path:
                    full_path = "/"
            else:
                full_path = path

            # Extract HTTP methods from methods=['GET', 'POST'] kwarg
            methods = ["GET"]  # Default Flask method
            if call_node:
                for kw in call_node.keywords:
                    if kw.arg == "methods" and isinstance(kw.value, (ast.List, ast.Tuple, ast.Set)):
                        methods = [
                            str(elt.value).upper()
                            for elt in kw.value.elts
                            if isinstance(elt, ast.Constant)
                        ]

            # Parse path parameters and converters (e.g. <int:user_id> -> user_id, type int)
            path_params, cleaned_path = self._parse_flask_path(full_path)

            # Extract auth / middleware decorators on this function
            auth_middlewares = []
            for dec in node.decorator_list:
                dec_str = self._node_to_string(dec)
                if dec_str != func_str and any(
                    tok in dec_str.lower() for tok in ["auth", "login", "jwt", "permission", "protect"]
                ):
                    auth_middlewares.append(dec_str)

            # Build endpoint parameters list
            parameters: List[EndpointParameter] = list(path_params)

            # Add function arguments not in path as query params
            path_param_names = {p.name for p in path_params}
            for arg in node.args.args:
                if arg.arg in ["self", "cls"]:
                    continue
                if arg.arg not in path_param_names:
                    ann_str = self._node_to_string(arg.annotation) if arg.annotation else "string"
                    parameters.append(
                        EndpointParameter(
                            name=arg.arg,
                            type=ann_str,
                            location="query",
                            required=False,
                        )
                    )

            # Request body for POST/PUT/PATCH methods
            req_body = None
            for method in methods:
                if method in ["POST", "PUT", "PATCH"]:
                    req_body = RequestBodyInfo(
                        content_type="application/json",
                        description="JSON request body",
                    )
                    break

            for method in methods:
                ep_id = f"flask_{method}_{cleaned_path.replace('/', '_').replace('{', '').replace('}', '')}_{node.name}"
                endpoints.append(
                    EndpointInfo(
                        id=ep_id,
                        file_path=filename,
                        framework="flask",
                        method=method,
                        path=cleaned_path,
                        handler_name=node.name,
                        docstring=docstring,
                        parameters=parameters,
                        request_body=req_body,
                        response_info=ResponseInfo(status_code=200, type_annotation="Any"),
                        auth_middleware=auth_middlewares,
                        tags=[var_name] if var_name != "app" else ["default"],
                        line_number=node.lineno,
                    )
                )

        return endpoints

    def _parse_flask_path(self, path: str) -> tuple[List[EndpointParameter], str]:
        """
        Converts Flask path syntax like `/users/<int:user_id>` to `/users/{user_id}`
        and returns list of EndpointParameter objects.
        """
        params: List[EndpointParameter] = []

        def replace_param(match):
            raw = match.group(1)
            if ":" in raw:
                conv, p_name = raw.split(":", 1)
                p_type = {"int": "integer", "float": "number", "path": "string", "uuid": "string"}.get(
                    conv, "string"
                )
            else:
                p_name = raw
                p_type = "string"

            params.append(
                EndpointParameter(
                    name=p_name,
                    type=p_type,
                    location="path",
                    required=True,
                )
            )
            return f"{{{p_name}}}"

        cleaned_path = re.sub(r"<([^>]+)>", replace_param, path)
        return params, cleaned_path

    def _get_name(self, node: Optional[ast.AST]) -> Optional[str]:
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            val = self._get_name(node.value)
            return f"{val}.{node.attr}" if val else node.attr
        return None

    def _node_to_string(self, node: Optional[ast.AST]) -> str:
        if node is None:
            return ""
        try:
            return ast.unparse(node).strip()
        except Exception:
            return str(node)

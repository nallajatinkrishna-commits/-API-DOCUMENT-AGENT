"""
FastAPI parser using Python's native `ast` module.
Extracts routes, path/query/body parameters, docstrings, auth dependencies, and Pydantic schemas.
"""

import ast
import uuid
from typing import List, Dict, Any, Optional, Set
from backend.parsers.base import (
    BaseParser,
    EndpointInfo,
    EndpointParameter,
    RequestBodyInfo,
    ResponseInfo,
)


class FastAPIParser(BaseParser):
    @property
    def framework_name(self) -> str:
        return "fastapi"

    def can_parse(self, filename: str, content: str) -> bool:
        if not filename.endswith(".py"):
            return False
        # Quick heuristics before full AST
        keywords = ["fastapi", "APIRouter", "@app.get", "@app.post", "@router.", "FastAPI("]
        return any(kw in content for kw in keywords)

    def parse(self, filename: str, content: str) -> List[EndpointInfo]:
        try:
            tree = ast.parse(content, filename=filename)
        except SyntaxError:
            return []

        endpoints: List[EndpointInfo] = []

        # 1. First pass: collect APIRouter prefix assignments and Pydantic models in file
        router_prefixes: Dict[str, str] = {}  # var_name -> prefix string
        router_tags: Dict[str, List[str]] = {}
        pydantic_models: Dict[str, List[EndpointParameter]] = {}

        self._collect_routers_and_models(tree, router_prefixes, router_tags, pydantic_models)

        # 2. Second pass: collect route functions
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                ep = self._parse_function(node, filename, router_prefixes, router_tags, pydantic_models)
                if ep:
                    endpoints.extend(ep)

        return endpoints

    def _collect_routers_and_models(
        self,
        tree: ast.AST,
        router_prefixes: Dict[str, str],
        router_tags: Dict[str, List[str]],
        pydantic_models: Dict[str, List[EndpointParameter]],
    ):
        for node in ast.walk(tree):
            # Detect APIRouter(prefix="/users", tags=["Users"])
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and isinstance(node.value, ast.Call):
                        func_name = self._get_name(node.value.func)
                        if func_name and "APIRouter" in func_name:
                            prefix = ""
                            tags = []
                            for kw in node.value.keywords:
                                if kw.arg == "prefix" and isinstance(kw.value, ast.Constant):
                                    prefix = str(kw.value.value)
                                elif kw.arg == "tags" and isinstance(kw.value, ast.List):
                                    tags = [
                                        str(elt.value)
                                        for elt in kw.value.elts
                                        if isinstance(elt, ast.Constant)
                                    ]
                            router_prefixes[target.id] = prefix
                            router_tags[target.id] = tags

            # Detect Pydantic models: class UserCreate(BaseModel):
            elif isinstance(node, ast.ClassDef):
                is_pydantic = False
                for base in node.bases:
                    base_name = self._get_name(base)
                    if base_name and ("BaseModel" in base_name or "Schema" in base_name):
                        is_pydantic = True
                        break

                if is_pydantic:
                    fields: List[EndpointParameter] = []
                    for item in node.body:
                        if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                            field_name = item.target.id
                            field_type = self._node_to_string(item.annotation)
                            default_val = self._node_to_string(item.value) if item.value else None
                            req = item.value is None or default_val == "..."
                            fields.append(
                                EndpointParameter(
                                    name=field_name,
                                    type=field_type,
                                    location="body",
                                    required=req,
                                    default_value=default_val,
                                )
                            )
                    pydantic_models[node.name] = fields

    def _parse_function(
        self,
        node: ast.AST,
        filename: str,
        router_prefixes: Dict[str, str],
        router_tags: Dict[str, List[str]],
        pydantic_models: Dict[str, List[EndpointParameter]],
    ) -> List[EndpointInfo]:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            return []

        endpoints: List[EndpointInfo] = []
        docstring = ast.get_docstring(node)

        for decorator in node.decorator_list:
            call_node = decorator if isinstance(decorator, ast.Call) else None
            func_expr = call_node.func if call_node else decorator
            func_str = self._node_to_string(func_expr)

            # Check if decorator is a route method, e.g. app.get, router.post, @api.get
            methods = ["get", "post", "put", "delete", "patch", "options", "head"]
            matched_method = None
            var_name = "app"

            parts = func_str.split(".")
            if len(parts) >= 2:
                var_name = parts[0]
                method_candidate = parts[-1].lower()
                if method_candidate in methods:
                    matched_method = method_candidate.upper()

            if not matched_method:
                continue

            # Extract path from first arg of decorator call
            path = "/"
            if call_node and call_node.args and isinstance(call_node.args[0], ast.Constant):
                path = str(call_node.args[0].value)

            # Apply router prefix if defined
            prefix = router_prefixes.get(var_name, "")
            if prefix:
                full_path = (prefix.rstrip("/") + "/" + path.lstrip("/")).rstrip("/")
                if not full_path:
                    full_path = "/"
            else:
                full_path = path

            # Extract decorator kwargs: response_model, status_code, tags, dependencies
            res_type = None
            status_code = 200
            tags = list(router_tags.get(var_name, []))
            auth_middlewares = []

            if call_node:
                for kw in call_node.keywords:
                    if kw.arg == "status_code" and isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, int):
                        status_code = kw.value.value
                    elif kw.arg == "response_model":
                        res_type = self._node_to_string(kw.value)
                    elif kw.arg == "tags" and isinstance(kw.value, ast.List):
                        for elt in kw.value.elts:
                            if isinstance(elt, ast.Constant):
                                tags.append(str(elt.value))
                    elif kw.arg == "dependencies":
                        dep_str = self._node_to_string(kw.value)
                        auth_middlewares.append(dep_str)

            # Extract auth from decorators like Depends
            for dec in node.decorator_list:
                dec_str = self._node_to_string(dec)
                if "security" in dec_str.lower() or "auth" in dec_str.lower() or "depends" in dec_str.lower():
                    if dec_str not in auth_middlewares and dec_str != func_str:
                        auth_middlewares.append(dec_str)

            # Extract path parameter names from path string (e.g. /users/{user_id})
            path_param_names = self._extract_path_param_names(full_path)

            # Analyze function arguments
            parameters: List[EndpointParameter] = []
            req_body: Optional[RequestBodyInfo] = None

            # Track defaults map
            defaults = node.args.defaults
            num_args = len(node.args.args)
            num_defaults = len(defaults)
            default_start = num_args - num_defaults

            for idx, arg in enumerate(node.args.args):
                arg_name = arg.arg
                if arg_name in ["self", "cls", "request", "response"]:
                    continue

                ann_str = self._node_to_string(arg.annotation) if arg.annotation else "str"
                def_val = None
                if idx >= default_start:
                    def_val = self._node_to_string(defaults[idx - default_start])

                # Check if Depends / Auth argument
                if def_val and ("Depends" in def_val or "Security" in def_val):
                    auth_middlewares.append(f"{arg_name}: {def_val}")
                    continue

                # Determine parameter location
                if arg_name in path_param_names:
                    location = "path"
                    parameters.append(
                        EndpointParameter(
                            name=arg_name,
                            type=ann_str,
                            location=location,
                            required=True,
                            default_value=def_val,
                        )
                    )
                elif ann_str in pydantic_models or "Body" in (def_val or "") or matched_method in ["POST", "PUT", "PATCH"]:
                    # Likely request body or Pydantic model
                    body_fields = pydantic_models.get(ann_str, [])
                    if not body_fields:
                        body_fields = [
                            EndpointParameter(
                                name=arg_name,
                                type=ann_str,
                                location="body",
                                required=(def_val is None),
                                default_value=def_val,
                            )
                        ]
                    req_body = RequestBodyInfo(
                        content_type="application/json",
                        schema_name=ann_str,
                        fields=body_fields,
                    )
                else:
                    # Default to query parameter
                    parameters.append(
                        EndpointParameter(
                            name=arg_name,
                            type=ann_str,
                            location="query",
                            required=(def_val is None),
                            default_value=def_val,
                        )
                    )

            ep_id = f"fastapi_{matched_method}_{full_path.replace('/', '_').replace('{', '').replace('}', '')}_{node.name}"

            endpoints.append(
                EndpointInfo(
                    id=ep_id,
                    file_path=filename,
                    framework="fastapi",
                    method=matched_method,
                    path=full_path,
                    handler_name=node.name,
                    docstring=docstring,
                    parameters=parameters,
                    request_body=req_body,
                    response_info=ResponseInfo(
                        status_code=status_code,
                        type_annotation=res_type or "Any",
                    ),
                    auth_middleware=auth_middlewares,
                    tags=tags,
                    line_number=node.lineno,
                )
            )

        return endpoints

    def _extract_path_param_names(self, path: str) -> Set[str]:
        import re

        return set(re.findall(r"\{([a-zA-Z0-9_]+)\}", path))

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

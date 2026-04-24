import ast

FORBIDDEN_IMPORTS = {"os", "sys", "subprocess", "socket", "builtins", "importlib", "shutil", "pathlib", "pty", "multiprocessing", "threading"}
ALLOWED_IMPORTS = {"math", "time", "json", "datetime", "random", "abc", "typing", "collections", "itertools", "functools", "re", "requests", "httpx", "urllib", "aiohttp", "asyncio", "pydantic", "bs4", "openai", "anthropic", "langchain", "solana", "solders"}

FORBIDDEN_NAMES = {"eval", "exec", "getattr", "setattr", "delattr", "compile", "open", "input", "breakpoint"}
FORBIDDEN_ATTRS = {"__class__", "__subclasses__", "__bases__", "__globals__", "__builtins__", "__code__", "__func__", "__self__", "__module__", "__dict__"}

def validate_agent_code(code: str):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"Syntax error in agent code: {e}"

    has_run_method = False
    has_agent_instance = False

    for node in ast.walk(tree):
        # 1. Check for allowed imports (Strict Whitelist)
        if isinstance(node, ast.Import):
            for alias in node.names:
                base_module = alias.name.split('.')[0]
                if base_module not in ALLOWED_IMPORTS:
                    return False, f"Import of '{base_module}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_IMPORTS))}"
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                base_module = node.module.split('.')[0]
                if base_module not in ALLOWED_IMPORTS:
                    return False, f"Import from '{base_module}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_IMPORTS))}"
        
        # 2. Block forbidden functions
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in FORBIDDEN_NAMES:
                    return False, f"Call to forbidden function '{node.func.id}' is not allowed"
            elif isinstance(node.func, ast.Attribute):
                if node.func.attr in FORBIDDEN_ATTRS:
                    return False, f"Access to forbidden attribute '{node.func.attr}' is not allowed"

        # 3. Block forbidden attribute access
        elif isinstance(node, ast.Attribute):
            if node.attr in FORBIDDEN_ATTRS:
                return False, f"Access to forbidden attribute '{node.attr}' is not allowed"

        # 4. Check for classes with run method
        if isinstance(node, ast.ClassDef):
            for item in node.body:
                if isinstance(item, ast.FunctionDef) and item.name == "run":
                    args = [arg.arg for arg in item.args.args]
                    # 'run(self, data)' or 'run(self, input_data)' should have at least 2 args
                    if len(args) >= 2:
                        has_run_method = True

        # 3. Check for 'agent' instance assignment
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "agent":
                    has_agent_instance = True

    if not has_run_method:
        return False, "Code must define a class with a 'run(self, input_data)' method"

    return True, "Success"

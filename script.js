const statusEl = document.getElementById("status");
const statusTextEl = statusEl.querySelector(".status-text");
const codeEl = document.getElementById("code");
const outputEl = document.getElementById("output");
const runButton = document.getElementById("runButton");
const clearButton = document.getElementById("clearButton");
const themeToggle = document.getElementById("themeToggle");

const THEME_KEY = "pbl-theme";
const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedTheme = localStorage.getItem(THEME_KEY);
const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
document.documentElement.setAttribute("data-theme", initialTheme);

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
});

let pyodideReadyPromise = initializePyodide();
let outputHasContent = false;

function setStatus(text, state) {
  statusTextEl.textContent = text;
  statusEl.classList.remove("ready", "error");
  if (state) statusEl.classList.add(state);
}

async function initializePyodide() {
  try {
    const pyodide = await loadPyodide({
      stdout: (text) => appendOutput(text),
      stderr: (text) => appendOutput(text),
    });

    setStatus("San sang", "ready");
    setOutputText("Pyodide da san sang. Bam Run Python de chay code.");
    runButton.disabled = false;
    return pyodide;
  } catch (error) {
    setStatus("Loi khoi dong", "error");
    setOutputText(String(error));
    throw error;
  }
}

function setOutputText(text) {
  outputEl.textContent = text;
  outputHasContent = !!text;
}

function clearOutput() {
  outputEl.textContent = "";
  outputHasContent = false;
}

function appendOutput(text) {
  if (outputHasContent) {
    outputEl.appendChild(document.createTextNode("\n"));
  }
  outputEl.appendChild(document.createTextNode(text));
  outputHasContent = true;
  outputEl.scrollTop = outputEl.scrollHeight;
}

function readInlineInput(promptText) {
  return new Promise((resolve) => {
    if (outputHasContent && !outputEl.lastChild) {
      outputEl.appendChild(document.createTextNode("\n"));
    }
    const line = document.createElement("span");
    line.className = "input-line";

    if (promptText) {
      line.appendChild(document.createTextNode(promptText));
    }

    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "inline-input";
    inp.autocomplete = "off";
    inp.autocapitalize = "off";
    inp.spellcheck = false;
    line.appendChild(inp);

    outputEl.appendChild(line);
    outputHasContent = true;
    inp.focus();
    outputEl.scrollTop = outputEl.scrollHeight;

    const finish = () => {
      const val = inp.value;
      const echo = document.createTextNode(val + "\n");
      line.replaceChild(echo, inp);
      resolve(val);
    };

    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish();
      }
    });
  });
}

window.__pyInput = readInlineInput;

const PY_RUNNER = `
import ast, builtins
from js import __pyInput as _jsinput

async def __ainput(prompt=""):
    return await _jsinput(str(prompt))

class _InputTransformer(ast.NodeTransformer):
    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id == 'input':
            return ast.Await(value=ast.Call(
                func=ast.Name(id='__ainput', ctx=ast.Load()),
                args=node.args,
                keywords=node.keywords,
            ))
        return node

def _has_input_in_sync_def(tree):
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            for sub in ast.walk(node):
                if (isinstance(sub, ast.Call)
                        and isinstance(sub.func, ast.Name)
                        and sub.func.id == 'input'):
                    return True
    return False

_src = __user_code
_tree = ast.parse(_src)
_scope = {
    "__name__": "__main__",
    "__builtins__": builtins,
    "__ainput": __ainput,
}

if _has_input_in_sync_def(_tree):
    # Co input() nam trong def thong thuong -> khong the dung await.
    # Fallback: dung input mac dinh cua Pyodide (window.prompt).
    exec(compile(_src, '<main.py>', 'exec'), _scope)
else:
    _tree = ast.fix_missing_locations(_InputTransformer().visit(_tree))
    _code = compile(_tree, '<main.py>', 'exec',
                    flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    _result = eval(_code, _scope)
    if _result is not None:
        await _result
`;

async function runPython() {
  runButton.disabled = true;
  clearOutput();

  try {
    const pyodide = await pyodideReadyPromise;
    pyodide.globals.set("__user_code", codeEl.value);
    await pyodide.runPythonAsync(PY_RUNNER);

    if (!outputHasContent) {
      setOutputText("(khong co output)");
    }
  } catch (error) {
    appendOutput(String(error));
  } finally {
    runButton.disabled = false;
  }
}

runButton.addEventListener("click", runPython);

clearButton.addEventListener("click", clearOutput);

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
    outputEl.textContent = "Pyodide da san sang. Bam Run Python de chay code.";
    runButton.disabled = false;
    return pyodide;
  } catch (error) {
    setStatus("Loi khoi dong", "error");
    outputEl.textContent = String(error);
    throw error;
  }
}

function appendOutput(text) {
  if (outputEl.textContent) {
    outputEl.textContent += "\n";
  }
  outputEl.textContent += text;
}

async function runPython() {
  runButton.disabled = true;
  outputEl.textContent = "";

  try {
    const pyodide = await pyodideReadyPromise;
    const result = pyodide.runPython(codeEl.value);

    if (result !== undefined) {
      appendOutput(String(result));
    }

    if (!outputEl.textContent) {
      outputEl.textContent = "(khong co output)";
    }
  } catch (error) {
    outputEl.textContent = String(error);
  } finally {
    runButton.disabled = false;
  }
}

runButton.addEventListener("click", runPython);

clearButton.addEventListener("click", () => {
  outputEl.textContent = "";
});

export interface ConsoleMessage {
  id: string;
  level: "log" | "warn" | "error" | "info";
  text: string;
  timestamp: number;
}

export interface SandboxExecutionResult {
  logs: ConsoleMessage[];
  returnValue?: string;
  error?: string;
  executionTimeMs: number;
}

export interface SandboxFile {
  name: string;
  code: string;
  language: string;
}

/**
 * Builds a sandboxed HTML document string combining all snippet files
 * with a postMessage bridge that reports console logs, errors, and unhandled rejections.
 */
export function buildWebPreviewDocument(
  files: SandboxFile[],
  defaultCode: string,
  defaultLanguage: string,
): string {
  let html = "";
  let css = "";
  let js = "";

  if (files && files.length > 0) {
    for (const file of files) {
      const lowerName = file.name.toLowerCase();
      const lang = (file.language || "").toLowerCase();

      if (lowerName.endsWith(".html") || lang === "html") {
        html += (html ? "\n" : "") + file.code;
      } else if (lowerName.endsWith(".css") || lang === "css") {
        css += (css ? "\n" : "") + file.code;
      } else if (
        lowerName.endsWith(".js") ||
        lowerName.endsWith(".ts") ||
        lang === "javascript" ||
        lang === "typescript"
      ) {
        js += (js ? "\n" : "") + file.code;
      }
    }
  }

  // Fallback if no files matched HTML/CSS/JS specifically
  if (!html && !css && !js) {
    const lang = (defaultLanguage || "").toLowerCase();
    if (lang === "html" || lang === "xml") {
      html = defaultCode;
    } else if (lang === "css") {
      css = defaultCode;
      html = `<div class="demo-container"><h1>CSS Preview</h1><p>Previewing styles:</p><button class="btn">Sample Button</button></div>`;
    } else if (lang === "svg") {
      html = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;">${defaultCode}</div>`;
    } else if (lang === "javascript" || lang === "typescript") {
      js = defaultCode;
      html = `<div style="font-family:sans-serif;padding:24px;color:#888;">JavaScript snippet loaded. Check Console Output below or inspect output.</div>`;
    } else {
      html = `<pre style="font-family:monospace;padding:16px;">${escapeHtml(defaultCode)}</pre>`;
    }
  }

  const bridgeScript = `
<script>
(function() {
  function formatArg(arg) {
    if (arg === null) return "null";
    if (arg === undefined) return "undefined";
    if (typeof arg === "object") {
      try { return JSON.stringify(arg, null, 2); } catch(e) { return String(arg); }
    }
    return String(arg);
  }

  function sendLog(level, args) {
    try {
      window.parent.postMessage({
        type: "SNIPPET_SANDBOX_LOG",
        level: level,
        text: Array.from(args).map(formatArg).join(" "),
        timestamp: Date.now()
      }, "*");
    } catch (_) {}
  }

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  const origInfo = console.info;

  console.log = function() { sendLog("log", arguments); origLog.apply(console, arguments); };
  console.warn = function() { sendLog("warn", arguments); origWarn.apply(console, arguments); };
  console.error = function() { sendLog("error", arguments); origError.apply(console, arguments); };
  console.info = function() { sendLog("info", arguments); origInfo.apply(console, arguments); };

  window.addEventListener("error", function(evt) {
    sendLog("error", [evt.message || "Uncaught Error at line " + evt.lineno]);
  });
  window.addEventListener("unhandledrejection", function(evt) {
    sendLog("error", ["Unhandled Promise Rejection: " + (evt.reason ? (evt.reason.message || evt.reason) : "Unknown")]);
  });
})();
</script>
`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    * { box-sizing: border-box; }
    ${css}
  </style>
  ${bridgeScript}
</head>
<body>
  ${html}
  ${js ? `<script>${js}<\/script>` : ""}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Executes a JavaScript snippet in a simulated safe runtime and collects console outputs.
 */
export async function runJavaScriptSnippet(
  code: string,
): Promise<SandboxExecutionResult> {
  const logs: ConsoleMessage[] = [];
  const start = performance.now();

  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  const record = (level: ConsoleMessage["level"], ...args: unknown[]) => {
    logs.push({
      id: crypto.randomUUID(),
      level,
      text: args.map((a) => {
        if (a === null) return "null";
        if (a === undefined) return "undefined";
        if (typeof a === "object") {
          try {
            return JSON.stringify(a, null, 2);
          } catch {
            return String(a);
          }
        }
        return String(a);
      }).join(" "),
      timestamp: Date.now(),
    });
  };

  let returnValue: string | undefined;
  let error: string | undefined;

  try {
    const sandboxConsole = {
      log: (...args: unknown[]) => record("log", ...args),
      warn: (...args: unknown[]) => record("warn", ...args),
      error: (...args: unknown[]) => record("error", ...args),
      info: (...args: unknown[]) => record("info", ...args),
    };

    // Use AsyncFunction constructor to allow top-level await in modern JS
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const runner = new AsyncFunction("console", code);
    const result = await runner(sandboxConsole);
    if (result !== undefined) {
      returnValue =
        typeof result === "object" ? JSON.stringify(result, null, 2) : String(result);
    }
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : String(err);
  } finally {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
  }

  const duration = Math.round(performance.now() - start);

  return {
    logs,
    returnValue,
    error,
    executionTimeMs: duration,
  };
}

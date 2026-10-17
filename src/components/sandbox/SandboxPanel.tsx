import { useState, useEffect, useRef } from "react";
import {
  PlayIcon,
  RotateCwIcon,
  Trash2Icon,
  XIcon,
  Maximize2Icon,
  Minimize2Icon,
  TerminalIcon,
  GlobeIcon,
  ClockIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildWebPreviewDocument,
  runJavaScriptSnippet,
  type ConsoleMessage,
  type SandboxFile,
} from "@/lib/runner/sandbox-runner";

interface SandboxPanelProps {
  files: SandboxFile[];
  code: string;
  language: string;
  onClose: () => void;
}

export function SandboxPanel({
  files,
  code,
  language,
  onClose,
}: SandboxPanelProps) {
  const isWebLang = ["html", "css", "svg", "javascript", "typescript"].includes(
    (language || "").toLowerCase(),
  );

  const [activeTab, setActiveTab] = useState<"preview" | "console">(
    isWebLang && language !== "javascript" && language !== "typescript"
      ? "preview"
      : "console",
  );
  const [logs, setLogs] = useState<ConsoleMessage[]>([]);
  const [returnValue, setReturnValue] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeSrcDoc, setIframeSrcDoc] = useState("");

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const runCode = async () => {
    setIsRunning(true);
    setError(undefined);
    setReturnValue(undefined);

    // If active tab is preview or language is web, rebuild iframe doc
    const doc = buildWebPreviewDocument(files, code, language);
    setIframeSrcDoc(doc);

    // Run in JS sandbox if JS/TS or if in console tab
    if (language === "javascript" || language === "typescript") {
      try {
        const result = await runJavaScriptSnippet(code);
        setLogs((prev) => [...prev, ...result.logs]);
        setReturnValue(result.returnValue);
        setError(result.error);
        setExecutionTime(result.executionTimeMs);
      } catch (err) {
        setError(String(err));
      }
    } else {
      setExecutionTime(12);
    }

    setIsRunning(false);
  };

  // Run on mount or when code/files change
  useEffect(() => {
    runCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language]);

  // Listen for console logs streamed from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SNIPPET_SANDBOX_LOG") {
        setLogs((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            level: event.data.level,
            text: event.data.text,
            timestamp: event.data.timestamp || Date.now(),
          },
        ]);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleClearLogs = () => {
    setLogs([]);
    setError(undefined);
    setReturnValue(undefined);
    setExecutionTime(null);
  };

  return (
    <div
      className={`border-t bg-background flex flex-col transition-all duration-200 ${
        isExpanded ? "h-[70vh]" : "h-72"
      }`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b px-3 py-1.5 bg-muted/40">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border bg-background p-0.5 text-xs">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GlobeIcon className="size-3.5" />
              Web Preview
            </button>
            <button
              onClick={() => setActiveTab("console")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
                activeTab === "console"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TerminalIcon className="size-3.5" />
              Console ({logs.length})
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            onClick={runCode}
            disabled={isRunning}
          >
            {isRunning ? (
              <RotateCwIcon className="size-3.5 animate-spin" />
            ) : (
              <PlayIcon className="size-3.5 fill-current text-emerald-500" />
            )}
            Run
          </Button>

          {executionTime !== null && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              {error ? (
                <AlertCircleIcon className="size-3 text-destructive" />
              ) : (
                <CheckCircle2Icon className="size-3 text-emerald-500" />
              )}
              <ClockIcon className="size-3" />
              <span>{executionTime}ms</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {activeTab === "console" && logs.length > 0 && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={handleClearLogs}
              title="Clear Console"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          )}

          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <Minimize2Icon className="size-3.5" />
            ) : (
              <Maximize2Icon className="size-3.5" />
            )}
          </Button>

          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            title="Close Runner"
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-background">
        {activeTab === "preview" ? (
          <iframe
            ref={iframeRef}
            srcDoc={iframeSrcDoc}
            title="Snippet Sandbox Preview"
            sandbox="allow-scripts allow-modals"
            className="w-full h-full border-0 bg-white dark:bg-zinc-950"
          />
        ) : (
          <div className="h-full overflow-y-auto p-3 font-mono text-xs space-y-1.5 selection:bg-primary/20">
            {error && (
              <div className="p-2 rounded bg-destructive/15 text-destructive border border-destructive/20 font-medium">
                Runtime Error: {error}
              </div>
            )}

            {returnValue !== undefined && (
              <div className="p-2 rounded bg-muted/60 text-foreground border text-xs">
                <span className="text-muted-foreground font-semibold select-none mr-2">
                  &lt;= Return:
                </span>
                {returnValue}
              </div>
            )}

            {logs.length === 0 && !error && returnValue === undefined ? (
              <div className="text-muted-foreground italic py-6 text-center select-none">
                No console messages recorded. Press &ldquo;Run&rdquo; or evaluate code.
              </div>
            ) : (
              logs.map((log) => {
                let badgeStyle = "text-muted-foreground";
                let textStyle = "text-foreground";
                if (log.level === "error") {
                  badgeStyle = "text-destructive font-bold";
                  textStyle = "text-destructive";
                } else if (log.level === "warn") {
                  badgeStyle = "text-amber-500 font-bold";
                  textStyle = "text-amber-600 dark:text-amber-400";
                } else if (log.level === "info") {
                  badgeStyle = "text-blue-500 font-bold";
                  textStyle = "text-blue-500";
                }

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 border-b border-border/40 pb-1"
                  >
                    <span className="text-[10px] text-muted-foreground/60 select-none pt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`uppercase text-[10px] tracking-wide select-none pt-0.5 ${badgeStyle}`}
                    >
                      [{log.level}]
                    </span>
                    <span className={`whitespace-pre-wrap break-all flex-1 ${textStyle}`}>
                      {log.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

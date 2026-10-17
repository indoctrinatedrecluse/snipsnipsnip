import { useState, useRef } from "react";
import {
  CameraIcon,
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  PaletteIcon,
  SlidersIcon,
  Code2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Snippet } from "@/types/snippet";

interface CodeCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippet: Snippet;
}

const GRADIENT_THEMES = [
  { id: "midnight", label: "Midnight Galaxy", css: "linear-gradient(135deg, #1e1e38 0%, #3b82f6 50%, #9333ea 100%)" },
  { id: "sunset", label: "Neon Sunset", css: "linear-gradient(135deg, #ea580c 0%, #db2777 50%, #7c3aed 100%)" },
  { id: "aurora", label: "Northern Aurora", css: "linear-gradient(135deg, #059669 0%, #0284c7 50%, #4f46e5 100%)" },
  { id: "charcoal", label: "Minimalist Slate", css: "linear-gradient(135deg, #18181b 0%, #27272a 100%)" },
  { id: "candy", label: "Candy Pastel", css: "linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)" },
  { id: "transparent", label: "Transparent", css: "transparent" },
];

export function CodeCardDialog({
  open,
  onOpenChange,
  snippet,
}: CodeCardDialogProps) {
  const [themeId, setThemeId] = useState("midnight");
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [padding, setPadding] = useState("32");
  const [windowControls, setWindowControls] = useState<"mac" | "none">("mac");
  const showWatermark = true;
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  const currentGradient =
    GRADIENT_THEMES.find((g) => g.id === themeId)?.css || GRADIENT_THEMES[0].css;

  const lines = (snippet.code || "").split("\n");

  const buildSvgString = (): string => {
    const cardEl = cardRef.current;
    if (!cardEl) return "";
    const rect = cardEl.getBoundingClientRect();
    const width = Math.max(600, Math.round(rect.width));
    const height = Math.max(300, Math.round(rect.height));

    const escapedCodeLines = lines.map((line, idx) => {
      const lineNum = showLineNumbers
        ? `<tspan fill="#64748b" text-anchor="end" dx="-16">${idx + 1}</tspan>`
        : "";
      const escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<tspan x="${showLineNumbers ? 60 : 24}" dy="20">${lineNum}${escaped || " "}</tspan>`;
    }).join("");

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      ${themeId === "midnight" ? '<stop offset="0%" stop-color="#1e1e38"/><stop offset="50%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#9333ea"/>' : ""}
      ${themeId === "sunset" ? '<stop offset="0%" stop-color="#ea580c"/><stop offset="50%" stop-color="#db2777"/><stop offset="100%" stop-color="#7c3aed"/>' : ""}
      ${themeId === "aurora" ? '<stop offset="0%" stop-color="#059669"/><stop offset="50%" stop-color="#0284c7"/><stop offset="100%" stop-color="#4f46e5"/>' : ""}
      ${themeId === "charcoal" ? '<stop offset="0%" stop-color="#18181b"/><stop offset="100%" stop-color="#27272a"/>' : ""}
      ${themeId === "candy" ? '<stop offset="0%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#fb923c"/>' : ""}
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="${themeId === "transparent" ? "none" : "url(#bg)"}" rx="12"/>
  <g transform="translate(${padding}, ${padding})">
    <rect width="${width - parseInt(padding, 10) * 2}" height="${height - parseInt(padding, 10) * 2}" fill="#0f172a" rx="10" opacity="0.95"/>
    ${
      windowControls === "mac"
        ? `
      <circle cx="18" cy="18" r="5" fill="#ef4444"/>
      <circle cx="34" cy="18" r="5" fill="#f59e0b"/>
      <circle cx="50" cy="18" r="5" fill="#10b981"/>
    `
        : ""
    }
    <text x="${width - parseInt(padding, 10) * 2 - 20}" y="22" font-family="sans-serif" font-size="11" fill="#94a3b8" text-anchor="end">${snippet.language.toUpperCase()}</text>
    <text font-family="Consolas, Monaco, monospace" font-size="13" fill="#f8fafc" xml:space="preserve" y="28">
      ${escapedCodeLines}
    </text>
  </g>
</svg>`.trim();
  };

  const handleDownloadSvg = () => {
    const svgStr = buildSvgString();
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${snippet.title ? snippet.title.toLowerCase().replace(/\s+/g, "-") : "snippet"}-card.svg`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("SVG Code Card exported");
  };

  const handleDownloadPng = async () => {
    setIsExporting(true);
    try {
      const svgStr = buildSvgString();
      const img = new Image();
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width * 2; // High-res 2x
        canvas.height = img.height * 2;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(2, 2);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const pngUrl = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = pngUrl;
              link.download = `${snippet.title ? snippet.title.toLowerCase().replace(/\s+/g, "-") : "snippet"}-card.png`;
              link.click();
              URL.revokeObjectURL(pngUrl);
              toast.success("PNG Code Card exported");
            }
          }, "image/png");
        }
        URL.revokeObjectURL(url);
        setIsExporting(false);
      };
      img.src = url;
    } catch {
      toast.error("Failed to export PNG");
      setIsExporting(false);
    }
  };

  const handleCopyPng = async () => {
    setIsExporting(true);
    try {
      const svgStr = buildSvgString();
      const img = new Image();
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(2, 2);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(async (blob) => {
            if (blob && navigator.clipboard?.write) {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
              setCopied(true);
              toast.success("Copied Code Card image to clipboard");
              setTimeout(() => setCopied(false), 1500);
            } else {
              toast.info("Clipboard image copy not supported in this environment");
            }
          }, "image/png");
        }
        URL.revokeObjectURL(url);
        setIsExporting(false);
      };
      img.src = url;
    } catch {
      toast.error("Failed to copy image");
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <CameraIcon className="size-5 text-pink-500" />
            Carbon-Style Code Card Exporter
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generate beautiful, high-resolution social code cards for sharing on Twitter, LinkedIn, GitHub, or documentation.
          </DialogDescription>
        </DialogHeader>

        {/* Options Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg border bg-muted/30 text-xs">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block flex items-center gap-1 font-medium">
              <PaletteIcon className="size-3" />
              Theme Gradient
            </label>
            <Select
              value={themeId}
              onValueChange={(val) => {
                if (val) setThemeId(val);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRADIENT_THEMES.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block flex items-center gap-1 font-medium">
              <SlidersIcon className="size-3" />
              Padding
            </label>
            <Select
              value={padding}
              onValueChange={(val) => {
                if (val) setPadding(val);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16">Compact (16px)</SelectItem>
                <SelectItem value="32">Balanced (32px)</SelectItem>
                <SelectItem value="48">Spacious (48px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block font-medium">
              Window Controls
            </label>
            <Select
              value={windowControls}
              onValueChange={(val) => setWindowControls(val as "mac" | "none")}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mac">macOS Dots</SelectItem>
                <SelectItem value="none">None (Clean)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block font-medium">
              Line Numbers
            </label>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full text-xs"
              onClick={() => setShowLineNumbers(!showLineNumbers)}
            >
              {showLineNumbers ? "Visible" : "Hidden"}
            </Button>
          </div>
        </div>

        {/* Live Card Preview */}
        <div className="flex-1 min-h-[260px] overflow-auto flex items-center justify-center p-4 bg-zinc-950/20 rounded-lg border">
          <div
            ref={cardRef}
            className="transition-all duration-200 rounded-xl max-w-full shadow-2xl"
            style={{
              background: currentGradient,
              padding: `${padding}px`,
            }}
          >
            <div className="rounded-lg bg-slate-900/95 border border-slate-700/50 shadow-xl overflow-hidden min-w-[340px] max-w-xl">
              {/* Card Window Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/60">
                {windowControls === "mac" ? (
                  <div className="flex items-center gap-1.5">
                    <div className="size-3 rounded-full bg-red-500/90" />
                    <div className="size-3 rounded-full bg-amber-500/90" />
                    <div className="size-3 rounded-full bg-emerald-500/90" />
                  </div>
                ) : (
                  <div />
                )}

                <span className="text-[11px] font-mono text-slate-400 font-medium truncate max-w-[200px]">
                  {snippet.title || "untitled"}
                </span>

                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {snippet.language}
                </span>
              </div>

              {/* Code Lines */}
              <div className="p-4 font-mono text-xs text-slate-100 overflow-x-auto leading-relaxed">
                {lines.slice(0, 30).map((line, idx) => (
                  <div key={idx} className="flex">
                    {showLineNumbers && (
                      <span className="select-none text-slate-600 text-right pr-4 w-7 shrink-0 text-[11px]">
                        {idx + 1}
                      </span>
                    )}
                    <span className="whitespace-pre">{line || " "}</span>
                  </div>
                ))}
              </div>

              {showWatermark && (
                <div className="px-3 py-1 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 font-sans">
                    <Code2Icon className="size-3 text-primary" />
                    SnippetVault
                  </span>
                  <span>{lines.length} lines</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8"
              onClick={handleCopyPng}
              disabled={isExporting}
            >
              {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5" />}
              Copy PNG Image
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8"
              onClick={handleDownloadSvg}
              disabled={isExporting}
            >
              <DownloadIcon className="size-3.5" />
              Download SVG
            </Button>

            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700"
              onClick={handleDownloadPng}
              disabled={isExporting}
            >
              <DownloadIcon className="size-3.5" />
              Download PNG
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

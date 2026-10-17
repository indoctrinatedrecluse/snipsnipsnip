import { useState } from "react";
import {
  SparklesIcon,
  BotIcon,
  Settings2Icon,
  KeyIcon,
  CheckIcon,
  CopyIcon,
  RotateCwIcon,
  ArrowRightIcon,
  FileCodeIcon,
  PlusIcon,
  HelpCircleIcon,
  FileTextIcon,
  TestTube2Icon,
  RepeatIcon,
  ShieldCheckIcon,
  Trash2Icon,
  Wand2Icon,
  MessageSquareCodeIcon,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  executeAiAction,
  type AiActionType,
  type AiProvider,
} from "@/lib/ai/ai-service";
import { useSettingsStore } from "@/stores/settings-store";
import { useSnippetStore } from "@/stores/snippet-store";
import type { Snippet } from "@/types/snippet";
import { LANGUAGE_OPTIONS } from "@/lib/languages";

interface AiActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippet: Snippet;
}

export function AiActionsDialog({
  open,
  onOpenChange,
  snippet,
}: AiActionsDialogProps) {
  const aiSettings = useSettingsStore((s) => s.aiSettings);
  const setAiSettings = useSettingsStore((s) => s.setAiSettings);
  const clearApiKeys = useSettingsStore((s) => s.clearApiKeys);

  const updateSnippet = useSnippetStore((s) => s.updateSnippet);
  const addSnippetFile = useSnippetStore((s) => s.addSnippetFile);
  const addHistorySnapshot = useSnippetStore((s) => s.addHistorySnapshot);

  const [selectedAction, setSelectedAction] = useState<AiActionType>("explain");
  const [customPrompt, setCustomPrompt] = useState("");
  const [targetLang, setTargetLang] = useState("typescript");
  const [showConfig, setShowConfig] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [resultText, setResultText] = useState("");
  const [extractedCode, setExtractedCode] = useState<string | undefined>();
  const [explanation, setExplanation] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  // Active provider credentials from store
  const provider = aiSettings.provider;
  const currentKey =
    provider === "gemini"
      ? aiSettings.geminiApiKey
      : provider === "claude"
        ? aiSettings.claudeApiKey
        : provider === "deepseek"
          ? aiSettings.deepseekApiKey
          : provider === "openai"
            ? aiSettings.openaiApiKey
            : aiSettings.customApiKey;

  const currentModel =
    provider === "gemini"
      ? aiSettings.geminiModel
      : provider === "claude"
        ? aiSettings.claudeModel
        : provider === "deepseek"
          ? aiSettings.deepseekModel
          : provider === "openai"
            ? aiSettings.openaiModel
            : aiSettings.customModel;

  const handleRunAi = async () => {
    if (provider !== "custom" && !currentKey) {
      setShowConfig(true);
      toast.error(`Please provide an API key for ${provider.toUpperCase()}`);
      return;
    }

    setIsGenerating(true);
    setResultText("");
    setExtractedCode(undefined);
    setExplanation(undefined);

    try {
      const res = await executeAiAction({
        action: selectedAction,
        code: snippet.code,
        language: snippet.language,
        customInstruction: customPrompt,
        targetLanguage: targetLang,
        config: {
          provider,
          apiKey: currentKey,
          model: currentModel,
          baseUrl: aiSettings.customBaseUrl,
        },
      });

      setResultText(res.fullText);
      setExtractedCode(res.extractedCode);
      setExplanation(res.explanation);
      toast.success("AI Generation complete");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "AI Action failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReplaceCode = () => {
    if (!extractedCode) return;
    addHistorySnapshot(snippet.id, `Before AI: ${selectedAction}`);
    updateSnippet(snippet.id, {
      code: extractedCode,
      language: selectedAction === "convert" ? targetLang : snippet.language,
    });
    toast.success("Replaced snippet code with AI output");
    onOpenChange(false);
  };

  const handleAddNewTab = () => {
    if (!extractedCode) return;
    const ext = selectedAction === "tests" ? ".test.ts" : selectedAction === "types" ? ".d.ts" : ".txt";
    const fileName = `${snippet.title ? snippet.title.toLowerCase().replace(/\s+/g, "-") : "ai-output"}${ext}`;
    addSnippetFile(
      snippet.id,
      fileName,
      extractedCode,
      selectedAction === "convert" ? targetLang : snippet.language,
    );
    toast.success(`Created new file tab: ${fileName}`);
    onOpenChange(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(extractedCode || resultText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <SparklesIcon className="size-5 text-indigo-500 animate-pulse" />
              Smart AI Code Actions
            </DialogTitle>
            <DialogDescription className="text-xs">
              Refactor, explain, generate types, docstrings or tests using your own AI provider (BYOK).
            </DialogDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowConfig(!showConfig)}
          >
            <Settings2Icon className="size-3.5" />
            {provider.toUpperCase()} Settings
          </Button>
        </DialogHeader>

        {/* BYOK Provider Settings Drawer */}
        {showConfig && (
          <div className="p-4 rounded-lg border bg-muted/30 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <BotIcon className="size-4 text-primary" />
                AI Provider Configuration (BYOK)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Keys stored securely on your local device only
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">
                  Active Provider
                </label>
                <Select
                  value={aiSettings.provider}
                  onValueChange={(val) =>
                    setAiSettings({ provider: val as AiProvider })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="claude">Anthropic Claude</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="custom">OpenAI-Compatible (Ollama/Local)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">
                  Model Name
                </label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={currentModel}
                  onChange={(e) => {
                    const key = `${provider}Model` as keyof typeof aiSettings;
                    setAiSettings({ [key]: e.target.value });
                  }}
                  placeholder="e.g. gemini-2.5-flash / deepseek-chat"
                />
              </div>
            </div>

            {provider === "custom" && (
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">
                  Custom Base URL
                </label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={aiSettings.customBaseUrl}
                  onChange={(e) =>
                    setAiSettings({ customBaseUrl: e.target.value })
                  }
                  placeholder="http://localhost:11434/v1 or https://openrouter.ai/api/v1"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <KeyIcon className="size-3" />
                  {provider.toUpperCase()} API Key
                </label>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheckIcon className="size-3" />
                  <span>AES-256 Encrypted on Device</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  className="h-8 text-xs font-mono flex-1"
                  value={currentKey}
                  onChange={(e) => {
                    const key = `${provider}ApiKey` as keyof typeof aiSettings;
                    setAiSettings({ [key]: e.target.value });
                  }}
                  placeholder={`Enter your ${provider.toUpperCase()} API key`}
                />
                {currentKey && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px] gap-1 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      clearApiKeys();
                      toast.success("Purged all stored API keys from device");
                    }}
                    title="Purge stored keys from device"
                  >
                    <Trash2Icon className="size-3" />
                    Purge
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Selection Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <ActionPill
            icon={<HelpCircleIcon className="size-3.5 text-blue-500" />}
            label="Explain Code"
            active={selectedAction === "explain"}
            onClick={() => setSelectedAction("explain")}
          />
          <ActionPill
            icon={<FileCodeIcon className="size-3.5 text-emerald-500" />}
            label="Generate Types"
            active={selectedAction === "types"}
            onClick={() => setSelectedAction("types")}
          />
          <ActionPill
            icon={<FileTextIcon className="size-3.5 text-amber-500" />}
            label="Docstrings / JSDoc"
            active={selectedAction === "docs"}
            onClick={() => setSelectedAction("docs")}
          />
          <ActionPill
            icon={<TestTube2Icon className="size-3.5 text-purple-500" />}
            label="Generate Tests"
            active={selectedAction === "tests"}
            onClick={() => setSelectedAction("tests")}
          />
          <ActionPill
            icon={<RepeatIcon className="size-3.5 text-cyan-500" />}
            label="Convert Language"
            active={selectedAction === "convert"}
            onClick={() => setSelectedAction("convert")}
          />
          <ActionPill
            icon={<Wand2Icon className="size-3.5 text-pink-500" />}
            label="Refactor & Optimize"
            active={selectedAction === "refactor"}
            onClick={() => setSelectedAction("refactor")}
          />
          <ActionPill
            icon={<MessageSquareCodeIcon className="size-3.5 text-indigo-500" />}
            label="Custom Instruction"
            active={selectedAction === "custom"}
            onClick={() => setSelectedAction("custom")}
          />
        </div>

        {/* Context inputs for Convert or Custom */}
        {selectedAction === "convert" && (
          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-muted-foreground whitespace-nowrap">
              Convert target language:
            </span>
            <Select
              value={targetLang}
              onValueChange={(val) => {
                if (val) setTargetLang(val);
              }}
            >
              <SelectTrigger className="h-8 text-xs max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedAction === "custom" && (
          <div className="pt-1">
            <Textarea
              placeholder="e.g. Add dark mode support, make this function concurrent, or rewrite using reactive streams..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="h-16 text-xs resize-none"
            />
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 min-h-[220px] rounded-lg border bg-muted/20 flex flex-col overflow-hidden mt-2">
          {resultText ? (
            <ScrollArea className="flex-1 p-3 font-mono text-xs">
              {explanation && (
                <div className="text-muted-foreground font-sans text-xs mb-3 whitespace-pre-wrap border-b pb-2">
                  {explanation}
                </div>
              )}
              {extractedCode ? (
                <pre className="p-3 rounded bg-zinc-900 text-zinc-100 overflow-x-auto text-xs leading-relaxed">
                  <code>{extractedCode}</code>
                </pre>
              ) : (
                <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                  {resultText}
                </div>
              )}
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
              <BotIcon className="size-8 opacity-40 text-primary" />
              <div className="text-xs font-medium">Ready to process snippet</div>
              <div className="text-[11px] max-w-sm">
                Click &ldquo;Generate with AI&rdquo; to run{" "}
                <span className="text-foreground font-semibold">
                  {selectedAction}
                </span>{" "}
                using <span className="font-semibold">{provider.toUpperCase()}</span>.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3 mt-2">
          <Button
            size="sm"
            onClick={handleRunAi}
            disabled={isGenerating}
            className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
          >
            {isGenerating ? (
              <RotateCwIcon className="size-4 animate-spin" />
            ) : (
              <SparklesIcon className="size-4" />
            )}
            {isGenerating ? "Processing..." : "Generate with AI"}
          </Button>

          <div className="flex items-center gap-2">
            {resultText && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-8"
                onClick={handleCopy}
              >
                {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                Copy
              </Button>
            )}

            {extractedCode && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8"
                  onClick={handleAddNewTab}
                >
                  <PlusIcon className="size-3.5" />
                  Add as File Tab
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5 text-xs h-8"
                  onClick={handleReplaceCode}
                >
                  <ArrowRightIcon className="size-3.5" />
                  Replace Code
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActionPill({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-all text-left ${
        active
          ? "border-primary bg-primary/10 text-primary shadow-xs"
          : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

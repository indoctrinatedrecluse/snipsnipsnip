import { useState } from "react";
import {
  CameraIcon,
  CheckIcon,
  CopyIcon,
  CopyPlusIcon,
  EyeIcon,
  HistoryIcon,
  LockIcon,
  PencilIcon,
  PlayIcon,
  RotateCcwIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
  UnlockIcon,
  VariableIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AiActionsDialog } from "@/components/ai/AiActionsDialog";
import { TextExpanderDialog } from "@/components/expander/TextExpanderDialog";
import { VaultDialog } from "@/components/vault/VaultDialog";
import { CodeCardDialog } from "@/components/snippets/CodeCardDialog";
import { GistDialog } from "@/components/snippets/GistDialog";
import { TemplateFillDialog } from "@/components/snippets/TemplateFillDialog";
import { VersionHistoryDialog } from "@/components/snippets/VersionHistoryDialog";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/ui/github-icon";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import { hasPlaceholders } from "@/lib/templates";
import { useSnippetStore } from "@/stores/snippet-store";

export type EditorMode = "edit" | "preview";

interface ToolbarProps {
  snippetId: string;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  showSandbox?: boolean;
  onToggleSandbox?: () => void;
}

export function Toolbar({
  snippetId,
  mode,
  onModeChange,
  showSandbox,
  onToggleSandbox,
}: ToolbarProps) {
  const snippet = useSnippetStore((store) =>
    store.snippets.find((item) => item.id === snippetId),
  );
  const updateSnippet = useSnippetStore((store) => store.updateSnippet);
  const moveToTrash = useSnippetStore((store) => store.moveToTrash);
  const restoreSnippet = useSnippetStore((store) => store.restoreSnippet);
  const deleteSnippet = useSnippetStore((store) => store.deleteSnippet);
  const duplicateSnippet = useSnippetStore((store) => store.duplicateSnippet);
  const toggleFavorite = useSnippetStore((store) => store.toggleFavorite);
  const setActive = useSnippetStore((store) => store.setActive);

  const [copied, setCopied] = useState(false);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [gistDialogOpen, setGistDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [expanderDialogOpen, setExpanderDialogOpen] = useState(false);
  const [vaultDialogOpen, setVaultDialogOpen] = useState(false);
  const [codeCardDialogOpen, setCodeCardDialogOpen] = useState(false);

  if (!snippet) return null;

  const isTrashed = Boolean(snippet.deletedAt);
  const hasVars = hasPlaceholders(snippet.code);

  const handleCopy = async () => {
    if (hasVars) {
      setTemplateDialogOpen(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleMoveToTrash = () => {
    const id = snippet.id;
    moveToTrash(id);
    toast("Moved snippet to Trash", {
      action: {
        label: "Undo",
        onClick: () => {
          restoreSnippet(id);
          setActive(id);
        },
      },
    });
  };

  const handlePermanentDelete = () => {
    deleteSnippet(snippet.id);
    setConfirmPermanentDelete(false);
    toast.success("Snippet permanently deleted");
  };

  const handleDuplicate = () => {
    const id = duplicateSnippet(snippet.id);
    if (id) {
      setActive(id);
      toast.success("Snippet duplicated");
    }
  };

  return (
    <div className="flex items-center gap-1 border-b px-4 py-2">
      <ToolbarButton
        label={mode === "edit" ? "Preview" : "Edit"}
        onClick={() => onModeChange(mode === "edit" ? "preview" : "edit")}
      >
        {mode === "edit" ? <EyeIcon /> : <PencilIcon />}
      </ToolbarButton>

      {onToggleSandbox && (
        <ToolbarButton
          label={showSandbox ? "Hide Sandbox Runner (Ctrl+Enter)" : "Run / Sandbox (Ctrl+Enter)"}
          onClick={onToggleSandbox}
          className={showSandbox ? "text-primary bg-primary/10" : "text-emerald-500 hover:text-emerald-600"}
        >
          <PlayIcon className="fill-current" />
        </ToolbarButton>
      )}

      <ToolbarButton
        label={hasVars ? "Fill variables & copy" : "Copy code (Ctrl+Shift+C)"}
        onClick={() => void handleCopy()}
      >
        {copied ? (
          <CheckIcon />
        ) : hasVars ? (
          <VariableIcon className="text-primary" />
        ) : (
          <CopyIcon />
        )}
      </ToolbarButton>

      {hasVars && (
        <ToolbarButton
          label="Fill template placeholders"
          onClick={() => setTemplateDialogOpen(true)}
          className="text-primary"
        >
          <VariableIcon />
        </ToolbarButton>
      )}

      <ToolbarButton label="Duplicate" onClick={handleDuplicate}>
        <CopyPlusIcon />
      </ToolbarButton>

      <ToolbarButton
        label={snippet.isFavorite ? "Unfavorite" : "Favorite"}
        onClick={() => toggleFavorite(snippet.id)}
      >
        <StarIcon
          className={snippet.isFavorite ? "fill-amber-400 text-amber-400" : ""}
        />
      </ToolbarButton>

      <ToolbarButton
        label="Share to GitHub Gist"
        onClick={() => setGistDialogOpen(true)}
      >
        <GitHubIcon />
      </ToolbarButton>

      <ToolbarButton
        label="Version history & diff"
        onClick={() => setHistoryDialogOpen(true)}
      >
        <HistoryIcon />
      </ToolbarButton>

      <ToolbarButton
        label="Smart AI Actions (BYOK)"
        onClick={() => setAiDialogOpen(true)}
        className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10"
      >
        <SparklesIcon />
      </ToolbarButton>

      <ToolbarButton
        label="Text Expander & Triggers"
        onClick={() => setExpanderDialogOpen(true)}
        className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
      >
        <ZapIcon />
      </ToolbarButton>

      <ToolbarButton
        label={snippet.isEncrypted ? "Encrypted Vault (Click to unlock)" : "Encrypt snippet (AES-GCM-256)"}
        onClick={() => setVaultDialogOpen(true)}
        className={snippet.isEncrypted ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:text-foreground"}
      >
        {snippet.isEncrypted ? <LockIcon /> : <UnlockIcon />}
      </ToolbarButton>

      <ToolbarButton
        label="Export Carbon-style Code Card"
        onClick={() => setCodeCardDialogOpen(true)}
        className="text-pink-500 hover:text-pink-600 hover:bg-pink-500/10"
      >
        <CameraIcon />
      </ToolbarButton>

      <div className="ml-auto flex items-center gap-2">
        <Select
          value={snippet.language}
          onValueChange={(language) => {
            if (language) updateSnippet(snippet.id, { language });
          }}
        >
          <SelectTrigger aria-label="Language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {LANGUAGE_OPTIONS.map((language) => (
              <SelectItem key={language.id} value={language.id}>
                {language.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isTrashed ? (
          <div className="flex items-center gap-1">
            <ToolbarButton
              label="Restore from Trash"
              onClick={() => {
                restoreSnippet(snippet.id);
                toast.success("Snippet restored");
              }}
            >
              <RotateCcwIcon />
            </ToolbarButton>
            <ToolbarButton
              label="Permanently delete"
              onClick={() => setConfirmPermanentDelete(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2Icon />
            </ToolbarButton>
          </div>
        ) : (
          <ToolbarButton
            label="Move to Trash"
            onClick={handleMoveToTrash}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2Icon />
          </ToolbarButton>
        )}
      </div>

      <Dialog
        open={confirmPermanentDelete}
        onOpenChange={setConfirmPermanentDelete}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete snippet?</DialogTitle>
            <DialogDescription>
              “{snippet.title || "Untitled snippet"}” will be permanently removed.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmPermanentDelete(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handlePermanentDelete}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplateFillDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        title={snippet.title}
        code={snippet.code}
      />

      <GistDialog
        open={gistDialogOpen}
        onOpenChange={setGistDialogOpen}
        snippet={snippet}
        mode="publish"
      />

      <VersionHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        snippet={snippet}
      />

      <AiActionsDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        snippet={snippet}
      />

      <TextExpanderDialog
        open={expanderDialogOpen}
        onOpenChange={setExpanderDialogOpen}
      />

      <VaultDialog
        open={vaultDialogOpen}
        onOpenChange={setVaultDialogOpen}
        snippet={snippet}
      />

      <CodeCardDialog
        open={codeCardDialogOpen}
        onOpenChange={setCodeCardDialogOpen}
        snippet={snippet}
      />
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button size="icon-sm" variant="ghost" className={className} />}
        onClick={onClick}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

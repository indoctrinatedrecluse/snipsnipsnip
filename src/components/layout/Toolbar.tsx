import { useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  CopyPlusIcon,
  EyeIcon,
  PencilIcon,
  StarIcon,
  Trash2Icon,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import { useSnippetStore } from "@/stores/snippet-store";

export type EditorMode = "edit" | "preview";

interface ToolbarProps {
  snippetId: string;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

export function Toolbar({ snippetId, mode, onModeChange }: ToolbarProps) {
  const snippet = useSnippetStore((store) =>
    store.snippets.find((item) => item.id === snippetId),
  );
  const updateSnippet = useSnippetStore((store) => store.updateSnippet);
  const deleteSnippet = useSnippetStore((store) => store.deleteSnippet);
  const duplicateSnippet = useSnippetStore((store) => store.duplicateSnippet);
  const toggleFavorite = useSnippetStore((store) => store.toggleFavorite);
  const setActive = useSnippetStore((store) => store.setActive);

  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!snippet) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDelete = () => {
    deleteSnippet(snippet.id);
    setConfirmOpen(false);
    toast.success("Snippet deleted");
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

      <ToolbarButton
        label="Copy code (Ctrl+Shift+C)"
        onClick={() => void handleCopy()}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </ToolbarButton>

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

        <ToolbarButton
          label="Delete snippet"
          onClick={() => setConfirmOpen(true)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon />
        </ToolbarButton>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete snippet?</DialogTitle>
            <DialogDescription>
              “{snippet.title || "Untitled snippet"}” will be permanently
              removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

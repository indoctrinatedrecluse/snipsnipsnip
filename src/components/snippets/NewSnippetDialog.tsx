import { useEffect, useState } from "react";
import { toast } from "sonner";

import { TagInput } from "@/components/snippets/TagInput";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  LANGUAGE_OPTIONS,
  detectLanguageFromCode,
  detectLanguageFromFilename,
} from "@/lib/languages";
import { useSnippetStore } from "@/stores/snippet-store";

interface NewSnippetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewSnippetDialog({
  open,
  onOpenChange,
}: NewSnippetDialogProps) {
  const addSnippet = useSnippetStore((store) => store.addSnippet);
  const setActive = useSnippetStore((store) => store.setActive);
  const selectedFolder = useSnippetStore((store) => store.selectedFolder);
  const folders = useSnippetStore((store) => store.folders);

  const [title, setTitle] = useState("Untitled snippet");
  const [language, setLanguage] = useState("plaintext");
  const [userSelectedLanguage, setUserSelectedLanguage] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [folder, setFolder] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setFolder(selectedFolder ?? undefined);
    }
  }, [open, selectedFolder]);

  const reset = () => {
    setTitle("Untitled snippet");
    setLanguage("plaintext");
    setUserSelectedLanguage(false);
    setTags([]);
    setCode("");
    setFolder(undefined);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!userSelectedLanguage) {
      const detected = detectLanguageFromFilename(newTitle);
      if (detected) {
        setLanguage(detected);
      }
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (!userSelectedLanguage) {
      const detectedFromTitle = detectLanguageFromFilename(title);
      if (!detectedFromTitle) {
        const detected = detectLanguageFromCode(newCode);
        if (detected) {
          setLanguage(detected);
        }
      }
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleCreate = () => {
    const id = addSnippet({
      title,
      language,
      tags,
      code,
      folder: folder || undefined,
    });
    setActive(id);
    reset();
    onOpenChange(false);
    toast.success("Snippet created");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New snippet</DialogTitle>
          <DialogDescription>
            Give it a title and a language — you can change everything later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-title">Title</Label>
            <Input
              id="new-title"
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-language">Language</Label>
              <Select
                value={language}
                onValueChange={(value) => {
                  setUserSelectedLanguage(true);
                  setLanguage(value ?? "plaintext");
                }}
              >
                <SelectTrigger id="new-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-folder">Collection</Label>
              <Select
                value={folder ?? "none"}
                onValueChange={(val) =>
                  setFolder(val && val !== "none" ? val : undefined)
                }
              >
                <SelectTrigger id="new-folder" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Unfiled)</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-code">Code (optional)</Label>
            <Textarea
              id="new-code"
              value={code}
              onChange={(event) => handleCodeChange(event.target.value)}
              placeholder="Paste some starter code..."
              className="min-h-24 font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-tags">Tags</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="react, hooks, demo…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim()}>
            Create snippet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

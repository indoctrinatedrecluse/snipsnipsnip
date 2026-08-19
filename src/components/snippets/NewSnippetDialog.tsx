import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
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

  const [title, setTitle] = useState("Untitled snippet");
  const [language, setLanguage] = useState("plaintext");
  const [code, setCode] = useState("");

  const reset = () => {
    setTitle("Untitled snippet");
    setLanguage("plaintext");
    setCode("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleCreate = () => {
    const id = addSnippet({ title, language, code });
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
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-language">Language</Label>
            <Select
              value={language}
              onValueChange={(value) => setLanguage(value ?? "plaintext")}
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
            <Label htmlFor="new-code">Code (optional)</Label>
            <Textarea
              id="new-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Paste some starter code..."
              className="min-h-24 font-mono text-sm"
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

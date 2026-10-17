import { useState } from "react";
import { ExternalLinkIcon, Loader2Icon } from "lucide-react";
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
import { GitHubIcon } from "@/components/ui/github-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importFromGist, publishToGist } from "@/lib/gist";
import { useSnippetStore } from "@/stores/snippet-store";
import type { Snippet } from "@/types/snippet";

interface GistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippet?: Snippet | null;
  mode: "publish" | "import";
}

const GITHUB_TOKEN_KEY = "snippetvault.github_token";

export function GistDialog({
  open,
  onOpenChange,
  snippet,
  mode,
}: GistDialogProps) {
  const addSnippet = useSnippetStore((store) => store.addSnippet);
  const setActive = useSnippetStore((store) => store.setActive);

  const [token, setToken] = useState(() => localStorage.getItem(GITHUB_TOKEN_KEY) ?? "");
  const [isPublic, setIsPublic] = useState(false);
  const [gistInput, setGistInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const handleSaveToken = (val: string) => {
    setToken(val);
    if (val.trim()) {
      localStorage.setItem(GITHUB_TOKEN_KEY, val.trim());
    } else {
      localStorage.removeItem(GITHUB_TOKEN_KEY);
    }
  };

  const handlePublish = async () => {
    if (!snippet) return;
    if (!token.trim()) {
      toast.error("A GitHub Personal Access Token is required to create a Gist.");
      return;
    }

    setLoading(true);
    try {
      const result = await publishToGist({
        snippet,
        isPublic,
        token,
      });
      setCreatedUrl(result.htmlUrl);
      toast.success("Published to GitHub Gist!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish Gist.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!gistInput.trim()) return;

    setLoading(true);
    try {
      const imported = await importFromGist(gistInput, token);
      const id = addSnippet({
        title: imported.title,
        description: imported.description,
        code: imported.code,
        language: imported.language,
        tags: ["gist"],
        files: imported.files,
      });
      setActive(id);
      toast.success("Snippet imported from GitHub Gist!");
      onOpenChange(false);
      setGistInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import Gist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setCreatedUrl(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitHubIcon className="size-5" />
            {mode === "publish" ? "Publish to GitHub Gist" : "Import from GitHub Gist"}
          </DialogTitle>
          <DialogDescription>
            {mode === "publish"
              ? "Share this snippet as a public or secret GitHub Gist."
              : "Paste a GitHub Gist URL or ID to load it into your library."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {mode === "publish" ? (
            createdUrl ? (
              <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Your Gist is live at:</p>
                <div className="flex items-center gap-2">
                  <Input value={createdUrl} readOnly className="font-mono text-xs" />
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(createdUrl);
                      toast.success("Gist URL copied");
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <a
                  href={createdUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary underline"
                >
                  Open in Browser <ExternalLinkIcon className="size-3" />
                </a>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="gh-token">GitHub Token (classic or fine-grained)</Label>
                  <Input
                    id="gh-token"
                    type="password"
                    placeholder="ghp_..."
                    value={token}
                    onChange={(e) => handleSaveToken(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Requires the <code className="rounded bg-muted px-1">gist</code> scope. Saved locally on your device.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="gist-public"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="size-4 rounded border-gray-300 accent-primary"
                  />
                  <Label htmlFor="gist-public" className="cursor-pointer text-xs">
                    Make this Gist public (anyone can discover it)
                  </Label>
                </div>
              </>
            )
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="gist-id">Gist URL or ID</Label>
                <Input
                  id="gist-id"
                  placeholder="https://gist.github.com/..."
                  value={gistInput}
                  onChange={(e) => setGistInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gh-token-import">GitHub Token (optional, for secret gists)</Label>
                <Input
                  id="gh-token-import"
                  type="password"
                  placeholder="ghp_..."
                  value={token}
                  onChange={(e) => handleSaveToken(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!createdUrl && (
            <Button
              onClick={mode === "publish" ? handlePublish : handleImport}
              disabled={loading || (mode === "import" && !gistInput.trim())}
              className="gap-2"
            >
              {loading && <Loader2Icon className="size-4 animate-spin" />}
              {mode === "publish" ? "Publish Gist" : "Import Snippet"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

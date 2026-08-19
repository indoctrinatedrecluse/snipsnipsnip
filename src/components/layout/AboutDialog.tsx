import { ExternalLinkIcon, GlobeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_VERSION,
  AUTHOR,
  AUTHOR_ROLE,
  githubUrl,
  portfolioUrl,
} from "@/lib/about";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary font-mono text-lg font-bold text-primary-foreground">
              {"</>"}
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                {APP_NAME}
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                  v{APP_VERSION}
                </span>
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {APP_DESCRIPTION}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{AUTHOR_ROLE}</span>
            <span className="font-medium">{AUTHOR}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">License</span>
            <span className="font-medium">MIT</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Technology</span>
            <span className="font-medium">React · Tauri · Shiki</span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <a
            href={githubUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ExternalLinkIcon className="size-4" />
            GitHub
          </a>
          <a
            href={portfolioUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <GlobeIcon className="size-4" />
            Portfolio
          </a>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

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

interface GoToLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineCount: number;
  onGo: (line: number) => void;
}

export function GoToLineDialog({
  open,
  onOpenChange,
  lineCount,
  onGo,
}: GoToLineDialogProps) {
  const [value, setValue] = useState("1");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("1");
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [open]);

  const handleSubmit = () => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    onGo(parsed);
    onOpenChange(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Go to line</DialogTitle>
          <DialogDescription>
            Enter a line number between 1 and {lineCount}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="go-to-line">Line number</Label>
          <Input
            id="go-to-line"
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Go</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

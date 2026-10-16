import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, VariableIcon } from "lucide-react";
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
  extractPlaceholders,
  getAutoValue,
  resolveTemplate,
  type TemplateVariable,
} from "@/lib/templates";

interface TemplateFillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  code: string;
}

export function TemplateFillDialog({
  open,
  onOpenChange,
  title,
  code,
}: TemplateFillDialogProps) {
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const extracted = extractPlaceholders(code);
    setVariables(extracted);

    const initialValues: Record<string, string> = {};
    for (const v of extracted) {
      if (v.isAuto) {
        initialValues[v.name] = getAutoValue(v.name);
      } else if (v.defaultValue !== undefined) {
        initialValues[v.name] = v.defaultValue;
      } else {
        initialValues[v.name] = "";
      }
    }
    setValues(initialValues);
    setCopied(false);
  }, [open, code]);

  const customVariables = variables.filter((v) => !v.isAuto);
  const resolvedCode = resolveTemplate(code, values);

  const handleCopyResolved = async () => {
    try {
      await navigator.clipboard.writeText(resolvedCode);
      setCopied(true);
      toast.success("Resolved code copied to clipboard");
      setTimeout(() => {
        setCopied(false);
        onOpenChange(false);
      }, 700);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCopyRaw = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Raw template copied to clipboard");
      onOpenChange(false);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <VariableIcon className="size-5 text-primary" />
            Fill Template Variables
          </DialogTitle>
          <DialogDescription>
            “{title || "Untitled"}” has dynamic placeholders. Fill them in to generate customized code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {customVariables.length > 0 ? (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {customVariables.map((v) => (
                <div key={v.name} className="space-y-1">
                  <Label htmlFor={`var-${v.name}`} className="font-mono text-xs">
                    {`{{${v.name}}}`}
                  </Label>
                  <Input
                    id={`var-${v.name}`}
                    value={values[v.name] ?? ""}
                    placeholder={v.defaultValue ?? `Value for ${v.name}`}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              All placeholders will be automatically filled with date, time, or system tokens.
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <pre className="max-h-36 overflow-auto rounded-md bg-muted p-2.5 font-mono text-xs whitespace-pre">
              {resolvedCode}
            </pre>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={handleCopyRaw}>
            Copy Raw
          </Button>
          <Button onClick={handleCopyResolved} className="gap-1.5">
            {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            Copy Resolved Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

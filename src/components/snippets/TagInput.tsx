import { useState, type KeyboardEvent } from "react";
import { XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MAX_TAG_LENGTH, normalizeTag } from "@/lib/tags";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Badge-style tag editor: type a tag and press Enter or comma to add it,
 * click the × to remove, or press Backspace on an empty input to remove
 * the last tag. Tags are normalized and de-duplicated.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const tag = normalizeTag(draft);
    setDraft("");
    if (!tag) return;
    if (value.some((existing) => existing === tag)) return;
    onChange([...value, tag]);
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((existing) => existing !== tag));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            disabled={disabled}
            aria-label={`Remove tag ${tag}`}
            className="rounded-full p-0.5 transition-colors hover:bg-destructive/20 hover:text-destructive"
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        disabled={disabled}
        maxLength={MAX_TAG_LENGTH}
        placeholder={value.length === 0 ? (placeholder ?? "Add tags…") : undefined}
        aria-label="Add tag"
        className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

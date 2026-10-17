import { useState } from "react";
import {
  ShieldLockIcon,
  KeyRoundIcon,
  UnlockIcon,
  LockIcon,
  AlertTriangleIcon,
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
  encryptSnippetContent,
  decryptSnippetContent,
} from "@/lib/crypto/vault-crypto";
import { useSnippetStore } from "@/stores/snippet-store";
import type { Snippet } from "@/types/snippet";

interface VaultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippet: Snippet;
}

export function VaultDialog({
  open,
  onOpenChange,
  snippet,
}: VaultDialogProps) {
  const updateSnippet = useSnippetStore((s) => s.updateSnippet);
  const addHistorySnapshot = useSnippetStore((s) => s.addHistorySnapshot);

  const isEncrypted = Boolean(snippet.isEncrypted && snippet.encryptedPayload);

  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEncrypt = async () => {
    if (!passphrase.trim()) {
      toast.error("Please enter a passphrase");
      return;
    }
    if (passphrase !== confirmPassphrase) {
      toast.error("Passphrases do not match");
      return;
    }

    setIsProcessing(true);
    try {
      addHistorySnapshot(snippet.id, "Before encryption");
      const encrypted = await encryptSnippetContent(snippet.code, passphrase);
      updateSnippet(snippet.id, {
        isEncrypted: true,
        encryptedPayload: encrypted,
        code: "[Locked with AES-GCM-256 Vault Encryption]",
      });
      toast.success("Snippet successfully encrypted with AES-256");
      setPassphrase("");
      setConfirmPassphrase("");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to encrypt snippet");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlock = async (permanent = false) => {
    if (!passphrase.trim()) {
      toast.error("Please enter the passphrase");
      return;
    }
    if (!snippet.encryptedPayload) {
      toast.error("No encrypted payload found");
      return;
    }

    setIsProcessing(true);
    try {
      const decrypted = await decryptSnippetContent(
        snippet.encryptedPayload,
        passphrase,
      );

      if (permanent) {
        updateSnippet(snippet.id, {
          isEncrypted: false,
          encryptedPayload: undefined,
          code: decrypted,
        });
        toast.success("Snippet unlocked and encryption removed");
      } else {
        updateSnippet(snippet.id, {
          code: decrypted,
        });
        toast.success("Snippet temporarily unlocked for editing");
      }

      setPassphrase("");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Incorrect passphrase");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <ShieldLockIcon className="size-5 text-amber-500" />
            {isEncrypted ? "Unlock Encrypted Snippet" : "Encrypt with Zero-Knowledge Vault"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEncrypted
              ? "Enter your passphrase to decrypt and access this snippet."
              : "Protect secret keys and sensitive credentials with client-side AES-GCM-256 & PBKDF2 encryption."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          {!isEncrypted && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
              <span>
                Zero-knowledge encryption cannot be recovered if you forget your passphrase. Write it down safely.
              </span>
            </div>
          )}

          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block flex items-center gap-1 font-medium">
              <KeyRoundIcon className="size-3" />
              Passphrase
            </label>
            <Input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase"
              className="h-8 text-xs font-mono"
            />
          </div>

          {!isEncrypted && (
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block font-medium">
                Confirm Passphrase
              </label>
              <Input
                type="password"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Confirm passphrase"
                className="h-8 text-xs font-mono"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          {isEncrypted ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={isProcessing}
                onClick={() => handleUnlock(true)}
              >
                <UnlockIcon className="size-3.5" />
                Remove Encryption
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                disabled={isProcessing}
                onClick={() => handleUnlock(false)}
              >
                <KeyRoundIcon className="size-3.5" />
                Unlock
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
              disabled={isProcessing}
              onClick={handleEncrypt}
            >
              <LockIcon className="size-3.5" />
              Encrypt & Lock
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

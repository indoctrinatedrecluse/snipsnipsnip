import {
  CloudAlertIcon,
  CloudCheckIcon,
  CloudIcon,
  CloudOffIcon,
  Loader2Icon,
  LogInIcon,
  LogOutIcon,
  RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/hooks/useRelativeTime";
import { cn } from "@/lib/utils";
import { useSyncStore } from "@/stores/sync-store";

/**
 * Sidebar footer showing Google Drive sync state. Clicking opens a menu with
 * "Sync now" / sign-in / sign-out actions.
 */
export function SyncStatus() {
  const isConfigured = useSyncStore((store) => store.isConfigured);
  const isSignedIn = useSyncStore((store) => store.isSignedIn);
  const isSyncing = useSyncStore((store) => store.isSyncing);
  const lastSyncedAt = useSyncStore((store) => store.lastSyncedAt);
  const error = useSyncStore((store) => store.error);
  const signIn = useSyncStore((store) => store.signIn);
  const signOut = useSyncStore((store) => store.signOut);
  const syncNow = useSyncStore((store) => store.syncNow);

  if (!isConfigured) {
    return (
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() =>
            toast.error(
              "Google Drive sync is not configured. Set VITE_GOOGLE_CLIENT_ID and rebuild.",
            )
          }
        >
          <CloudOffIcon className="size-4 shrink-0" />
          <span className="truncate">Drive sync not configured</span>
        </Button>
      </div>
    );
  }

  const label = isSyncing
    ? "Syncing…"
    : error
      ? "Sync error"
      : isSignedIn
        ? lastSyncedAt
          ? `Synced ${formatRelativeTime(lastSyncedAt)}`
          : "Not synced yet"
        : "Sign in to sync";

  const Icon = isSyncing
    ? Loader2Icon
    : error
      ? CloudAlertIcon
      : isSignedIn
        ? CloudCheckIcon
        : CloudIcon;

  return (
    <div className="border-t p-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
            />
          }
        >
          <Icon
            className={cn(
              "size-4 shrink-0",
              isSyncing && "animate-spin",
              error && "text-destructive",
            )}
          />
          <span className="truncate">{label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          <DropdownMenuLabel>Google Drive sync</DropdownMenuLabel>
          {isSignedIn ? (
            <>
              <DropdownMenuItem
                onClick={() => void syncNow()}
                disabled={isSyncing}
              >
                <RefreshCwIcon />
                Sync now
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void signOut()}>
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={() => void signIn()}>
              <LogInIcon />
              Sign in with Google
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

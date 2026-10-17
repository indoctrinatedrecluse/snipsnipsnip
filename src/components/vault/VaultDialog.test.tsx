import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VaultDialog } from "./VaultDialog";
import type { Snippet } from "@/types/snippet";

const mockSnippet: Snippet = {
  id: "vault-snippet-1",
  title: "API Secret Key",
  description: "Sensitive credential",
  code: "sk_live_1234567890abcdef",
  language: "plaintext",
  tags: ["secrets"],
  createdAt: 0,
  updatedAt: 0,
  isFavorite: false,
};

describe("VaultDialog", () => {
  it("renders encryption form with passphrase inputs", () => {
    const handleOpenChange = vi.fn();
    render(
      <VaultDialog
        open={true}
        onOpenChange={handleOpenChange}
        snippet={mockSnippet}
      />,
    );

    expect(screen.getByText(/Encrypt with Zero-Knowledge Vault/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^Enter passphrase$/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Confirm passphrase/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Encrypt & Lock/i })).toBeInTheDocument();
  });

  it("renders unlock form when snippet is already encrypted", () => {
    const encryptedSnippet: Snippet = {
      ...mockSnippet,
      isEncrypted: true,
      encryptedPayload: {
        ciphertext: "base64==",
        iv: "base64==",
        salt: "base64==",
      },
    };

    const handleOpenChange = vi.fn();
    render(
      <VaultDialog
        open={true}
        onOpenChange={handleOpenChange}
        snippet={encryptedSnippet}
      />,
    );

    expect(screen.getByText(/Unlock Encrypted Snippet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Unlock$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove Encryption/i })).toBeInTheDocument();
  });
});

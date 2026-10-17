import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiActionsDialog } from "./AiActionsDialog";
import type { Snippet } from "@/types/snippet";

const mockSnippet: Snippet = {
  id: "test-ai-snippet",
  title: "Test Snippet",
  description: "Description",
  code: "function add(a, b) { return a + b; }",
  language: "javascript",
  tags: ["math"],
  isFavorite: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe("AiActionsDialog", () => {
  it("renders action buttons, provider settings toggle, and generator button", () => {
    const handleOpenChange = vi.fn();
    render(
      <AiActionsDialog
        open={true}
        onOpenChange={handleOpenChange}
        snippet={mockSnippet}
      />,
    );

    expect(screen.getByText(/Smart AI Code Actions/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Explain Code/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate Types/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Docstrings/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate Tests/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Convert Language/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refactor/i })).toBeInTheDocument();

    // Toggle settings drawer
    const settingsBtn = screen.getByRole("button", { name: /Settings/i });
    fireEvent.click(settingsBtn);
    expect(screen.getByText(/AI Provider Configuration \(BYOK\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Provider/i)).toBeInTheDocument();
  });
});

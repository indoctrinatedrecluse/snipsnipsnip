import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./CommandPalette";
import { useSnippetStore } from "@/stores/snippet-store";

describe("CommandPalette", () => {
  it("renders commands list in command mode and filters by query", () => {
    const handleOpenChange = vi.fn();
    render(
      <CommandPalette
        open={true}
        onOpenChange={handleOpenChange}
        initialMode="commands"
      />,
    );

    expect(screen.getByText("New Snippet")).toBeInTheDocument();
    expect(screen.getByText("Search Snippets & Tags")).toBeInTheDocument();
    expect(screen.getByText("Smart AI Code Actions (BYOK)")).toBeInTheDocument();
    expect(screen.getByText("Toggle Web & Code Sandbox Runner")).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Type a command/i);
    fireEvent.change(input, { target: { value: ">ai" } });

    expect(screen.getByText("Smart AI Code Actions (BYOK)")).toBeInTheDocument();
  });

  it("renders files mode and selects snippet", () => {
    useSnippetStore.setState({
      snippets: [
        {
          id: "palette-snippet-1",
          title: "My React Hook",
          description: "Custom useDebounce hook",
          code: "export function useDebounce() {}",
          language: "typescript",
          tags: ["react"],
          createdAt: 0,
          updatedAt: 0,
          isFavorite: false,
        },
      ],
      activeId: null,
    });

    const handleOpenChange = vi.fn();
    render(
      <CommandPalette
        open={true}
        onOpenChange={handleOpenChange}
        initialMode="files"
      />,
    );

    expect(screen.getByText("My React Hook")).toBeInTheDocument();

    // Click to select
    fireEvent.click(screen.getByText("My React Hook"));
    expect(useSnippetStore.getState().activeId).toBe("palette-snippet-1");
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextExpanderDialog } from "./TextExpanderDialog";
import { useSnippetStore } from "@/stores/snippet-store";

describe("TextExpanderDialog", () => {
  it("renders live playground and matches typed abbreviations", () => {
    // Seed a snippet with a shortcut prefix
    useSnippetStore.setState({
      snippets: [
        {
          id: "exp-1",
          title: "My Date Snippet",
          description: "Expands current date",
          code: "TODAY IS: {{date}}",
          language: "plaintext",
          tags: [],
          createdAt: 0,
          updatedAt: 0,
          isFavorite: false,
          shortcutPrefix: ";td",
          shortcutEnabled: true,
        },
      ],
      activeId: "exp-1",
    });

    const handleOpenChange = vi.fn();
    render(
      <TextExpanderDialog open={true} onOpenChange={handleOpenChange} />,
    );

    expect(screen.getByText(/Text Expansion & Trigger Abbreviations/i)).toBeInTheDocument();
    expect(screen.getByText(";td")).toBeInTheDocument();
    expect(screen.getByText("My Date Snippet")).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Type any configured abbreviation/i);
    // Type abbreviation ";td"
    fireEvent.change(input, { target: { value: "hello ;td" } });

    // It should have expanded to TODAY IS:
    expect((input as HTMLInputElement).value).toContain("hello TODAY IS:");
  });
});

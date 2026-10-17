import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CodeCardDialog } from "./CodeCardDialog";
import type { Snippet } from "@/types/snippet";

const mockSnippet: Snippet = {
  id: "card-snippet-1",
  title: "Binary Search Implementation",
  description: "Standard binary search algorithm",
  code: "function binarySearch(arr, target) {\n  let left = 0;\n  let right = arr.length - 1;\n}",
  language: "javascript",
  tags: ["algorithms"],
  createdAt: 0,
  updatedAt: 0,
  isFavorite: false,
};

describe("CodeCardDialog", () => {
  it("renders code card options, snippet title, and export buttons", () => {
    const handleOpenChange = vi.fn();
    render(
      <CodeCardDialog
        open={true}
        onOpenChange={handleOpenChange}
        snippet={mockSnippet}
      />,
    );

    expect(screen.getByText(/Carbon-Style Code Card Exporter/i)).toBeInTheDocument();
    expect(screen.getByText("Binary Search Implementation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download PNG/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download SVG/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy PNG Image/i })).toBeInTheDocument();

    // Toggle line numbers
    const lineNumBtn = screen.getByRole("button", { name: /Visible/i });
    fireEvent.click(lineNumBtn);
    expect(screen.getByRole("button", { name: /Hidden/i })).toBeInTheDocument();
  });
});

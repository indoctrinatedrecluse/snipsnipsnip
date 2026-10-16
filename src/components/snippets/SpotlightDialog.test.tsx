import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SpotlightDialog } from "./SpotlightDialog";
import { useSnippetStore } from "@/stores/snippet-store";

describe("SpotlightDialog", () => {
  it("renders search input and active snippets", () => {
    useSnippetStore.setState({
      snippets: [
        {
          id: "spotlight-test-1",
          title: "My Special Algorithm",
          code: "function algo() {}",
          language: "typescript",
          description: "Does awesome stuff",
          tags: ["algo"],
          createdAt: 1000,
          updatedAt: 1000,
          isFavorite: false,
        },
      ],
      activeId: null,
      searchQuery: "",
      languageFilter: null,
      viewFilter: "all",
      selectedFolder: null,
      folders: [],
    });

    render(<SpotlightDialog open={true} onOpenChange={() => undefined} />);

    expect(screen.getByPlaceholderText(/Search snippets to copy code/)).toBeInTheDocument();
    expect(screen.getByText("My Special Algorithm")).toBeInTheDocument();
  });
});

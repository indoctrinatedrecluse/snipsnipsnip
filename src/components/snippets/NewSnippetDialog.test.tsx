import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NewSnippetDialog } from "@/components/snippets/NewSnippetDialog";
import { useSnippetStore } from "@/stores/snippet-store";

describe("NewSnippetDialog", () => {
  beforeEach(() => {
    useSnippetStore.setState({
      snippets: [],
      activeId: null,
      searchQuery: "",
      languageFilter: null,
    });
  });

  it("creates a snippet and activates it", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<NewSnippetDialog open onOpenChange={onOpenChange} />);

    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "My first snippet");

    await user.click(screen.getByRole("button", { name: "Create snippet" }));

    const snippets = useSnippetStore.getState().snippets;
    expect(snippets).toHaveLength(1);
    expect(snippets[0].title).toBe("My first snippet");
    expect(useSnippetStore.getState().activeId).toBe(snippets[0].id);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables create while the title is blank", async () => {
    const user = userEvent.setup();
    render(<NewSnippetDialog open onOpenChange={() => undefined} />);
    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    expect(
      screen.getByRole("button", { name: "Create snippet" }),
    ).toBeDisabled();
  });
});

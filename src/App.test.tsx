import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "fake-indexeddb/auto";

import App from "@/App";
import { resetDatabaseForTests } from "@/lib/db";
import { useSnippetStore } from "@/stores/snippet-store";

describe("App", () => {
  it("renders the sidebar and the empty state", async () => {
    useSnippetStore.setState({
      snippets: [],
      activeId: null,
      searchQuery: "",
      languageFilter: null,
    });
    await resetDatabaseForTests();

    render(<App />);

    expect(await screen.findByText("SnippetVault")).toBeInTheDocument();
    expect(screen.getByText("Your snippets live here")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search snippets...")).toBeInTheDocument();
  });

  it("shows a snippet in the editor when one is active", async () => {
    useSnippetStore.setState({
      snippets: [],
      activeId: null,
      searchQuery: "",
      languageFilter: null,
    });
    await resetDatabaseForTests();

    const id = useSnippetStore
      .getState()
      .addSnippet({
        title: "My snippet",
        code: "console.log('hello')",
        language: "javascript",
      });
    useSnippetStore.getState().setActive(id);

    render(<App />);

    expect(await screen.findByText("My snippet")).toBeInTheDocument();
    expect(screen.getByLabelText("Code editor")).toBeInTheDocument();
  });
});

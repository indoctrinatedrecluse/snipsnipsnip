import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "fake-indexeddb/auto";

import App from "@/App";
import { resetDatabaseForTests, setMeta } from "@/lib/db";
import { SEEDED_KEY } from "@/lib/demo-snippets";
import { useSnippetStore } from "@/stores/snippet-store";

function resetState() {
  useSnippetStore.setState({
    snippets: [],
    activeId: null,
    searchQuery: "",
    languageFilter: null,
  });
}

describe("App", () => {
  it("renders the sidebar and the empty state (when seeded)", async () => {
    resetState();
    await resetDatabaseForTests();
    await setMeta(SEEDED_KEY, true);

    render(<App />);

    expect(await screen.findByText("SnippetVault")).toBeInTheDocument();
    expect(screen.getByText("Your snippets live here")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search snippets..."),
    ).toBeInTheDocument();
  });

  it("seeds demo snippets and opens the editor on first run", async () => {
    resetState();
    await resetDatabaseForTests();

    render(<App />);

    expect(
      await screen.findByText("Debounce utility (TypeScript)"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Code editor")).toBeInTheDocument();
  });

  it("shows a snippet in the editor when one is active", async () => {
    resetState();
    await resetDatabaseForTests();
    await setMeta(SEEDED_KEY, true);

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

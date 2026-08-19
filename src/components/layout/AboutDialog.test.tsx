import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AboutDialog } from "@/components/layout/AboutDialog";

describe("AboutDialog", () => {
  it("shows the author and links without exposing raw URLs as text", () => {
    render(<AboutDialog open onOpenChange={() => undefined} />);

    expect(screen.getByText("indoctrinatedrecluse")).toBeInTheDocument();
    expect(screen.getByText("SnippetVault")).toBeInTheDocument();

    const github = screen.getByRole("link", { name: "GitHub" });
    expect(github).toHaveAttribute(
      "href",
      "https://github.com/indoctrinatedrecluse",
    );
    expect(github).toHaveAttribute("target", "_blank");

    const portfolio = screen.getByRole("link", { name: "Portfolio" });
    expect(portfolio).toHaveAttribute(
      "href",
      "https://portfolio-flutter-78bcf.web.app/",
    );

    // The raw addresses must never be visible as text in the UI.
    expect(
      screen.queryByText(/github\.com\/indoctrinatedrecluse/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/portfolio-flutter-78bcf\.web\.app/),
    ).not.toBeInTheDocument();
  });
});

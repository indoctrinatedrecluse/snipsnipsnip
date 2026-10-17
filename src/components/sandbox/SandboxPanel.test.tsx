import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SandboxPanel } from "./SandboxPanel";

describe("SandboxPanel", () => {
  it("renders console and preview tabs and handles tab switching", async () => {
    const handleClose = vi.fn();
    render(
      <SandboxPanel
        files={[]}
        code="console.log('hello from test');"
        language="javascript"
        onClose={handleClose}
      />,
    );

    const consoleTab = screen.getByRole("button", { name: /Console/i });
    const previewTab = screen.getByRole("button", { name: /Web Preview/i });
    expect(consoleTab).toBeInTheDocument();
    expect(previewTab).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Run$/i })).toBeInTheDocument();

    // Switch to preview tab
    fireEvent.click(previewTab);
    expect(screen.getByTitle("Snippet Sandbox Preview")).toBeInTheDocument();

    // Switch back to console
    fireEvent.click(consoleTab);

    // Verify console log appears
    await waitFor(() => {
      expect(screen.getByText("hello from test")).toBeInTheDocument();
    });

    // Close button triggers onClose
    const closeBtn = screen.getByTitle("Close Runner");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

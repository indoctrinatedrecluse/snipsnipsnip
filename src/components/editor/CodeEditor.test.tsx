import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CodeEditor } from "./CodeEditor";

describe("CodeEditor (CodeMirror 6)", () => {
  it("renders with aria-label and displays lines and word counts", () => {
    const onChange = vi.fn();
    render(
      <CodeEditor
        value={"const greeting = 'hello world';\nconsole.log(greeting);"}
        onChange={onChange}
        language="javascript"
        theme="light"
      />,
    );

    // Should find the editor content
    expect(screen.getByLabelText("Code editor")).toBeInTheDocument();

    // Should display line count in footer
    expect(screen.getByText(/2 lines/)).toBeInTheDocument();
    expect(screen.getByText(/Ln 1, Col 1/)).toBeInTheDocument();
  });
});

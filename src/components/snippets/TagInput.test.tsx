import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TagInput } from "@/components/snippets/TagInput";

describe("TagInput", () => {
  it("adds a tag with Enter and normalizes it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);

    const input = screen.getByLabelText("Add tag");
    await user.type(input, "React Hooks");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith(["react-hooks"]);
  });

  it("ignores duplicates", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["react"]} onChange={onChange} />);

    await user.type(screen.getByLabelText("Add tag"), "react");
    await user.keyboard("{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes a tag via its × button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["react", "hooks"]} onChange={onChange} />);

    await user.click(screen.getByLabelText("Remove tag react"));

    expect(onChange).toHaveBeenCalledWith(["hooks"]);
  });

  it("removes the last tag with Backspace on an empty input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["react", "hooks"]} onChange={onChange} />);

    await user.type(screen.getByLabelText("Add tag"), "{Backspace}");

    expect(onChange).toHaveBeenCalledWith(["react"]);
  });
});

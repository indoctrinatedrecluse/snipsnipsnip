import { describe, expect, it } from "vitest";

import { AUTHOR, githubUrl, portfolioUrl } from "@/lib/about";

describe("about metadata", () => {
  it("lists the author", () => {
    expect(AUTHOR).toBe("indoctrinatedrecluse");
  });

  it("decodes the GitHub profile URL", () => {
    expect(githubUrl()).toBe("https://github.com/indoctrinatedrecluse");
  });

  it("decodes the portfolio URL", () => {
    expect(portfolioUrl()).toBe("https://portfolio-flutter-78bcf.web.app/");
  });
});

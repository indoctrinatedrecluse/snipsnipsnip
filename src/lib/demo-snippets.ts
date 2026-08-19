import { createSnippet, type Snippet } from "@/types/snippet";

/** Meta key that records whether demo snippets have been seeded. */
export const SEEDED_KEY = "app.seeded";

interface DemoSpec {
  title: string;
  language: string;
  tags: string[];
  code: string;
}

const DEMO_SPECS: DemoSpec[] = [
  {
    title: "Debounce utility (TypeScript)",
    language: "typescript",
    tags: ["utility", "typescript"],
    code: `export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 200,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
`,
  },
  {
    title: "Quicksort (Python)",
    language: "python",
    tags: ["algorithm", "python"],
    code: `def quicksort(items: list[int]) -> list[int]:
    if len(items) <= 1:
        return items

    pivot = items[len(items) // 2]
    left = [x for x in items if x < pivot]
    middle = [x for x in items if x == pivot]
    right = [x for x in items if x > pivot]

    return quicksort(left) + middle + quicksort(right)
`,
  },
  {
    title: "Backup script (Bash)",
    language: "bash",
    tags: ["shell", "devops"],
    code: `#!/usr/bin/env bash
# Backup a directory into a timestamped tarball.
set -euo pipefail

src_dir="\${1:?usage: $0 <source-dir>}"
backup_dir="\${BACKUP_DIR:-./backups}"
stamp="\$(date +%Y%m%d-%H%M%S)"
dest="\$backup_dir/\$(basename "\$src_dir")-\$stamp.tar.gz"

mkdir -p "\$backup_dir"
tar -czf "\$dest" -C "\$(dirname "\$src_dir")" "\$(basename "\$src_dir")"
echo "Backed up to \$dest"
`,
  },
];

export function createDemoSnippets(): Snippet[] {
  return DEMO_SPECS.map((spec) => createSnippet(spec));
}

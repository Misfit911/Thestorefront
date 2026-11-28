import { access, mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_THEME_CSS = `/* Store theme. Edit these colors in the IDE. */
:root {
  --color-ink: #111111;
  --color-muted: #707072;
  --color-line: #e5e5e5;
  --color-canvas: #f6f6f6;
  --color-sale: #d30000;
  --color-member: #128a00;
}
`;

export function themeCssPath(slug: string) {
  return path.join(process.cwd(), "public", "themes", `${slug}.css`);
}

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export async function writeThemeFile(slug: string) {
  const file = themeCssPath(slug);
  await mkdir(path.dirname(file), { recursive: true });
  if (await exists(file)) return;
  await writeFile(file, DEFAULT_THEME_CSS, "utf8");
}

export async function deleteThemeFile(slug: string) {
  try {
    await unlink(themeCssPath(slug));
  } catch {
    return;
  }
}

export async function renameThemeFile(from: string, to: string) {
  if (from === to) return;
  const source = themeCssPath(from);
  const target = themeCssPath(to);
  await mkdir(path.dirname(target), { recursive: true });
  if (await exists(target)) return;
  if (await exists(source)) {
    await rename(source, target);
    return;
  }
  await writeFile(target, DEFAULT_THEME_CSS, "utf8");
}

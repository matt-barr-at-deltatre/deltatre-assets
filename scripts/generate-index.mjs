#!/usr/bin/env node

import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const outputFile = "ASSET_INDEX.md";

const ignoredDirs = new Set([
  ".git",
  ".github",
  "node_modules",
  "scripts",
]);

const ignoredFiles = new Set([
  outputFile,
  "README.md",
  "package-lock.json",
  "package.json",
]);

const assetExtensions = new Set([
  ".ai",
  ".avif",
  ".bmp",
  ".css",
  ".eot",
  ".eps",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".json",
  ".md",
  ".mp4",
  ".otf",
  ".pdf",
  ".png",
  ".svg",
  ".tif",
  ".tiff",
  ".ttf",
  ".txt",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
]);

const typeByExtension = new Map([
  [".ai", "Vector"],
  [".avif", "Image"],
  [".bmp", "Image"],
  [".css", "Stylesheet"],
  [".eot", "Font"],
  [".eps", "Vector"],
  [".gif", "Image"],
  [".ico", "Icon"],
  [".jpeg", "Image"],
  [".jpg", "Image"],
  [".json", "Data"],
  [".md", "Document"],
  [".mp4", "Video"],
  [".otf", "Font"],
  [".pdf", "Document"],
  [".png", "Image"],
  [".svg", "Vector"],
  [".tif", "Image"],
  [".tiff", "Image"],
  [".ttf", "Font"],
  [".txt", "Document"],
  [".webp", "Image"],
  [".woff", "Font"],
  [".woff2", "Font"],
  [".zip", "Archive"],
]);

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".well-known") {
      continue;
    }

    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(repoRoot, absolutePath);

    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }

      files.push(...await collectFiles(absolutePath));
      continue;
    }

    if (!entry.isFile() || ignoredFiles.has(relativePath) || ignoredFiles.has(entry.name)) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (!assetExtensions.has(extension)) {
      continue;
    }

    const fileStat = await stat(absolutePath);
    files.push({
      path: relativePath.split(path.sep).join("/"),
      name: path.basename(entry.name, extension),
      extension: extension.slice(1).toUpperCase(),
      type: typeByExtension.get(extension) ?? "Asset",
      size: fileStat.size,
    });
  }

  return files;
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatName(name) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function markdownEscape(value) {
  return value.replaceAll("|", "\\|");
}

function renderIndex(files) {
  const groups = Map.groupBy(files, (file) => file.type);
  const lines = [
    "# Asset Index",
    "",
    "Auto-generated from repository files. Do not edit by hand.",
    "",
    `Total assets: ${files.length}`,
    "",
  ];

  for (const [type, groupFiles] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`## ${type}s`, "");
    lines.push("| Name | Path | Format | Size |");
    lines.push("|---|---|---:|---:|");

    for (const file of groupFiles.sort((a, b) => a.path.localeCompare(b.path))) {
      const row = [
        markdownEscape(formatName(file.name)),
        `\`${file.path}\``,
        file.extension,
        formatBytes(file.size),
      ];

      lines.push(`| ${row.join(" | ")} |`);
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const files = (await collectFiles(repoRoot)).sort((a, b) => a.path.localeCompare(b.path));
await writeFile(path.join(repoRoot, outputFile), renderIndex(files));
console.log(`Generated ${outputFile} with ${files.length} assets.`);

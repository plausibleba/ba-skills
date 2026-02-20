import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { canonicalStringify } from "./canonical-json.js";

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const text = await readFile(filePath, "utf-8");
  return JSON.parse(text) as T;
}

export async function writeJsonFile(
  filePath: string,
  obj: unknown,
): Promise<void> {
  await writeFile(filePath, canonicalStringify(obj) + "\n", "utf-8");
}

export function sha256Buffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function sha256File(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  return sha256Buffer(buf);
}

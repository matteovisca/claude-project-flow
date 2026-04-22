import { readFileSync } from "node:fs";
import type { ParsedConfig } from "./types.js";

/**
 * Parse .project-flow/config.md into a ParsedConfig.
 * Recognizes top-level H2 sections and extracts `- key: value` list items.
 * Lines starting with `#` inside a section are ignored (defaults placeholders).
 */
export function parseConfig(path: string): ParsedConfig {
	const raw = readFileSync(path, "utf-8");
	const config: ParsedConfig = {};
	const lines = raw.split(/\r?\n/);
	let section: string | null = null;

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith("## ")) {
			section = trimmed.slice(3).trim().toLowerCase();
			continue;
		}
		if (!section) continue;
		if (trimmed.startsWith("#") || trimmed === "") continue;
		if (!trimmed.startsWith("-")) continue;

		const body = trimmed.slice(1).trim();
		const match = body.match(/^([a-zA-Z0-9_.-]+):\s*(.+?)(?:\s+#.*)?$/);
		if (!match) continue;
		const [, key, valueRaw] = match;
		const value = valueRaw.replace(/^`|`$/g, "").trim();

		applySection(config, section, key, value);
	}

	return config;
}

function applySection(config: ParsedConfig, section: string, key: string, value: string): void {
	switch (section) {
		case "identity":
			config.identity = { ...config.identity, [key]: value };
			break;
		case "branch convention":
			config.branch = { ...config.branch, [key]: value };
			break;
		case "folder layout":
			config.folderLayout = { ...config.folderLayout, [key]: value };
			break;
		case "plugin mapping":
			config.plugins = { ...config.plugins, [key]: value };
			break;
		case "workflow rules":
			config.workflow = { ...config.workflow, [toCamel(key)]: value };
			break;
		case "glossary":
			config.glossary = { ...config.glossary, [key]: value };
			break;
	}
}

function toCamel(s: string): string {
	return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

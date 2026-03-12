import { getGitUserName } from './git-user.js';

const FOOTER_SEPARATOR = '\n---\n';
const FOOTER_PREFIX = '**Ultima modifica:**';
const INLINE_TAG_RE = /<!-- @\S+ \d{4}-\d{2}-\d{2} -->/g;

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

// generates or updates the footer signature block at the end of a markdown file
export function updateFooter(content: string, description: string, cwd?: string): string {
	const user = getGitUserName(cwd);
	if (!user) return content;

	const footer = `${FOOTER_PREFIX} ${user} | ${today()} | ${description}`;

	// check if footer already exists
	const sepIdx = content.lastIndexOf(FOOTER_SEPARATOR);
	if (sepIdx >= 0) {
		const afterSep = content.substring(sepIdx + FOOTER_SEPARATOR.length);
		// only replace if it's our footer (starts with prefix)
		if (afterSep.trimStart().startsWith(FOOTER_PREFIX)) {
			return content.substring(0, sepIdx) + FOOTER_SEPARATOR + footer + '\n';
		}
	}

	// append new footer
	return content.trimEnd() + '\n' + FOOTER_SEPARATOR + footer + '\n';
}

// generates an inline tag for a specific modification point
export function inlineTag(cwd?: string): string {
	const user = getGitUserName(cwd);
	if (!user) return '';
	return `<!-- @${user} ${today()} -->`;
}

// strips all inline tags from content (useful for clean diffs)
export function stripInlineTags(content: string): string {
	return content.replace(INLINE_TAG_RE, '').replace(/\n{3,}/g, '\n\n');
}

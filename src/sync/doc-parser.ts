// parses feature-definition.md and project-definition.md to extract metadata

export interface FeatureMetadata {
	name: string;
	description: string;
	branch: string | null;
	status: string;
	created: string | null;
	author: string | null;
	lastModifiedBy: string | null;
}

export interface ProjectMetadata {
	name: string;
	overview: string;
}

const HEADING_RE = /^#\s+(?:Feature|Project):\s*(.+)/m;
const BRANCH_RE = /^##\s+Branch\s*\n+`([^`]+)`/m;
const STATUS_RE = /^##\s+Status\s*\n+(\S+)/m;
const CREATED_RE = /^##\s+Created\s*\n+(\S+)/m;
const DESC_RE = /^##\s+Description\s*\n+([\s\S]*?)(?=\n##\s|\n---|\Z)/m;
const FOOTER_RE = /\*\*Ultima modifica:\*\*\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(.+)/;

export function parseFeatureDefinition(content: string): FeatureMetadata {
	const nameMatch = content.match(HEADING_RE);
	const descMatch = content.match(DESC_RE);
	const branchMatch = content.match(BRANCH_RE);
	const statusMatch = content.match(STATUS_RE);
	const createdMatch = content.match(CREATED_RE);
	const footerMatch = content.match(FOOTER_RE);

	return {
		name: nameMatch?.[1]?.trim() ?? '',
		description: descMatch?.[1]?.trim() ?? '',
		branch: branchMatch?.[1]?.trim() ?? null,
		status: statusMatch?.[1]?.trim() ?? 'draft',
		created: createdMatch?.[1]?.trim() ?? null,
		author: footerMatch?.[1]?.trim() ?? null,
		lastModifiedBy: footerMatch?.[1]?.trim() ?? null,
	};
}

export function parseProjectDefinition(content: string): ProjectMetadata {
	const nameMatch = content.match(HEADING_RE);
	const overviewMatch = content.match(/^##\s+Overview\s*\n+([\s\S]*?)(?=\n##\s|\n---|\Z)/m);

	return {
		name: nameMatch?.[1]?.trim() ?? '',
		overview: overviewMatch?.[1]?.trim() ?? '',
	};
}

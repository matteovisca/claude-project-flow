// Shared types between server and client

export interface FileNode {
	name: string;
	path: string;
	type: 'file' | 'directory';
	binary?: boolean;
	children?: FileNode[];
}

export interface FeatureSummary {
	id: number;
	name: string;
	branch: string;
	status: string;
	description: string;
	project_name: string;
	project_id: number;
	author: string;
	last_modified_by: string;
	created_at: string;
	closed_at: string | null;
}

export interface FeatureDetail extends FeatureSummary {
	definition: string | null;
	session_log: string | null;
	requirements_status: string | null;
	plans_status: string | null;
	pending_discoveries: string | null;
	document_count: number;
	attachment_count: number;
}

export interface FeatureDocument {
	id: number;
	feature_id: number;
	type: string;
	name: string;
	content: string;
	created_at: string;
	updated_at: string;
	size?: number;
}

export interface FeatureAttachment {
	id: number;
	feature_id: number;
	name: string;
	mime_type: string;
	size: number;
	created_at: string;
}

export interface KnowledgeDoc {
	id: number;
	project: string | null;
	category: string;
	title: string;
	content?: string;
	source: string;
	updated_at: string;
	size?: number;
}

export interface ScriptArg {
	name: string;
	required: boolean;
	description: string;
	options?: string[];
}

export interface ScriptInfo {
	name: string;
	description: string;
	args: ScriptArg[];
}

export interface ScriptRun {
	id: string;
	script: string;
	args: string[];
	status: 'running' | 'success' | 'error';
	output: string;
	startedAt: string;
	finishedAt?: string;
	exitCode?: number;
}

export interface PluginSettings {
	memory_path: string;
}

export interface Project {
	id: number;
	name: string;
	path: string;
	type: string;
	definition: string | null;
	overview: string | null;
	created_at: string;
}

export interface CreateProjectPayload {
	name: string;
	path: string;
	type?: string;
	definition?: string;
	overview?: string;
}

export interface HealthResponse {
	status: 'ok';
	version: string;
	uptime: number;
}

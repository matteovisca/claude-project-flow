export interface ProjectContext {
	projectRoot: string;
	projectFlowDir: string;
	configExists: boolean;
	contextExists: boolean;
}

export interface ParsedConfig {
	identity?: {
		name?: string;
		family?: string;
		stack?: string;
		description?: string;
	};
	branch?: {
		feature?: string;
		us?: string;
		fix?: string;
	};
	folderLayout?: Record<string, string>;
	plugins?: Record<string, string>;
	workflow?: {
		crossReview?: "suggested" | "required" | "off";
		scopeAudit?: "on" | "off";
		announceDefault?: "hybrid" | "always-confirm" | "always-proceed";
	};
	glossary?: Record<string, string>;
}

export interface CliError {
	error: string;
	hint: string;
}

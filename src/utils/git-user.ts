import { execSync } from 'child_process';

export interface GitUser {
	name: string | null;
	email: string | null;
}

// returns git user.name and user.email, null if not configured
export function getGitUser(cwd?: string): GitUser {
	const opts = { encoding: 'utf-8' as const, stdio: 'pipe' as const, cwd };
	let name: string | null = null;
	let email: string | null = null;
	try {
		name = execSync('git config user.name', opts).trim() || null;
	} catch { /* not configured */ }
	try {
		email = execSync('git config user.email', opts).trim() || null;
	} catch { /* not configured */ }
	return { name, email };
}

// shorthand: returns "username" or null
export function getGitUserName(cwd?: string): string | null {
	return getGitUser(cwd).name;
}

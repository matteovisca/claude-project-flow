#!/usr/bin/env node
/**
 * Smart Install Script for claude-project-flow
 *
 * Ensures runtime dependencies (better-sqlite3) are installed.
 * Runs on SessionStart before the main hook.
 * Resolves install directory from CLAUDE_PLUGIN_ROOT.
 */
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || join(__dirname, '..');

const nodeModulesDir = join(PLUGIN_ROOT, 'node_modules');
const packageJson = join(PLUGIN_ROOT, 'package.json');
const markerFile = join(nodeModulesDir, '.install-version');

function needsInstall() {
	if (!existsSync(nodeModulesDir) || !existsSync(join(nodeModulesDir, 'better-sqlite3'))) {
		return true;
	}

	// check if version changed
	try {
		const pkg = JSON.parse(readFileSync(packageJson, 'utf-8'));
		if (existsSync(markerFile)) {
			const installed = readFileSync(markerFile, 'utf-8').trim();
			return installed !== pkg.version;
		}
		return true;
	} catch {
		return true;
	}
}

if (needsInstall()) {
	try {
		console.log('[project-flow] Installing runtime dependencies...');
		execSync('npm install --production --silent', {
			cwd: PLUGIN_ROOT,
			stdio: ['pipe', 'pipe', 'pipe'],
			timeout: 60000
		});

		// write marker
		const pkg = JSON.parse(readFileSync(packageJson, 'utf-8'));
		const { writeFileSync } = await import('fs');
		writeFileSync(markerFile, pkg.version);

		console.log('[project-flow] Dependencies installed.');
	} catch (err) {
		console.error('[project-flow] Failed to install dependencies:', err.message);
		process.exit(1);
	}
} else {
	// already installed, silent exit
	process.exit(0);
}

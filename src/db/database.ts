import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { SCHEMA } from './schema.js';

const DATA_DIR = join(homedir(), '.claude-project-flow');
const DB_PATH = join(DATA_DIR, 'project-flow.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (db) return db;

	if (!existsSync(DATA_DIR)) {
		mkdirSync(DATA_DIR, { recursive: true });
	}

	db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.exec(SCHEMA);

	return db;
}

export function getSettings(): Settings {
	const settingsPath = join(DATA_DIR, 'settings.json');
	if (!existsSync(settingsPath)) {
		const defaults: Settings = {
			knowledge_paths: [],
			projects: {},
			feature_docs_location: 'repo'
		};
		const { writeFileSync } = require('fs');
		writeFileSync(settingsPath, JSON.stringify(defaults, null, '\t') + '\n');
		return defaults;
	}
	const { readFileSync } = require('fs');
	return JSON.parse(readFileSync(settingsPath, 'utf-8'));
}

export interface Settings {
	knowledge_paths: string[];
	projects: Record<string, string>;
	feature_docs_location: 'repo' | 'local';
}

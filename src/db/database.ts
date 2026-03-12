import Database from 'better-sqlite3';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
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
	runMigrations(db);

	return db;
}

export const SETTINGS_PATH = join(DATA_DIR, 'settings.json');

export function getSettings(): Settings {
	if (!existsSync(SETTINGS_PATH)) {
		const defaults: Settings = {
			knowledge_paths: [],
			default_projects_path: '',
			project_overrides: {},
		};
		writeFileSync(SETTINGS_PATH, JSON.stringify(defaults, null, '\t') + '\n');
		return defaults;
	}
	return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
}

export function saveSettings(settings: Settings): void {
	writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, '\t') + '\n');
}

function runMigrations(db: Database.Database): void {
	// check if columns exist before adding (idempotent)
	const cols = db.prepare("PRAGMA table_info('features')").all() as { name: string }[];
	const colNames = new Set(cols.map(c => c.name));
	if (!colNames.has('author')) {
		db.exec("ALTER TABLE features ADD COLUMN author TEXT");
	}
	if (!colNames.has('last_modified_by')) {
		db.exec("ALTER TABLE features ADD COLUMN last_modified_by TEXT");
	}
}

export interface Settings {
	// paths to shared knowledge MD files (cross-project patterns, conventions, libraries)
	knowledge_paths: string[];
	// default path where project feature docs are stored
	default_projects_path: string;
	// per-project path overrides (project name → custom path)
	project_overrides: Record<string, string>;
}

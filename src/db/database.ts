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
		const defaults: Settings = { memory_path: '' };
		writeFileSync(SETTINGS_PATH, JSON.stringify(defaults, null, '\t') + '\n');
		return defaults;
	}
	const raw = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
	// migrate old settings formats
	if ('projects_path' in raw && !('memory_path' in raw)) {
		raw.memory_path = raw.projects_path;
	} else if ('default_projects_path' in raw && !('memory_path' in raw)) {
		raw.memory_path = raw.default_projects_path;
	}
	return { memory_path: raw.memory_path || '' };
}

export function saveSettings(settings: Settings): void {
	writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, '\t') + '\n');
}

function addColumnIfMissing(db: Database.Database, table: string, column: string, type: string): void {
	const cols = db.prepare(`PRAGMA table_info('${table}')`).all() as { name: string }[];
	if (!cols.some(c => c.name === column)) {
		db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
	}
}

function runMigrations(db: Database.Database): void {
	// v0 → v1: features columns
	addColumnIfMissing(db, 'features', 'author', 'TEXT');
	addColumnIfMissing(db, 'features', 'last_modified_by', 'TEXT');

	// v1: DB-only content columns
	addColumnIfMissing(db, 'features', 'definition', 'TEXT');
	addColumnIfMissing(db, 'features', 'description', 'TEXT');
	addColumnIfMissing(db, 'features', 'session_log', 'TEXT');
	addColumnIfMissing(db, 'features', 'requirements_status', 'TEXT');
	addColumnIfMissing(db, 'features', 'plans_status', 'TEXT');
	addColumnIfMissing(db, 'features', 'pending_discoveries', 'TEXT');

	// v1: projects content columns
	addColumnIfMissing(db, 'projects', 'definition', 'TEXT');
	addColumnIfMissing(db, 'projects', 'overview', 'TEXT');

	// v1: knowledge_docs source tracking
	addColumnIfMissing(db, 'knowledge_docs', 'source', "TEXT DEFAULT 'manual'");

	// v1: make file_path nullable (was UNIQUE NOT NULL, now optional)
	// SQLite can't ALTER constraints, but new rows can have NULL file_path
}

export interface Settings {
	// root path for plugin memory (contains projects/ and knowledge/ subdirectories)
	memory_path: string;
}

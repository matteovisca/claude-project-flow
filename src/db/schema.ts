export const SCHEMA = `
-- Registry dei progetti monitorati
CREATE TABLE IF NOT EXISTS projects (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT UNIQUE NOT NULL,
	path TEXT NOT NULL,
	type TEXT DEFAULT 'app',
	definition TEXT,
	overview TEXT,
	created_at TEXT DEFAULT (datetime('now'))
);

-- Feature lifecycle
CREATE TABLE IF NOT EXISTS features (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	branch TEXT,
	status TEXT DEFAULT 'draft',
	version INTEGER DEFAULT 1,
	definition TEXT,
	description TEXT,
	session_log TEXT,
	requirements_status TEXT,
	plans_status TEXT,
	pending_discoveries TEXT,
	author TEXT,
	last_modified_by TEXT,
	created_at TEXT DEFAULT (datetime('now')),
	closed_at TEXT,
	UNIQUE(project_id, name, version)
);

-- Documents attached to features (requirements, plans, context notes, docs, closure)
CREATE TABLE IF NOT EXISTS feature_documents (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
	type TEXT NOT NULL,
	name TEXT NOT NULL,
	content TEXT NOT NULL DEFAULT '',
	created_at TEXT DEFAULT (datetime('now')),
	updated_at TEXT DEFAULT (datetime('now')),
	UNIQUE(feature_id, type, name)
);

-- Binary attachments for features (PDF, images, etc.)
CREATE TABLE IF NOT EXISTS feature_attachments (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	mime_type TEXT,
	size INTEGER,
	data BLOB NOT NULL,
	created_at TEXT DEFAULT (datetime('now')),
	UNIQUE(feature_id, name)
);

-- Knowledge docs index per ricerca cross-project
CREATE TABLE IF NOT EXISTS knowledge_docs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	project TEXT,
	category TEXT NOT NULL,
	file_path TEXT,
	title TEXT,
	content TEXT,
	content_hash TEXT,
	source TEXT DEFAULT 'manual',
	updated_at TEXT DEFAULT (datetime('now'))
);

-- FTS5 per ricerca veloce
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
	title, content, category, project,
	content='knowledge_docs',
	content_rowid='id'
);

-- Trigger per mantenere FTS sincronizzato
CREATE TRIGGER IF NOT EXISTS knowledge_ai AFTER INSERT ON knowledge_docs BEGIN
	INSERT INTO knowledge_fts(rowid, title, content, category, project)
	VALUES (new.id, new.title, new.content, new.category, new.project);
END;

CREATE TRIGGER IF NOT EXISTS knowledge_ad AFTER DELETE ON knowledge_docs BEGIN
	INSERT INTO knowledge_fts(knowledge_fts, rowid, title, content, category, project)
	VALUES ('delete', old.id, old.title, old.content, old.category, old.project);
END;

CREATE TRIGGER IF NOT EXISTS knowledge_au AFTER UPDATE ON knowledge_docs BEGIN
	INSERT INTO knowledge_fts(knowledge_fts, rowid, title, content, category, project)
	VALUES ('delete', old.id, old.title, old.content, old.category, old.project);
	INSERT INTO knowledge_fts(rowid, title, content, category, project)
	VALUES (new.id, new.title, new.content, new.category, new.project);
END;

-- FTS5 per ricerca nei documenti feature
CREATE VIRTUAL TABLE IF NOT EXISTS feature_docs_fts USING fts5(
	name, content, type,
	content='feature_documents',
	content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS feature_docs_ai AFTER INSERT ON feature_documents BEGIN
	INSERT INTO feature_docs_fts(rowid, name, content, type)
	VALUES (new.id, new.name, new.content, new.type);
END;

CREATE TRIGGER IF NOT EXISTS feature_docs_ad AFTER DELETE ON feature_documents BEGIN
	INSERT INTO feature_docs_fts(feature_docs_fts, rowid, name, content, type)
	VALUES ('delete', old.id, old.name, old.content, old.type);
END;

CREATE TRIGGER IF NOT EXISTS feature_docs_au AFTER UPDATE ON feature_documents BEGIN
	INSERT INTO feature_docs_fts(feature_docs_fts, rowid, name, content, type)
	VALUES ('delete', old.id, old.name, old.content, old.type);
	INSERT INTO feature_docs_fts(rowid, name, content, type)
	VALUES (new.id, new.name, new.content, new.type);
END;

-- Indici
CREATE INDEX IF NOT EXISTS idx_features_project ON features(project_id);
CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);
CREATE INDEX IF NOT EXISTS idx_feature_docs_feature ON feature_documents(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_docs_type ON feature_documents(type);
CREATE INDEX IF NOT EXISTS idx_feature_attachments_feature ON feature_attachments(feature_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_project ON knowledge_docs(project);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_docs(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_hash ON knowledge_docs(content_hash);
`;

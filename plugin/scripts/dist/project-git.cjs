"use strict";var R=Object.create;var _=Object.defineProperty;var A=Object.getOwnPropertyDescriptor;var O=Object.getOwnPropertyNames;var X=Object.getPrototypeOf,w=Object.prototype.hasOwnProperty;var L=(e,o,n,E)=>{if(o&&typeof o=="object"||typeof o=="function")for(let a of O(o))!w.call(e,a)&&a!==n&&_(e,a,{get:()=>o[a],enumerable:!(E=A(o,a))||E.enumerable});return e};var y=(e,o,n)=>(n=e!=null?R(X(e)):{},L(o||!e||!e.__esModule?_(n,"default",{value:e,enumerable:!0}):n,e));var u=require("child_process"),S=require("fs");var g=y(require("better-sqlite3"),1),c=require("fs"),l=require("path"),I=require("os");var p=`
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
`;var N=(0,l.join)((0,I.homedir)(),".claude-project-flow"),D=(0,l.join)(N,"project-flow.db"),T=null;function m(){return T||((0,c.existsSync)(N)||(0,c.mkdirSync)(N,{recursive:!0}),T=new g.default(D),T.pragma("journal_mode = WAL"),T.pragma("foreign_keys = ON"),T.exec(p),U(T),T)}var k=(0,l.join)(N,"settings.json");function s(e,o,n,E){e.prepare(`PRAGMA table_info('${o}')`).all().some(f=>f.name===n)||e.exec(`ALTER TABLE ${o} ADD COLUMN ${n} ${E}`)}function U(e){s(e,"features","author","TEXT"),s(e,"features","last_modified_by","TEXT"),s(e,"features","definition","TEXT"),s(e,"features","description","TEXT"),s(e,"features","session_log","TEXT"),s(e,"features","requirements_status","TEXT"),s(e,"features","plans_status","TEXT"),s(e,"features","pending_discoveries","TEXT"),s(e,"projects","definition","TEXT"),s(e,"projects","overview","TEXT"),s(e,"knowledge_docs","source","TEXT DEFAULT 'manual'")}function F(e){try{return(0,u.execSync)("git rev-parse --git-dir",{cwd:e,stdio:"pipe",timeout:5e3}),!0}catch{return!1}}function d(e,o){return(0,u.execSync)(`git ${e}`,{cwd:o,encoding:"utf-8",stdio:"pipe",timeout:3e4}).trim()}function C(){let e=process.argv.slice(2).filter(t=>t!=="--json"),o=process.argv.includes("--json"),[n,E]=e;if(!n||!E){let t="Usage: project-git <project-name> <log|diff|status> [--json]";o?console.log(JSON.stringify({error:t})):console.error(t),process.exit(1)}if(!["log","diff","status"].includes(E)){let t=`Unknown command: ${E}. Use: log, diff, status`;o?console.log(JSON.stringify({error:t})):console.error(t),process.exit(1)}let f=m().prepare("SELECT * FROM projects WHERE name = ?").get(n);if(!f){let t=`Project not found: ${n}`;o?console.log(JSON.stringify({error:t})):console.error(t),process.exit(1)}let r=f.path;if(!(0,S.existsSync)(r)){let t=`Path does not exist: ${r}`;o?console.log(JSON.stringify({error:t})):console.error(t),process.exit(1)}if(!F(r)){let t=`Not a git repository: ${r}`;o?console.log(JSON.stringify({error:t})):console.error(t),process.exit(1)}try{let t=d("rev-parse --abbrev-ref HEAD",r),i="";switch(E){case"log":i=d("log --oneline --graph --decorate -n 30",r);break;case"diff":i=d("diff",r),i||(i=d("diff --staged",r)||"(no changes)");break;case"status":i=d("status",r);break}o?console.log(JSON.stringify({output:i,branch:t,cmd:E,path:r})):(console.log(`
${n} \u2014 branch: ${t}`),console.log(`${r}
`),console.log(i))}catch(t){o?console.log(JSON.stringify({error:t.message})):console.error(`Error: ${t.message}`),process.exit(1)}}C();

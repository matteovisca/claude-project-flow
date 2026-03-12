"use strict";var L=Object.create;var m=Object.defineProperty;var y=Object.getOwnPropertyDescriptor;var X=Object.getOwnPropertyNames;var w=Object.getPrototypeOf,j=Object.prototype.hasOwnProperty;var D=(e,t,n,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of X(t))!j.call(e,o)&&o!==n&&m(e,o,{get:()=>t[o],enumerable:!(s=y(t,o))||s.enumerable});return e};var F=(e,t,n)=>(n=e!=null?L(w(e)):{},D(t||!e||!e.__esModule?m(n,"default",{value:e,enumerable:!0}):n,e));var O=require("child_process"),N=require("path");var g=F(require("better-sqlite3"),1),c=require("fs"),l=require("path"),I=require("os");var _=`
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
`;var u=(0,l.join)((0,I.homedir)(),".claude-project-flow"),U=(0,l.join)(u,"project-flow.db"),E=null;function f(){return E||((0,c.existsSync)(u)||(0,c.mkdirSync)(u,{recursive:!0}),E=new g.default(U),E.pragma("journal_mode = WAL"),E.pragma("foreign_keys = ON"),E.exec(_),C(E),E)}var M=(0,l.join)(u,"settings.json");function i(e,t,n,s){e.prepare(`PRAGMA table_info('${t}')`).all().some(T=>T.name===n)||e.exec(`ALTER TABLE ${t} ADD COLUMN ${n} ${s}`)}function C(e){i(e,"features","author","TEXT"),i(e,"features","last_modified_by","TEXT"),i(e,"features","definition","TEXT"),i(e,"features","description","TEXT"),i(e,"features","session_log","TEXT"),i(e,"features","requirements_status","TEXT"),i(e,"features","plans_status","TEXT"),i(e,"features","pending_discoveries","TEXT"),i(e,"projects","definition","TEXT"),i(e,"projects","overview","TEXT"),i(e,"knowledge_docs","source","TEXT DEFAULT 'manual'")}function h(){try{let e=(0,O.execSync)("git rev-parse --show-toplevel",{encoding:"utf-8",stdio:"pipe"}).trim();return(0,N.basename)(e)}catch{return(0,N.basename)(process.cwd())}}function A(e){let t=f(),n=t.prepare(`
		SELECT f.*, p.name as project_name
		FROM features f JOIN projects p ON f.project_id = p.id
		WHERE f.id = ?
	`).get(e),s=t.prepare("SELECT id, type, name, LENGTH(content) as size FROM feature_documents WHERE feature_id = ? ORDER BY type, name").all(e),o=t.prepare("SELECT id, name, mime_type, size FROM feature_attachments WHERE feature_id = ? ORDER BY name").all(e);return{featureName:n.name,projectName:n.project_name,status:n.status,branch:n.branch,definition:n.definition,sessionLog:n.session_log,requirementsStatus:n.requirements_status?p(n.requirements_status):null,plansStatus:n.plans_status?p(n.plans_status):null,pendingDiscoveries:n.pending_discoveries?p(n.pending_discoveries):null,documents:s,attachments:o}}function R(e){let t=f(),n=t.prepare("SELECT * FROM projects WHERE id = ?").get(e),s=t.prepare("SELECT id FROM features WHERE project_id = ? AND closed_at IS NULL ORDER BY created_at DESC").all(e);return{projectName:n.name,definition:n.definition,overview:n.overview,features:s.map(o=>A(o.id))}}function p(e){try{return JSON.parse(e)}catch{return e}}function v(){let e=process.argv.slice(2).filter(a=>a!=="--json"),t=process.argv.includes("--json"),n=f(),s=e.indexOf("--project"),o=s>=0?e[s+1]:void 0,T=e.find(a=>!a.startsWith("--")&&a!==o),r;if(T){let a=o??h(),d=n.prepare(`
			SELECT f.id FROM features f JOIN projects p ON f.project_id = p.id
			WHERE p.name = ? AND f.name = ? AND f.closed_at IS NULL
		`).get(a,T);d?r=A(d.id):r={error:`Feature "${T}" not found in "${a}"`}}else if(o){let a=n.prepare("SELECT id FROM projects WHERE name = ?").get(o);a?r=R(a.id):r={error:`Project "${o}" not found`}}else r={projects:n.prepare("SELECT id FROM projects ORDER BY name").all().map(d=>R(d.id))};if(t)console.log(JSON.stringify(r,null,2));else if(r.error&&(console.log(`Error: ${r.error}`),process.exit(1)),r.projects)for(let a of r.projects)S(a);else r.features?S(r):r.featureName&&G(r)}function S(e){console.log(`
${e.projectName} (${e.features.length} features)`);for(let t of e.features)console.log(`  - ${t.featureName} [${t.status}] docs:${t.documents.length} att:${t.attachments.length}`)}function G(e){console.log(`
Feature: ${e.featureName} [${e.status}]`),console.log(`  Project: ${e.projectName}`),console.log(`  Branch: ${e.branch??"-"}`),console.log(`  Definition: ${e.definition?"yes":"no"}`),console.log(`  Session log: ${e.sessionLog?"yes":"no"}`),console.log(`  Documents: ${e.documents.length}`);for(let t of e.documents)console.log(`    - [${t.type}] ${t.name} (${t.size} bytes)`);console.log(`  Attachments: ${e.attachments.length}`)}v();

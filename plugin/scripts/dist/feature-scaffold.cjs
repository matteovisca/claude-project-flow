"use strict";var X=Object.create;var I=Object.defineProperty;var y=Object.getOwnPropertyDescriptor;var U=Object.getOwnPropertyNames;var h=Object.getPrototypeOf,D=Object.prototype.hasOwnProperty;var F=(e,a,t,r)=>{if(a&&typeof a=="object"||typeof a=="function")for(let n of U(a))!D.call(e,n)&&n!==t&&I(e,n,{get:()=>a[n],enumerable:!(r=y(a,n))||r.enumerable});return e};var j=(e,a,t)=>(t=e!=null?X(h(e)):{},F(a||!e||!e.__esModule?I(t,"default",{value:e,enumerable:!0}):t,e));var A=require("child_process"),_=require("path");var R=j(require("better-sqlite3"),1),d=require("fs"),l=require("path"),S=require("os");var g=`
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
`;var u=(0,l.join)((0,S.homedir)(),".claude-project-flow"),C=(0,l.join)(u,"project-flow.db"),c=null;function N(){return c||((0,d.existsSync)(u)||(0,d.mkdirSync)(u,{recursive:!0}),c=new R.default(C),c.pragma("journal_mode = WAL"),c.pragma("foreign_keys = ON"),c.exec(g),b(c),c)}var P=(0,l.join)(u,"settings.json");function i(e,a,t,r){e.prepare(`PRAGMA table_info('${a}')`).all().some(o=>o.name===t)||e.exec(`ALTER TABLE ${a} ADD COLUMN ${t} ${r}`)}function b(e){i(e,"features","author","TEXT"),i(e,"features","last_modified_by","TEXT"),i(e,"features","definition","TEXT"),i(e,"features","description","TEXT"),i(e,"features","session_log","TEXT"),i(e,"features","requirements_status","TEXT"),i(e,"features","plans_status","TEXT"),i(e,"features","pending_discoveries","TEXT"),i(e,"projects","definition","TEXT"),i(e,"projects","overview","TEXT"),i(e,"knowledge_docs","source","TEXT DEFAULT 'manual'")}var m=require("child_process");function k(e){let a={encoding:"utf-8",stdio:"pipe",cwd:e},t=null,r=null;try{t=(0,m.execSync)("git config user.name",a).trim()||null}catch{}try{r=(0,m.execSync)("git config user.email",a).trim()||null}catch{}return{name:t,email:r}}function p(e){return k(e).name}function O(e){return(0,A.execSync)(`git ${e}`,{encoding:"utf-8",stdio:"pipe"}).trim()}function w(){try{let e=O("rev-parse --show-toplevel");return(0,_.basename)(e)}catch{return(0,_.basename)(process.cwd())}}function G(e){let a=e.projectName??w(),t=N(),r=p(),n=t.prepare("SELECT id FROM projects WHERE name = ?").get(a);if(!n){let f=process.cwd();t.prepare("INSERT INTO projects (name, path, type) VALUES (?, ?, ?)").run(a,f,"app"),n=t.prepare("SELECT id FROM projects WHERE name = ?").get(a)}let o=t.prepare("SELECT id, status FROM features WHERE project_id = ? AND name = ? AND closed_at IS NULL").get(n.id,e.featureName);if(o&&t.prepare("UPDATE features SET closed_at = datetime('now'), status = 'superseded' WHERE id = ?").run(o.id),e.createBranch)try{O(`checkout -b ${e.branch}`)}catch{}let E=new Date().toISOString().slice(0,10),T=`# Feature: ${e.featureName}

## Description
${e.description}

## Branch
\`${e.branch}\`

## Created
${E}

## Status
draft
`,s=t.prepare("INSERT INTO features (project_id, name, branch, status, description, definition, author, last_modified_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(n.id,e.featureName,e.branch,"draft",e.description,T,r,r);return{command:"init",success:!0,featureName:e.featureName,branch:e.branch,featureId:s.lastInsertRowid}}function x(e,a,t,r){let n=r??w(),o=N(),E=p()??"unknown",T=o.prepare("SELECT id FROM projects WHERE name = ?").get(n);if(!T)return{command:"close",success:!1,featureName:e,reason:a,error:"Project not found"};let s=o.prepare("SELECT id FROM features WHERE project_id = ? AND name = ? AND closed_at IS NULL").get(T.id,e);if(!s)return{command:"close",success:!1,featureName:e,reason:a,error:"Feature not found or already closed"};let f=new Date().toISOString().slice(0,10),L=`# Closure: ${e}

## Status
${t}

## Reason
${a}

## Closed by
${E}

## Date
${f}
`;return o.prepare("INSERT INTO feature_documents (feature_id, type, name, content) VALUES (?, ?, ?, ?)").run(s.id,"closure","CLOSURE",L),o.prepare("UPDATE features SET status = ?, closed_at = datetime('now'), last_modified_by = ? WHERE id = ?").run(t,E,s.id),{command:"close",success:!0,featureName:e,reason:a}}function B(){let e=process.argv[2],a=process.argv.includes("--json"),t=process.argv.slice(3).filter(n=>n!=="--json"),r;switch(e){case"init":{let n={featureName:"",branch:"",description:""};for(let o=0;o<t.length;o++)switch(t[o]){case"--name":n.featureName=t[++o];break;case"--branch":n.branch=t[++o];break;case"--desc":n.description=t.slice(++o).join(" "),o=t.length;break;case"--project":n.projectName=t[++o];break;case"--create-branch":n.createBranch=!0;break}if(!n.featureName||!n.branch){r={error:"Required: --name <name> --branch <branch> --desc <description>"};break}n.description||(n.description=n.featureName),r=G(n);break}case"close":{let n=t[0],o="Cancelled",E="cancelled",T;for(let s=1;s<t.length;s++)switch(t[s]){case"--reason":o=t.slice(++s).join(" "),s=t.length;break;case"--status":E=t[++s];break;case"--project":T=t[++s];break}if(!n){r={error:"Required: feature name"};break}r=x(n,o,E,T);break}default:r={error:`Unknown command: ${e}. Use: init, close`}}if(a)console.log(JSON.stringify(r,null,2));else switch(r.error&&(console.log(`Error: ${r.error}`),process.exit(1)),r.command){case"init":console.log(`Feature "${r.featureName}" inizializzata (id: ${r.featureId})`),console.log(`  Branch: ${r.branch}`);break;case"close":console.log(`Feature "${r.featureName}" chiusa`),console.log(`  Reason: ${r.reason}`);break}}B();

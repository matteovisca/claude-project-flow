#!/usr/bin/env node
"use strict";var P=Object.create;var D=Object.defineProperty;var k=Object.getOwnPropertyDescriptor;var B=Object.getOwnPropertyNames;var H=Object.getPrototypeOf,W=Object.prototype.hasOwnProperty;var V=(e,s,t,o)=>{if(s&&typeof s=="object"||typeof s=="function")for(let n of B(s))!W.call(e,n)&&n!==t&&D(e,n,{get:()=>s[n],enumerable:!(o=k(s,n))||o.enumerable});return e};var Y=(e,s,t)=>(t=e!=null?P(H(e)):{},V(s||!e||!e.__esModule?D(t,"default",{value:e,enumerable:!0}):t,e));var _=require("child_process"),v=require("fs"),x=require("path");var O=Y(require("better-sqlite3"),1),d=require("fs"),g=require("path"),w=require("os");var j=`
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
`;var T=(0,g.join)((0,w.homedir)(),".claude-project-flow"),K=(0,g.join)(T,"project-flow.db"),f=null;function h(){return f||((0,d.existsSync)(T)||(0,d.mkdirSync)(T,{recursive:!0}),f=new O.default(K),f.pragma("journal_mode = WAL"),f.pragma("foreign_keys = ON"),f.exec(j),q(f),f)}var S=(0,g.join)(T,"settings.json");function R(){if(!(0,d.existsSync)(S)){let s={memory_path:""};return(0,d.writeFileSync)(S,JSON.stringify(s,null,"	")+`
`),s}let e=JSON.parse((0,d.readFileSync)(S,"utf-8"));return"projects_path"in e&&!("memory_path"in e)?e.memory_path=e.projects_path:"default_projects_path"in e&&!("memory_path"in e)&&(e.memory_path=e.default_projects_path),{memory_path:e.memory_path||""}}function u(e,s,t,o){e.prepare(`PRAGMA table_info('${s}')`).all().some(r=>r.name===t)||e.exec(`ALTER TABLE ${s} ADD COLUMN ${t} ${o}`)}function q(e){u(e,"features","author","TEXT"),u(e,"features","last_modified_by","TEXT"),u(e,"features","definition","TEXT"),u(e,"features","description","TEXT"),u(e,"features","session_log","TEXT"),u(e,"features","requirements_status","TEXT"),u(e,"features","plans_status","TEXT"),u(e,"features","pending_discoveries","TEXT"),u(e,"projects","definition","TEXT"),u(e,"projects","overview","TEXT"),u(e,"knowledge_docs","source","TEXT DEFAULT 'manual'")}var p=require("fs"),E=require("path");var F=/^#\s+(?:Feature|Project):\s*(.+)/m,J=/^##\s+Branch\s*\n+`([^`]+)`/m,Q=/^##\s+Status\s*\n+(\S+)/m,z=/^##\s+Created\s*\n+(\S+)/m,Z=/^##\s+Description\s*\n+([\s\S]*?)(?=\n##\s|\n---|\Z)/m,ee=/\*\*Ultima modifica:\*\*\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(.+)/;function L(e){let s=e.match(F),t=e.match(Z),o=e.match(J),n=e.match(Q),r=e.match(z),a=e.match(ee);return{name:s?.[1]?.trim()??"",description:t?.[1]?.trim()??"",branch:o?.[1]?.trim()??null,status:n?.[1]?.trim()??"draft",created:r?.[1]?.trim()??null,author:a?.[1]?.trim()??null,lastModifiedBy:a?.[1]?.trim()??null}}function C(e){let s=e.match(F),t=e.match(/^##\s+Overview\s*\n+([\s\S]*?)(?=\n##\s|\n---|\Z)/m);return{name:s?.[1]?.trim()??"",overview:t?.[1]?.trim()??""}}function X(e){try{return(0,p.readFileSync)(e,"utf-8")}catch{return null}}function U(e){try{return(0,p.statSync)(e).isDirectory()}catch{return!1}}function te(e,s){let t=(0,E.join)(e,"features");if(!U(t))return[];let o=[];try{for(let n of(0,p.readdirSync)(t,{withFileTypes:!0})){if(!n.isDirectory()||n.name==="Archive"||n.name.startsWith("."))continue;let r=(0,E.join)(t,n.name),a=(0,E.join)(r,"feature-definition.md"),i=X(a);if(!i)continue;let c=L(i);c.name||(c.name=n.name),o.push({projectName:s,dirName:n.name,metadata:c,featureDir:r})}}catch{}return o}function N(){let e=R(),s=[],t=e.memory_path?(0,E.join)(e.memory_path,"projects"):"";if(!t||!U(t))return s;try{for(let o of(0,p.readdirSync)(t,{withFileTypes:!0})){if(!o.isDirectory()||o.name.startsWith("."))continue;let n=(0,E.join)(t,o.name),r=X((0,E.join)(n,"project-definition.md")),a=r?C(r):{name:o.name,overview:""};a.name||(a.name=o.name);let i=te(n,a.name);s.push({name:a.name,path:n,overview:a.overview,features:i})}}catch{}return s}function y(){let e=h(),s=N(),t={projectsCreated:[],projectsUnchanged:[],featuresCreated:[],featuresUpdated:[],featuresDeletedRemote:[],errors:[]},o=new Set;for(let n of s){let r=e.prepare("SELECT id FROM projects WHERE name = ?").get(n.name),a;if(r)a=r.id,t.projectsUnchanged.push(n.name);else try{a=e.prepare("INSERT INTO projects (name, path, type) VALUES (?, ?, ?)").run(n.name,n.path,"app").lastInsertRowid,t.projectsCreated.push(n.name)}catch(c){t.errors.push(`Project "${n.name}": ${c.message}`);continue}for(let c of n.features){let m=`${n.name}/${c.metadata.name}`;o.add(m);try{ne(e,a,c,t)}catch(G){t.errors.push(`Feature "${m}": ${G.message}`)}}let i=e.prepare("SELECT id, name, status FROM features WHERE project_id = ? AND closed_at IS NULL AND status != 'deleted-remote'").all(a);for(let c of i){let m=`${n.name}/${c.name}`;o.has(m)||(e.prepare("UPDATE features SET status = 'deleted-remote' WHERE id = ?").run(c.id),t.featuresDeletedRemote.push(m))}}return t}function ne(e,s,t,o){let{metadata:n}=t,r=e.prepare("SELECT id, status, branch, author, last_modified_by FROM features WHERE project_id = ? AND name = ? AND closed_at IS NULL").get(s,n.name);if(!r)e.prepare("INSERT INTO features (project_id, name, branch, status, author, last_modified_by) VALUES (?, ?, ?, ?, ?, ?)").run(s,n.name,n.branch,n.status,n.author,n.lastModifiedBy),o.featuresCreated.push(`${t.projectName}/${n.name}`);else{let a=[],i=[];n.status&&n.status!==r.status&&(a.push("status = ?"),i.push(n.status)),n.branch&&n.branch!==r.branch&&(a.push("branch = ?"),i.push(n.branch)),n.lastModifiedBy&&n.lastModifiedBy!==r.last_modified_by&&(a.push("last_modified_by = ?"),i.push(n.lastModifiedBy)),n.author&&!r.author&&(a.push("author = ?"),i.push(n.author)),a.length>0&&(i.push(r.id),e.prepare(`UPDATE features SET ${a.join(", ")} WHERE id = ?`).run(...i),o.featuresUpdated.push(`${t.projectName}/${n.name}`))}}function se(){let e=R();return e.memory_path?(0,x.join)(e.memory_path,"projects"):""}function I(e){try{return(0,_.execSync)("git rev-parse --is-inside-work-tree",{cwd:e,stdio:"pipe"}),!0}catch{return!1}}function A(e){try{return(0,_.execSync)("git remote",{cwd:e,encoding:"utf-8",stdio:"pipe"}).trim().length>0}catch{return!1}}function l(e,s){return(0,_.execSync)(e,{cwd:s,encoding:"utf-8",stdio:"pipe"}).trim()}function b(e){if(!I(e))return{output:"",conflicts:[],hasConflicts:!1};if(!A(e))return{output:"No remote configured",conflicts:[],hasConflicts:!1};let s,t=[];try{s=l("git pull --no-rebase",e)}catch(o){s=o.stdout?.toString()??o.message;try{t=l("git status --porcelain",e).split(`
`).filter(r=>r.startsWith("UU")||r.startsWith("AA")||r.startsWith("DD")).map(r=>r.substring(3).trim())}catch{}}return{output:s,conflicts:t,hasConflicts:t.length>0}}function $(e){if(!I(e))return{summary:"Not a git repo",committed:!1,pushed:!1,output:""};if(!A(e))return{summary:"No remote configured",committed:!1,pushed:!1,output:""};let s=l("git status --porcelain",e);if(!s)return{summary:"No changes to push",committed:!1,pushed:!1,output:""};let t=s.split(`
`).filter(Boolean),o=oe(t),n="";try{return l("git add -A",e),n+=l(`git commit -m "${o}"`,e)+`
`,n+=l("git push",e),{summary:o,committed:!0,pushed:!0,output:n}}catch(r){return{summary:o,committed:!1,pushed:!1,output:r.message}}}function oe(e){let s=[];for(let n of e){let a=n.substring(3).trim().split("/"),i=a.indexOf("features");if(i>=0&&i+1<a.length){let c=a[i+1],m=a[i+2]??"definition";s.push(`${c}/${m}`)}else s.push(a[a.length-1])}let t=[...new Set(s)];return`docs: sync ${t.length<=3?t.join(", "):`${t.slice(0,3).join(", ")} (+${t.length-3})`}`}function re(e){let s={hasRemote:!1,isGitRepo:!1,localChanges:[],behindRemote:!1,aheadOfRemote:!1,dbDifferences:[]};if(s.isGitRepo=I(e),!s.isGitRepo)return s;s.hasRemote=A(e);let t=l("git status --porcelain",e);if(t&&(s.localChanges=t.split(`
`).filter(Boolean)),s.hasRemote)try{l("git fetch --quiet",e);let r=l("git rev-list HEAD --not @{upstream} --count",e),a=l("git rev-list @{upstream} --not HEAD --count",e);s.aheadOfRemote=parseInt(r)>0,s.behindRemote=parseInt(a)>0}catch{}let o=N(),n=h();for(let r of o){let a=n.prepare("SELECT id FROM projects WHERE name = ?").get(r.name);if(!a){s.dbDifferences.push(`Project "${r.name}" exists in files but not in DB`);continue}for(let i of r.features){let c=n.prepare("SELECT status, branch FROM features WHERE project_id = ? AND name = ? AND closed_at IS NULL").get(a.id,i.metadata.name);c?c.status!==i.metadata.status&&s.dbDifferences.push(`Feature "${r.name}/${i.metadata.name}" status: DB="${c.status}" file="${i.metadata.status}"`):s.dbDifferences.push(`Feature "${r.name}/${i.metadata.name}" exists in files but not in DB`)}}return s}function ae(){let e=process.argv[2]||"all",s=process.argv.includes("--json"),t=se();if(!t||!(0,v.existsSync)(t)){let n={command:e,success:!1,error:`Docs path not configured or doesn't exist: ${t}. Run /claude-project-flow:setup first.`};M(n,s),process.exit(1)}let o;switch(e){case"pull":{let n=b(t);if(n.hasConflicts)o={command:e,success:!1,pull:n,error:`Conflicts detected in: ${n.conflicts.join(", ")}. Resolve manually then run /sync again.`};else{let r=y();o={command:e,success:!0,pull:n,reconcile:r}}break}case"push":{let n=$(t);o={command:e,success:n.pushed||!n.summary.includes("No"),push:n};break}case"status":{let n=re(t);o={command:e,success:!0,status:n};break}case"all":{let n=b(t);if(n.hasConflicts){o={command:e,success:!1,pull:n,error:`Conflicts detected in: ${n.conflicts.join(", ")}. Resolve manually then run /sync again.`};break}let r=y(),a=$(t);o={command:e,success:!0,pull:n,reconcile:r,push:a};break}default:o={command:e,success:!1,error:`Unknown command: ${e}. Use: pull, push, status, all`}}M(o,s),process.exit(o.success?0:1)}function M(e,s){if(s){console.log(JSON.stringify(e,null,2));return}if(console.log(`
=== Sync: ${e.command} ===
`),e.error&&console.log(`\u274C Error: ${e.error}
`),e.pull&&(console.log("\u{1F4E5} Pull:"),e.pull.hasConflicts?console.log(`  \u26A0\uFE0F  Conflicts: ${e.pull.conflicts.join(", ")}`):console.log(`  ${e.pull.output||"Already up to date"}`)),e.reconcile){let t=e.reconcile;console.log(`
\u{1F504} Reconcile:`),t.projectsCreated.length&&console.log(`  Projects created: ${t.projectsCreated.join(", ")}`),t.featuresCreated.length&&console.log(`  Features created: ${t.featuresCreated.join(", ")}`),t.featuresUpdated.length&&console.log(`  Features updated: ${t.featuresUpdated.join(", ")}`),t.featuresDeletedRemote.length&&console.log(`  Features deleted remote: ${t.featuresDeletedRemote.join(", ")}`),t.errors.length&&console.log(`  Errors: ${t.errors.join(", ")}`),!t.projectsCreated.length&&!t.featuresCreated.length&&!t.featuresUpdated.length&&!t.featuresDeletedRemote.length&&console.log("  Everything in sync")}if(e.push&&(console.log(`
\u{1F4E4} Push:`),e.push.committed?(console.log(`  Committed: ${e.push.summary}`),console.log(`  Pushed: ${e.push.pushed?"yes":"no"}`)):console.log(`  ${e.push.summary}`)),e.status){let t=e.status;console.log("\u{1F4CA} Status:"),console.log(`  Git repo: ${t.isGitRepo?"yes":"no"}`),console.log(`  Remote: ${t.hasRemote?"yes":"no"}`),console.log(`  Local changes: ${t.localChanges.length||"none"}`),t.hasRemote&&(console.log(`  Behind remote: ${t.behindRemote?"yes":"no"}`),console.log(`  Ahead of remote: ${t.aheadOfRemote?"yes":"no"}`)),t.dbDifferences.length&&(console.log("  DB differences:"),t.dbDifferences.forEach(o=>console.log(`    - ${o}`)))}console.log("")}ae();

"use strict";var $=Object.create;var O=Object.defineProperty;var x=Object.getOwnPropertyDescriptor;var C=Object.getOwnPropertyNames;var G=Object.getPrototypeOf,P=Object.prototype.hasOwnProperty;var B=(e,o,r,t)=>{if(o&&typeof o=="object"||typeof o=="function")for(let n of C(o))!P.call(e,n)&&n!==r&&O(e,n,{get:()=>o[n],enumerable:!(t=x(o,n))||t.enumerable});return e};var M=(e,o,r)=>(r=e!=null?$(G(e)):{},B(o||!e||!e.__esModule?O(r,"default",{value:e,enumerable:!0}):r,e));var X=require("child_process"),s=require("fs"),c=require("path");var y=M(require("better-sqlite3"),1),u=require("fs"),T=require("path"),F=require("os");var j=`
-- Registry dei progetti monitorati
CREATE TABLE IF NOT EXISTS projects (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT UNIQUE NOT NULL,
	path TEXT NOT NULL,
	type TEXT DEFAULT 'app',
	created_at TEXT DEFAULT (datetime('now'))
);

-- Feature lifecycle
CREATE TABLE IF NOT EXISTS features (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	project_id INTEGER NOT NULL REFERENCES projects(id),
	name TEXT NOT NULL,
	branch TEXT,
	status TEXT DEFAULT 'draft',
	version INTEGER DEFAULT 1,
	requirements_path TEXT,
	plan_path TEXT,
	progress_path TEXT,
	changelog_path TEXT,
	author TEXT,
	last_modified_by TEXT,
	created_at TEXT DEFAULT (datetime('now')),
	closed_at TEXT,
	UNIQUE(project_id, name, version)
);

-- Indice knowledge per ricerca cross-project
CREATE TABLE IF NOT EXISTS knowledge_docs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	project TEXT,
	category TEXT NOT NULL,
	file_path TEXT UNIQUE NOT NULL,
	title TEXT,
	content TEXT,
	content_hash TEXT,
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

-- Indici
CREATE INDEX IF NOT EXISTS idx_features_project ON features(project_id);
CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_project ON knowledge_docs(project);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_docs(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_hash ON knowledge_docs(content_hash);
`;var f=(0,T.join)((0,F.homedir)(),".claude-project-flow"),V=(0,T.join)(f,"project-flow.db"),d=null;function k(){return d||((0,u.existsSync)(f)||(0,u.mkdirSync)(f,{recursive:!0}),d=new y.default(V),d.pragma("journal_mode = WAL"),d.pragma("foreign_keys = ON"),d.exec(j),z(d),d)}var h=(0,T.join)(f,"settings.json");function D(){if(!(0,u.existsSync)(h)){let e={knowledge_paths:[],default_projects_path:"",project_overrides:{}};return(0,u.writeFileSync)(h,JSON.stringify(e,null,"	")+`
`),e}return JSON.parse((0,u.readFileSync)(h,"utf-8"))}function z(e){let o=e.prepare("PRAGMA table_info('features')").all(),r=new Set(o.map(t=>t.name));r.has("author")||e.exec("ALTER TABLE features ADD COLUMN author TEXT"),r.has("last_modified_by")||e.exec("ALTER TABLE features ADD COLUMN last_modified_by TEXT")}var N=require("child_process");function H(e){let o={encoding:"utf-8",stdio:"pipe",cwd:e},r=null,t=null;try{r=(0,N.execSync)("git config user.name",o).trim()||null}catch{}try{t=(0,N.execSync)("git config user.email",o).trim()||null}catch{}return{name:r,email:t}}function E(e){return H(e).name}var p=`
---
`,U="**Ultima modifica:**";function Y(){return new Date().toISOString().slice(0,10)}function S(e,o,r){let t=E(r);if(!t)return e;let n=`${U} ${t} | ${Y()} | ${o}`,i=e.lastIndexOf(p);return i>=0&&e.substring(i+p.length).trimStart().startsWith(U)?e.substring(0,i)+p+n+`
`:e.trimEnd()+`
`+p+n+`
`}function L(e){return(0,X.execSync)(`git ${e}`,{encoding:"utf-8",stdio:"pipe"}).trim()}function I(e,o){let r=D(),t=r.project_overrides[e]??(0,c.join)(r.default_projects_path,e);return(0,c.join)(t,"features",o)}function v(){try{let e=L("rev-parse --show-toplevel");return(0,c.basename)(e)}catch{return(0,c.basename)(process.cwd())}}function q(e){let o=(0,c.join)(e,"Archive");if(!(0,s.existsSync)(o))return 1;try{return((0,s.readdirSync)(o).filter(t=>/^v\d+$/.test(t)).map(t=>parseInt(t.substring(1))).sort((t,n)=>n-t)[0]??0)+1}catch{return 1}}function _(e){if(!(0,s.existsSync)(e))return null;let o=q(e),r=(0,c.join)(e,"Archive",`v${o}`);(0,s.mkdirSync)(r,{recursive:!0});for(let t of(0,s.readdirSync)(e))t!=="Archive"&&(0,s.renameSync)((0,c.join)(e,t),(0,c.join)(r,t));return{version:o,path:r}}function J(e){let o=e.projectName??v(),r=I(o,e.featureName),t;if((0,s.existsSync)(r)&&(0,s.existsSync)((0,c.join)(r,"feature-definition.md"))){let a=_(r);a&&(t=`Archive/v${a.version}`)}if((0,s.mkdirSync)((0,c.join)(r,"context"),{recursive:!0}),(0,s.mkdirSync)((0,c.join)(r,"plans"),{recursive:!0}),(0,s.mkdirSync)((0,c.join)(r,"requirements"),{recursive:!0}),e.createBranch)try{L(`checkout -b ${e.branch}`)}catch{}let n=new Date().toISOString().slice(0,10),i=`# Feature: ${e.featureName}

## Description
${e.description}

## Branch
\`${e.branch}\`

## Created
${n}

## Status
draft
`;return i=S(i,"Feature inizializzata"),(0,s.writeFileSync)((0,c.join)(r,"feature-definition.md"),i),{command:"init",success:!0,featureName:e.featureName,branch:e.branch,featureDir:r,archived:t}}function W(e,o){let r=o??v(),t=I(r,e);if(!(0,s.existsSync)(t))return{command:"archive",success:!1,featureDir:t,archiveVersion:0,archivePath:"",error:"Feature directory not found"};let n=_(t);return n?{command:"archive",success:!0,featureDir:t,archiveVersion:n.version,archivePath:n.path}:{command:"archive",success:!1,featureDir:t,archiveVersion:0,archivePath:"",error:"Nothing to archive"}}function K(e,o,r,t){let n=t??v(),i=I(n,e);if(!(0,s.existsSync)(i))return{command:"close",success:!1,featureName:e,featureDir:i,reason:o,closureFile:"",error:"Feature directory not found"};let a,g=_(i);g&&(a=`Archive/v${g.version}`),(0,s.mkdirSync)((0,c.join)(i,"context"),{recursive:!0});let l=new Date().toISOString().slice(0,10),A=E()??"unknown",m=`# Closure: ${e}

## Status
${r}

## Reason
${o}

## Closed by
${A}

## Date
${l}

## Archived
${a??"N/A"}
`;m=S(m,`Feature chiusa: ${r}`);let R=(0,c.join)(i,"CLOSURE.md");(0,s.writeFileSync)(R,m);try{let w=k(),b=w.prepare("SELECT id FROM projects WHERE name = ?").get(n);b&&w.prepare("UPDATE features SET status = ?, closed_at = datetime('now'), last_modified_by = ? WHERE project_id = ? AND name = ? AND closed_at IS NULL").run(r,A,b.id,e)}catch{}return{command:"close",success:!0,featureName:e,featureDir:i,reason:o,closureFile:R,archived:a}}function Q(){let e=process.argv[2],o=process.argv.includes("--json"),r=process.argv.slice(3).filter(n=>n!=="--json"),t;switch(e){case"init":{let n={featureName:"",branch:"",description:""};for(let i=0;i<r.length;i++)switch(r[i]){case"--name":n.featureName=r[++i];break;case"--branch":n.branch=r[++i];break;case"--desc":n.description=r.slice(++i).join(" "),i=r.length;break;case"--project":n.projectName=r[++i];break;case"--create-branch":n.createBranch=!0;break}if(!n.featureName||!n.branch){t={error:"Required: --name <name> --branch <branch> --desc <description>"};break}n.description||(n.description=n.featureName),t=J(n);break}case"archive":{let n=r[0],i=r.includes("--project")?r[r.indexOf("--project")+1]:void 0;if(!n){t={error:"Required: feature name"};break}t=W(n,i);break}case"close":{let n=r[0],i="Cancelled",a="cancelled",g;for(let l=1;l<r.length;l++)switch(r[l]){case"--reason":i=r.slice(++l).join(" "),l=r.length;break;case"--status":a=r[++l];break;case"--project":g=r[++l];break}if(!n){t={error:"Required: feature name"};break}t=K(n,i,a,g);break}default:t={error:`Unknown command: ${e}. Use: init, archive, close`}}if(o)console.log(JSON.stringify(t,null,2));else switch(t.error&&(console.log(`\u274C ${t.error}`),process.exit(1)),t.command){case"init":console.log(`
\u2705 Feature "${t.featureName}" inizializzata`),console.log(`  Branch: ${t.branch}`),console.log(`  Dir: ${t.featureDir}`),t.archived&&console.log(`  Archiviato: ${t.archived}`);break;case"archive":console.log(`
\u{1F4E6} Archiviato in v${t.archiveVersion}`),console.log(`  Path: ${t.archivePath}`);break;case"close":console.log(`
\u{1F512} Feature "${t.featureName}" chiusa`),console.log(`  Reason: ${t.reason}`),console.log(`  Closure: ${t.closureFile}`),t.archived&&console.log(`  Archiviato: ${t.archived}`);break}}Q();

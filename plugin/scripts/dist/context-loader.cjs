"use strict";var F=Object.create;var R=Object.defineProperty;var L=Object.getOwnPropertyDescriptor;var X=Object.getOwnPropertyNames;var x=Object.getPrototypeOf,D=Object.prototype.hasOwnProperty;var v=(e,r,s,n)=>{if(r&&typeof r=="object"||typeof r=="function")for(let t of X(r))!D.call(e,t)&&t!==s&&R(e,t,{get:()=>r[t],enumerable:!(n=L(r,t))||n.enumerable});return e};var C=(e,r,s)=>(s=e!=null?F(x(e)):{},v(r||!e||!e.__esModule?R(s,"default",{value:e,enumerable:!0}):s,e));var a=require("fs"),i=require("path");var j=C(require("better-sqlite3"),1),l=require("fs"),p=require("path"),w=require("os");var I=`
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
`;var g=(0,p.join)((0,w.homedir)(),".claude-project-flow"),U=(0,p.join)(g,"project-flow.db"),d=null;function N(){return d||((0,l.existsSync)(g)||(0,l.mkdirSync)(g,{recursive:!0}),d=new j.default(U),d.pragma("journal_mode = WAL"),d.pragma("foreign_keys = ON"),d.exec(I),b(d),d)}var m=(0,p.join)(g,"settings.json");function f(){if(!(0,l.existsSync)(m)){let e={knowledge_paths:[],default_projects_path:"",project_overrides:{}};return(0,l.writeFileSync)(m,JSON.stringify(e,null,"	")+`
`),e}return JSON.parse((0,l.readFileSync)(m,"utf-8"))}function b(e){let r=e.prepare("PRAGMA table_info('features')").all(),s=new Set(r.map(n=>n.name));s.has("author")||e.exec("ALTER TABLE features ADD COLUMN author TEXT"),s.has("last_modified_by")||e.exec("ALTER TABLE features ADD COLUMN last_modified_by TEXT")}function T(e){try{return(0,a.readFileSync)(e,"utf-8")}catch{return null}}function S(e){try{return JSON.parse((0,a.readFileSync)(e,"utf-8"))}catch{return null}}function u(e){try{return(0,a.statSync)(e).isDirectory()}catch{return!1}}function y(e,r){let s={featureName:r,featureDir:e,definition:T((0,i.join)(e,"feature-definition.md")),requirements:T((0,i.join)(e,"requirements","requirements.md")),requirementsStatus:S((0,i.join)(e,"context",".requirements-status.json")),plans:[],plansStatus:S((0,i.join)(e,"context",".plans-status.json")),sessionLog:T((0,i.join)(e,"context","session-log.md")),discoveries:S((0,i.join)(e,"context",".pending-discoveries.json")),contextFiles:{},dbRecord:null},n=(0,i.join)(e,"plans");if(u(n))try{for(let o of(0,a.readdirSync)(n))if((0,i.extname)(o)===".md"){let c=T((0,i.join)(n,o));c&&s.plans.push({name:(0,i.basename)(o,".md"),content:c})}}catch{}let t=(0,i.join)(e,"context");if(u(t))try{for(let o of(0,a.readdirSync)(t))if(!(o.startsWith(".")||o==="session-log.md")&&(0,i.extname)(o)===".md"){let c=T((0,i.join)(t,o));c&&(s.contextFiles[o]=c)}}catch{}try{let o=N(),c=e.split("/"),E=c.indexOf("features"),h=c.slice(0,E).pop()??"",_=o.prepare("SELECT id FROM projects WHERE name = ?").get(h);_&&(s.dbRecord=o.prepare("SELECT * FROM features WHERE project_id = ? AND name = ? ORDER BY version DESC LIMIT 1").get(_.id,r))}catch{}return s}function O(e,r){let s={projectName:r,projectDir:e,definition:T((0,i.join)(e,"project-definition.md")),features:[],dbRecord:null},n=(0,i.join)(e,"features");if(u(n))try{for(let t of(0,a.readdirSync)(n,{withFileTypes:!0}))!t.isDirectory()||t.name==="Archive"||t.name.startsWith(".")||s.features.push(y((0,i.join)(n,t.name),t.name))}catch{}try{let t=N();s.dbRecord=t.prepare("SELECT * FROM projects WHERE name = ?").get(r)}catch{}return s}function k(e){let s=f().default_projects_path;if(!s)return null;try{for(let n of(0,a.readdirSync)(s,{withFileTypes:!0})){if(!n.isDirectory())continue;let t=(0,i.join)(s,n.name,"features",e);if(u(t))return t}}catch{}return null}function $(){let e=process.argv.slice(2).filter(t=>t!=="--json"),r=process.argv.includes("--json"),s=e.indexOf("--project"),n;if(s>=0&&e[s+1]){let t=e[s+1],o=f(),c=o.project_overrides[t]??(0,i.join)(o.default_projects_path,t);u(c)?n=O(c,t):n={error:`Project directory not found: ${c}`}}else if(e[0]){let t=e[0];if(u(t)&&(0,a.existsSync)((0,i.join)(t,"feature-definition.md"))){let o=(0,i.basename)(t);n=y(t,o)}else{let o=k(t);o?n=y(o,t):n={error:`Feature "${t}" not found in any project`}}}else{let o=f().default_projects_path;if(!o||!u(o))n={error:`Projects path not configured or doesn't exist: ${o}`};else{let c=[];for(let E of(0,a.readdirSync)(o,{withFileTypes:!0}))!E.isDirectory()||E.name.startsWith(".")||c.push(O((0,i.join)(o,E.name),E.name));n={projects:c}}}if(r)console.log(JSON.stringify(n,null,2));else if(n.error&&(console.log(`\u274C ${n.error}`),process.exit(1)),n.projects)for(let t of n.projects)A(t);else n.features?A(n):n.featureName&&P(n)}function A(e){console.log(`
\u{1F4C1} ${e.projectName} (${e.features.length} features)`);for(let r of e.features){let s=r.dbRecord?.status??"?",n=r.requirementsStatus?.coverage??"-",t=r.plansStatus?.plans?.map(o=>`${o.name}: ${o.progress?.done??"?"}/${o.progress?.total??"?"}`).join(", ")??"-";console.log(`  \u251C\u2500 ${r.featureName} [${s}] req:${n}% plans:${t}`)}}function P(e){if(console.log(`
\u{1F4CB} Feature: ${e.featureName}`),console.log(`  Status: ${e.dbRecord?.status??"?"}`),console.log(`  Definition: ${e.definition?"yes":"no"}`),console.log(`  Requirements: ${e.requirements?"yes":"no"} (${e.requirementsStatus?.coverage??"-"}%)`),console.log(`  Plans: ${e.plans.length}`),e.plansStatus?.plans)for(let r of e.plansStatus.plans)console.log(`    - ${r.name} [${r.status}] ${r.progress.done}/${r.progress.total}`);console.log(`  Session log: ${e.sessionLog?"yes":"no"}`),console.log(`  Discoveries: ${e.discoveries?"yes":"no"}`),console.log(`  Context files: ${Object.keys(e.contextFiles).length}`)}$();

#!/usr/bin/env node
"use strict";var k=Object.create;var I=Object.defineProperty;var P=Object.getOwnPropertyDescriptor;var B=Object.getOwnPropertyNames;var G=Object.getPrototypeOf,H=Object.prototype.hasOwnProperty;var W=(e,n,s,o)=>{if(n&&typeof n=="object"||typeof n=="function")for(let t of B(n))!H.call(e,t)&&t!==s&&I(e,t,{get:()=>n[t],enumerable:!(o=P(n,t))||o.enumerable});return e};var V=(e,n,s)=>(s=e!=null?k(G(e)):{},W(n||!e||!e.__esModule?I(s,"default",{value:e,enumerable:!0}):s,e));var S=require("child_process"),X=require("fs");var F=V(require("better-sqlite3"),1),l=require("fs"),h=require("path"),C=require("os");var w=`
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
`;var g=(0,h.join)((0,C.homedir)(),".claude-project-flow"),Y=(0,h.join)(g,"project-flow.db"),d=null;function E(){return d||((0,l.existsSync)(g)||(0,l.mkdirSync)(g,{recursive:!0}),d=new F.default(Y),d.pragma("journal_mode = WAL"),d.pragma("foreign_keys = ON"),d.exec(w),J(d),d)}var y=(0,h.join)(g,"settings.json");function T(){if(!(0,l.existsSync)(y)){let e={knowledge_paths:[],default_projects_path:"",project_overrides:{}};return(0,l.writeFileSync)(y,JSON.stringify(e,null,"	")+`
`),e}return JSON.parse((0,l.readFileSync)(y,"utf-8"))}function J(e){let n=e.prepare("PRAGMA table_info('features')").all(),s=new Set(n.map(o=>o.name));s.has("author")||e.exec("ALTER TABLE features ADD COLUMN author TEXT"),s.has("last_modified_by")||e.exec("ALTER TABLE features ADD COLUMN last_modified_by TEXT")}var m=require("fs"),p=require("path");var O=/^#\s+(?:Feature|Project):\s*(.+)/m,K=/^##\s+Branch\s*\n+`([^`]+)`/m,q=/^##\s+Status\s*\n+(\S+)/m,Q=/^##\s+Created\s*\n+(\S+)/m,z=/^##\s+Description\s*\n+([\s\S]*?)(?=\n##\s|\n---|\Z)/m,Z=/\*\*Ultima modifica:\*\*\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(.+)/;function U(e){let n=e.match(O),s=e.match(z),o=e.match(K),t=e.match(q),r=e.match(Q),a=e.match(Z);return{name:n?.[1]?.trim()??"",description:s?.[1]?.trim()??"",branch:o?.[1]?.trim()??null,status:t?.[1]?.trim()??"draft",created:r?.[1]?.trim()??null,author:a?.[1]?.trim()??null,lastModifiedBy:a?.[1]?.trim()??null}}function N(e){let n=e.match(O),s=e.match(/^##\s+Overview\s*\n+([\s\S]*?)(?=\n##\s|\n---|\Z)/m);return{name:n?.[1]?.trim()??"",overview:s?.[1]?.trim()??""}}function j(e){try{return(0,m.readFileSync)(e,"utf-8")}catch{return null}}function _(e){try{return(0,m.statSync)(e).isDirectory()}catch{return!1}}function L(e,n){let s=(0,p.join)(e,"features");if(!_(s))return[];let o=[];try{for(let t of(0,m.readdirSync)(s,{withFileTypes:!0})){if(!t.isDirectory()||t.name==="Archive"||t.name.startsWith("."))continue;let r=(0,p.join)(s,t.name),a=(0,p.join)(r,"feature-definition.md"),i=j(a);if(!i)continue;let c=U(i);c.name||(c.name=t.name),o.push({projectName:n,dirName:t.name,metadata:c,featureDir:r})}}catch{}return o}function R(){let e=T(),n=[],s=e.default_projects_path;if(!s||!_(s))return n;try{for(let o of(0,m.readdirSync)(s,{withFileTypes:!0})){if(!o.isDirectory()||o.name.startsWith("."))continue;let t=(0,p.join)(s,o.name),r=j((0,p.join)(t,"project-definition.md")),a=r?N(r):{name:o.name,overview:""};a.name||(a.name=o.name);let i=L(t,a.name);n.push({name:a.name,path:t,overview:a.overview,features:i})}}catch{}for(let[o,t]of Object.entries(e.project_overrides)){if(!_(t)||n.some(c=>c.name===o))continue;let r=j((0,p.join)(t,"project-definition.md")),a=r?N(r):{name:o,overview:""},i=L(t,a.name||o);n.push({name:a.name||o,path:t,overview:a.overview,features:i})}return n}function D(){let e=E(),n=R(),s={projectsCreated:[],projectsUnchanged:[],featuresCreated:[],featuresUpdated:[],featuresDeletedRemote:[],errors:[]},o=new Set;for(let t of n){let r=e.prepare("SELECT id FROM projects WHERE name = ?").get(t.name),a;if(r)a=r.id,s.projectsUnchanged.push(t.name);else try{a=e.prepare("INSERT INTO projects (name, path, type) VALUES (?, ?, ?)").run(t.name,t.path,"app").lastInsertRowid,s.projectsCreated.push(t.name)}catch(c){s.errors.push(`Project "${t.name}": ${c.message}`);continue}for(let c of t.features){let f=`${t.name}/${c.metadata.name}`;o.add(f);try{ee(e,a,c,s)}catch(x){s.errors.push(`Feature "${f}": ${x.message}`)}}let i=e.prepare("SELECT id, name, status FROM features WHERE project_id = ? AND closed_at IS NULL AND status != 'deleted-remote'").all(a);for(let c of i){let f=`${t.name}/${c.name}`;o.has(f)||(e.prepare("UPDATE features SET status = 'deleted-remote' WHERE id = ?").run(c.id),s.featuresDeletedRemote.push(f))}}return s}function ee(e,n,s,o){let{metadata:t}=s,r=e.prepare("SELECT id, status, branch, author, last_modified_by FROM features WHERE project_id = ? AND name = ? AND closed_at IS NULL").get(n,t.name);if(!r)e.prepare("INSERT INTO features (project_id, name, branch, status, author, last_modified_by) VALUES (?, ?, ?, ?, ?, ?)").run(n,t.name,t.branch,t.status,t.author,t.lastModifiedBy),o.featuresCreated.push(`${s.projectName}/${t.name}`);else{let a=[],i=[];t.status&&t.status!==r.status&&(a.push("status = ?"),i.push(t.status)),t.branch&&t.branch!==r.branch&&(a.push("branch = ?"),i.push(t.branch)),t.lastModifiedBy&&t.lastModifiedBy!==r.last_modified_by&&(a.push("last_modified_by = ?"),i.push(t.lastModifiedBy)),t.author&&!r.author&&(a.push("author = ?"),i.push(t.author)),a.length>0&&(i.push(r.id),e.prepare(`UPDATE features SET ${a.join(", ")} WHERE id = ?`).run(...i),o.featuresUpdated.push(`${s.projectName}/${t.name}`))}}function te(){return T().default_projects_path}function A(e){try{return(0,S.execSync)("git rev-parse --is-inside-work-tree",{cwd:e,stdio:"pipe"}),!0}catch{return!1}}function b(e){try{return(0,S.execSync)("git remote",{cwd:e,encoding:"utf-8",stdio:"pipe"}).trim().length>0}catch{return!1}}function u(e,n){return(0,S.execSync)(e,{cwd:n,encoding:"utf-8",stdio:"pipe"}).trim()}function $(e){if(!A(e))return{output:"",conflicts:[],hasConflicts:!1};if(!b(e))return{output:"No remote configured",conflicts:[],hasConflicts:!1};let n,s=[];try{n=u("git pull --no-rebase",e)}catch(o){n=o.stdout?.toString()??o.message;try{s=u("git status --porcelain",e).split(`
`).filter(r=>r.startsWith("UU")||r.startsWith("AA")||r.startsWith("DD")).map(r=>r.substring(3).trim())}catch{}}return{output:n,conflicts:s,hasConflicts:s.length>0}}function v(e){if(!A(e))return{summary:"Not a git repo",committed:!1,pushed:!1,output:""};if(!b(e))return{summary:"No remote configured",committed:!1,pushed:!1,output:""};let n=u("git status --porcelain",e);if(!n)return{summary:"No changes to push",committed:!1,pushed:!1,output:""};let s=n.split(`
`).filter(Boolean),o=se(s),t="";try{return u("git add -A",e),t+=u(`git commit -m "${o}"`,e)+`
`,t+=u("git push",e),{summary:o,committed:!0,pushed:!0,output:t}}catch(r){return{summary:o,committed:!1,pushed:!1,output:r.message}}}function se(e){let n=[];for(let t of e){let a=t.substring(3).trim().split("/"),i=a.indexOf("features");if(i>=0&&i+1<a.length){let c=a[i+1],f=a[i+2]??"definition";n.push(`${c}/${f}`)}else n.push(a[a.length-1])}let s=[...new Set(n)];return`docs: sync ${s.length<=3?s.join(", "):`${s.slice(0,3).join(", ")} (+${s.length-3})`}`}function ne(e){let n={hasRemote:!1,isGitRepo:!1,localChanges:[],behindRemote:!1,aheadOfRemote:!1,dbDifferences:[]};if(n.isGitRepo=A(e),!n.isGitRepo)return n;n.hasRemote=b(e);let s=u("git status --porcelain",e);if(s&&(n.localChanges=s.split(`
`).filter(Boolean)),n.hasRemote)try{u("git fetch --quiet",e);let r=u("git rev-list HEAD --not @{upstream} --count",e),a=u("git rev-list @{upstream} --not HEAD --count",e);n.aheadOfRemote=parseInt(r)>0,n.behindRemote=parseInt(a)>0}catch{}let o=R(),t=E();for(let r of o){let a=t.prepare("SELECT id FROM projects WHERE name = ?").get(r.name);if(!a){n.dbDifferences.push(`Project "${r.name}" exists in files but not in DB`);continue}for(let i of r.features){let c=t.prepare("SELECT status, branch FROM features WHERE project_id = ? AND name = ? AND closed_at IS NULL").get(a.id,i.metadata.name);c?c.status!==i.metadata.status&&n.dbDifferences.push(`Feature "${r.name}/${i.metadata.name}" status: DB="${c.status}" file="${i.metadata.status}"`):n.dbDifferences.push(`Feature "${r.name}/${i.metadata.name}" exists in files but not in DB`)}}return n}function oe(){let e=process.argv[2]||"all",n=process.argv.includes("--json"),s=te();if(!s||!(0,X.existsSync)(s)){let t={command:e,success:!1,error:`Docs path not configured or doesn't exist: ${s}. Run /claude-project-flow:setup first.`};M(t,n),process.exit(1)}let o;switch(e){case"pull":{let t=$(s);if(t.hasConflicts)o={command:e,success:!1,pull:t,error:`Conflicts detected in: ${t.conflicts.join(", ")}. Resolve manually then run /sync again.`};else{let r=D();o={command:e,success:!0,pull:t,reconcile:r}}break}case"push":{let t=v(s);o={command:e,success:t.pushed||!t.summary.includes("No"),push:t};break}case"status":{let t=ne(s);o={command:e,success:!0,status:t};break}case"all":{let t=$(s);if(t.hasConflicts){o={command:e,success:!1,pull:t,error:`Conflicts detected in: ${t.conflicts.join(", ")}. Resolve manually then run /sync again.`};break}let r=D(),a=v(s);o={command:e,success:!0,pull:t,reconcile:r,push:a};break}default:o={command:e,success:!1,error:`Unknown command: ${e}. Use: pull, push, status, all`}}M(o,n),process.exit(o.success?0:1)}function M(e,n){if(n){console.log(JSON.stringify(e,null,2));return}if(console.log(`
=== Sync: ${e.command} ===
`),e.error&&console.log(`\u274C Error: ${e.error}
`),e.pull&&(console.log("\u{1F4E5} Pull:"),e.pull.hasConflicts?console.log(`  \u26A0\uFE0F  Conflicts: ${e.pull.conflicts.join(", ")}`):console.log(`  ${e.pull.output||"Already up to date"}`)),e.reconcile){let s=e.reconcile;console.log(`
\u{1F504} Reconcile:`),s.projectsCreated.length&&console.log(`  Projects created: ${s.projectsCreated.join(", ")}`),s.featuresCreated.length&&console.log(`  Features created: ${s.featuresCreated.join(", ")}`),s.featuresUpdated.length&&console.log(`  Features updated: ${s.featuresUpdated.join(", ")}`),s.featuresDeletedRemote.length&&console.log(`  Features deleted remote: ${s.featuresDeletedRemote.join(", ")}`),s.errors.length&&console.log(`  Errors: ${s.errors.join(", ")}`),!s.projectsCreated.length&&!s.featuresCreated.length&&!s.featuresUpdated.length&&!s.featuresDeletedRemote.length&&console.log("  Everything in sync")}if(e.push&&(console.log(`
\u{1F4E4} Push:`),e.push.committed?(console.log(`  Committed: ${e.push.summary}`),console.log(`  Pushed: ${e.push.pushed?"yes":"no"}`)):console.log(`  ${e.push.summary}`)),e.status){let s=e.status;console.log("\u{1F4CA} Status:"),console.log(`  Git repo: ${s.isGitRepo?"yes":"no"}`),console.log(`  Remote: ${s.hasRemote?"yes":"no"}`),console.log(`  Local changes: ${s.localChanges.length||"none"}`),s.hasRemote&&(console.log(`  Behind remote: ${s.behindRemote?"yes":"no"}`),console.log(`  Ahead of remote: ${s.aheadOfRemote?"yes":"no"}`)),s.dbDifferences.length&&(console.log("  DB differences:"),s.dbDifferences.forEach(o=>console.log(`    - ${o}`)))}console.log("")}oe();

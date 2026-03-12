"use strict";var oe=Object.create;var Y=Object.defineProperty;var se=Object.getOwnPropertyDescriptor;var re=Object.getOwnPropertyNames;var ie=Object.getPrototypeOf,ae=Object.prototype.hasOwnProperty;var ce=(e,t,o,u)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of re(t))!ae.call(e,i)&&i!==o&&Y(e,i,{get:()=>t[i],enumerable:!(u=se(t,i))||u.enumerable});return e};var de=(e,t,o)=>(o=e!=null?oe(ie(e)):{},ce(t||!e||!e.__esModule?Y(o,"default",{value:e,enumerable:!0}):o,e));var a=require("fs"),n=require("path"),te=require("crypto");var z=de(require("better-sqlite3"),1),S=require("fs"),k=require("path"),Q=require("os");var K=`
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
`;var C=(0,k.join)((0,Q.homedir)(),".claude-project-flow"),Ee=(0,k.join)(C,"project-flow.db"),R=null;function Z(){return R||((0,S.existsSync)(C)||(0,S.mkdirSync)(C,{recursive:!0}),R=new z.default(Ee),R.pragma("journal_mode = WAL"),R.pragma("foreign_keys = ON"),R.exec(K),Te(R),R)}var V=(0,k.join)(C,"settings.json");function ee(){if(!(0,S.existsSync)(V)){let t={memory_path:""};return(0,S.writeFileSync)(V,JSON.stringify(t,null,"	")+`
`),t}let e=JSON.parse((0,S.readFileSync)(V,"utf-8"));return"projects_path"in e&&!("memory_path"in e)?e.memory_path=e.projects_path:"default_projects_path"in e&&!("memory_path"in e)&&(e.memory_path=e.default_projects_path),{memory_path:e.memory_path||""}}function f(e,t,o,u){e.prepare(`PRAGMA table_info('${t}')`).all().some(E=>E.name===o)||e.exec(`ALTER TABLE ${t} ADD COLUMN ${o} ${u}`)}function Te(e){f(e,"features","author","TEXT"),f(e,"features","last_modified_by","TEXT"),f(e,"features","definition","TEXT"),f(e,"features","description","TEXT"),f(e,"features","session_log","TEXT"),f(e,"features","requirements_status","TEXT"),f(e,"features","plans_status","TEXT"),f(e,"features","pending_discoveries","TEXT"),f(e,"projects","definition","TEXT"),f(e,"projects","overview","TEXT"),f(e,"knowledge_docs","source","TEXT DEFAULT 'manual'")}function y(e){try{return(0,a.readFileSync)(e,"utf-8")}catch{return null}}function H(e){try{return JSON.parse((0,a.readFileSync)(e,"utf-8"))}catch{return null}}function O(e){try{return(0,a.statSync)(e).isDirectory()}catch{return!1}}function le(e){let t=(0,n.extname)(e).toLowerCase();return[".pdf",".png",".jpg",".jpeg",".gif",".bmp",".svg",".webp",".doc",".docx",".xls",".xlsx",".ppt",".pptx",".zip",".tar",".gz"].includes(t)}function ue(e){return e.match(/^##\s+Status\s*\n+(\S+)/m)?.[1]??"draft"}function pe(e){return e.match(/^##\s+Description\s*\n+([\s\S]*?)(?=\n##|\n$)/m)?.[1]?.trim()??""}function fe(e){return e.match(/^##\s+Branch\s*\n+`([^`]+)`/m)?.[1]??null}function me(e){return e.match(/^##\s+Overview\s*\n+([\s\S]*?)(?=\n##|\n$)/m)?.[1]?.trim()??""}function ge(e,t){let o=Z(),u={success:!0,dryRun:t,memoryPath:e,projects:[],knowledge:[],errors:[]},i=(0,n.join)(e,"projects"),E=O(i)?i:e,c=(0,n.join)(e,"knowledge");if(O(E))for(let m of(0,a.readdirSync)(E,{withFileTypes:!0})){if(m.name==="knowledge"||m.name==="projects"||!m.isDirectory()||m.name.startsWith("."))continue;let w=(0,n.join)(E,m.name),g=m.name,L={name:g,definition:!1,features:[]},h=y((0,n.join)(w,"project-definition.md")),l=h?me(h):"";if(!t)try{let s=o.prepare("SELECT id, path FROM projects WHERE name = ?").get(g);s?o.prepare("UPDATE projects SET definition = ?, overview = ? WHERE id = ?").run(h,l,s.id):o.prepare("INSERT INTO projects (name, path, definition, overview) VALUES (?, ?, ?, ?)").run(g,w,h,l)}catch(s){u.errors.push(`Project ${g}: ${s.message}`)}L.definition=!!h;let _=(0,n.join)(w,"features");if(O(_))for(let s of(0,a.readdirSync)(_,{withFileTypes:!0})){if(!s.isDirectory()||s.name==="Archive"||s.name.startsWith("."))continue;let T=(0,n.join)(_,s.name),j=s.name,p={name:j,definition:!1,documents:[],attachments:[],sessionLog:!1,status:"draft"};try{let d=y((0,n.join)(T,"feature-definition.md")),D=d?pe(d):"",v=d?ue(d):"draft",J=d?fe(d):null,G=y((0,n.join)(T,"context","session-log.md")),F=H((0,n.join)(T,"context",".requirements-status.json")),U=H((0,n.join)(T,"context",".plans-status.json")),x=H((0,n.join)(T,"context",".pending-discoveries.json"));if(p.definition=!!d,p.sessionLog=!!G,p.status=v,!t){let $=o.prepare("SELECT id FROM projects WHERE name = ?").get(g);if(!$)continue;let M=o.prepare("SELECT id FROM features WHERE project_id = ? AND name = ? AND closed_at IS NULL ORDER BY version DESC LIMIT 1").get($.id,j),X;M?(o.prepare(`UPDATE features SET definition = ?, description = ?, status = ?,
									branch = COALESCE(?, branch), session_log = ?, requirements_status = ?,
									plans_status = ?, pending_discoveries = ? WHERE id = ?`).run(d,D,v,J,G,F?JSON.stringify(F):null,U?JSON.stringify(U):null,x?JSON.stringify(x):null,M.id),X=M.id):X=o.prepare(`INSERT INTO features
									(project_id, name, branch, status, definition, description,
									session_log, requirements_status, plans_status, pending_discoveries)
									VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run($.id,j,J,v,d,D,G,F?JSON.stringify(F):null,U?JSON.stringify(U):null,x?JSON.stringify(x):null).lastInsertRowid;let b=o.prepare(`INSERT INTO feature_documents (feature_id, type, name, content)
								VALUES (?, ?, ?, ?) ON CONFLICT(feature_id, type, name) DO UPDATE SET
								content = excluded.content, updated_at = datetime('now')`),W=y((0,n.join)(T,"requirements","requirements.md"));W&&(b.run(X,"requirements","requirements",W),p.documents.push({type:"requirements",name:"requirements"}));let B=(0,n.join)(T,"plans");if(O(B))for(let r of(0,a.readdirSync)(B)){if((0,n.extname)(r)!==".md")continue;let I=y((0,n.join)(B,r));if(I){let A=(0,n.basename)(r,".md");b.run(X,"plan",A,I),p.documents.push({type:"plan",name:A})}}let P=(0,n.join)(T,"context");if(O(P))for(let r of(0,a.readdirSync)(P)){if(r.startsWith(".")||r==="session-log.md"||(0,n.extname)(r)!==".md")continue;let I=y((0,n.join)(P,r));if(I){let A=(0,n.basename)(r,".md");b.run(X,"context",A,I),p.documents.push({type:"context",name:A})}}let q=(0,n.join)(T,"requirements");if(O(q)){for(let r of(0,a.readdirSync)(q))if(le(r))try{let I=(0,a.readFileSync)((0,n.join)(q,r)),A=(0,n.extname)(r).toLowerCase(),ne={".pdf":"application/pdf",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".gif":"image/gif",".svg":"image/svg+xml",".doc":"application/msword",".docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",".xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"};o.prepare(`INSERT INTO feature_attachments (feature_id, name, mime_type, size, data)
											VALUES (?, ?, ?, ?, ?) ON CONFLICT(feature_id, name) DO UPDATE SET
											data = excluded.data, size = excluded.size`).run(X,r,ne[A]||"application/octet-stream",I.length,I),p.attachments.push(r)}catch{}}}}catch(d){u.errors.push(`Feature ${g}/${j}: ${d.message}`)}L.features.push(p)}u.projects.push(L)}if(O(c)){let g=function(L,h){try{for(let l of(0,a.readdirSync)(L,{withFileTypes:!0})){if(l.name.startsWith(".")||l.name==="Archive")continue;let _=(0,n.join)(L,l.name);if(l.isDirectory()){let s=["patterns","conventions","libraries"].includes(l.name)?l.name.replace(/s$/,""):h;g(_,s)}else if(l.isFile()&&(0,n.extname)(l.name)===".md"){let s=y(_);if(!s)return;let T=(0,te.createHash)("md5").update(s).digest("hex"),p=s.match(/^#\s+(.+)/m)?.[1]??(0,n.basename)(l.name,".md"),d=h??"general";if(u.knowledge.push({category:d,title:p,path:_}),!t&&w)try{let D=o.prepare("SELECT id, content_hash FROM knowledge_docs WHERE file_path = ?").get(_);D?D.content_hash!==T&&o.prepare("UPDATE knowledge_docs SET content = ?, content_hash = ?, source = ?, updated_at = datetime('now') WHERE id = ?").run(s,T,"imported",D.id):w.run(null,d,_,p,s,T)}catch{}}}}catch{}};var N=g;let m=t?null:o.prepare(`INSERT INTO knowledge_docs
			(project, category, title, content, content_hash, source)
			VALUES (?, ?, ?, ?, ?, 'imported')
			ON CONFLICT(file_path) DO UPDATE SET
			content = excluded.content, content_hash = excluded.content_hash,
			source = 'imported', updated_at = datetime('now')
			WHERE content_hash != excluded.content_hash`),w=t?null:o.prepare(`INSERT INTO knowledge_docs
			(project, category, file_path, title, content, content_hash, source)
			VALUES (?, ?, ?, ?, ?, ?, 'imported')`);g(c)}return u}function Ne(){let e=process.argv.slice(2),t=e.includes("--json"),o=e.includes("--dry-run"),i=ee().memory_path;if(!i||!(0,a.existsSync)(i)){let c={success:!1,error:`Memory path not configured or doesn't exist: ${i}`};console.log(t?JSON.stringify(c,null,2):`Error: ${c.error}`),process.exit(1)}let E=ge(i,o);if(t)console.log(JSON.stringify(E,null,2));else{console.log(`
=== Import Legacy ${o?"(DRY RUN)":""} ===
`),console.log(`Memory path: ${i}`);for(let c of E.projects){console.log(`
Project: ${c.name} (definition: ${c.definition?"yes":"no"})`);for(let N of c.features)console.log(`  Feature: ${N.name} [${N.status}]`),console.log(`    Definition: ${N.definition?"yes":"no"}, Session log: ${N.sessionLog?"yes":"no"}`),N.documents.length&&console.log(`    Documents: ${N.documents.map(m=>`${m.type}/${m.name}`).join(", ")}`),N.attachments.length&&console.log(`    Attachments: ${N.attachments.join(", ")}`)}if(E.knowledge.length){console.log(`
Knowledge: ${E.knowledge.length} docs imported`);for(let c of E.knowledge)console.log(`  [${c.category}] ${c.title}`)}if(E.errors.length){console.log(`
Errors:`);for(let c of E.errors)console.log(`  - ${c}`)}console.log("")}}Ne();

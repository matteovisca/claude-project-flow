#!/usr/bin/env node
"use strict";var i=require("fs");var c=require("child_process");function m(t){let r={encoding:"utf-8",stdio:"pipe",cwd:t},e=null,n=null;try{e=(0,c.execSync)("git config user.name",r).trim()||null}catch{}try{n=(0,c.execSync)("git config user.email",r).trim()||null}catch{}return{name:e,email:n}}function a(t){return m(t).name}var s=`
---
`,l="**Ultima modifica:**";function u(){return new Date().toISOString().slice(0,10)}function f(t,r,e){let n=a(e);if(!n)return t;let g=`${l} ${n} | ${u()} | ${r}`,o=t.lastIndexOf(s);return o>=0&&t.substring(o+s.length).trimStart().startsWith(l)?t.substring(0,o)+s+g+`
`:t.trimEnd()+`
`+s+g+`
`}function p(t){let r=a(t);return r?`<!-- @${r} ${u()} -->`:""}var d=process.argv[2];switch(d){case"footer":{let t=process.argv[3],r=process.argv.slice(4).join(" ")||"Updated";t||(console.error("Usage: sign.cjs footer <file> <description>"),process.exit(1));try{let e=(0,i.readFileSync)(t,"utf-8"),n=f(e,r);(0,i.writeFileSync)(t,n),console.log(JSON.stringify({success:!0,file:t}))}catch(e){console.error(JSON.stringify({success:!1,error:e.message})),process.exit(1)}break}case"tag":{let t=p();console.log(t||"");break}default:console.error("Usage: sign.cjs <footer|tag> [args]"),process.exit(1)}

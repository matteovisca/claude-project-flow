#!/usr/bin/env node
const cmd = process.argv[2];
const args = process.argv.slice(3);

async function main() {
	switch (cmd) {
		case "context":
		case "start-feature":
		case "next-number":
		case "validate-config":
			console.error(`not implemented: ${cmd}`);
			process.exit(1);
		default:
			console.error(`usage: pf <context|start-feature|next-number|validate-config> [args]`);
			process.exit(2);
	}
}

main().catch((err) => {
	console.error(JSON.stringify({ error: err.message, hint: "unexpected failure" }));
	process.exit(2);
});

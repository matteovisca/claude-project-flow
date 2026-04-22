#!/usr/bin/env node
import { validateConfig } from "./commands/validate-config.js";
import { context } from "./commands/context.js";
import { nextNumber } from "./commands/next-number.js";
import { startFeature } from "./commands/start-feature.js";

const cmd = process.argv[2];
const args = process.argv.slice(3);

async function main() {
	switch (cmd) {
		case "validate-config":
			process.exit(validateConfig(args));
		case "context":
			process.exit(context(args));
		case "next-number":
			process.exit(nextNumber(args));
		case "start-feature":
			process.exit(startFeature(args));
		default:
			console.error(`usage: pf <context|start-feature|next-number|validate-config> [args]`);
			process.exit(2);
	}
}

main().catch((err) => {
	console.error(JSON.stringify({ error: err.message, hint: "unexpected failure" }));
	process.exit(2);
});

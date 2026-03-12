#!/usr/bin/env node
// signs a markdown file with git user footer and optional inline tag
// usage: node sign.cjs footer <file> <description>
//        node sign.cjs tag    — outputs an inline tag to stdout

import { readFileSync, writeFileSync } from 'fs';
import { updateFooter, inlineTag } from './doc-signature.js';

const command = process.argv[2];

switch (command) {
	case 'footer': {
		const filePath = process.argv[3];
		const description = process.argv.slice(4).join(' ') || 'Updated';
		if (!filePath) {
			console.error('Usage: sign.cjs footer <file> <description>');
			process.exit(1);
		}
		try {
			const content = readFileSync(filePath, 'utf-8');
			const signed = updateFooter(content, description);
			writeFileSync(filePath, signed);
			console.log(JSON.stringify({ success: true, file: filePath }));
		} catch (e: any) {
			console.error(JSON.stringify({ success: false, error: e.message }));
			process.exit(1);
		}
		break;
	}

	case 'tag': {
		const tag = inlineTag();
		console.log(tag || '');
		break;
	}

	default:
		console.error('Usage: sign.cjs <footer|tag> [args]');
		process.exit(1);
}

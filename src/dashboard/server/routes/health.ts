import { Hono } from 'hono';
import type { HealthResponse } from '../../shared/types.js';

const startTime = Date.now();

const app = new Hono();

app.get('/', (c) => {
	const response: HealthResponse = {
		status: 'ok',
		version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0',
		uptime: Math.floor((Date.now() - startTime) / 1000),
	};
	return c.json(response);
});

export default app;

declare const __VERSION__: string;

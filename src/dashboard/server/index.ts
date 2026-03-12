import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import healthRoutes from './routes/health.js';
import filesRoutes from './routes/files.js';
import watchRoutes from './routes/watch.js';
import featuresRoutes from './routes/features.js';
import projectsRoutes from './routes/projects.js';
import settingsRoutes from './routes/settings.js';
import knowledgeRoutes from './routes/knowledge.js';
import scriptsRoutes from './routes/scripts.js';

const app = new Hono();

// middleware
app.use('*', cors({ origin: '*' }));
app.use('*', logger());

// API routes
app.route('/api/health', healthRoutes);
app.route('/api/files', filesRoutes);
app.route('/api/files/watch', watchRoutes);
app.route('/api/features', featuresRoutes);
app.route('/api/projects', projectsRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/knowledge', knowledgeRoutes);
app.route('/api/scripts', scriptsRoutes);

// serve UI bundle — try to load from same dist directory as the server script
let uiHtml: string | null = null;
const uiCandidates = [
	resolve(dirname(process.argv[1] || '.'), 'dashboard-ui.html'),
	resolve(process.cwd(), 'plugin/scripts/dist/dashboard-ui.html'),
];
for (const candidate of uiCandidates) {
	if (existsSync(candidate)) {
		uiHtml = readFileSync(candidate, 'utf-8');
		break;
	}
}

// serve UI for all non-API routes (SPA client-side routing)
app.get('*', (c) => {
	if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/ws/')) {
		return c.json({ error: 'Not found' }, 404);
	}
	if (uiHtml) {
		return c.html(uiHtml);
	}
	return c.html(`<!DOCTYPE html><html><head><title>Dashboard</title></head><body style="background:#1e1e1e;color:#d4d4d4;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>UI bundle not found. Run <code>npm run build</code>.</p></body></html>`);
});

export default app;

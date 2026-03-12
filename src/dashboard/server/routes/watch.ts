import { Hono } from 'hono';
import { watch, type FSWatcher } from 'fs';
import { streamSSE } from 'hono/streaming';

const app = new Hono();

// active watchers per client
const watchers = new Set<FSWatcher>();

// GET /api/files/watch?path=<dir> — SSE stream of file changes
app.get('/', (c) => {
	const watchPath = c.req.query('path');
	if (!watchPath) return c.json({ error: 'path parameter required' }, 400);

	return streamSSE(c, async (stream) => {
		let watcher: FSWatcher | null = null;
		try {
			watcher = watch(watchPath, { recursive: true }, (eventType, filename) => {
				if (!filename) return;
				stream.writeSSE({
					event: 'file-change',
					data: JSON.stringify({ eventType, filename, path: watchPath, timestamp: Date.now() }),
				}).catch(() => {});
			});
			watchers.add(watcher);

			// keep connection alive with heartbeat
			while (true) {
				await stream.writeSSE({ event: 'heartbeat', data: '' });
				await stream.sleep(15000);
			}
		} catch {
			// client disconnected
		} finally {
			if (watcher) {
				watcher.close();
				watchers.delete(watcher);
			}
		}
	});
});

export default app;

import { useEffect, useState } from 'react';

interface BackupInfo {
	name: string;
	path: string;
	size: number;
	created: string;
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString();
}

export default function PluginSettings() {
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	const [dbPath, setDbPath] = useState('');
	const [dbSize, setDbSize] = useState(0);
	const [backups, setBackups] = useState<BackupInfo[]>([]);
	const [backingUp, setBackingUp] = useState(false);
	const [restoring, setRestoring] = useState(false);

	const loadInfo = async () => {
		try {
			const [settingsRes, backupsRes] = await Promise.all([
				fetch('/api/settings/plugin'),
				fetch('/api/settings/db/backups'),
			]);
			const settings = await settingsRes.json();
			setDbPath(settings.db_path ?? '');
			setDbSize(settings.db_size ?? 0);
			setBackups(await backupsRes.json());
		} catch { /* */ }
		setLoading(false);
	};

	useEffect(() => { loadInfo(); }, []);

	const doBackup = async () => {
		setBackingUp(true);
		setMessage(null);
		try {
			const res = await fetch('/api/settings/db/backup', { method: 'POST' });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			setMessage({ type: 'success', text: `Backup created (${formatSize(data.size)})` });
			loadInfo();
		} catch (err: any) {
			setMessage({ type: 'error', text: err.message });
		} finally {
			setBackingUp(false);
		}
	};

	const doRestore = async (backup: BackupInfo) => {
		if (!confirm(`Restore database from "${backup.name}"?\n\nA safety backup of the current DB will be created first.\nThe server will need to be restarted after restore.`)) return;
		setRestoring(true);
		setMessage(null);
		try {
			const res = await fetch('/api/settings/db/restore', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ file: backup.path }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			setMessage({ type: 'success', text: 'Database restored. Restart the server to load changes.' });
			loadInfo();
		} catch (err: any) {
			setMessage({ type: 'error', text: err.message });
		} finally {
			setRestoring(false);
		}
	};

	const doDeleteBackup = async (backup: BackupInfo) => {
		if (!confirm(`Delete backup "${backup.name}"?`)) return;
		try {
			await fetch(`/api/settings/db/backups/${encodeURIComponent(backup.name)}`, { method: 'DELETE' });
			loadInfo();
		} catch { /* */ }
	};

	if (loading) return <div className="page"><p style={{ color: 'var(--text-secondary)' }}>Loading...</p></div>;

	return (
		<div className="page">
			<h1 className="page-title">Plugin Settings</h1>

			{message && (
				<div className={`settings-message ${message.type}`}>{message.text}</div>
			)}

			{/* Database info */}
			<div className="card">
				<div className="card-header">
					<span className="card-title">
						<i className="fa-solid fa-database" style={{ marginRight: 8, color: 'var(--accent)' }} />
						Database
					</span>
					<div style={{ display: 'flex', gap: 6 }}>
						<a href="/api/settings/db/download" download="project-flow.db"
							style={{ padding: '4px 12px', fontSize: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
							<i className="fa-solid fa-download" style={{ marginRight: 6 }} />
							Download DB
						</a>
						<button className="primary" onClick={doBackup} disabled={backingUp}
							style={{ padding: '4px 12px', fontSize: 12 }}>
							<i className="fa-solid fa-box-archive" style={{ marginRight: 6 }} />
							{backingUp ? 'Creating...' : 'Backup'}
						</button>
					</div>
				</div>
				<div style={{ display: 'flex', gap: 24, fontSize: 12, color: 'var(--text-secondary)' }}>
					<div>
						<span style={{ color: 'var(--text-muted)' }}>Path: </span>
						<code style={{ fontSize: 11 }}>{dbPath}</code>
					</div>
					<div>
						<span style={{ color: 'var(--text-muted)' }}>Size: </span>
						<span>{formatSize(dbSize)}</span>
					</div>
				</div>
			</div>

			{/* Backups */}
			<div className="card">
				<div className="card-header">
					<span className="card-title">
						<i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 8, color: 'var(--accent)' }} />
						Backups
					</span>
				</div>
				{backups.length === 0 ? (
					<p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No backups yet.</p>
				) : (
					<table className="sync-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Size</th>
								<th style={{ textAlign: 'right' }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{backups.map(b => (
								<tr key={b.name}>
									<td>{formatDate(b.created)}</td>
									<td>{formatSize(b.size)}</td>
									<td style={{ textAlign: 'right' }}>
										<a href={`/api/settings/db/backups/${encodeURIComponent(b.name)}/download`}
											download={b.name}
											style={{ padding: '2px 8px', fontSize: 11, marginRight: 4, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}>
											<i className="fa-solid fa-download" />
										</a>
										<button onClick={() => doRestore(b)} disabled={restoring}
											style={{ padding: '2px 8px', fontSize: 11, marginRight: 4 }}>
											<i className="fa-solid fa-arrow-rotate-left" style={{ marginRight: 4 }} />
											Restore
										</button>
										<button onClick={() => doDeleteBackup(b)}
											style={{ padding: '2px 8px', fontSize: 11, color: 'var(--error)' }}>
											<i className="fa-solid fa-trash-can" />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

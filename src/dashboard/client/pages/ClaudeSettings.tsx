import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';

type Tab = 'settings' | 'claude-md' | 'plugins' | 'permissions';

export default function ClaudeSettings() {
	const [activeTab, setActiveTab] = useState<Tab>('settings');
	const [settingsContent, setSettingsContent] = useState('');
	const [settingsSaved, setSettingsSaved] = useState('');
	const [claudeMd, setClaudeMd] = useState('');
	const [claudeMdSaved, setClaudeMdSaved] = useState('');
	const [plugins, setPlugins] = useState<{ marketplace: string; name: string; versions: string[] }[]>([]);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	useEffect(() => {
		fetch('/api/settings/claude').then(r => r.json()).then(data => {
			setSettingsContent(data.content || '');
			setSettingsSaved(data.content || '');
		}).catch(() => {});

		fetch('/api/settings/claude-md').then(r => r.json()).then(data => {
			setClaudeMd(data.content || '');
			setClaudeMdSaved(data.content || '');
		}).catch(() => {});

		fetch('/api/settings/plugins').then(r => r.json()).then(setPlugins).catch(() => {});
	}, []);

	const saveSettings = async () => {
		setSaving(true);
		setMessage(null);
		try {
			// validate JSON
			JSON.parse(settingsContent);
			const res = await fetch('/api/settings/claude', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: settingsContent }),
			});
			if (!res.ok) throw new Error('Save failed');
			setSettingsSaved(settingsContent);
			setMessage({ type: 'success', text: 'settings.json saved (backup created)' });
		} catch (err: any) {
			setMessage({ type: 'error', text: err.message });
		} finally {
			setSaving(false);
		}
	};

	const saveClaudeMd = async () => {
		setSaving(true);
		setMessage(null);
		try {
			const res = await fetch('/api/settings/claude-md', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: claudeMd }),
			});
			if (!res.ok) throw new Error('Save failed');
			setClaudeMdSaved(claudeMd);
			setMessage({ type: 'success', text: 'CLAUDE.md saved (backup created)' });
		} catch (err: any) {
			setMessage({ type: 'error', text: err.message });
		} finally {
			setSaving(false);
		}
	};

	// extract permissions from settings
	let permissions: string[] = [];
	try {
		const parsed = JSON.parse(settingsContent);
		const perms = parsed?.permissions?.allow || parsed?.allowedTools || [];
		permissions = Array.isArray(perms) ? perms : [];
	} catch { /* invalid JSON */ }

	return (
		<div className="page claude-settings">
			<h1 className="page-title">Claude Settings</h1>

			{message && (
				<div className={`settings-message ${message.type}`}>{message.text}</div>
			)}

			<div className="claude-tabs">
				{(['settings', 'claude-md', 'plugins', 'permissions'] as Tab[]).map(tab => (
					<button
						key={tab}
						className={activeTab === tab ? 'active' : ''}
						onClick={() => setActiveTab(tab)}
					>
						{tab === 'settings' ? 'settings.json' :
						 tab === 'claude-md' ? 'CLAUDE.md' :
						 tab === 'plugins' ? 'Installed Plugins' : 'Permissions'}
					</button>
				))}
			</div>

			{activeTab === 'settings' && (
				<div className="claude-editor-panel">
					<div className="claude-editor-wrapper">
						<Editor
							height="60vh"
							language="json"
							theme="vs-dark"
							value={settingsContent}
							onChange={(v) => setSettingsContent(v || '')}
							options={{
								fontSize: 13,
								minimap: { enabled: false },
								wordWrap: 'on',
								scrollBeyondLastLine: false,
								tabSize: 2,
								padding: { top: 8 },
							}}
						/>
					</div>
					<div className="claude-editor-actions">
						{settingsContent !== settingsSaved && <span className="editor-dirty">modified</span>}
						<button
							className="primary"
							onClick={saveSettings}
							disabled={saving || settingsContent === settingsSaved}
						>
							{saving ? 'Saving...' : 'Save settings.json'}
						</button>
					</div>
				</div>
			)}

			{activeTab === 'claude-md' && (
				<div className="claude-editor-panel">
					<div className="claude-editor-wrapper">
						<Editor
							height="60vh"
							language="markdown"
							theme="vs-dark"
							value={claudeMd}
							onChange={(v) => setClaudeMd(v || '')}
							options={{
								fontSize: 13,
								minimap: { enabled: false },
								wordWrap: 'on',
								scrollBeyondLastLine: false,
								tabSize: 2,
								padding: { top: 8 },
							}}
						/>
					</div>
					<div className="claude-editor-actions">
						{claudeMd !== claudeMdSaved && <span className="editor-dirty">modified</span>}
						<button
							className="primary"
							onClick={saveClaudeMd}
							disabled={saving || claudeMd === claudeMdSaved}
						>
							{saving ? 'Saving...' : 'Save CLAUDE.md'}
						</button>
					</div>
				</div>
			)}

			{activeTab === 'plugins' && (
				<div className="card">
					{plugins.length === 0 ? (
						<p style={{ color: 'var(--text-muted)' }}>No plugins installed.</p>
					) : (
						<table className="sync-table">
							<thead>
								<tr><th>Marketplace</th><th>Plugin</th><th>Versions</th></tr>
							</thead>
							<tbody>
								{plugins.map((p, i) => (
									<tr key={i}>
										<td>{p.marketplace}</td>
										<td>{p.name}</td>
										<td>{p.versions.join(', ')}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			)}

			{activeTab === 'permissions' && (
				<div className="card">
					<div className="card-header">
						<span className="card-title">Permissions allowlist</span>
					</div>
					{permissions.length === 0 ? (
						<p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
							No permissions configured. Edit settings.json to add permissions.
						</p>
					) : (
						<ul className="permissions-list">
							{permissions.map((perm, i) => <li key={i}>{perm}</li>)}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}

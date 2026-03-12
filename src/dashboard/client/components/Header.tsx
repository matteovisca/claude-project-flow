import { useEffect, useState } from 'react';

export default function Header() {
	const [connected, setConnected] = useState(false);
	const [projectName, setProjectName] = useState('');

	useEffect(() => {
		let mounted = true;
		const check = async () => {
			try {
				const res = await fetch('/api/health');
				if (mounted && res.ok) {
					setConnected(true);
					const settings = await fetch('/api/settings/plugin').then(r => r.json());
					if (mounted && settings.memory_path) {
						setProjectName(settings.memory_path.split('/').pop() || 'project-flow');
					}
				}
			} catch {
				if (mounted) setConnected(false);
			}
		};

		check();
		const interval = setInterval(check, 30000);
		return () => { mounted = false; clearInterval(interval); };
	}, []);

	return (
		<header className="app-header">
			<span className="project-name">
				<i className="fa-solid fa-cubes" style={{ marginRight: 8, opacity: 0.7 }} />
				{projectName || 'claude-project-flow'}
			</span>
			<div className="connection-status">
				<i className={`fa-solid fa-circle status-dot ${connected ? '' : 'disconnected'}`} />
				{connected ? 'Connected' : 'Disconnected'}
			</div>
		</header>
	);
}

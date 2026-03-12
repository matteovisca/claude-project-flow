import { useEffect, useState } from 'react';
import type { ScriptInfo } from '../../shared/types.js';

interface RunState {
	id: string;
	status: 'running' | 'success' | 'error';
	output: string;
}

export default function Commands() {
	const [scripts, setScripts] = useState<ScriptInfo[]>([]);
	const [runs, setRuns] = useState<Map<string, RunState>>(new Map());
	const [args, setArgs] = useState<Map<string, string[]>>(new Map());
	const [history, setHistory] = useState<{ script: string; args: string[]; status: string; time: string }[]>([]);

	useEffect(() => {
		fetch('/api/scripts/list')
			.then(r => r.json())
			.then(setScripts)
			.catch(() => {});
	}, []);

	const getArgs = (scriptName: string): string[] => {
		return args.get(scriptName) || [];
	};

	const setArgValue = (scriptName: string, index: number, value: string) => {
		const current = [...getArgs(scriptName)];
		current[index] = value;
		setArgs(prev => new Map(prev).set(scriptName, current));
	};

	const runScript = async (script: ScriptInfo) => {
		const scriptArgs = getArgs(script.name).filter(a => a.trim());
		try {
			const res = await fetch('/api/scripts/run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ script: script.name, args: scriptArgs }),
			});
			const { id } = await res.json();

			setRuns(prev => new Map(prev).set(script.name, { id, status: 'running', output: '' }));

			// stream output
			const es = new EventSource(`/api/scripts/stream/${id}`);
			es.addEventListener('output', (e) => {
				setRuns(prev => {
					const current = prev.get(script.name);
					if (!current) return prev;
					return new Map(prev).set(script.name, { ...current, output: current.output + e.data });
				});
			});
			es.addEventListener('done', (e) => {
				es.close();
				const result = JSON.parse(e.data);
				const status = result.status as 'success' | 'error';
				setRuns(prev => {
					const current = prev.get(script.name);
					if (!current) return prev;
					return new Map(prev).set(script.name, { ...current, status });
				});
				setHistory(prev => [
					{ script: script.name, args: scriptArgs, status, time: new Date().toLocaleTimeString() },
					...prev.slice(0, 19),
				]);
			});
			es.onerror = () => {
				es.close();
				setRuns(prev => {
					const current = prev.get(script.name);
					if (!current) return prev;
					return new Map(prev).set(script.name, { ...current, status: 'error' });
				});
			};
		} catch { /* skip */ }
	};

	const stopScript = async (scriptName: string) => {
		const run = runs.get(scriptName);
		if (!run) return;
		await fetch(`/api/scripts/${run.id}`, { method: 'DELETE' });
		setRuns(prev => {
			const current = prev.get(scriptName);
			if (!current) return prev;
			return new Map(prev).set(scriptName, { ...current, status: 'error', output: current.output + '\n[Terminated]' });
		});
	};

	return (
		<div className="page">
			<h1 className="page-title">Commands</h1>

			<div className="scripts-grid">
				{scripts.map(script => {
					const run = runs.get(script.name);
					return (
						<div key={script.name} className="card script-card">
							<div className="card-header">
								<span className="card-title">{script.name}</span>
								{run && (
									<span className={`badge ${run.status}`}>
										{run.status === 'running' ? 'Running' : run.status === 'success' ? 'Completed' : 'Error'}
									</span>
								)}
							</div>
							<p className="script-desc">{script.description}</p>

							{script.args.length > 0 && (
								<div className="script-args">
									{script.args.map((arg, i) => (
										<div key={arg.name} className="script-arg">
											<label>
												{arg.name} {arg.required && <span className="required">*</span>}
												<span className="arg-desc">{arg.description}</span>
											</label>
											{arg.options ? (
												<select
													value={getArgs(script.name)[i] || ''}
													onChange={(e) => setArgValue(script.name, i, e.target.value)}
												>
													<option value="">— select —</option>
													{arg.options.map(opt => (
														<option key={opt} value={opt}>{opt}</option>
													))}
												</select>
											) : (
												<input
													type="text"
													placeholder={arg.description}
													value={getArgs(script.name)[i] || ''}
													onChange={(e) => setArgValue(script.name, i, e.target.value)}
												/>
											)}
										</div>
									))}
								</div>
							)}

							<div className="script-actions">
								{run?.status === 'running' ? (
									<button className="stop-btn" onClick={() => stopScript(script.name)}>Stop</button>
								) : (
									<button className="primary" onClick={() => runScript(script)}>Run</button>
								)}
							</div>

							{run?.output && (
								<pre className="script-output">{run.output}</pre>
							)}
						</div>
					);
				})}
			</div>

			{history.length > 0 && (
				<div className="card" style={{ marginTop: 16 }}>
					<div className="card-header">
						<span className="card-title">History</span>
					</div>
					<table className="sync-table">
						<thead>
							<tr><th>Time</th><th>Script</th><th>Arguments</th><th>Status</th></tr>
						</thead>
						<tbody>
							{history.map((h, i) => (
								<tr key={i}>
									<td>{h.time}</td>
									<td>{h.script}</td>
									<td>{h.args.join(' ') || '—'}</td>
									<td><span className={`badge ${h.status}`}>{h.status}</span></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

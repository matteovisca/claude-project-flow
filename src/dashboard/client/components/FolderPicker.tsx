import { useState, useEffect } from 'react';

interface FolderPickerProps {
	open: boolean;
	initialPath?: string;
	onSelect: (path: string) => void;
	onClose: () => void;
}

export default function FolderPicker({ open, initialPath, onSelect, onClose }: FolderPickerProps) {
	const [currentPath, setCurrentPath] = useState('/');
	const [dirs, setDirs] = useState<{ name: string; path: string }[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (open) setCurrentPath(initialPath || '/');
	}, [open, initialPath]);

	useEffect(() => {
		if (!open) return;
		setLoading(true);
		fetch(`/api/files/dirs?path=${encodeURIComponent(currentPath)}`)
			.then(r => r.json())
			.then(data => {
				if (!data.error) {
					setDirs(data.dirs);
					setCurrentPath(data.path);
				}
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [open, currentPath]);

	if (!open) return null;

	const parent = currentPath !== '/'
		? currentPath.split('/').slice(0, -1).join('/') || '/'
		: null;

	return (
		<div className="fp-overlay" onClick={onClose}>
			<div className="fp-modal" onClick={e => e.stopPropagation()}>
				<div className="fp-bar">
					<i className="fa-solid fa-folder-open" style={{ color: 'var(--accent)', marginRight: 8 }} />
					<code className="fp-path">{currentPath}</code>
					<button onClick={onClose}><i className="fa-solid fa-xmark" /></button>
				</div>
				<div className="fp-list">
					{parent && (
						<div className="fp-item fp-parent" onClick={() => setCurrentPath(parent)}>
							<i className="fa-solid fa-arrow-up" style={{ marginRight: 8, opacity: 0.5 }} />
							..
						</div>
					)}
					{loading
						? <div className="fp-empty">Loading...</div>
						: dirs.length === 0
							? <div className="fp-empty">No subfolders</div>
							: dirs.map(d => (
								<div key={d.path} className="fp-item" onClick={() => setCurrentPath(d.path)}>
									<i className="fa-solid fa-folder" style={{ marginRight: 8, color: 'var(--accent)' }} />
									{d.name}
								</div>
							))
					}
				</div>
				<div className="fp-actions">
					<button onClick={onClose}>Cancel</button>
					<button className="primary" onClick={() => { onSelect(currentPath); onClose(); }}>
						<i className="fa-solid fa-check" style={{ marginRight: 6 }} />
						Select
					</button>
				</div>
			</div>
		</div>
	);
}

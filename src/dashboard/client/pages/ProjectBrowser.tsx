import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { marked } from 'marked';
import FolderPicker from '../components/FolderPicker.js';
import type { Project, FeatureSummary, FeatureDocument, FeatureAttachment } from '../../shared/types.js';

marked.setOptions({ breaks: true, gfm: true });

loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.0/min/vs' } });

interface OpenTab {
	id: string;
	label: string;
	dirty: boolean;
	docId?: number;
	featureId?: number;
	projectId?: number;
	type: 'project-def' | 'definition' | 'document' | 'session-log';
	content: string;
	language: string;
	readOnly?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
	'draft': '#666', 'requirements-done': '#e0a820', 'in-progress': '#4fc3f7',
	'implementation-done': '#81c784', 'documented': '#a78bfa', 'implemented': '#4caf50',
	'closed': '#888', 'cancelled': '#ef5350',
};

// group documents by type into virtual folders
const DOC_FOLDERS: { type: string; label: string; icon: string }[] = [
	{ type: 'requirements', label: 'requirements', icon: 'fa-clipboard-list' },
	{ type: 'plan', label: 'plans', icon: 'fa-map' },
	{ type: 'context', label: 'context', icon: 'fa-sticky-note' },
	{ type: 'doc', label: 'docs', icon: 'fa-file-lines' },
	{ type: 'closure', label: 'closure', icon: 'fa-lock' },
];

export default function ProjectBrowser() {
	const [projects, setProjects] = useState<Project[]>([]);
	const [selectedProject, setSelectedProject] = useState<Project | null>(null);
	const [selectorOpen, setSelectorOpen] = useState(false);

	const [features, setFeatures] = useState<FeatureSummary[]>([]);
	const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(new Set());
	const [featureDocs, setFeatureDocs] = useState<Map<number, FeatureDocument[]>>(new Map());
	const [featureAtts, setFeatureAtts] = useState<Map<number, FeatureAttachment[]>>(new Map());
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['features']));

	const [tabs, setTabs] = useState<OpenTab[]>([]);
	const [activeTab, setActiveTab] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
	const [loading, setLoading] = useState(true);

	// modals
	const [showAdd, setShowAdd] = useState(false);
	const [newName, setNewName] = useState('');
	const [newPath, setNewPath] = useState('');
	const [newType, setNewType] = useState('app');
	const [pickerOpen, setPickerOpen] = useState(false);
	const [addError, setAddError] = useState('');
	const [showAddDoc, setShowAddDoc] = useState(false);
	const [addDocFeatureId, setAddDocFeatureId] = useState<number | null>(null);
	const [newDocType, setNewDocType] = useState('plan');
	const [newDocName, setNewDocName] = useState('');
	const [docTypeLocked, setDocTypeLocked] = useState(false);
	const [uploadFeatureId, setUploadFeatureId] = useState<number | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// --- Data loading ---

	const loadProjects = async () => {
		setLoading(true);
		try {
			const res = await fetch('/api/projects');
			const data = await res.json();
			setProjects(data);
			if (!selectedProject && data.length > 0) setSelectedProject(data[0]);
		} catch { /* */ }
		setLoading(false);
	};

	const loadFeatures = useCallback(async (projectName: string) => {
		try {
			const res = await fetch(`/api/features?project=${encodeURIComponent(projectName)}`);
			setFeatures(await res.json());
		} catch { setFeatures([]); }
	}, []);

	const loadFeatureDocs = useCallback(async (featureId: number) => {
		try {
			const [docsRes, attRes] = await Promise.all([
				fetch(`/api/features/${featureId}/documents`),
				fetch(`/api/features/${featureId}/attachments`),
			]);
			const docs = await docsRes.json();
			const atts = await attRes.json();
			setFeatureDocs(prev => new Map(prev).set(featureId, docs));
			setFeatureAtts(prev => new Map(prev).set(featureId, atts));
		} catch { /* */ }
	}, []);

	useEffect(() => { loadProjects(); }, []);
	useEffect(() => {
		if (selectedProject) {
			loadFeatures(selectedProject.name);
			setExpandedFeatures(new Set());
			setFeatureDocs(new Map());
			setFeatureAtts(new Map());
		}
	}, [selectedProject?.id]);

	// --- Toggle helpers ---

	const toggleFolder = (key: string) => {
		setExpandedFolders(prev => {
			const next = new Set(prev);
			next.has(key) ? next.delete(key) : next.add(key);
			return next;
		});
	};

	const toggleFeature = (feat: FeatureSummary) => {
		setExpandedFeatures(prev => {
			const next = new Set(prev);
			if (next.has(feat.id)) {
				next.delete(feat.id);
			} else {
				next.add(feat.id);
				if (!featureDocs.has(feat.id)) loadFeatureDocs(feat.id);
			}
			return next;
		});
	};

	// --- Tab management ---

	const openTab = (tab: OpenTab) => {
		const existing = tabs.find(t => t.id === tab.id);
		if (existing) { setActiveTab(tab.id); return; }
		setTabs(prev => [...prev, tab]);
		setActiveTab(tab.id);
	};

	const closeTab = (id: string, e?: React.MouseEvent) => {
		e?.stopPropagation();
		const tab = tabs.find(t => t.id === id);
		if (tab?.dirty && !confirm('Unsaved changes. Close anyway?')) return;
		setTabs(prev => prev.filter(t => t.id !== id));
		if (activeTab === id) {
			const remaining = tabs.filter(t => t.id !== id);
			setActiveTab(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
		}
	};

	const updateTabContent = (id: string, content: string) => {
		setTabs(prev => prev.map(t => t.id === id ? { ...t, content, dirty: true } : t));
	};

	const saveTab = async (id: string) => {
		const tab = tabs.find(t => t.id === id);
		if (!tab || tab.readOnly) return;
		try {
			if (tab.type === 'project-def' && tab.projectId) {
				await fetch(`/api/projects/${tab.projectId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ definition: tab.content }),
				});
			} else if (tab.type === 'definition' && tab.featureId) {
				await fetch(`/api/features/${tab.featureId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ definition: tab.content }),
				});
			} else if (tab.type === 'session-log' && tab.featureId) {
				await fetch(`/api/features/${tab.featureId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ session_log: tab.content }),
				});
			} else if (tab.type === 'document' && tab.docId && tab.featureId) {
				await fetch(`/api/features/${tab.featureId}/documents/${tab.docId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ content: tab.content }),
				});
			}
			setTabs(prev => prev.map(t => t.id === id ? { ...t, dirty: false } : t));
		} catch (err: any) {
			alert(`Save failed: ${err.message}`);
		}
	};

	// --- Open actions ---

	const openProjectDef = (proj: Project) => {
		openTab({
			id: `projdef:${proj.id}`, label: 'project-definition.md', dirty: false,
			projectId: proj.id, type: 'project-def',
			content: proj.definition || `# Project: ${proj.name}\n\n## Overview\n\n`,
			language: 'markdown',
		});
	};

	const openFeatureDef = async (feat: FeatureSummary) => {
		const res = await fetch(`/api/features/${feat.id}`);
		const data = await res.json();
		openTab({
			id: `def:${feat.id}`, label: `${feat.name}/definition.md`, dirty: false,
			featureId: feat.id, type: 'definition',
			content: data.definition || `# Feature: ${feat.name}\n\n## Description\n\n## Status\n${feat.status}\n`,
			language: 'markdown',
		});
	};

	const openSessionLog = async (feat: FeatureSummary) => {
		const res = await fetch(`/api/features/${feat.id}`);
		const data = await res.json();
		openTab({
			id: `log:${feat.id}`, label: `${feat.name}/session-log.md`, dirty: false,
			featureId: feat.id, type: 'session-log',
			content: data.session_log || '# Session Log\n',
			language: 'markdown',
		});
	};

	const openDocument = async (doc: FeatureDocument, featName: string) => {
		const res = await fetch(`/api/features/${doc.feature_id}/documents/${doc.id}`);
		const data = await res.json();
		openTab({
			id: `doc:${doc.id}`, label: `${featName}/${doc.type}/${doc.name}.md`, dirty: false,
			docId: doc.id, featureId: doc.feature_id, type: 'document',
			content: data.content || '', language: 'markdown',
		});
	};

	// --- CRUD ---

	const addDocDirect = (featureId: number, type: string) => {
		setAddDocFeatureId(featureId);
		setNewDocType(type);
		setDocTypeLocked(true);
		setNewDocName('');
		setShowAddDoc(true);
	};

	const handleAddDocument = async () => {
		if (!addDocFeatureId || !newDocName.trim()) return;
		try {
			const res = await fetch(`/api/features/${addDocFeatureId}/documents`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: newDocType, name: newDocName.trim(), content: '' }),
			});
			if (!res.ok) { const d = await res.json(); alert(d.error); return; }
			setShowAddDoc(false);
			setNewDocName('');
			loadFeatureDocs(addDocFeatureId);
		} catch (err: any) { alert(err.message); }
	};

	const handleDeleteDocument = async (doc: FeatureDocument) => {
		if (!confirm(`Delete "${doc.type}/${doc.name}"?`)) return;
		await fetch(`/api/features/${doc.feature_id}/documents/${doc.id}`, { method: 'DELETE' });
		closeTab(`doc:${doc.id}`);
		loadFeatureDocs(doc.feature_id);
	};

	const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!uploadFeatureId || !e.target.files?.length) return;
		const file = e.target.files[0];
		const formData = new FormData();
		formData.append('file', file);
		try {
			const res = await fetch(`/api/features/${uploadFeatureId}/attachments`, { method: 'POST', body: formData });
			if (!res.ok) { const d = await res.json(); alert(d.error); return; }
			loadFeatureDocs(uploadFeatureId);
		} catch (err: any) { alert(err.message); }
		e.target.value = '';
	};

	const handleDeleteAttachment = async (att: FeatureAttachment) => {
		if (!confirm(`Delete "${att.name}"?`)) return;
		await fetch(`/api/features/${att.feature_id}/attachments/${att.id}`, { method: 'DELETE' });
		loadFeatureDocs(att.feature_id);
	};

	const handleAddProject = async () => {
		setAddError('');
		if (!newName.trim() || !newPath.trim()) { setAddError('Name and source path are required'); return; }
		try {
			const res = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName.trim(), path: newPath.trim(), type: newType }),
			});
			const data = await res.json();
			if (!res.ok) { setAddError(data.error || 'Failed'); return; }
			setShowAdd(false);
			setNewName(''); setNewPath(''); setNewType('app');
			loadProjects();
			setSelectedProject(data);
			setSelectorOpen(false);
		} catch (err: any) { setAddError(err.message); }
	};

	const deleteProject = async (p: Project, e: React.MouseEvent) => {
		e.stopPropagation();
		if (!confirm(`Remove project "${p.name}"?`)) return;
		await fetch(`/api/projects/${p.id}`, { method: 'DELETE' });
		if (selectedProject?.id === p.id) {
			const remaining = projects.filter(pr => pr.id !== p.id);
			setSelectedProject(remaining.length > 0 ? remaining[0] : null);
		}
		loadProjects();
	};

	// --- Tree helpers ---
	const INDENT = 16;
	const Chevron = ({ open }: { open: boolean }) => (
		<i className={`fa-solid fa-chevron-${open ? 'down' : 'right'}`}
			style={{ fontSize: 8, width: 10, color: 'var(--text-muted)', flexShrink: 0 }} />
	);
	const Folder = ({ depth, open, label, badge, onClick, extra, onAdd }: { depth: number; open: boolean; label: string; badge?: number | string; onClick: () => void; extra?: React.ReactNode; onAdd?: (e: React.MouseEvent) => void }) => (
		<div className="tree-item" style={{ paddingLeft: depth * INDENT }} onClick={onClick}>
			<Chevron open={open} />
			<i className="tree-icon fa-solid fa-folder" style={{ color: 'var(--accent)' }} />
			<span className="tree-label">{label}</span>
			{badge !== undefined && <span className="tree-badge">{badge}</span>}
			{extra}
			{onAdd && (
				<button className="tree-action" onClick={(e) => { e.stopPropagation(); onAdd(e); }} title="Add">
					<i className="fa-solid fa-plus" />
				</button>
			)}
		</div>
	);
	const File = ({ depth, label, icon, onClick, children }: { depth: number; label: string; icon?: string; onClick?: () => void; children?: React.ReactNode }) => (
		<div className="tree-item" style={{ paddingLeft: depth * INDENT }} onClick={onClick}>
			<i className={`tree-icon fa-solid ${icon ?? 'fa-file'}`} style={{ color: 'var(--text-secondary)' }} />
			<span className="tree-label">{label}</span>
			{children}
		</div>
	);

	const activeTabData = tabs.find(t => t.id === activeTab);
	const activeFeatures = features.filter(f => !f.closed_at);

	// --- Render ---
	return (
		<div className="file-browser">
			<div className="fb-sidebar">
				{/* project selector */}
				<div className="project-selector">
					<button className="project-selector-trigger" onClick={() => setSelectorOpen(!selectorOpen)}>
						<i className="fa-solid fa-diagram-project" style={{ color: 'var(--accent)', marginRight: 8, fontSize: 12 }} />
						<span className="project-selector-name">
							{selectedProject?.name ?? 'Select project...'}
						</span>
						<i className={`fa-solid fa-chevron-${selectorOpen ? 'up' : 'down'}`}
							style={{ fontSize: 10, color: 'var(--text-muted)' }} />
					</button>
					{selectorOpen && (
						<div className="project-selector-dropdown">
							<div className="project-selector-list">
								{projects.map(p => (
									<div key={p.id}
										className={`project-selector-item ${selectedProject?.id === p.id ? 'active' : ''}`}
										onClick={() => { setSelectedProject(p); setSelectorOpen(false); }}>
										<span className="project-selector-item-name">{p.name}</span>
										<span className="project-selector-item-type">{p.type}</span>
										<button className="project-selector-item-delete"
											onClick={(e) => deleteProject(p, e)} title="Remove">
											<i className="fa-solid fa-trash-can" />
										</button>
									</div>
								))}
								{projects.length === 0 && (
									<div className="project-selector-empty">No projects registered</div>
								)}
							</div>
							<button className="project-selector-add"
								onClick={() => { setSelectorOpen(false); setShowAdd(true); }}>
								<i className="fa-solid fa-plus" style={{ marginRight: 6 }} /> Register project
							</button>
						</div>
					)}
				</div>

				{/* file tree */}
				{selectedProject && (
					<div className="file-tree">
						<File depth={1} label="project-definition.md" onClick={() => openProjectDef(selectedProject)} />

						<Folder depth={1} open={expandedFolders.has('features')} label="features"
							badge={activeFeatures.length} onClick={() => toggleFolder('features')} />

						{expandedFolders.has('features') && activeFeatures.map(feat => {
							const fKey = `feat:${feat.id}`;
							const isExpanded = expandedFeatures.has(feat.id);
							const docs = featureDocs.get(feat.id) ?? [];
							const atts = featureAtts.get(feat.id) ?? [];

							const docsByType = new Map<string, FeatureDocument[]>();
							for (const d of docs) {
								const arr = docsByType.get(d.type) ?? [];
								arr.push(d);
								docsByType.set(d.type, arr);
							}

							return (
								<React.Fragment key={feat.id}>
									<Folder depth={2} open={isExpanded} label={feat.name}
										onClick={() => toggleFeature(feat)}
										extra={<span className="status-dot" style={{ background: STATUS_COLORS[feat.status] || '#666', marginLeft: 'auto' }} />}
										onAdd={() => { setAddDocFeatureId(feat.id); setDocTypeLocked(false); setNewDocName(''); setShowAddDoc(true); }}
									/>

									{isExpanded && (
										<>
											<File depth={3} label="definition.md" onClick={() => openFeatureDef(feat)} />
											<File depth={3} label="session-log.md" onClick={() => openSessionLog(feat)} />

											{DOC_FOLDERS.filter(df => df.type !== 'closure').map(df => {
												const typeDocs = docsByType.get(df.type) ?? [];
												const folderKey = `${fKey}:${df.type}`;
												return (
													<React.Fragment key={df.type}>
														<Folder depth={3} open={expandedFolders.has(folderKey)} label={df.label}
															badge={typeDocs.length || undefined} onClick={() => toggleFolder(folderKey)}
															onAdd={() => addDocDirect(feat.id, df.type)} />
														{expandedFolders.has(folderKey) && typeDocs.map(doc => (
															<File key={doc.id} depth={4} label={`${doc.name}.md`}
																onClick={() => openDocument(doc, feat.name)}>
																<button className="tree-action" onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc); }}>
																	<i className="fa-solid fa-trash-can" />
																</button>
															</File>
														))}
													</React.Fragment>
												);
											})}

											<Folder depth={3} open={expandedFolders.has(`${fKey}:att`)} label="attachments"
												badge={atts.length || undefined} onClick={() => toggleFolder(`${fKey}:att`)}
												onAdd={() => { setUploadFeatureId(feat.id); fileInputRef.current?.click(); }} />
											{expandedFolders.has(`${fKey}:att`) && atts.map(att => (
												<div key={att.id} className="tree-item" style={{ paddingLeft: 4 * INDENT }}>
													<i className="tree-icon fa-solid fa-paperclip" style={{ color: 'var(--text-secondary)' }} />
													<a href={`/api/features/${att.feature_id}/attachments/${att.id}`}
														className="tree-label" download={att.name}
														onClick={e => e.stopPropagation()}>{att.name}</a>
													<span className="tree-badge">{(att.size / 1024).toFixed(0)}KB</span>
													<button className="tree-action" onClick={() => handleDeleteAttachment(att)}>
														<i className="fa-solid fa-trash-can" />
													</button>
												</div>
											))}

										</>
									)}
								</React.Fragment>
							);
						})}
					</div>
				)}
			</div>

			{/* main editor area */}
			<div className="fb-main">
				{tabs.length > 0 && (
					<div className="fb-tabs">
						{tabs.map(tab => (
							<div key={tab.id}
								className={`fb-tab ${tab.id === activeTab ? 'active' : ''}`}
								onClick={() => setActiveTab(tab.id)} title={tab.label}>
								{tab.dirty && <span className="dirty-dot" />}
								<span className="tab-name">{tab.label}</span>
								<button className="tab-close" onClick={(e) => closeTab(tab.id, e)}>&times;</button>
							</div>
						))}
					</div>
				)}
				<div className="fb-editor">
					{activeTab && activeTabData ? (
						<div className="file-editor">
							<div className="editor-toolbar">
								<span className="editor-path">{activeTabData.label}</span>
								{activeTabData.language === 'markdown' && (
									<div className="editor-view-toggle">
										<button className={viewMode === 'code' ? 'active' : ''} onClick={() => setViewMode('code')}>
											<i className="fa-solid fa-code" />
										</button>
										<button className={viewMode === 'preview' ? 'active' : ''} onClick={() => setViewMode('preview')}>
											<i className="fa-solid fa-eye" />
										</button>
									</div>
								)}
								{activeTabData.dirty && (
									<button className="primary" onClick={() => saveTab(activeTab)}
										style={{ padding: '2px 10px', fontSize: 12 }}>Save</button>
								)}
								{activeTabData.readOnly && (
									<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>read-only</span>
								)}
							</div>
							{viewMode === 'preview' && activeTabData.language === 'markdown' ? (
								<div className="md-preview"
									dangerouslySetInnerHTML={{ __html: marked.parse(activeTabData.content || '') as string }} />
							) : (
								<Editor
									height="100%"
									language={activeTabData.language}
									theme="vs-dark"
									value={activeTabData.content}
									options={{
										readOnly: activeTabData.readOnly,
										fontSize: 13,
										fontFamily: 'var(--font-mono)',
										minimap: { enabled: false },
										wordWrap: 'on',
										lineNumbers: 'on',
										scrollBeyondLastLine: false,
										renderWhitespace: 'selection',
										tabSize: 2,
										padding: { top: 8 },
									}}
									onChange={(value) => {
										if (value !== undefined && !activeTabData.readOnly) {
											updateTabContent(activeTab, value);
										}
									}}
									onMount={(editor) => {
										editor.addCommand(2048 | 49, () => saveTab(activeTab));
									}}
								/>
							)}
						</div>
					) : (
						<div className="fb-placeholder">
							<i className="fa-solid fa-cubes" style={{ fontSize: 32, opacity: 0.15 }} />
							<p>Select a file to start editing</p>
						</div>
					)}
				</div>
			</div>

			{/* hidden file input */}
			<input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUploadAttachment} />

			{/* add project modal */}
			{showAdd && (
				<div className="fp-overlay" onClick={() => setShowAdd(false)}>
					<div className="add-project-modal" onClick={e => e.stopPropagation()}>
						<div className="add-project-modal-header">
							<i className="fa-solid fa-diagram-project" style={{ color: 'var(--accent)', marginRight: 8 }} />
							<span>Register New Project</span>
							<button onClick={() => setShowAdd(false)} style={{ marginLeft: 'auto' }}>
								<i className="fa-solid fa-xmark" />
							</button>
						</div>
						<div className="add-project-modal-body">
							{addError && <div className="add-project-error">{addError}</div>}
							<label>
								Project name
								<input placeholder="my-project" value={newName} onChange={e => setNewName(e.target.value)} />
							</label>
							<label>
								Source path
								<div className="settings-path-row">
									<input placeholder="/path/to/source" value={newPath}
										onChange={e => setNewPath(e.target.value)} style={{ flex: 1 }} />
									<button onClick={() => setPickerOpen(true)} title="Browse">
										<i className="fa-solid fa-folder-open" />
									</button>
								</div>
							</label>
							<label>
								Type
								<select value={newType} onChange={e => setNewType(e.target.value)}>
									<option value="app">App</option>
									<option value="library">Library</option>
									<option value="plugin">Plugin</option>
									<option value="service">Service</option>
								</select>
							</label>
						</div>
						<div className="add-project-modal-footer">
							<button onClick={() => setShowAdd(false)}>Cancel</button>
							<button className="primary" onClick={handleAddProject}>
								<i className="fa-solid fa-plus" style={{ marginRight: 6 }} />Register
							</button>
						</div>
					</div>
				</div>
			)}

			{/* add document modal */}
			{showAddDoc && (
				<div className="fp-overlay" onClick={() => setShowAddDoc(false)}>
					<div className="add-project-modal" onClick={e => e.stopPropagation()}>
						<div className="add-project-modal-header">
							<i className="fa-solid fa-file-circle-plus" style={{ color: 'var(--accent)', marginRight: 8 }} />
							<span>New Document</span>
							<button onClick={() => setShowAddDoc(false)} style={{ marginLeft: 'auto' }}>
								<i className="fa-solid fa-xmark" />
							</button>
						</div>
						<div className="add-project-modal-body">
							<label>
								Type
								<select value={newDocType} onChange={e => setNewDocType(e.target.value)} disabled={docTypeLocked}>
									<option value="requirements">Requirements</option>
									<option value="plan">Plan</option>
									<option value="context">Context Note</option>
									<option value="doc">Documentation</option>
								</select>
							</label>
							<label>
								Name
								<input placeholder="document-name" value={newDocName}
									onChange={e => setNewDocName(e.target.value)}
									autoFocus
									onKeyDown={e => { if (e.key === 'Enter') handleAddDocument(); }} />
							</label>
						</div>
						<div className="add-project-modal-footer">
							<button onClick={() => setShowAddDoc(false)}>Cancel</button>
							<button className="primary" onClick={handleAddDocument}>
								<i className="fa-solid fa-plus" style={{ marginRight: 6 }} />Create
							</button>
						</div>
					</div>
				</div>
			)}

			<FolderPicker
				open={pickerOpen}
				initialPath={newPath || '/'}
				onSelect={(path) => { setNewPath(path); setPickerOpen(false); }}
				onClose={() => setPickerOpen(false)}
			/>
		</div>
	);
}

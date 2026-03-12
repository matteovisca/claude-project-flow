import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.js';
import ProjectBrowser from './pages/ProjectBrowser.js';
import Commands from './pages/Commands.js';
import PluginSettings from './pages/PluginSettings.js';
import ClaudeSettings from './pages/ClaudeSettings.js';
import Documentation from './pages/Documentation.js';

export default function App() {
	return (
		<BrowserRouter>
			<Layout>
				<Routes>
					<Route path="/" element={<ProjectBrowser />} />
					<Route path="/commands" element={<Commands />} />
					<Route path="/docs" element={<Documentation />} />
					<Route path="/settings/plugin" element={<PluginSettings />} />
					<Route path="/settings/claude" element={<ClaudeSettings />} />
				</Routes>
			</Layout>
		</BrowserRouter>
	);
}

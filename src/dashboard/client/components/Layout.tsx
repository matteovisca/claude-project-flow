import React, { useState } from 'react';
import Sidebar from './Sidebar.js';
import Header from './Header.js';

interface LayoutProps {
	children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
	const [collapsed, setCollapsed] = useState(false);

	return (
		<div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
			<Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
			<Header />
			<main className="app-content">
				{children}
			</main>
		</div>
	);
}

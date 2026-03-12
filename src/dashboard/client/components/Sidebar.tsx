import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
	{ to: '/', icon: 'fa-solid fa-diagram-project', label: 'Projects' },
	{ to: '/commands', icon: 'fa-solid fa-terminal', label: 'Commands' },
	{ to: '/docs', icon: 'fa-solid fa-book', label: 'Documentation' },
	{ to: '/settings/plugin', icon: 'fa-solid fa-sliders', label: 'Plugin Settings' },
	{ to: '/settings/claude', icon: 'fa-solid fa-robot', label: 'Claude Settings' },
];

interface SidebarProps {
	collapsed: boolean;
	onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
	return (
		<aside className="app-sidebar">
			<div className="sidebar-brand">
				<i className="fa-solid fa-diagram-project" />
				<span className="sidebar-brand-text">project-flow</span>
			</div>
			<nav className="sidebar-nav">
				{NAV_ITEMS.map((item) => (
					<NavLink
						key={item.to}
						to={item.to}
						end={item.to === '/'}
						className={({ isActive }) => isActive ? 'active' : ''}
						title={collapsed ? item.label : undefined}
					>
						<i className={`nav-icon ${item.icon}`} />
						<span className="nav-label">{item.label}</span>
					</NavLink>
				))}
			</nav>
			<button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
				<i className={`fa-solid ${collapsed ? 'fa-angles-right' : 'fa-angles-left'}`} />
			</button>
		</aside>
	);
}

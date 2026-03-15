/**
 * Sidebar navigation for the DevFoundry dashboard.
 */

import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils.js';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '⊞' },
  { path: '/agents', label: 'Agent Activity', icon: '⚡' },
  { path: '/prs', label: 'PR Governance', icon: '⌥' },
  { path: '/architecture', label: 'Architecture Health', icon: '⬡' },
  { path: '/policies', label: 'Policy Config', icon: '⚙' },
];

/** Main sidebar with logo and navigation links. */
export function Sidebar(): React.ReactElement {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-gray-950">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-800 px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold">
            DF
          </div>
          <span className="font-semibold text-white">DevFoundry</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                  )
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 px-4 py-3">
        <p className="text-xs text-gray-500">DevFoundry v1.0.0</p>
        <p className="text-xs text-gray-600">AI-Native Engineering Platform</p>
      </div>
    </aside>
  );
}

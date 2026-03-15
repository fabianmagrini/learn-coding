/**
 * Root application layout — sidebar + main content area.
 */

import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar.js';

/** Main application shell with sidebar navigation and content area. */
export function AppLayout(): React.ReactElement {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/**
 * Top header bar for the DevFoundry dashboard.
 */

interface HeaderProps {
  title: string;
  subtitle?: string;
}

/** Page-level header with title and optional subtitle. */
export function Header({ title, subtitle }: HeaderProps): React.ReactElement {
  return (
    <header className="flex h-16 items-center border-b border-gray-200 bg-white px-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
          U
        </div>
      </div>
    </header>
  );
}

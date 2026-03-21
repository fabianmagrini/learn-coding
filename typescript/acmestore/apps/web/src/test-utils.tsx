import { type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

interface WrapperProps {
  children: ReactNode;
  initialEntries?: string[];
}

function Wrapper({ children, initialEntries = ['/'] }: WrapperProps) {
  return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
}

function renderWithRouter(
  ui: ReactNode,
  { initialEntries, ...options }: Omit<RenderOptions, 'wrapper'> & { initialEntries?: string[] } = {},
) {
  return render(ui, {
    wrapper: ({ children }) => <Wrapper initialEntries={initialEntries}>{children}</Wrapper>,
    ...options,
  });
}

export { renderWithRouter };
export * from '@testing-library/react';

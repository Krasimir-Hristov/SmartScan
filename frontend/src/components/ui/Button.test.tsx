import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { describe, it, expect, vi } from 'vitest';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
    // Default variant primary and size md should be applied
    expect(button.className).toContain('from-emerald-400');
    expect(button.className).toContain('text-sm');
  });

  it('renders with different variants', () => {
    render(<Button variant="ghost">GhostBtn</Button>);
    const button = screen.getByRole('button', { name: 'GhostBtn' });
    expect(button.className).toContain('text-zinc-400');
  });

  it('applies fullWidth class', () => {
    render(<Button fullWidth>Full</Button>);
    const button = screen.getByRole('button', { name: 'Full' });
    expect(button).toHaveClass('w-full');
  });

  it('merges custom className correctly', () => {
    render(<Button className="mt-4 custom-test-class">Custom</Button>);
    const button = screen.getByRole('button', { name: 'Custom' });
    expect(button).toHaveClass('mt-4', 'custom-test-class', 'inline-flex');
  });

  it('handles clicks', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Click' }));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled and prevents click', async () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
    
    const user = userEvent.setup();
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from '../Badge';

describe('Badge component', () => {
  it('renders the label text', () => {
    render(<Badge label="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('defaults to slate variant when variant is not provided', () => {
    render(<Badge label="Default" />);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-slate-100');
    expect(badge.className).toContain('text-slate-700');
  });

  it('applies green variant classes', () => {
    render(<Badge label="Paid" variant="green" />);
    const badge = screen.getByText('Paid');
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-700');
  });

  it('applies red variant classes', () => {
    render(<Badge label="Overdue" variant="red" />);
    const badge = screen.getByText('Overdue');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-700');
  });

  it('applies amber variant classes', () => {
    render(<Badge label="Pending" variant="amber" />);
    const badge = screen.getByText('Pending');
    expect(badge.className).toContain('bg-amber-100');
    expect(badge.className).toContain('text-amber-700');
  });

  it('applies blue variant classes', () => {
    render(<Badge label="Info" variant="blue" />);
    const badge = screen.getByText('Info');
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-700');
  });

  it('applies purple variant classes', () => {
    render(<Badge label="Premium" variant="purple" />);
    const badge = screen.getByText('Premium');
    expect(badge.className).toContain('bg-purple-100');
    expect(badge.className).toContain('text-purple-700');
  });

  it('falls back to slate for unknown variant', () => {
    render(<Badge label="Unknown" variant="unknown" />);
    const badge = screen.getByText('Unknown');
    expect(badge.className).toContain('bg-slate-100');
    expect(badge.className).toContain('text-slate-700');
  });

  it('renders as a span element', () => {
    render(<Badge label="Test" />);
    expect(screen.getByText('Test').tagName).toBe('SPAN');
  });

  it('renders empty string label', () => {
    const { container } = render(<Badge label="" />);
    expect(container.querySelector('span')).toBeInTheDocument();
  });
});

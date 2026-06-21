import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from '../StatCard';

const MockIcon = ({ size }) => <svg data-testid="icon" width={size} height={size} />;

describe('StatCard component', () => {
  it('renders the label', () => {
    render(<StatCard label="Total Rooms" value={42} icon={MockIcon} />);
    expect(screen.getByText('Total Rooms')).toBeInTheDocument();
  });

  it('renders the numeric value', () => {
    render(<StatCard label="Rooms" value={42} icon={MockIcon} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders — when value is undefined', () => {
    render(<StatCard label="Rooms" icon={MockIcon} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders — when value is null', () => {
    render(<StatCard label="Rooms" value={null} icon={MockIcon} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the sub text when provided', () => {
    render(<StatCard label="Revenue" value="₹50,000" icon={MockIcon} sub="This month" />);
    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  it('does not render sub element when sub is not provided', () => {
    render(<StatCard label="Revenue" value="₹50,000" icon={MockIcon} />);
    expect(screen.queryByText('This month')).not.toBeInTheDocument();
  });

  it('renders the icon component', () => {
    render(<StatCard label="X" value={1} icon={MockIcon} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies indigo color classes by default', () => {
    const { container } = render(<StatCard label="X" value={1} icon={MockIcon} />);
    expect(container.querySelector('.bg-indigo-50')).toBeInTheDocument();
    expect(container.querySelector('.text-indigo-600')).toBeInTheDocument();
  });

  it('applies green color classes', () => {
    const { container } = render(<StatCard label="X" value={1} icon={MockIcon} color="green" />);
    expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
  });

  it('applies amber color classes', () => {
    const { container } = render(<StatCard label="X" value={1} icon={MockIcon} color="amber" />);
    expect(container.querySelector('.bg-amber-50')).toBeInTheDocument();
  });

  it('applies red color classes', () => {
    const { container } = render(<StatCard label="X" value={1} icon={MockIcon} color="red" />);
    expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
  });

  it('applies blue color classes', () => {
    const { container } = render(<StatCard label="X" value={1} icon={MockIcon} color="blue" />);
    expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
  });

  it('applies purple color classes', () => {
    const { container } = render(<StatCard label="X" value={1} icon={MockIcon} color="purple" />);
    expect(container.querySelector('.bg-purple-50')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(<StatCard label="Revenue" value="₹1,20,000" icon={MockIcon} />);
    expect(screen.getByText('₹1,20,000')).toBeInTheDocument();
  });
});

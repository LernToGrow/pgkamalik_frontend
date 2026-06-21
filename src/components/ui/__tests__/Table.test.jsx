import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Table from '../Table';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
];

const data = [
  { _id: '1', name: 'Alice', status: 'Active' },
  { _id: '2', name: 'Bob', status: 'Inactive' },
];

describe('Table component', () => {
  // ─── Column headers ────────────────────────────────────────────────────────

  it('renders all column headers', () => {
    render(<Table columns={columns} data={[]} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders Actions header when actions prop is provided', () => {
    render(<Table columns={columns} data={[]} actions={() => null} />);
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('does NOT render Actions header when actions prop is absent', () => {
    render(<Table columns={columns} data={[]} />);
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });

  // ─── Data rows ─────────────────────────────────────────────────────────────

  it('renders a row for each data item', () => {
    render(<Table columns={columns} data={data} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders cell values from row keys', () => {
    render(<Table columns={columns} data={data} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders — for missing field values', () => {
    const sparse = [{ _id: '1', name: 'Alice' }]; // status missing
    render(<Table columns={columns} data={sparse} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('uses col.render when provided', () => {
    const cols = [
      { key: 'name', label: 'Name', render: (row) => <b>{row.name.toUpperCase()}</b> },
    ];
    render(<Table columns={cols} data={[{ _id: '1', name: 'alice' }]} />);
    expect(screen.getByText('ALICE')).toBeInTheDocument();
  });

  it('calls actions function with each row', () => {
    const actions = vi.fn(() => <button>Edit</button>);
    render(<Table columns={columns} data={data} actions={actions} />);
    expect(actions).toHaveBeenCalledTimes(2);
    expect(actions).toHaveBeenCalledWith(data[0]);
    expect(actions).toHaveBeenCalledWith(data[1]);
  });

  it('renders action elements in each row', () => {
    const actions = () => <button>Edit</button>;
    render(<Table columns={columns} data={data} actions={actions} />);
    expect(screen.getAllByText('Edit')).toHaveLength(2);
  });

  // ─── Empty state ───────────────────────────────────────────────────────────

  it('shows "No records found" when data is empty', () => {
    render(<Table columns={columns} data={[]} />);
    expect(screen.getByText('No records found')).toBeInTheDocument();
  });

  it('empty state spans all columns including actions', () => {
    render(<Table columns={columns} data={[]} actions={() => null} />);
    const td = screen.getByText('No records found').closest('td');
    expect(td.colSpan).toBe(columns.length + 1); // +1 for actions
  });

  it('empty state spans only data columns when no actions', () => {
    render(<Table columns={columns} data={[]} />);
    const td = screen.getByText('No records found').closest('td');
    expect(td.colSpan).toBe(columns.length);
  });

  // ─── Key handling ──────────────────────────────────────────────────────────

  it('uses row index as key when _id is absent', () => {
    const noId = [{ name: 'X', status: 'Y' }];
    expect(() => render(<Table columns={columns} data={noId} />)).not.toThrow();
  });
});

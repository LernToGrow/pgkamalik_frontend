import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../Modal';

describe('Modal component', () => {
  it('renders the modal title', () => {
    render(<Modal title="Add Tenant" onClose={() => {}}><p>Content</p></Modal>);
    expect(screen.getByText('Add Tenant')).toBeInTheDocument();
  });

  it('renders children inside the modal', () => {
    render(<Modal title="Test" onClose={() => {}}><p>Modal body text</p></Modal>);
    expect(screen.getByText('Modal body text')).toBeInTheDocument();
  });

  it('calls onClose when the X button is clicked', async () => {
    const onClose = vi.fn();
    render(<Modal title="Test" onClose={onClose}><p>Body</p></Modal>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a close button', () => {
    render(<Modal title="Test" onClose={() => {}}><p>Body</p></Modal>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders complex children', () => {
    render(
      <Modal title="Form" onClose={() => {}}>
        <input placeholder="Name" />
        <button>Submit</button>
      </Modal>
    );
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('renders with a fixed overlay container', () => {
    const { container } = render(<Modal title="T" onClose={() => {}}><p>B</p></Modal>);
    const overlay = container.firstChild;
    expect(overlay.className).toContain('fixed');
    expect(overlay.className).toContain('inset-0');
  });
});

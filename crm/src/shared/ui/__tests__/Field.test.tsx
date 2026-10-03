import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Field } from '../Field';

describe('Field accessibility and label binding', () => {
  it('automatically connects label htmlFor to input id', () => {
    render(
      <Field label="Full Name">
        <input type="text" placeholder="Enter name" />
      </Field>
    );

    const input = screen.getByLabelText('Full Name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id');
    expect(input.id).toBeTruthy();
  });

  it('renders required indicator when required is true', () => {
    render(
      <Field label="Email Address" required>
        <input type="email" />
      </Field>
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders accessible error message and marks input aria-invalid', () => {
    render(
      <Field label="Phone" error="Phone number is invalid">
        <input type="tel" />
      </Field>
    );

    const input = screen.getByLabelText('Phone');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Phone number is invalid');
    expect(input).toHaveAttribute('aria-describedby', alert.id);
  });

  it('renders hint text when provided and no error exists', () => {
    render(
      <Field label="Notes" hint="Max 200 characters">
        <textarea />
      </Field>
    );

    const hint = screen.getByText('Max 200 characters');
    expect(hint).toBeInTheDocument();

    const textarea = screen.getByLabelText('Notes');
    expect(textarea).toHaveAttribute('aria-describedby', hint.id);
  });
});

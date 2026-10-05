import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonalWorkCategorySelector } from '../PersonalWorkCategorySelector';
import {
  getUserCustomCategories,
  saveUserCustomCategories,
  MAX_CUSTOM_CATEGORIES,
} from '@/lib/personalTasksStore';

function ControlledSelector({
  initialCategory = '',
  userId = 'test-user-999',
  onSelect,
}: {
  initialCategory?: string;
  userId?: string;
  onSelect?: (cat: string) => void;
}) {
  const [selected, setSelected] = React.useState(initialCategory);
  return (
    <PersonalWorkCategorySelector
      selectedCategory={selected}
      onSelectCategory={(cat) => {
        setSelected(cat);
        onSelect?.(cat);
      }}
      userId={userId}
    />
  );
}

describe('PersonalWorkCategorySelector', () => {
  const testUserId = 'test-user-999';

  beforeEach(() => {
    localStorage.clear();
  });

  it('initially renders empty slots with Add Label button when user has no categories', () => {
    render(<ControlledSelector userId={testUserId} />);

    // Initial state: "Add Label" on slot 0, and 2 "Empty" placeholder slots
    expect(screen.getByText('Add Label')).toBeInTheDocument();
    const emptySlots = screen.getAllByText('Empty');
    expect(emptySlots.length).toBe(2);
  });

  it('allows user to click Add Label and type a new custom category label', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(<ControlledSelector userId={testUserId} onSelect={handleSelect} />);

    // Click "Add Label"
    await user.click(screen.getByText('Add Label'));

    // Input should be present
    const input = screen.getByPlaceholderText('Label name...');
    expect(input).toBeInTheDocument();

    // Type new category name and submit with Enter
    await user.type(input, 'Inspections{Enter}');

    // Category should now be in the document and selected
    expect(screen.getByText('Inspections')).toBeInTheDocument();
    expect(handleSelect).toHaveBeenCalledWith('Inspections');

    // It should be persisted in localStorage for this user
    const saved = getUserCustomCategories(testUserId);
    expect(saved).toEqual(['Inspections']);
  });

  it('allows adding up to 3 custom labels and hides Add Label once 3 are reached', async () => {
    const user = userEvent.setup();
    saveUserCustomCategories(['Roofing', 'Solar'], testUserId);

    render(<ControlledSelector initialCategory="Roofing" userId={testUserId} />);

    expect(screen.getByText('Roofing')).toBeInTheDocument();
    expect(screen.getByText('Solar')).toBeInTheDocument();
    expect(screen.getByText('Add Label')).toBeInTheDocument();

    // Add the 3rd category
    await user.click(screen.getByText('Add Label'));
    const input = screen.getByPlaceholderText('Label name...');
    await user.type(input, 'Gutters{Enter}');

    expect(screen.getByText('Gutters')).toBeInTheDocument();
    expect(screen.queryByText('Add Label')).not.toBeInTheDocument();
    expect(screen.queryByText('Empty')).not.toBeInTheDocument();

    const saved = getUserCustomCategories(testUserId);
    expect(saved).toEqual(['Roofing', 'Solar', 'Gutters']);
  });

  it('allows deleting a category label and opens a slot back up', async () => {
    const user = userEvent.setup();
    saveUserCustomCategories(['Permits', 'Inspections'], testUserId);

    render(<ControlledSelector initialCategory="Permits" userId={testUserId} />);

    expect(screen.getByText('Permits')).toBeInTheDocument();
    expect(screen.getByText('Inspections')).toBeInTheDocument();

    // Click delete on Permits
    const deleteButton = screen.getByLabelText('Delete "Permits" category');
    await user.click(deleteButton);

    expect(screen.queryByText('Permits')).not.toBeInTheDocument();
    expect(screen.getByText('Inspections')).toBeInTheDocument();

    // Now an Add Label slot is open again
    expect(screen.getByText('Add Label')).toBeInTheDocument();

    const saved = getUserCustomCategories(testUserId);
    expect(saved).toEqual(['Inspections']);
  });

  it('selects category when category chip is clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    saveUserCustomCategories(['Estimates', 'Site Visits'], testUserId);

    render(
      <ControlledSelector
        initialCategory="Estimates"
        userId={testUserId}
        onSelect={handleSelect}
      />
    );

    await user.click(screen.getByText('Site Visits'));
    expect(handleSelect).toHaveBeenCalledWith('Site Visits');
  });
});

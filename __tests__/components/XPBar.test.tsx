import React from 'react';
import { render } from '@testing-library/react-native';
import { XPBar } from '../../src/components/XPBar';

describe('XPBar', () => {
  it('renders level and XP text', () => {
    const { getByText } = render(<XPBar level={2} totalXp={150} />);
    expect(getByText(/Lv 2/)).toBeTruthy();
    expect(getByText(/150 XP/)).toBeTruthy();
  });

  it('renders streak chip when currentStreak > 0', () => {
    const { getByText } = render(<XPBar level={1} totalXp={0} currentStreak={5} />);
    expect(getByText(/🔥 5/)).toBeTruthy();
  });

  it('does not render streak chip when currentStreak is 0', () => {
    const { queryByText } = render(<XPBar level={1} totalXp={0} currentStreak={0} />);
    expect(queryByText(/🔥/)).toBeNull();
  });

  it('does not render streak chip when currentStreak is omitted', () => {
    const { queryByText } = render(<XPBar level={1} totalXp={0} />);
    expect(queryByText(/🔥/)).toBeNull();
  });
});

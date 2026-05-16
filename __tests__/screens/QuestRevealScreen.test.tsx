import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QuestRevealScreen } from '../../src/screens/QuestRevealScreen';
import { useQuestStore } from '../../src/stores/questStore';
import { usePackStore } from '../../src/stores/packStore';
import { allQuests } from '../../src/data/quests';
import { Mood } from '../../src/types';

jest.mock('../../src/lib/feedback', () => ({
  playCardRevealFeedback: jest.fn(),
}));

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

const BORED_MOOD: Mood = 'bored';
const mockRoute = { params: { mood: BORED_MOOD } };

const boredQuestIds = allQuests
  .filter((q) => q.moods.includes('bored'))
  .slice(0, 3)
  .map((q) => q.id);

beforeEach(() => {
  useQuestStore.setState({
    completedQuests: [],
    activeQuestId: null,
    lastRevealedQuestIds: boredQuestIds,
  });
  usePackStore.setState({ unlockedPackIds: ['free'] });
  jest.clearAllMocks();
});

describe('QuestRevealScreen hint text', () => {
  it('shows "Tap a card to reveal" before any card is revealed', () => {
    const { getByText } = render(
      <QuestRevealScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    expect(getByText('Tap a card to reveal')).toBeTruthy();
  });

  it('does not show helper text before any card is revealed', () => {
    const { queryByText } = render(
      <QuestRevealScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    expect(queryByText('Tap a revealed card to continue')).toBeNull();
  });

  it('shows "Choose one quest" after at least one card is revealed', () => {
    const { getAllByText, getByText } = render(
      <QuestRevealScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    fireEvent.press(getAllByText('Tap to reveal')[0]);
    expect(getByText('Choose one quest')).toBeTruthy();
  });

  it('shows helper text after at least one card is revealed', () => {
    const { getAllByText, getByText } = render(
      <QuestRevealScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    fireEvent.press(getAllByText('Tap to reveal')[0]);
    expect(getByText('Tap a revealed card to continue')).toBeTruthy();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  ProjectShellTabBar,
  type TabItem,
} from '../src/guepard/shell/project-shell-tab-bar';

// JSDOM does not implement scrollIntoView; the tab bar calls it on mount.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const TWO_TABS: TabItem[] = [
  { id: 'a', title: 'Alpha', active: true },
  { id: 'b', title: 'Bravo' },
];

const PINNED: TabItem[] = [
  { id: 'p', title: 'Pinned', pinned: true },
  { id: 'a', title: 'Alpha', active: true },
];

describe('ProjectShellTabBar — drag/click separation', () => {
  it('clicking on the tab body fires onTabClick exactly once', () => {
    const onTabClick = vi.fn();
    const onTabReorder = vi.fn();
    render(
      <ProjectShellTabBar
        tabs={TWO_TABS}
        onTabClick={onTabClick}
        onTabClose={vi.fn()}
        onTabReorder={onTabReorder}
      />,
    );

    fireEvent.click(screen.getByText('Bravo'));

    expect(onTabClick).toHaveBeenCalledTimes(1);
    expect(onTabClick).toHaveBeenCalledWith('b');
    expect(onTabReorder).not.toHaveBeenCalled();
  });

  it('a tab without intermediate pointer movement is treated as a click, not a drag', () => {
    const onTabClick = vi.fn();
    const onTabReorder = vi.fn();
    render(
      <ProjectShellTabBar
        tabs={PINNED}
        onTabClick={onTabClick}
        onTabClose={vi.fn()}
        onTabReorder={onTabReorder}
      />,
    );

    fireEvent.click(screen.getByText('Alpha'));
    expect(onTabClick).toHaveBeenCalledWith('a');
    expect(onTabReorder).not.toHaveBeenCalled();
  });

  it('clicking the close button does not also fire onTabClick', () => {
    const onTabClick = vi.fn();
    const onTabClose = vi.fn();
    render(
      <ProjectShellTabBar
        tabs={TWO_TABS}
        onTabClick={onTabClick}
        onTabClose={onTabClose}
      />,
    );

    fireEvent.click(screen.getByLabelText('Close Bravo'));
    expect(onTabClose).toHaveBeenCalledWith('b');
    expect(onTabClick).not.toHaveBeenCalled();
  });
});

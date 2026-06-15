import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary: Record<string, string> = {
        'picture.title': 'Your Profile Picture',
        'picture.description':
          'Please choose a photo to upload as your profile picture.',
        'picture.upload': 'Upload',
        'picture.clear': 'Clear',
        'picture.invalidType': 'Please choose a PNG, JPEG, WEBP, or GIF image.',
        'picture.tooLarge': 'Image must be 2 MB or smaller.',
      };
      return dictionary[key] ?? key;
    },
  }),
}));

import { PictureCard } from '../src/components/picture-card';

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe('PictureCard', () => {
  it('uploads a valid image', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const onClear = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <PictureCard
        displayName="Hani"
        pictureUrl={null}
        onUpload={onUpload}
        onClear={onClear}
      />,
    );

    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    await user.upload(input, makeFile('a.png', 'image/png', 1024));

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledTimes(1);
    });
    expect(onClear).not.toHaveBeenCalled();
  });

  it('rejects a non-image file with an inline error and never calls onUpload', async () => {
    const onUpload = vi.fn();

    const { container } = render(
      <PictureCard
        displayName="Hani"
        pictureUrl={null}
        onUpload={onUpload}
        onClear={vi.fn()}
      />,
    );

    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    // Bypass the input's `accept="image/*"` filter (a UX hint) by firing a
    // change event directly so the component's defensive MIME check runs.
    fireEvent.change(input, {
      target: { files: [makeFile('a.txt', 'text/plain', 1024)] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please choose a PNG, JPEG, WEBP, or GIF image.',
    );
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('rejects an oversize image and never calls onUpload', async () => {
    const onUpload = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <PictureCard
        displayName="Hani"
        pictureUrl={null}
        onUpload={onUpload}
        onClear={vi.fn()}
      />,
    );

    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    await user.upload(input, makeFile('big.png', 'image/png', 3 * 1024 * 1024));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Image must be 2 MB or smaller.',
    );
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('shows the Clear button when an avatar is set and calls onClear', async () => {
    const onClear = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <PictureCard
        displayName="Hani"
        pictureUrl="https://example.com/a.png"
        onUpload={vi.fn()}
        onClear={onClear}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('hides the Clear button when no avatar is set', () => {
    render(
      <PictureCard
        displayName="Hani"
        pictureUrl={null}
        onUpload={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('renders exactly one avatar element (no duplicate from primitives)', () => {
    const { container } = render(
      <PictureCard
        displayName="Hani"
        pictureUrl={null}
        onUpload={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    // ProfileAvatar uses Radix Avatar which renders a single span[role=img]-style
    // root with class containing "rounded-full". Verify only one such top-level
    // avatar exists in the card.
    const avatars = container.querySelectorAll(
      '[data-slot="avatar"], .rounded-full',
    );
    // Allow shape-only `rounded-full` matches that aren't avatars (e.g. the
    // Tailwind class on icons), but the avatar root has both data-slot and the
    // 80px square sizing we apply in PictureCard.
    const avatarRoots = Array.from(avatars).filter((el) =>
      el.classList.contains('h-20'),
    );
    expect(avatarRoots).toHaveLength(1);
  });

  it('triggers the file input when Upload is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PictureCard
        displayName="Hani"
        pictureUrl={null}
        onUpload={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    await user.click(screen.getByRole('button', { name: 'Upload' }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@guepard/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@guepard/ui/card';
import { ProfileAvatar } from '@guepard/ui/profile-avatar';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

export type PictureCardProps = Readonly<{
  displayName: string;
  pictureUrl: string | null;
  isPending?: boolean;
  onUpload: (file: File) => void | Promise<void>;
  onClear: () => void | Promise<void>;
}>;

export function PictureCard({
  displayName,
  pictureUrl,
  isPending = false,
  onUpload,
  onClear,
}: PictureCardProps) {
  const { t } = useTranslation('user-profile');
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    // Reset so picking the same file again still fires `change`.
    event.target.value = '';
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('picture.invalidType'));
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError(t('picture.tooLarge'));
      return;
    }
    await onUpload(file);
  };

  const handleClear = async () => {
    setError(null);
    await onClear();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('picture.title')}</CardTitle>
        <CardDescription>{t('picture.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4" data-test="picture-card">
          <div data-test="picture-avatar">
            <ProfileAvatar
              displayName={displayName}
              pictureUrl={pictureUrl}
              className="h-20 w-20 text-2xl"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => inputRef.current?.click()}
                data-test="picture-upload"
              >
                {t('picture.upload')}
              </Button>
              {pictureUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={handleClear}
                  data-test="picture-clear"
                >
                  {t('picture.clear')}
                </Button>
              ) : null}
            </div>
            {error ? (
              <p
                role="alert"
                data-test="picture-error"
                className="text-destructive text-xs"
              >
                {error}
              </p>
            ) : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSelect}
            data-test="picture-input"
          />
        </div>
      </CardContent>
    </Card>
  );
}

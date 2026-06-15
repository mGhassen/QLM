import { Button } from '@qlm/ui/button';
import { OauthProviderLogoImage } from '@qlm/ui/oauth-provider-logo-image';

export function AuthProviderButton({
  providerId,
  onClick,
  children,
}: React.PropsWithChildren<{
  providerId: string;
  onClick: () => void;
}>) {
  return (
    <Button
      className={'flex w-full space-x-2 text-center'}
      data-provider={providerId}
      data-test={'auth-provider-button'}
      variant={'outline'}
      onClick={onClick}
    >
      <OauthProviderLogoImage providerId={providerId} />

      <span>{children}</span>
    </Button>
  );
}

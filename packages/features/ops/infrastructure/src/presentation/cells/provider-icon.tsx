import type { NodeProvider } from '@guepard/domain/entities';

import {
  CloudProviderIcon,
  type CloudProviderIconProps,
} from '@guepard/ui/cloud-provider-icon';

/**
 * Thin re-export under the legacy name. New consumers should import
 * `CloudProviderIcon` directly from `@guepard/ui/cloud-provider-icon`.
 */
export function ProviderIcon(
  props: Readonly<{
    provider: NodeProvider | undefined;
    size?: number;
    className?: string;
    minimal?: boolean;
  }>,
) {
  return <CloudProviderIcon {...(props as CloudProviderIconProps)} />;
}

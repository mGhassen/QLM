import * as React from 'react';
import type { ToolUIPart as AIToolUIPart } from 'ai';

import { ToolVariantProvider, useToolVariant } from '../tool-variant-context';

export function VariantSetter(props: { variant: 'default' | 'minimal' }) {
  const { setVariant } = useToolVariant();
  React.useEffect(() => {
    setVariant(props.variant);
  }, [props.variant, setVariant]);
  return null;
}

export function Frame(props: React.PropsWithChildren) {
  return <div className="bg-background w-full p-8">{props.children}</div>;
}

export function SingleToolFrame(props: {
  variant: 'default' | 'minimal';
  children: React.ReactNode;
}) {
  return (
    <ToolVariantProvider>
      <VariantSetter variant={props.variant} />
      <Frame>{props.children}</Frame>
    </ToolVariantProvider>
  );
}

export type ToolPartStory = {
  part: AIToolUIPart;
  messageId?: string;
  index?: number;
};

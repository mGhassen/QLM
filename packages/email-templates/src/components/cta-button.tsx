import { Button } from '@react-email/components';

export function CtaButton(
  props: React.PropsWithChildren<{
    href: string;
  }>,
) {
  return (
    <Button
      className="w-full bg-[#000000] py-3 text-center text-[14px] font-semibold text-white no-underline shadow-sm"
      href={props.href}
    >
      {props.children}
    </Button>
  );
}

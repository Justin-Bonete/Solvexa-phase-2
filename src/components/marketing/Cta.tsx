import { cta, type CtaId } from '@content/cta';
import { Button, ButtonLink } from '@/components/ui/Button';

type Props = {
  id: CtaId;
  variant?: 'primary' | 'secondary' | 'tertiary';
  to?: string;
  className?: string;
  label?: string;
};

/** Renders a real link when the destination exists, otherwise a visibly disabled button with the reason. */
export function Cta({ id, variant = 'primary', to, className = '', label }: Props) {
  const def = cta[id];
  const text = label ?? def.label;
  if (def.enabled || to) {
    return (
      <ButtonLink to={to ?? def.to} variant={variant} className={className}>
        {text}
      </ButtonLink>
    );
  }
  return (
    <Button variant={variant} disabledReason={def.reason} className={className}>
      {text}
    </Button>
  );
}

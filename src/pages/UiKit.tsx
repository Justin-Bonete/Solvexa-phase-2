import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Alert,
  Badge,
  Card,
  Container,
  EmptyState,
  ErrorState,
  PlaceholderBadge,
  Skeleton,
} from '@/components/ui/Feedback';
import { Checkbox, FormField, Input, Textarea } from '@/components/ui/Form';

/** Dev-only kitchen sink for reviewing components. Not routed in production builds. */
export default function UiKit() {
  const [loading, setLoading] = useState(false);
  return (
    <Container className="space-y-10 py-12">
      <h1 className="text-h1">Component kitchen sink</h1>
      <section className="flex flex-wrap items-start gap-4">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="tertiary">Tertiary</Button>
        <Button variant="danger">Danger</Button>
        <Button
          loading={loading}
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1200);
          }}
        >
          Loading demo
        </Button>
        <Button disabledReason="Reason shown to everyone.">Disabled</Button>
      </section>
      <section className="grid max-w-md gap-4">
        <FormField label="Label" hint="Hint text" required>
          {(a) => <Input {...a} />}
        </FormField>
        <FormField label="With error" error="Enter a valid value">
          {(a) => <Input {...a} />}
        </FormField>
        <FormField label="Message">{(a) => <Textarea {...a} />}</FormField>
        <Checkbox label="Checkbox label" />
      </section>
      <section className="flex flex-wrap gap-2">
        <Badge>Neutral</Badge>
        <Badge tone="accent">Accent</Badge>
        <Badge tone="ok">OK</Badge>
        <Badge tone="warn">Warn</Badge>
        <Badge tone="bad">Bad</Badge>
        <PlaceholderBadge />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Alert tone="info" title="Info">
          Message
        </Alert>
        <Alert tone="danger" title="Danger">
          Message
        </Alert>
        <Card>Card</Card>
        <Skeleton className="h-20" />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <EmptyState title="Empty state">Explain what to do next.</EmptyState>
        <ErrorState message="What went wrong and how to fix it." onRetry={() => undefined} />
      </section>
    </Container>
  );
}

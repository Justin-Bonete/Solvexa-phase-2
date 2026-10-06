export type Testimonial = { id: string; quote: string; author: string; org: string; verified: boolean };

/** Placeholders only. Never add a testimonial with verified: true unless it is real and you have permission to publish it. */
export const testimonials: Testimonial[] = [
  {
    id: 't1',
    quote: 'Placeholder testimonial. Replace with a real client quote and permission to publish.',
    author: 'Client name',
    org: 'Organization',
    verified: false,
  },
  {
    id: 't2',
    quote: 'Placeholder testimonial. Replace with a real client quote and permission to publish.',
    author: 'Client name',
    org: 'Organization',
    verified: false,
  },
  {
    id: 't3',
    quote: 'Placeholder testimonial. Replace with a real client quote and permission to publish.',
    author: 'Client name',
    org: 'Organization',
    verified: false,
  },
];

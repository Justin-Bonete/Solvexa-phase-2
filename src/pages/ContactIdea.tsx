import { InquiryForm } from '@/features/intake/InquiryForm';
import { IntakePage } from './IntakePage';

export default function ContactIdea() {
  return (
    <IntakePage heading="Idea inquiry">
      <InquiryForm path="idea" />
    </IntakePage>
  );
}

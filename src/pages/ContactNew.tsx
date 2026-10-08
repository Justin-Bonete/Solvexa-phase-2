import { InquiryForm } from '@/features/intake/InquiryForm';
import { IntakePage } from './IntakePage';

export default function ContactNew() {
  return (
    <IntakePage heading="New system inquiry">
      <InquiryForm path="new" />
    </IntakePage>
  );
}

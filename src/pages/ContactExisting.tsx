import { InquiryForm } from '@/features/intake/InquiryForm';
import { IntakePage } from './IntakePage';

export default function ContactExisting() {
  return (
    <IntakePage heading="Existing system inquiry">
      <InquiryForm path="existing" />
    </IntakePage>
  );
}

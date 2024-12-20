import { Container } from '@/components/layout/Container';
import { VerificationForm } from '@/components/verification/VerificationForm';
import { VerificationStatus } from '@/components/verification/VerificationStatus';

export default function VerificationPage() {
  return (
    <Container className="py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Community Verification</h1>
        <VerificationStatus />
        <div className="mt-8">
          <VerificationForm />
        </div>
      </div>
    </Container>
  );
}
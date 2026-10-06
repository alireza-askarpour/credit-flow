import { FailureType, PaymentProcessingError } from '@app/common';
import { PaymentFailureSimulator } from './payment-failure-simulator.service';

const simulatorWith = (simulation: {
  enabled: boolean;
  max_amount: number;
  seed?: string;
}) =>
  new PaymentFailureSimulator({
    getOrThrow: () => simulation,
  } as never);

describe('PaymentFailureSimulator', () => {
  it('treats FAIL references as non-retryable business failures', async () => {
    await expect(
      simulatorWith({ enabled: true, max_amount: 1_000_000 }).run({
        amount: 1n,
        reference: 'invoice-FAIL-001',
      }),
    ).rejects.toMatchObject({
      failureType: FailureType.BUSINESS,
      code: 'SIMULATED_BUSINESS_FAILURE',
    } satisfies Partial<PaymentProcessingError>);
  });

  it('treats FAIL_TECH references as retryable technical failures', async () => {
    await expect(
      simulatorWith({ enabled: true, max_amount: 1_000_000 }).run({
        amount: 1n,
        reference: 'invoice-FAIL_TECH-001',
      }),
    ).rejects.toMatchObject({
      failureType: FailureType.TECHNICAL,
      code: 'SIMULATED_TECHNICAL_FAILURE',
    } satisfies Partial<PaymentProcessingError>);
  });

  it('does not simulate failures when disabled', async () => {
    await expect(
      simulatorWith({ enabled: false, max_amount: 1 }).run({
        amount: 1_000_000n,
        reference: 'normal-reference',
      }),
    ).resolves.toBeUndefined();
  });
});

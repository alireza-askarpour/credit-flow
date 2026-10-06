import { FailureType } from '../enums/failure-type.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import {
  allowedPaymentTransitions,
  assertPaymentTransition,
  canTransition,
} from './payment-state-machine';

describe('payment state machine', () => {
  it.each([
    [PaymentStatus.PENDING, PaymentStatus.QUEUED],
    [PaymentStatus.QUEUED, PaymentStatus.PROCESSING],
    [PaymentStatus.PROCESSING, PaymentStatus.SUCCEEDED],
    [PaymentStatus.PROCESSING, PaymentStatus.FAILED],
    [PaymentStatus.PENDING, PaymentStatus.CANCELLED],
    [PaymentStatus.QUEUED, PaymentStatus.CANCELLED],
  ])('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertPaymentTransition(from, to)).not.toThrow();
  });

  it('allows PROCESSING -> QUEUED only for technical failures', () => {
    expect(
      canTransition(PaymentStatus.PROCESSING, PaymentStatus.QUEUED, {
        failureType: FailureType.TECHNICAL,
      }),
    ).toBe(true);
    expect(
      canTransition(PaymentStatus.PROCESSING, PaymentStatus.QUEUED, {
        failureType: FailureType.BUSINESS,
      }),
    ).toBe(false);
  });

  it.each([
    [PaymentStatus.SUCCEEDED, PaymentStatus.PROCESSING],
    [PaymentStatus.SUCCEEDED, PaymentStatus.FAILED],
    [PaymentStatus.FAILED, PaymentStatus.PROCESSING],
    [PaymentStatus.CANCELLED, PaymentStatus.QUEUED],
    [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
  ])('rejects %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertPaymentTransition(from, to)).toThrow();
  });

  it.each([
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
  ])('has no outgoing transitions from terminal state %s', (status) => {
    expect(allowedPaymentTransitions(status)).toEqual([]);
  });
});

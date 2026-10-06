import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentStateTransitionError } from '../errors/payment-state-transition.error';

const TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  [PaymentStatus.PENDING]: [PaymentStatus.QUEUED, PaymentStatus.CANCELLED],
  [PaymentStatus.QUEUED]: [PaymentStatus.PROCESSING, PaymentStatus.CANCELLED],
  [PaymentStatus.PROCESSING]: [PaymentStatus.SUCCEEDED, PaymentStatus.FAILED],
  [PaymentStatus.SUCCEEDED]: [],
  [PaymentStatus.FAILED]: [PaymentStatus.PROCESSING],
  [PaymentStatus.CANCELLED]: [],
};

export function canTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertPaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): void {
  if (!canTransition(from, to)) {
    throw new PaymentStateTransitionError(from, to);
  }
}

export function allowedPaymentTransitions(
  status: PaymentStatus,
): readonly PaymentStatus[] {
  return TRANSITIONS[status];
}

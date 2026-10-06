import { PaymentStatus } from '../enums/payment-status.enum';
import { FailureType } from '../enums/failure-type.enum';
import { PaymentStateTransitionError } from '../errors/payment-state-transition.error';

const TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  [PaymentStatus.PENDING]: [PaymentStatus.QUEUED, PaymentStatus.CANCELLED],
  [PaymentStatus.QUEUED]: [PaymentStatus.PROCESSING, PaymentStatus.CANCELLED],
  [PaymentStatus.PROCESSING]: [
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.QUEUED,
  ],
  [PaymentStatus.SUCCEEDED]: [],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.CANCELLED]: [],
};

export interface PaymentTransitionContext {
  failureType?: FailureType;
}

export function canTransition(
  from: PaymentStatus,
  to: PaymentStatus,
  context: PaymentTransitionContext = {},
): boolean {
  if (!TRANSITIONS[from].includes(to)) {
    return false;
  }

  return (
    from !== PaymentStatus.PROCESSING ||
    to !== PaymentStatus.QUEUED ||
    context.failureType === FailureType.TECHNICAL
  );
}

export function assertPaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus,
  context: PaymentTransitionContext = {},
): void {
  if (!canTransition(from, to, context)) {
    throw new PaymentStateTransitionError(from, to);
  }
}

export function allowedPaymentTransitions(
  status: PaymentStatus,
): readonly PaymentStatus[] {
  return TRANSITIONS[status];
}

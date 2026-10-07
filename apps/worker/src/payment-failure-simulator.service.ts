import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@app/config';
import {
  isNil,
  isFalse,
  ErrorCode,
  FailureType,
  PaymentProcessingError,
} from '@app/common';

@Injectable()
export class PaymentFailureSimulator {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables>,
  ) {}

  async run(payment: { amount: bigint; reference: string }): Promise<void> {
    const simulation = this.config.getOrThrow('simulation', { infer: true });
    if (isFalse(simulation.enabled)) {
      return;
    }

    const reference = payment.reference.toUpperCase();
    if (reference.includes('FAIL_TECH')) {
      throw new PaymentProcessingError(
        ErrorCode.SIMULATED_TECHNICAL_FAILURE,
        FailureType.TECHNICAL,
      );
    }

    if (reference.includes('FAIL')) {
      throw new PaymentProcessingError(
        ErrorCode.SIMULATED_BUSINESS_FAILURE,
        FailureType.BUSINESS,
      );
    }

    const maxAmount = BigInt(simulation.max_amount);
    const probability = Math.min(
      0.9,
      Number(payment.amount >= maxAmount ? maxAmount : payment.amount) /
        simulation.max_amount,
    );

    if (this.random(payment.reference, simulation.seed) < probability) {
      throw new PaymentProcessingError(
        ErrorCode.SIMULATED_AMOUNT_FAILURE,
        FailureType.TECHNICAL,
      );
    }
  }

  private random(reference: string, seed?: string): number {
    if (isNil(seed)) {
      return Math.random();
    }

    let hash = 2166136261;
    for (const character of `${seed}:${reference}`) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0) / 4_294_967_296;
  }
}

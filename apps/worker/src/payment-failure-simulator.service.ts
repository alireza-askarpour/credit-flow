import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@app/config';
import { FailureType, PaymentProcessingError } from '@app/common';

@Injectable()
export class PaymentFailureSimulator {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables>,
  ) {}

  async run(payment: { amount: bigint; reference: string }): Promise<void> {
    const simulation = this.config.getOrThrow('simulation', { infer: true });
    if (!simulation.enabled) {
      return;
    }

    const reference = payment.reference.toUpperCase();
    if (reference.includes('FAIL_TECH')) {
      throw new PaymentProcessingError(
        'Simulated technical failure',
        FailureType.TECHNICAL,
        'SIMULATED_TECHNICAL_FAILURE',
      );
    }

    if (reference.includes('FAIL')) {
      throw new PaymentProcessingError(
        'Simulated business failure',
        FailureType.BUSINESS,
        'SIMULATED_BUSINESS_FAILURE',
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
        'Simulated amount-based technical failure',
        FailureType.TECHNICAL,
        'SIMULATED_AMOUNT_FAILURE',
      );
    }
  }

  private random(reference: string, seed?: string): number {
    if (!seed) {
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

import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentFailureSimulator {
  async run(): Promise<void> {
    // Failure scenarios will be configured here in the simulation section.
  }
}

import { Module } from '@nestjs/common';
import { ActivationSignalsService } from './activation-signals.service';
import { PrismaService } from '../prisma.service';

/**
 * [EA-37] Activation Signals Module
 *
 * Provides activation milestone computation and success indicator services.
 * All metrics are internal-only (admin dashboards) and align to user value.
 */
@Module({
  providers: [ActivationSignalsService, PrismaService],
  exports: [ActivationSignalsService],
})
export class ActivationSignalsModule {}

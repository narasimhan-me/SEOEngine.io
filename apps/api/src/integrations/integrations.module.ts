import { Module, forwardRef } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '../prisma.service';
import { ProjectsModule } from '../projects/projects.module';

/**
 * [ROLES-3 FIXUP-4] Import ProjectsModule to enable RoleResolutionService injection
 */
@Module({
  imports: [forwardRef(() => ProjectsModule)],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, PrismaService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}

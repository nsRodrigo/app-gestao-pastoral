import { Module } from "@nestjs/common";
import { FamiliesController } from "./families.controller";
import { FamiliesService } from "./families.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [FamiliesController],
  providers: [FamiliesService],
  exports: [FamiliesService],
})
export class FamiliesModule {}

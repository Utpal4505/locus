import { Module } from "@nestjs/common";
import { OpenAiBatchClient } from "./clients/openai-batch.client.js";
import { TopicService } from "./services/topic.service.js";
import { ClassificationService } from "./services/classification.service.js";
import { BatchOrchestratorService } from "./services/batch-orchestrator.service.js";
import { ClassificationSchedulerService } from "./services/classification-scheduler.service.js";
import { ClassificationMonitoringService } from "./services/classification-monitoring.service.js";
import { ClassificationMonitoringRepository } from "./repositories/classification-monitoring.repository.js";
import { TopicController } from "./controllers/topic.controller.js";
import { ClassificationMonitoringController } from "./controllers/classification-monitoring.controller.js";

@Module({
  controllers: [TopicController, ClassificationMonitoringController],
  providers: [
    OpenAiBatchClient,
    TopicService,
    ClassificationService,
    BatchOrchestratorService,
    ClassificationSchedulerService,
    ClassificationMonitoringRepository,
    ClassificationMonitoringService,
  ],
  exports: [
    TopicService,
    ClassificationService,
    BatchOrchestratorService,
    ClassificationMonitoringRepository,
    ClassificationMonitoringService,
  ],
})
export class ClassificationModule {}


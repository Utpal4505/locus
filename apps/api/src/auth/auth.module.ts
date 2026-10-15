import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { EmailService } from "./email.service.js";

@Module({
  controllers: [AuthController],
  providers: [AuthGuard, EmailService],
  exports: [AuthGuard, EmailService],
})
export class AuthModule {}


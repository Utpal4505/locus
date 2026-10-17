import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { OAuthStateService } from "./oauth-state.service.js";
import { YoutubeController } from "./youtube.controller.js";
import { YoutubeOAuthService } from "./youtube-oauth.service.js";

@Module({
  imports: [AuthModule],
  controllers: [YoutubeController],
  providers: [YoutubeOAuthService, OAuthStateService],
  exports: [YoutubeOAuthService, OAuthStateService],
})
export class YoutubeModule {}


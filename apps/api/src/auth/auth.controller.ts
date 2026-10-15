import { All, Controller, Get, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth, getAvailableAuthProviders } from "./auth.js";

@Controller("api/auth")
export class AuthController {
  private readonly handler = toNodeHandler(auth);

  @Get("providers")
  getProviders() {
    return getAvailableAuthProviders();
  }

  @All("*splat")
  async handleAll(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }

  @All()
  async handleRoot(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }
}


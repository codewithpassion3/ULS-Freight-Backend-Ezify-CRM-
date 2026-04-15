import { Controller, Get, UseGuards, Req, Res, Query, Headers, Header, Options, Session } from "@nestjs/common";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { SSEService } from "../service/sse.service";
import type { Request, Response } from "express";
import type { SessionData } from "express-session";

@Controller('notifications/stream')
export class SSEController {
  constructor(private sseService: SSEService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  async stream(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Session() session: SessionData,
    @Headers('last-event-id') lastEventId?: string
  ) {
    await this.sseService.handleConnection(
      res,
      String(session.userId as any), 
      String(session.companyId as any),
      lastEventId
    );
  }
}
import { Controller, Get, UseGuards, Req, Res, Query, Headers } from "@nestjs/common";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { SSEService } from "../service/sse.service";
import type { Request, Response } from "express";

@Controller('notifications/stream')
export class SSEController {
  constructor(private sseService: SSEService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  async stream(
    @Req() req: Request,
    @Res() res: Response,
    @Query('userId') userId?: string,
    @Query('companyId') companyId?: string,
    @Headers('last-event-id') lastEventId?: string
  ) {
    await this.sseService.handleConnection(
      res,
      userId as string, 
      companyId,
      lastEventId
    );
  }
}
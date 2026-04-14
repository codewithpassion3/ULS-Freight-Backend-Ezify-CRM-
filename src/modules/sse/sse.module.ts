import { Module } from "@nestjs/common";
import { SSEController } from "./controller/sse.controller";
import { ConnectionRepository } from "./repository/sse.repository";
import { SSEService } from "./service/sse.service";

@Module({
  controllers: [SSEController],
  providers: [
    SSEService,
    ConnectionRepository,
  ],
  exports: [SSEService],
})
export class SSEModule {}
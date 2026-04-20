// src/worker.ts
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "src/modules/worker/worker.module";

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule);
  await app.init(); // No HTTP listener for pure worker
  
  console.log('Worker process started and listening for jobs...');
  
  // Keep alive
  await new Promise(() => {});
}
bootstrap();
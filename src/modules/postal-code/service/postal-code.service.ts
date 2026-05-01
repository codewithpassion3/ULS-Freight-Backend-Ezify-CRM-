import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/core";
import ExcelJS from "exceljs";
import { PostalCode } from "src/entities/postal-codes.entity";

@Injectable()
export class PostalCodeService {
  private readonly logger = new Logger(PostalCodeService.name);

  private readonly BATCH_SIZE = 200;
  private readonly FILE_PATH = "./postal-data.xlsx";

  constructor(private readonly em: EntityManager) {}

  async seedPostalCodes() {
    const em = this.em.fork();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.FILE_PATH);

    const sheet = workbook.worksheets[0];

    let batch: PostalCode[] = [];
    let total = 0;

    this.logger.log("⚡ Starting postal code import...");

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);

      const postalCode = row.getCell(1).value?.toString().trim();
      const placeName = row.getCell(2).value?.toString().trim();
      const country = row.getCell(3).value?.toString().trim();
      const fsaProvince = row.getCell(4).value?.toString().trim();

      if (!postalCode || !placeName || !country || !fsaProvince) continue; 

      batch.push(
        em.create(PostalCode, {
          postalCode,
          placeName,
          country,
          fsaProvince,
        }),
      );

      if (batch.length >= this.BATCH_SIZE) {
        await this.flush(em, batch);
        total += batch.length;

        this.logger.log(`Inserted: ${total}`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await this.flush(em, batch);
      total += batch.length;
    }

    this.logger.log(`✅ Done. Total inserted: ${total}`);
    return total;
  }

  async getAddressByPostalCode(postalCode: string) {
    const record = await this.em.findOne(PostalCode, {
      postalCode: postalCode.trim(),
    });

    if (!record) {
      throw new NotFoundException("Postal code not found");
    }

    return record;
  }

  private async flush(em: EntityManager, batch: PostalCode[]) {
    await em.persist(batch).flush();
    em.clear();
  }
}
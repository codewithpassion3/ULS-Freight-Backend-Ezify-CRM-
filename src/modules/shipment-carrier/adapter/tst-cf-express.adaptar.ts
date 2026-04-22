import { TSTCFRateRequest, TSTCFRateResponse } from "src/types/tst-cf-express";
import { TSTCFExpressMapper } from "src/modules/shipment-carrier/mapper/tst-cf-express.mapper";
import { BadRequestException } from '@nestjs/common';
import { Builder } from 'xml2js';
import { parseStringPromise } from 'xml2js';
import { CarrierAdapter } from "src/types/shipment-carriers";
export class TSTCFExpressAdapter implements CarrierAdapter {
  readonly carrierName = 'tst-cf-express';
  private readonly baseUrl: string;
  private readonly mapper: TSTCFExpressMapper;
//   private readonly useMock: boolean;

  constructor(params?: {
    baseUrl?: string;
    useMock?: boolean;
  }) {
    this.baseUrl = process.env.TST_CF_BASE_URL as string;
    // this.useMock = params?.useMock || process.env.NODE_ENV === 'development' || process.env.TST_CF_MOCK === 'true';
    this.mapper = new TSTCFExpressMapper();
  }

  async getRates(req: any): Promise<any[]> {
    // if (this.useMock) {
    //   return this.getMockRates(req);
    // }

    const carrierPayload = this.buildRequest(req);
    const carrierResponse = await this.fetchRates(carrierPayload);
    return this.parseResponse(carrierResponse);
  }

  buildRequest(req: any): TSTCFRateRequest {
    // No validation — just map
    return this.mapper.map(req);
  }

  async fetchRates(carrierPayload: unknown): Promise<unknown> {
    const payload = carrierPayload as TSTCFRateRequest;
    
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'ISO-8859-1' },
      renderOpts: { pretty: false },
      headless: false,
    });

    const xmlPayload = builder.buildObject({ raterequest: payload });
  
    const response = await fetch('https://www.tst-cfexpress.com/xml/rate-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
      },
      body: xmlPayload,
    });
    console.log({response})
    if (!response.ok) {
      throw new BadRequestException(`TST CF Express API error: ${response.status}`);
    }

    const xmlText = await response.text();
    const parsed = await parseStringPromise(xmlText, { explicitArray: false });
    console.log({parsed})
    if (parsed.rqresults?.errorcode) {
      throw new BadRequestException({
        carrier: this.carrierName,
        code: parsed.rqresults.errorcode,
        message: parsed.rqresults.errormsg,
      });
    }

    return parsed.rqresults as TSTCFRateResponse;
  }

  parseResponse(carrierResponse: unknown): any[] {
    const tstResponse = carrierResponse as TSTCFRateResponse;
    const totalCAD = parseFloat(tstResponse.totalamt) || 0;
    
    // Convert to USD for standardization (or keep CAD if your app handles multi-currency)
    const exchangeRate = 0.73; // Fetch from API in production
    const totalUSD = +(totalCAD * exchangeRate).toFixed(2);

    return [{
      carrierId: this.carrierName,
      serviceType: 'ST', // TST only has Standard
      totalCharge: totalUSD,    // Standardized to USD
      totalChargeCAD: totalCAD, // Keep original for reference
      currency: 'USD',
      originalCurrency: 'CAD',
      transitDays: tstResponse.transitresults?.servicedays 
        ? parseInt(tstResponse.transitresults.servicedays) 
        : undefined,
    }];
}

  // private extractAccessorials(response: TSTCFRateResponse): any[] {
  //   if (!response.accitems?.item) return [];
    
  //   const items = Array.isArray(response.accitems.item) 
  //     ? response.accitems.item 
  //     : [response.accitems.item];

  //   return items.map(item => ({
  //     code: item.itemcode,
  //     description: item.itemdesc,
  //     status: item.itemstatus,
  //     amount: parseFloat(item.itemamount),
  //     rate: parseFloat(item.itemrate) || 0,
  //   }));
  // }
}
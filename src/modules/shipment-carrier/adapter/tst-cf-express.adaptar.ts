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
    console.log("WORKING")
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
    const accessorials = this.extractAccessorials(tstResponse);
    console.log({tstResponse})
    const quote: any = {
      carrier: this.carrierName,
      quoteId: tstResponse.quoteid,
      totalAmount: parseFloat(tstResponse.totalamt),
      freightAmount: parseFloat(tstResponse.freightamt),
      discountPercent: parseFloat(tstResponse.discountpct),
      discountAmount: parseFloat(tstResponse.discountamt),
      totalWeight: parseFloat(tstResponse.totalweight),
      currency: 'CAD',
      accessorials,
      transit: tstResponse.transitresults ? {
        shipDate: tstResponse.transitresults.shipdate,
        serviceDays: parseInt(tstResponse.transitresults.servicedays),
        arrivalDate: tstResponse.transitresults.arrivaldate,
        status: tstResponse.transitresults.status,
      } : null,
      tier1: parseFloat(tstResponse.g1amt),
      tier2: parseFloat(tstResponse.g2amt),
      tier3: parseFloat(tstResponse.g3amt),
    };

    return [quote];
  }

  private getMockRates(req: any): any[] {
    return [{
      carrier: this.carrierName,
      quoteId: 'MOCK-4780001',
      totalAmount: 262.25,
      freightAmount: 65.00,
      discountPercent: 0,
      discountAmount: 0,
      totalWeight: req.packages?.reduce((sum, p) => sum + (p.weight || 0), 0) || 100,
      currency: 'CAD',
      accessorials: [
        { code: 'INSPUP', description: 'Inside Pickup', status: 'OK', amount: 68.85, rate: 0 },
        { code: 'INSDP', description: 'Inside Delivery', status: 'OK', amount: 68.85, rate: 0 },
        { code: 'FS', description: 'Fuel Surcharge', status: 'OK', amount: 29.38, rate: 45.20 },
        { code: 'HST', description: 'Federal / Provincial Tax', status: 'OK', amount: 30.17, rate: 0 },
      ],
      transit: {
        shipDate: req.shipDate || '20260422',
        serviceDays: 1,
        arrivalDate: '20260423',
        status: 'OK',
      },
      tier1: 384.90,
      tier2: 0.00,
      tier3: 446.18,
    }];
  }

  private extractAccessorials(response: TSTCFRateResponse): any[] {
    if (!response.accitems?.item) return [];
    
    const items = Array.isArray(response.accitems.item) 
      ? response.accitems.item 
      : [response.accitems.item];

    return items.map(item => ({
      code: item.itemcode,
      description: item.itemdesc,
      status: item.itemstatus,
      amount: parseFloat(item.itemamount),
      rate: parseFloat(item.itemrate) || 0,
    }));
  }
}
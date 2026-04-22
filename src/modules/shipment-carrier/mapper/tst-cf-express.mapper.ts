import { TSTCFRateRequest, TSTCFAddress, TSTCFShipLine, TSTCFAccessorials } from "src/types/tst-cf-express";
export class TSTCFExpressMapper {
  private readonly serviceMap: Record<string, string> = {
    'STANDARD': 'ST',
    'EXPRESS': 'EX',
    'GUARANTEED': 'GD',
  };

  private readonly accessorialMap: Record<string, string> = {
    'INSIDE_PICKUP': 'INSPU',
    'INSIDE_DELIVERY': 'INSD',
    'LIFTGATE_PICKUP': 'LGPU',
    'LIFTGATE_DELIVERY': 'LGD',
    'RESIDENTIAL_PICKUP': 'RESPU',
    'RESIDENTIAL_DELIVERY': 'RESD',
  };

  validate(request: any): string[] {
    // No validation — just return empty
    return [];
  }

  map(request: any): TSTCFRateRequest {
    const shipDate = this.formatDate(request?.shipDate || new Date());

    return {
      requestor: process.env.TST_CF_REQUESTOR || '',
      authorization: process.env.TST_CF_AUTHORIZATION || '',
      login: process.env.TST_CF_LOGIN || '',
      passwd: process.env.TST_CF_PASSWD || '',
      testmode: request?.testMode === false ? 'N' : 'Y',
      language: 'en',
      xmlversion: '2.0',
      transit: request.tst?.includeTransit !== false ? 'Y' : 'N',
      shipdate: shipDate,
      origin: this.mapAddress(request.tst?.from),
      destination: this.mapAddress(request.tst?.to),
      service: this.serviceMap[request.serviceType] || 'ST',
      funds: 'C',
      rqby: 'S',
      terms: request?.paymentTerms || 'P',
      taxexempt: request?.taxExempt ? 'Y' : 'N',
      tllf: request?.tailgateLiftFee || 0,
      cod: request?.codAmount || 0,
      dclval: {
        amount: request.declaredValue?.amount || 0,
        funds: request.declaredValue?.currency || '',
      },
      shipdetail: {
        line: request.packages.map((pkg: any, index: number) => this.mapPackage(pkg, index)),
      },
      accitems: this.mapAccessorials(request.accessorials),
    };
  }

  private mapAddress(addr: any): TSTCFAddress {
    return {
      name: addr?.name || '',
      address: addr?.streetAddress || addr?.address || '',
      zip: addr?.postalCode || '',
      city: addr?.city || '',
      state: addr?.state || addr?.province || '',
    };
  }

  private mapPackage(pkg: any, index: number): TSTCFShipLine {
    return {
      weight: pkg.weight,
      class: pkg.freightClass || pkg.class || '050',
      nmfc: pkg.nmfc || '',
      stackable: pkg.stackable ? 'Y' : 'N',
      cubicft: pkg.cubicFeet || '',
      dimensions: {
        qty: pkg.handlingUnits || pkg.quantity || 1,
        len: pkg.length || pkg.dimensions?.length || 0,
        wid: pkg.width || pkg.dimensions?.width || 0,
        hgt: pkg.height || pkg.dimensions?.height || 0,
      },
    };
  }

  private mapAccessorials(accessorials?: string[]): TSTCFAccessorials | undefined {
    if (!accessorials || accessorials.length === 0) return undefined;

    return {
      item: accessorials.map(acc => this.accessorialMap[acc] || acc),
    };
  }

  private formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
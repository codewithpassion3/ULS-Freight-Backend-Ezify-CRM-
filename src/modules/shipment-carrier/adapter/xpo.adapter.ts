import { CarrierAdapter } from 'src/types/shipment-carriers';

// ============================================================================
// XPO API TYPES
// ============================================================================

interface XPOCredentials {
  consumerKey: string;
  consumerSecret: string;
}

interface XPOTokenResponse {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expires_in: number; // 43200 = 12 hours
}

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export enum ShipmentType {
  PALLET      = 'PALLET',
  PACKAGE     = 'PACKAGE',
  COURIER     = 'COURIER',
  STANDARD_FTL = 'STANDARD_FTL',
  SPOT_LTL    = 'SPOT_LTL',
}

export interface Address {
  postalCode: string;
  countryCode: string;
  city: string;
  state: string;
  street: string;
  stateOrProvinceCode: string;
}

export interface PalletLineItem {
  length: number;
  width: number;
  height: number;
  weight: number;
  freightClass: string;
  nmfc?: string;
  stackable?: boolean;
  unitsOnPallet: number;
  palletUnitType: string;
  description?: string;
  dangerousGoods?: boolean;
}

export interface PackageLineItem {
  length: number;
  width: number;
  height: number;
  weight: number;
  description?: string;
  specialHandlingRequired: boolean;
  dimensionsUnit: string;
  weightUnit: string;
  subPackagingType: string;
  packaging?: string;
}

export interface ShipmentRateRequest {
  type: ShipmentType;
  from: Address;
  to: Address;
  shipDate?: Date;
  dangerousGoods: boolean;
  pallets?: PalletLineItem[];
  packages?: PackageLineItem[];
  services?: Record<string, boolean>;
  serviceType?: string;
}

// ============================================================================
// XPO RESPONSE TYPES
// ============================================================================

interface XPORateQuoteResponse {
  rateQuote?: {
    confirmationNbr?: string;
    totalChargeAmt?: { amt?: number; currencyCd?: string };
    linehaulChrgAmt?: { amt?: number; currencyCd?: string };
    totalDiscountAmt?: { amt?: number; currencyCd?: string };
    actlDiscountPct?: number;
    fscAmt?: { amt?: number; currencyCd?: string };
    transitDays?: number;
    estimatedDeliveryDate?: string;
    shipmentInfo?: {
      accessorials?: Array<{
        accessorialCd?: string;
        accessorialDesc?: string;
        chargeAmt?: { amt?: number; currencyCd?: string };
      }>;
    };
  };
  errors?: Array<{ code: string; message: string }>;
}

// ============================================================================
// PAYLOAD MAPPER INTERFACE
// ============================================================================

interface CarrierPayloadMapper {
  supports(type: ShipmentType): boolean;
  map(request: ShipmentRateRequest, accountNumber: string): unknown;
}

// ============================================================================
// LTL MAPPER  (pallets → XPO commodity array)
// ============================================================================

class XPOLTLMapper implements CarrierPayloadMapper {
  supports(type: ShipmentType): boolean {
    return (
      type === ShipmentType.PALLET ||
      type === ShipmentType.SPOT_LTL ||
      type === ShipmentType.STANDARD_FTL
    );
  }

  map(req: ShipmentRateRequest, accountNumber: string): unknown {
    const shipmentDate = req.shipDate
      ? new Date(req.shipDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Map pallets → XPO commodities
    const commodities = (req.pallets || []).map((pallet) => {
      const commodity: Record<string, unknown> = {
        pieceCnt: pallet.unitsOnPallet,
        packageCode: this.mapPackagingType(pallet.palletUnitType),
        grossWeight: {
          weight: String(pallet.weight),
          weightUom: 'LBS',
        },
        nmfcClass: pallet.freightClass,
        hazmatInd: pallet.dangerousGoods ?? req.dangerousGoods ?? false,
      };

      if (pallet.nmfc) {
        commodity.nmfcItemCd = pallet.nmfc;
      }

      // Dimensions — XPO requires ALL three if any are provided, in inches
      if (pallet.length && pallet.width && pallet.height) {
        commodity.dimensions = {
          length: pallet.length,
          width: pallet.width,
          height: pallet.height,
          dimensionsUom: 'Inches',
        };
      }

      return commodity;
    });

    return {
      shipmentInfo: {
        shipper: {
          ...(accountNumber ? { acctMadCd: accountNumber } : {}),
          address: {
            postalCd: req.from.postalCode,
            ...(req.from.city ? { cityName: req.from.city } : {}),
          },
        },
        consignee: {
          address: {
            postalCd: req.to.postalCode,
            ...(req.to.city ? { cityName: req.to.city } : {}),
          },
        },
        commodity: commodities,
        paymentTermCd: 'P', // Prepaid (shipper pays)
        shipmentDate,
        palletCnt: (req.pallets || []).reduce(
          (sum, p) => sum + p.unitsOnPallet,
          0,
        ),
        hazmatInd: req.dangerousGoods ?? false,
        ...(req.services?.residentialPickup
          ? { accessorials: [{ accessorialCd: 'RPU' }] }
          : {}),
        ...(req.services?.residentialDelivery
          ? {
              accessorials: [
                ...(req.services?.residentialPickup
                  ? [{ accessorialCd: 'RPU' }]
                  : []),
                { accessorialCd: 'RDL' },
              ],
            }
          : {}),
      },
    };
  }

  private mapPackagingType(palletUnitType: string): string {
    const map: Record<string, string> = {
      PALLET:  'PLT',
      SKID:    'SKD',
      BOX:     'BOX',
      CRATE:   'CRT',
      BUNDLE:  'BDL',
      CARTON:  'CAS',
      PIECES:  'PCS',
    };
    return map[palletUnitType?.toUpperCase()] ?? 'PLT';
  }
}

// ============================================================================
// PACKAGE MAPPER  (packages → XPO commodity — treats each package as a piece)
// ============================================================================

class XPOPackageMapper implements CarrierPayloadMapper {
  supports(type: ShipmentType): boolean {
    return type === ShipmentType.PACKAGE || type === ShipmentType.COURIER;
  }

  map(req: ShipmentRateRequest, accountNumber: string): unknown {
    const shipmentDate = req.shipDate
      ? new Date(req.shipDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const commodities = (req.packages || []).map((pkg) => {
      const commodity: Record<string, unknown> = {
        pieceCnt: 1,
        packageCode: this.mapPackagingType(pkg.packaging ?? pkg.subPackagingType),
        grossWeight: {
          weight: String(pkg.weight),
          weightUom: pkg.weightUnit || 'LBS',
        },
        nmfcClass: '100', // default class for parcels
        hazmatInd: false,
      };

      if (pkg.length && pkg.width && pkg.height) {
        commodity.dimensions = {
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          dimensionsUom: 'Inches',
        };
      }

      return commodity;
    });

    return {
      shipmentInfo: {
        shipper: {
          ...(accountNumber ? { acctMadCd: accountNumber } : {}),
          address: { postalCd: req.from.postalCode },
        },
        consignee: {
          address: { postalCd: req.to.postalCode },
        },
        commodity: commodities,
        paymentTermCd: 'P',
        shipmentDate,
      },
    };
  }

  private mapPackagingType(type?: string): string {
    const map: Record<string, string> = {
      BOX:    'BOX',
      PALLET: 'PLT',
      SKID:   'SKD',
      CRATE:  'CRT',
    };
    return map[type?.toUpperCase() ?? ''] ?? 'BOX';
  }
}

// ============================================================================
// MAIN ADAPTER
// ============================================================================

export class XPOAdapter implements CarrierAdapter {
  readonly carrierName = 'xpo';

  private readonly baseUrl     = 'https://api.ltl.xpo.com';
  private readonly tokenUrl    = 'https://api.ltl.xpo.com/token';
  private readonly credentials: XPOCredentials;
  private readonly accountNumber: string;
  private readonly mappers: CarrierPayloadMapper[];

  // XPO tokens last 12 hours — cache them
  private tokenCache: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null = null;

  constructor(params: {
    name: string;
    consumerKey: string;
    consumerSecret: string;
    accountNumber: string;
  }) {
    this.credentials = {
      consumerKey: params.consumerKey,
      consumerSecret: params.consumerSecret,
    };
    this.accountNumber = params.accountNumber;
    this.mappers = [new XPOLTLMapper(), new XPOPackageMapper()];
  }

  // --------------------------------------------------------------------------
  // AUTH  — XPO uses Basic auth (base64 key:secret) to get a bearer token
  // --------------------------------------------------------------------------

  private async getAuthToken(): Promise<string> {
    // Still valid with 5-min buffer
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 300_000) {
      return this.tokenCache.accessToken;
    }

    // Try refresh token first if we have one
    if (this.tokenCache?.refreshToken) {
      try {
        return await this.refreshAuthToken(this.tokenCache.refreshToken);
      } catch {
        // Fall through to full re-auth
      }
    }

    return this.fetchNewToken();
  }

  private async fetchNewToken(): Promise<string> {
    // XPO uses base64(consumerKey:consumerSecret) as the Basic auth value
    const basicAuth = Buffer.from(
      `${this.credentials.consumerKey}:${this.credentials.consumerSecret}`,
    ).toString('base64');

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`XPO auth failed: ${response.status} - ${errorText}`);
    }

    const data: XPOTokenResponse = await response.json();
    this.cacheToken(data);
    return data.access_token;
  }

  private async refreshAuthToken(refreshToken: string): Promise<string> {
    const basicAuth = Buffer.from(
      `${this.credentials.consumerKey}:${this.credentials.consumerSecret}`,
    ).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) throw new Error('XPO refresh token failed');

    const data: XPOTokenResponse = await response.json();
    this.cacheToken(data);
    return data.access_token;
  }

  private cacheToken(data: XPOTokenResponse): void {
    this.tokenCache = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  // --------------------------------------------------------------------------
  // BUILD REQUEST
  // --------------------------------------------------------------------------

  buildRequest(req: any): unknown {
    const mapper = this.mappers.find((m) => m.supports(req.type));
    if (!mapper) {
      throw new Error(`XPO does not support shipment type: ${req.type}`);
    }
    return mapper.map(req, this.accountNumber);
  }

  // --------------------------------------------------------------------------
  // FETCH RATES
  // --------------------------------------------------------------------------

  async fetchRates(carrierPayload: unknown): Promise<unknown> {
    const token = await this.getAuthToken();

    const response = await fetch(`${this.baseUrl}/rating/1.0/ratequotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(carrierPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`XPO API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // --------------------------------------------------------------------------
  // PARSE RESPONSE
  // --------------------------------------------------------------------------

  parseResponse(carrierResponse: any): any[] {
    const response = carrierResponse as XPORateQuoteResponse;
    const quotes: any[] = [];

    if (response.errors && response.errors.length > 0) {
      const messages = response.errors.map((e) => e.message);
      throw new Error(`XPO returned errors: ${messages.join(', ')}`);
    }

    const rate = response.rateQuote;
    if (!rate) return quotes;

    quotes.push({
      carrierId: this.carrierName,
      serviceType: 'LTL',
      serviceName: 'XPO LTL',
      totalCharge: rate.totalChargeAmt?.amt,
      currency: rate.totalChargeAmt?.currencyCd ?? 'USD',
      transitDays: rate.transitDays,
      estimatedDelivery: rate.estimatedDeliveryDate,
      confirmationNumber: rate.confirmationNbr,
    });

    return quotes;
  }

  // --------------------------------------------------------------------------
  // GET RATES  (top-level convenience)
  // --------------------------------------------------------------------------

  async getRates(req: any): Promise<unknown> {
    const payload = this.buildRequest(req);
    return this.fetchRates(payload);
  }

  // --------------------------------------------------------------------------
  // MAP TO NORMALIZED CARRIER RATE
  // --------------------------------------------------------------------------

  mapXPOToCarrierRate(xpoResponse: any): any[] {
    const rate = xpoResponse?.rateQuote;
    if (!rate) return [];

    const accessorials = rate.shipmentInfo?.accessorials ?? [];

    return [
      {
        carrier: 'XPO',
        serviceType: 'LTL',
        serviceName: 'XPO LTL Freight',
        totalPrice: rate.totalChargeAmt?.amt ?? null,
        totalDiscount: rate.totalDiscountAmt?.amt ?? 0,
        discountPercent: rate.actlDiscountPct ?? 0,
        currency: rate.totalChargeAmt?.currencyCd ?? 'USD',
        linehaulCharge: rate.linehaulChrgAmt?.amt ?? null,
        fuelSurcharge: rate.fscAmt?.amt ?? 0,
        totalSurcharges: accessorials.reduce(
          (sum: number, a: any) => sum + (a.chargeAmt?.amt ?? 0),
          0,
        ),
        estimatedDeliveryDays: rate.transitDays
          ? `${rate.transitDays} business day${rate.transitDays === 1 ? '' : 's'}`
          : 'Varies by destination',
        estimatedDeliveryDate: rate.estimatedDeliveryDate ?? null,
        confirmationNumber: rate.confirmationNbr ?? null,
        transactionId: null,
      },
    ];
  }
}
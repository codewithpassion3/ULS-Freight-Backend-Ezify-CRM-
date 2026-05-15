import { CarrierAdapter } from 'src/types/shipment-carriers';
import { Carrier } from '../dto/create-carrier-shipment.dto';

// ============================================================================
// TFORCE API TYPES
// ============================================================================

interface TForceCredentials {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  apiScope: string;
}

interface TForceTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// ============================================================================
// DOMAIN TYPES (shared with your app — mirror of FedEx adapter)
// ============================================================================

export enum ShipmentType {
  PALLET = 'PALLET',
  PACKAGE = 'PACKAGE',
  COURIER = 'COURIER',
  STANDARD_FTL = 'STANDARD_FTL',
  SPOT_LTL = 'SPOT_LTL',
}

export interface Address {
  postalCode: string;
  countryCode: string;
  city: string;
  state: string;
  street: string;
  stateOrProvinceCode: string;
  streetLines?: string;
  isResidential?: boolean;
}

export interface PalletLineItem {
  length: number;
  width: number;
  height: number;
  weight: number;
  freightClass: string;
  nmfc?: string;
  nmfcSub?: string;
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
  rateRequestType: string;
  dangerousGoods: boolean;
  pallets?: PalletLineItem[];
  packages?: PackageLineItem[];
  services?: Record<string, boolean>;
  serviceType: string;
  shipmentType: string;
}

// ============================================================================
// TFORCE RESPONSE TYPES
// ============================================================================

interface TForceRateResponse {
  transactionId?: string;
  rateResponse?: {
    totalCharges?: {
      monetaryValue?: number;
      currencyCode?: string;
    };
    totalChargesWithAccessorials?: {
      monetaryValue?: number;
      currencyCode?: string;
    };
    serviceCode?: string;
    serviceName?: string;
    timeInTransit?: {
      daysInTransit?: string;
    };
    quoteNumber?: string;
    rateCode?: string;
    billedWeight?: {
      weight?: number;
      unitOfMeasurement?: string;
    };
    accessorialCharges?: Array<{
      code?: string;
      name?: string;
      charge?: {
        monetaryValue?: number;
        currencyCode?: string;
      };
    }>;
    baseCharges?: Array<{
      currencyCode?: string;
      monetaryValue?: number;
    }>;
  };
  errors?: Array<{ code: string; message: string }>;
}

// ============================================================================
// PAYLOAD MAPPER INTERFACE (same pattern as FedEx)
// ============================================================================

interface CarrierPayloadMapper {
  supports(type: ShipmentType): boolean;
  map(request: ShipmentRateRequest, accountNumber: string): unknown;
}

// ============================================================================
// LTL / PALLET MAPPER  (maps to TForce /getRate)
// ============================================================================

function mapWeightUnit(unit?: string): string {
    const map: Record<string, string> = {
      LB: 'LBS',
      LBS: 'LBS',
      KG: 'KGS',
      KGS: 'KGS',
    };
    return map[unit?.toUpperCase() || ''] || 'LBS';
  }

  function mapDimensionUnit(unit?: string): string {
    const map: Record<string, string> = {
      IN: 'IN',
      INCHES: 'IN',
      CM: 'CM',
      CENTIMETERS: 'CM',
      FT: 'FT',
      FEET: 'FT',
      M: 'M',
      METERS: 'M',
    };
    return map[unit?.toUpperCase() || ''] || 'inches';
  }

  function mapPackagingType(type?: string): string {
  const map: Record<string, string> = {
    // LineItemUnitType enum → TForce packaging code
    PALLET: 'PLT',
    DRUM: 'DRM',
    BOXES: 'BOX',
    ROLLS: 'ROL',
    PIPES_OR_TUBES: 'TBE',
    BALES: 'BAL',
    BAGS: 'BAG',
    CYLINDER: 'CYL',
    PAILS: 'PAIL',
    REELS: 'REEL',
    CRATE: 'CRT',
    LOOSE: 'LOOSE',
    PIECES: 'PCS',
  };
  return map[type?.toUpperCase() || ''] || 'PLT';
}
class TForceLTLMapper implements CarrierPayloadMapper {
  
  supports(type: ShipmentType): boolean {
    return (
      type === ShipmentType.PALLET ||
      type === ShipmentType.SPOT_LTL ||
      type === ShipmentType.STANDARD_FTL
    );
  }

  map(req: ShipmentRateRequest, accountNumber: string): unknown {
    const units = req.packages ?? req.pallets ?? [];
    const pickupDate = req.shipDate ? new Date(req.shipDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    const commodities = units?.map((unit: any) => {
      const commodity: Record<string, unknown> = {
        class: unit.freightClass ?? '50',      // nullish coalescing
        pieces: unit.unitsOnPallet ?? unit.handlingUnits ?? 1,
        weight: {
          weight: unit.weight,
          weightUnit: mapWeightUnit(unit.dimensionsUnit),
        },
        packagingType: mapPackagingType(unit.palletUnitType),
        dangerousGoods: unit.dangerousGoods ?? req.dangerousGoods ?? false,
      };

      if (unit.nmfc) {
        commodity.nmfc = {
          prime: unit.nmfc,
          ...(unit.nmfcSub ? { sub: unit.nmfcSub } : {}),
        };
      }

      if (unit.length && unit.width && unit.height) {
        commodity.dimensions = {
          length: unit.length,
          width: unit.width,
          height: unit.height,
          unit: mapDimensionUnit(unit.dimensionsUnit),
        };
      }

      return commodity;
    });

    return {
      requestOptions: {
        serviceCode: '308', // Standard TForce LTL service
        pickupDate,
        type: 'L',
        densityEligible: false,
        timeInTransit: true,
        quoteNumber: true,
      },
      shipFrom: {
        address: {
          city: req.from.city,
          stateProvinceCode: req.from.stateOrProvinceCode || req.from.state,
          postalCode: req.from.postalCode,
          country: req.from.countryCode,
        },
        isResidential: req.from?.isResidential || false,
      },
      shipTo: {
        address: {
          city: req.to.city,
          stateProvinceCode: req.to.stateOrProvinceCode || req.to.state,
          postalCode: req.to.postalCode,
          country: req.to.countryCode,
        },
        isResidential: req.to?.isResidential || false,
      },
      payment: {
        payer: {
          address: {
            city: req.from.city,
            stateProvinceCode: req.from.stateOrProvinceCode || req.from.state,
            postalCode: req.from.postalCode,
            country: req.from.countryCode,
          },
        },
        billingCode: '10', // Prepaid (shipper pays)
      },
      serviceOptions: {
        pickup: [
          // ...(req.services?.insidePickup ? ['INPU'] : []),
          // ...(req.services?.liftgatePickup ? ['LIFO'] : []),
          // ...(req.services?.limitedAccess ? ['LAPU'] : []),
          // ...(req.services?.residentialPickup ? ['RESP'] : []),
          // ...(req.services?.tradeShowDelivery ? ['TRPU'] : []),
        ],
        delivery: [
          // ...(req.services?.insideDelivery ? ['INDE'] : []),
          // ...(req.services?.liftgateDelivery ? ['LIFO'] : []),
          // ...(req.services?.limitedAccess ? ['LADE'] : []),
          // ...(req.services?.residentialDelivery ? ['RESD'] : []),
        ],
        shipment: {
          ...(req.services?.protectFromFreeze ? { freezableProtection: true } : {}),
          ...(req.services?.excessValue ? { excessValue: { value: String(req.services.excessValue), currency: 'USD' } } : {}),
  
        }
        
        // {
        //   ...(req.services?.protectFromFreeze ? { freezableProtection: true } : {}),
        //   // ...(req.services?.excessValue ? { excessValue: { value: String(req.services.excessValue), currency: 'USD' } } : {}),
        //   // ...(req.services?.extremeLength ? { extremeLength: { value: String(req.services.extremeLength), unit: 'FEET' } } : {}),
        // },
      },
      commodities,
    };
  }
}

// ============================================================================
// VOLUME / FTL MAPPER  (maps to TForce /volumeRating)
// ============================================================================

class TForceVolumeMapper implements CarrierPayloadMapper {
  supports(type: ShipmentType): boolean {
    return type === ShipmentType.STANDARD_FTL;
  }

  map(req: ShipmentRateRequest, _accountNumber: string): unknown {
    const pickupDate = req.shipDate
      ? new Date(req.shipDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const totalWeight = (req.pallets || []).reduce(
      (sum, p) => sum + p.weight,
      0,
    );
    const totalPieces = (req.pallets || []).reduce(
      (sum, p) => sum + p.unitsOnPallet,
      0,
    );

    const units = req.packages ?? req.pallets ?? [];
    return {
      requestOptions: {
        serviceCode: '308',
        pickupDate,
        type: 'L',
        timeInTransit: true,
        quoteNumber: true,
      },
      shipFrom: {
        address: {
          city: req.from.city,
          stateProvinceCode: req.from.stateOrProvinceCode || req.from.state,
          postalCode: req.from.postalCode,
          country: req.from.countryCode,
        },
        isResidential: false,
      },
      shipTo: {
        address: {
          city: req.to.city,
          stateProvinceCode: req.to.stateOrProvinceCode || req.to.state,
          postalCode: req.to.postalCode,
          country: req.to.countryCode,
        },
        isResidential: false,
      },
      serviceOptions: {
        pickup: [],
        delivery: [],
        shipment: {},
      },
      commodity: [
        {
          linearfeet: this.estimateLinearFeet(units as any),
          pieces: totalPieces,
          weight: {
            weight: totalWeight,
            weightUnit: 'LBS',
          },
          packagingType: 'PLT',
          dangerousGoods: req.dangerousGoods ?? false,
        },
      ],
    };
  }

  private estimateLinearFeet(pallets: PalletLineItem[]): number {
    // Standard pallet is 48" deep = 4 linear feet
    return pallets.reduce((sum, p) => sum + p.unitsOnPallet * 4, 0);
  }
}

// ============================================================================
// MAIN ADAPTER
// ============================================================================

export class TForceAdapter implements CarrierAdapter {
  readonly carrierName = 'tforce';

  private readonly baseUrl = 'https://api.tforcefreight.com/rating';
  private readonly credentials: TForceCredentials;
  private readonly accountNumber: string;
  private readonly apiVersion: string;
  private readonly mappers: CarrierPayloadMapper[];
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(params: {
    name: string;
    clientId: string;
    clientSecret: string;
    accountNumber: string;
    apiScope: string;
    tokenUrl?: string;
    apiVersion?: string;
  }) {
    this.credentials = {
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      // TForce uses Microsoft CIAM / Azure AD B2C for OAuth
      tokenUrl: params.tokenUrl || '',
      apiScope: params.apiScope || ''
    };
    this.accountNumber = params.accountNumber;
    this.apiVersion = params.apiVersion ?? 'v1';
    // FTL uses volumeRating endpoint, everything else uses getRate
    this.mappers = [new TForceVolumeMapper(), new TForceLTLMapper()];
  }

  private readonly TFORCE_SURCHARGE_MAP: Record<string, string> = {
    PFFF: 'Protect from Freezing',
    RESP: 'Residential Pickup',
    RESD: 'Residential Delivery',
    FUEL_SUR: 'Fuel Surcharge',
    HICST: 'High Cost Service Area',
    // Add new known codes here as they appear
  };
  // --------------------------------------------------------------------------
  // AUTH
  // --------------------------------------------------------------------------

  private async getAuthToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 300_000) {
      return this.tokenCache.token;
    }

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      scope: this.credentials.apiScope,
    });

    const response = await fetch(this.credentials.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TForce auth failed: ${response.status} - ${errorText}`);
    }

    const data: TForceTokenResponse = await response.json();
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  }

  // --------------------------------------------------------------------------
  // BUILD REQUEST  (matches CarrierAdapter interface: buildRequest(req: RateRequest): unknown)
  // The returned object is an internal envelope { endpoint, payload } that
  // fetchRates unwraps — callers outside this class only see `unknown`.
  // --------------------------------------------------------------------------

  buildRequest(req: any): unknown {
    const mapper = this.mappers.find((m) => m.supports(req.type));
    if (!mapper) {
      throw new Error(`TForce does not support shipment type: ${req.type}`);
    }

    const isVolume = req.type === ShipmentType.STANDARD_FTL;
    const endpoint = isVolume
      ? `${this.baseUrl}/volumeRating?api-version=${this.apiVersion}`
      : `${this.baseUrl}/getRate?api-version=${this.apiVersion}`;

    // Wrap endpoint + payload together so fetchRates can stay signature-compatible
    return { __tforceEndpoint: endpoint, payload: mapper.map(req, this.accountNumber) };
  }

  // --------------------------------------------------------------------------
  // FETCH RATES  (matches CarrierAdapter interface: fetchRates(payload: unknown): Promise<unknown>)
  // --------------------------------------------------------------------------

  async fetchRates(carrierPayload: unknown): Promise<unknown> {
    const { __tforceEndpoint: endpoint, payload } = carrierPayload as {
      __tforceEndpoint: string;
      payload: unknown;
    };

    const token = await this.getAuthToken();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TForce API error: ${response.status} - ${errorText}`);
    }
    const responseInJson = await response.json();
    return responseInJson;
  }

  // --------------------------------------------------------------------------
  // PARSE RESPONSE  (mirrors FedExAdapter.parseResponse)
  // --------------------------------------------------------------------------

  parseResponse(carrierResponse: any): any[] {
    const response = carrierResponse as TForceRateResponse;
    const quotes: any[] = [];

    // Surface any API-level errors early
    if (response.errors && response.errors.length > 0) {
      const messages = response.errors.map((e) => e.message);
      throw new Error(`TForce returned errors: ${messages.join(', ')}`);
    }

    const rate = response.rateResponse;
    if (!rate) return quotes;

    quotes.push({
      carrierId: this.carrierName,
      serviceType: rate.serviceCode ?? 'LTL',
      serviceName: rate.serviceName ?? 'TForce Freight LTL',
      totalCharge: rate.totalChargesWithAccessorials?.monetaryValue
        ?? rate.totalCharges?.monetaryValue,
      currency: rate.totalCharges?.currencyCode ?? 'USD',
      transitDays: rate.timeInTransit?.daysInTransit
        ? parseInt(rate.timeInTransit.daysInTransit)
        : undefined,
      quoteNumber: rate.quoteNumber,
      rateCode: rate.rateCode,
      billedWeight: rate.billedWeight?.weight,
    });

    return quotes;
  }

  // --------------------------------------------------------------------------
  // GET RATES  (top-level convenience — mirrors FedExAdapter.getRates)
  // --------------------------------------------------------------------------

  async getRates(req: any): Promise<unknown> {
    const carrierPayload = this.buildRequest(req);
    return this.fetchRates(carrierPayload);
  }

  // --------------------------------------------------------------------------
  // MAP TO NORMALIZED CARRIER RATE  (mirrors FedExAdapter.mapFedExToCarrierRate)
  // --------------------------------------------------------------------------

  mapTForceToCarrierRate(tforceResponse: any): any[] {
    const detailArray = tforceResponse?.detail;
    if (!Array.isArray(detailArray) || detailArray.length === 0) return [];

    return detailArray.map((detail: any) => {
      const rateLines = detail.rate || [];
      const excludedBaseCodes = new Set(['DSCNT', 'DSCNT_RATE', 'LND_GROSS', 'AFTR_DSCNT']);

      // Fuel surcharge (top-level convenience)
      const fuelLine = rateLines.find(
        (r: any) => r.code === 'FUEL_SUR' || r.description?.toLowerCase().includes('fuel')
      );
      const fuelSurcharge = parseFloat(fuelLine?.value ?? 0);

      // Total surcharges
      const totalSurcharges = rateLines.reduce((sum: number, r: any) => {
        if (!excludedBaseCodes.has(r.code)) {
          return sum + (parseFloat(r.value) || 0);
        }
        return sum;
      }, 0);

      // Discount amount
      const discountLine = rateLines.find((r: any) => r.code === 'DSCNT');
      const totalDiscount = discountLine ? parseFloat(discountLine.value) : 0;

      // Mapped surcharges array — known codes get clean names, unknowns fall back to "Freight charge"
      const surcharges = rateLines
        .filter((r: any) => !excludedBaseCodes.has(r.code))
        .map((r: any) => ({
          code: r.code,
          name: this.TFORCE_SURCHARGE_MAP[r.code] || 'Freight charge',
          rawDescription: r.description || null, // keep original if you ever need it
          value: parseFloat(r.value) || 0,
          currency: detail.shipmentCharges?.total?.currency ?? 'USD',
        }));

      return {
        carrier: Carrier.TFORCE,
        serviceType: detail.service?.code ?? 'LTL',
        serviceName: detail.service?.description ?? 'TForce Freight LTL',
        totalPrice: parseFloat(detail.shipmentCharges?.total?.value ?? 0),
        totalDiscount,
        currency: detail.shipmentCharges?.total?.currency ?? 'USD',
        shipDate: null,
        estimatedDeliveryDays: detail.timeInTransit?.timeInTransit ? `${parseInt(detail.timeInTransit?.timeInTransit)} business days` : null,
        billingWeight: detail.shipmentWeights?.billable?.value ?? null,
        fuelSurcharge,
        totalSurcharges,
        surcharges,
        quoteNumber: tforceResponse.summary?.quoteNumber ?? null,
        transactionId: tforceResponse.summary?.transactionReference?.transactionId ?? null,
        grossCharges: parseFloat(rateLines.find((r: any) => r.code === 'LND_GROSS')?.value ?? 0),
        afterDiscount: parseFloat(rateLines.find((r: any) => r.code === 'AFTR_DSCNT')?.value ?? 0),
        alerts: detail.alerts ?? null,
      };
    });
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  private getTForceTransitTime(
    serviceCode?: string,
    daysInTransit?: string,
  ): string {
    if (daysInTransit) {
      const days = parseInt(daysInTransit);
      return isNaN(days)
        ? daysInTransit
        : `${days} business day${days === 1 ? '' : 's'}`;
    }

    // TForce service code reference (see API appendix)
    const map: Record<string, string> = {
      '308': '1-5 business days', // Standard LTL
      '309': '1-3 business days', // Guaranteed LTL
      '310': '1-2 business days', // Accelerated
      '334': 'Same day',           // Same Day
      '335': '1 business day',     // Next Day
    };
    return map[serviceCode ?? ''] ?? 'Varies by destination';
  }
}
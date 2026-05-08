import { CarrierAdapter } from 'src/types/shipment-carriers';
import { Carrier } from '../dto/create-carrier-shipment.dto';

// ============================================================================
// TFORCE API TYPES
// ============================================================================

interface TForceCredentials {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
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

class TForceLTLMapper implements CarrierPayloadMapper {
  supports(type: ShipmentType): boolean {
    return (
      type === ShipmentType.PALLET ||
      type === ShipmentType.SPOT_LTL ||
      type === ShipmentType.STANDARD_FTL
    );
  }

  map(req: ShipmentRateRequest, accountNumber: string): unknown {
    const pickupDate = req.shipDate
      ? new Date(req.shipDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const commodities = (req.pallets || []).map((pallet) => {
      const commodity: Record<string, unknown> = {
        class: pallet.freightClass,
        pieces: pallet.unitsOnPallet,
        weight: {
          weight: pallet.weight,
          weightUnit: 'LBS',
        },
        packagingType: this.mapPackagingType(pallet.palletUnitType),
        dangerousGoods: pallet.dangerousGoods ?? req.dangerousGoods ?? false,
      };

      if (pallet.nmfc) {
        commodity.nmfc = {
          prime: pallet.nmfc,
          ...(pallet.nmfcSub ? { sub: pallet.nmfcSub } : {}),
        };
      }

      if (pallet.length && pallet.width && pallet.height) {
        commodity.dimensions = {
          length: pallet.length,
          width: pallet.width,
          height: pallet.height,
          unit: 'inches',
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
        pickup: [],
        delivery: [],
        shipment: {
          ...(req.services?.freezableProtection
            ? { freezableProtection: true }
            : {}),
          ...(req.services?.excessValue
            ? {
                excessValue: {
                  value: String(req.services.excessValue),
                  currency: 'USD',
                },
              }
            : {}),
        },
      },
      commodities,
    };
  }

  private mapPackagingType(palletUnitType: string): string {
    const map: Record<string, string> = {
      PALLET: 'PLT',
      SKID: 'SKD',
      BOX: 'BOX',
      CRATE: 'CRT',
      DRUM: 'DRM',
      ROLL: 'ROL',
      BUNDLE: 'BDL',
      BAG: 'BAG',
      CARTON: 'CTN',
    };
    return map[palletUnitType?.toUpperCase()] ?? 'PLT';
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
          linearfeet: this.estimateLinearFeet(req.pallets || []),
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
    tokenUrl?: string;
    apiVersion?: string;
  }) {
    this.credentials = {
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      // TForce uses Microsoft CIAM / Azure AD B2C for OAuth
      tokenUrl:
        params.tokenUrl ??
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    };
    this.accountNumber = params.accountNumber;
    this.apiVersion = params.apiVersion ?? 'v1';

    // FTL uses volumeRating endpoint, everything else uses getRate
    this.mappers = [new TForceVolumeMapper(), new TForceLTLMapper()];
  }

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
      scope: 'https://api.tforcefreight.com/.default',
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

    return response.json();
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
    const rate = tforceResponse?.rateResponse;
    if (!rate) return [];

    const detail = rate;

    return [
      {
        carrier: 'TFORCE',
        serviceType: detail.serviceCode ?? 'LTL',
        serviceName: detail.serviceName ?? 'TForce Freight LTL',
        totalPrice:
          detail.totalChargesWithAccessorials?.monetaryValue ??
          detail.totalCharges?.monetaryValue ??
          null,
        totalDiscount: 0,
        currency: detail.totalCharges?.currencyCode ?? 'USD',
        shipDate: tforceResponse.requestOptions?.pickupDate ?? null,
        estimatedDeliveryDays: this.getTForceTransitTime(
          detail.serviceCode,
          detail.timeInTransit?.daysInTransit,
        ),
        billingWeight: detail.billedWeight?.weight ?? null,
        fuelSurcharge:
          detail.accessorialCharges?.find(
            (a: any) => a.code === 'FUEL' || a.name?.toLowerCase().includes('fuel'),
          )?.charge?.monetaryValue ?? 0,
        totalSurcharges:
          detail.accessorialCharges?.reduce(
            (sum: number, a: any) => sum + (a.charge?.monetaryValue ?? 0),
            0,
          ) ?? 0,
        quoteNumber: detail.quoteNumber ?? null,
        transactionId: tforceResponse.transactionId ?? null,
      },
    ];
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
import { CarrierAdapter } from "src/types/shipment-carriers";

// ============================================================================
// FEDEX API TYPES
// ============================================================================

interface FedExCredentials {
  clientId: string;
  clientSecret: string;
}

interface FedExTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface FedExAddress {
  postalCode: string | number;
  countryCode: string;
  city: string;
  stateOrProvinceCode: string;
  streetLines: string[];
}

// ============================================================================
// DOMAIN TYPES (Your App)
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
  stackable?: boolean;
  unitsOnPallet: number;
  palletUnitType: string;
  description?: string;
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
  packaging?:string;
}

export interface CourierLineItem {
  weight: number;
  description?: string;
}

export interface Insurance {
  value: number;
  currency: string;
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
  courierItems?: CourierLineItem[];
  services?: Record<string, boolean>;
  insurance?: Insurance;
  serviceType: string;
  shipmentType: string;
}

// ============================================================================
// CARRIER RESPONSE TYPES
// ============================================================================

interface FedExRateResponse {
  transactionId?: string;
  output?: {
    rateReplyDetails?: Array<any>;
    rateShipmentDetails?: Array<{
      serviceType?: string;
      serviceName?: string;
      transitTime?: number;
      totalNetCharge?: { amount?: number; currency?: string };
    }>;
  };
  alerts?: Array<{ code: string; message: string }>;
}

export interface RateQuote {
  carrierId: string;
  serviceType: string;
  serviceName: string;
  totalCharge: number;
  currency: string;
  estimatedDelivery?: string;
  rateType: string;
  breakdown?: {
    baseCharge: number;
    surcharges: Array<{ type: string; description: string; amount: number }>;
  };
}

// ============================================================================
// MAPPER INTERFACE & IMPLEMENTATIONS
// ============================================================================

interface CarrierPayloadMapper {
  supports(type: ShipmentType): boolean;
  map(request: ShipmentRateRequest, accountNumber: string): unknown;
}

class FedExParcelMapper implements CarrierPayloadMapper {
  supports(type: ShipmentType): boolean {
    return type === ShipmentType.PACKAGE || type === ShipmentType.COURIER;
  }


  map(req: any, accountNumber: string): unknown {
    return {
      accountNumber: { value: accountNumber },
      requestedShipment: {
        shipper: { address: this.toFedExAddress(req.fedex?.from) },
        recipient: { address: this.toFedExAddress(req.fedex?.to) },
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        rateRequestType: req.rateRequestType,
        serviceType: req.serviceType,
        requestedPackageLineItems: req.packages?.map(pkg => {
          const lineItem: any = {};
          
          if (pkg.subPackagingType) {
            lineItem.subPackagingType = pkg.subPackagingType;
          }
          
          if (pkg.weightUnit && pkg.weight) {
            lineItem.weight = {
              units: pkg.weightUnit,
              value: pkg.weight,
            };
          }

          if (pkg.length && pkg.width && pkg.height && pkg.dimensionsUnit) {
            lineItem.dimensions = {
              length: pkg.length,
              width: pkg.width,
              height: pkg.height,
              units: pkg.dimensionsUnit,
            };
          }
          
          return lineItem;
        })
      }
    };
  }

  private mapLineItems(req: ShipmentRateRequest) {
    if (req.type === ShipmentType.COURIER) {
      return (req.courierItems || []).map(item => ({
        weight: { units: "LB", value: item.weight },
        ...(item.description ? { customerReferences: [{ value: item.description }] } : {})
      }));
    }

    return (req.packages || []).map(pkg => ({
      weight: { units: "LB", value: pkg.weight },
      dimensions: {
        length: pkg.length,
        width: pkg.width,
        height: pkg.height,
        units: "IN"
      },
      ...(pkg.specialHandlingRequired ? {
        packageSpecialServices: { specialServiceTypes: ["SIGNATURE_OPTION"] }
      } : {})
    }));
  }

  private toFedExAddress(addr: Address) {
    return {
      postalCode: addr.postalCode,
      countryCode: addr.countryCode,
      ...(addr.city ? { city: addr.city } : {}),
      ...(addr.state ? { stateOrProvinceCode: addr.state } : {}),
      ...(addr.street ? { streetLines: [addr.street] } : {})
    };
  }
}

export class FedExAdapter implements CarrierAdapter {
  readonly carrierName = "fedex";
  private readonly baseUrl = "https://apis-sandbox.fedex.com";
  private readonly credentials: FedExCredentials;
  private readonly accountNumber: string;
  private readonly mappers: CarrierPayloadMapper[];

  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(params: {
    name: string;
    clientId: string;
    clientSecret: string;
    accountNumber: string;
  }) {

    this.credentials = {
      clientId: params.clientId,
      clientSecret: params.clientSecret,
    };
    this.accountNumber = params.accountNumber;
    
    this.mappers = [new FedExParcelMapper()];
  }

  private async getAuthToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 300000) {
      return this.tokenCache.token;
    }

    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
    });

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FedEx auth failed: ${response.status} - ${errorText}`);
    }

    const data: FedExTokenResponse = await response.json();

    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return data.access_token;
  }

 
  buildRequest(req: any): unknown {
    const mapper = this.mappers.find(m => m.supports(ShipmentType.PACKAGE));
    
    if (!mapper) {
      throw new Error(`FedEx does not support shipment type: ${req.type}`);
    }
    
    return mapper.map(req, this.accountNumber);
  }

  async fetchRates(carrierPayload: unknown): Promise<unknown> {
    const token = await this.getAuthToken();
    
    const transactionId = crypto.randomUUID();

    const url = `${this.baseUrl}/rate/v1/rates/quotes`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "x-customer-transaction-id": transactionId,
        "x-locale": "en_US",
      },
      body: JSON.stringify(carrierPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FedEx API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  parseResponse(carrierResponse: any): any[] {
      const response = carrierResponse as FedExRateResponse;
      const quotes: any[] = [];

      // Handle errors
      if ((response?.alerts?.length as any) > 0) {
        const errors = (response?.alerts as any)
          .filter(a => a.code?.startsWith("ERROR"))
          .map(a => a.message);
        if (errors.length > 0) {
          throw new Error(`FedEx returned errors: ${errors.join(", ")}`);
        }
      }

      // Parcel response
      const parcelDetails = response.output?.rateReplyDetails || [];
      for (const detail of parcelDetails) {
        for (const rated of detail.ratedShipmentDetails || []) {
          quotes.push({
            carrierId: this.carrierName,
            serviceType: detail.serviceType,
            totalCharge: rated.totalNetCharge,
            currency: rated.currency,
            transitDays: detail.transitTime ? parseInt(detail.transitTime) : undefined,
          });
        }
      }

      // Freight response
      const freightDetails = response.output?.rateShipmentDetails || [];
      for (const detail of freightDetails) {
        quotes.push({
          carrierId: this.carrierName,
          serviceType: detail.serviceType || "FREIGHT",
          totalCharge: detail.totalNetCharge?.amount,
          currency: detail.totalNetCharge?.currency,
          transitDays: (detail.transitTime as any) ? parseInt(detail.transitTime as any) : undefined,
        });
      }

      return quotes;
  }

 
  async getRates(req: ShipmentRateRequest): Promise<RateQuote[]> {
    const payload = this.buildRequest(req);
   
    const response = await this.fetchRates(payload);

    return this.parseResponse(response);
  }
}
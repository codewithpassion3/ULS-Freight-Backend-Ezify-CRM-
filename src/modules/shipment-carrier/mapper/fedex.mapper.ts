import { Address } from "cluster";
import { ShipmentType } from "src/common/enum/shipment-type.enum";

interface CarrierPayloadMapper {
  supports(type: any): boolean;
  map(request: any): unknown;
}

// FedEx-specific mappers
class FedExParcelMapper implements CarrierPayloadMapper {
  supports(type: any): boolean {
    return type === ShipmentType.PACKAGE || type === ShipmentType.COURIER_PAK;
  }
  
  map(req: any) {
    const isDomestic = req.from.countryCode === req.to.countryCode;
    
    return {
      accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER! },
      requestedShipment: {
        shipper: { address: this.toFedExAddress(req.from) },
        recipient: { address: this.toFedExAddress(req.to) },
        shipDateStamp: new Date().toISOString().split('T')[0],
        pickupType: "DROPOFF_AT_FEDEX_LOCATION",
        serviceType: isDomestic ? "FEDEX_GROUND" : "INTERNATIONAL_PRIORITY",
        rateRequestType: ["LIST"],
        packagingType: req.type === ShipmentType.COURIER_PAK ? "FEDEX_ENVELOPE" : "YOUR_PACKAGING",
        requestedPackageLineItems: this.mapLineItems(req),
        ...(req.dangerousGoods ? {
          shipmentSpecialServices: {
            specialServiceTypes: ["DANGEROUS_GOODS"]
          }
        } : {}),
        ...(req.insurance ? {
          totalInsuredValue: {
            amount: req.insurance.value,
            currency: req.insurance.currency
          }
        } : {}),
        rateRequestControlParameters: {
          returnTransitTimes: true,
          servicesNeededOnRateFailure: true
        },
      }
    };
  }
  
  private mapLineItems(req: any) {
    if (req.type === ShipmentType.COURIER_PAK) {
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
        packageSpecialServices: {
          specialServiceTypes: ["SIGNATURE_OPTION"]
        }
      } : {})
    }));
  }
  
  private toFedExAddress(addr: any) {
    return {
      postalCode: addr.postalCode,
      countryCode: addr.countryCode,
      ...(addr.city ? { city: addr.city } : {}),
      ...(addr.state ? { stateOrProvinceCode: addr.state } : {})
    };
  }
}

class FedExFreightMapper implements CarrierPayloadMapper {
  supports(type: ShipmentType): boolean {
    return type === ShipmentType.PALLET || type === ShipmentType.SPOT_LTL;
  }
  
  map(req: any) {
    return {
      accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER! },
      freightRequestedShipment: {
        shipper: { address: this.toFedExAddress(req.fedex.from) },
        recipient: { address: this.toFedExAddress(req.fedex.to) },
        shipDateStamp: new Date().toISOString().split('T')[0],
        serviceType: "FEDEX_FREIGHT_PRIORITY",
        rateRequestType: ["LIST"],
        freightShipmentDetail: {
          totalHandlingUnits: req.pallets?.reduce((sum, p) => sum + p.unitsOnPallet, 0) || 0,
          fedExFreightAccountNumber: process.env.FEDEX_FREIGHT_ACCOUNT,
          lineItems: (req.pallets || []).map(pallet => ({
            freightClass: pallet.freightClass,
            ...(pallet.nmfc ? { nmfc: { code: pallet.nmfc } } : {}),
            handlingUnits: pallet.unitsOnPallet,
            subPackagingType: pallet.palletUnitType,
            description: pallet.description || "Freight",
            weight: { units: "LB", value: pallet.weight },
            dimensions: {
              length: pallet.length,
              width: pallet.width,
              height: pallet.height,
              units: "IN"
            },
            stackable: pallet.stackable ?? false
          }))
        },
        ...(req.dangerousGoods ? {
          shipmentSpecialServices: {
            specialServiceTypes: ["DANGEROUS_GOODS"]
          }
        } : {}),
        ...(req.insurance ? {
          totalInsuredValue: {
            amount: req.insurance.value,
            currency: req.insurance.currency
          }
        } : {})
      }
    };
  }
  
  private toFedExAddress(addr: any) {
    return {
      postalCode: addr.postalCode,
      countryCode: addr.countryCode,
      ...(addr.city ? { city: addr.city } : {}),
      ...(addr.state ? { stateOrProvinceCode: addr.state } : {})
    };
  }
}
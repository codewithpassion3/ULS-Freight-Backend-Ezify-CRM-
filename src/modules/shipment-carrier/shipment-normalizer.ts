import { Injectable } from '@nestjs/common';

@Injectable()
export class ShipmentNormalizer {
  normalize(dto: any) {
    return {
      shipmentType: dto.shipmentType,
      origin: dto.origin,
      destination: dto.destination,
      packages: dto.packages ?? [],
      commodities: dto.commodities ?? [],
      accessorials: dto.accessorials ?? [],
    };
  }
}
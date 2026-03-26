import { EQUIPMENT_RULES } from "src/common/constants/spot-equipment";
import { ShipmentType } from "src/common/enum/shipment-type.enum";


export function validateSpotDetails(spotDetails: any, shipmentType: ShipmentType): string[] {
  const errors: string[] = [];

  if (!spotDetails) {
    return ['spotDetails is required for SPOT quotes'];
  }

  /* -------------------- SPOT TYPE -------------------- */
  if (!spotDetails.spotType) {
    errors.push('spotDetails.spotType is required');
  }

  /* -------------------- SPOT CONTACT -------------------- */
  const contact = spotDetails.spotContact;

  if (!contact) {
    errors.push('spotDetails.spotContact is required');
  } else {
    if (!contact.contactName) {
      errors.push('spotContact.contactName is required');
    }

    if (!contact.phoneNumber) {
      errors.push('spotContact.phoneNumber is required');
    }

    if (!contact.email) {
      errors.push('spotContact.email is required');
    }

    if (!contact.shipDate) {
      errors.push('spotContact.shipDate is required');
    }

    if (ShipmentType.TIME_CRITICAL === shipmentType && !contact.deliveryDate) {
      errors.push('spotContact.deliveryDate is required');
    }

    if (contact.spotQuoteName !== undefined && typeof contact.spotQuoteName !== 'string') {
      errors.push('spotContact.spotQuoteName must be a string');
    }

    if (contact.shipDate && contact.deliveryDate) {
      const ship = new Date(contact.shipDate);
      const delivery = new Date(contact.deliveryDate);

      if (delivery < ship) {
        errors.push('deliveryDate cannot be earlier than shipDate');
      }
    }
  }

  /* -------------------- SPOT EQUIPMENT -------------------- */
  const equipment = spotDetails.spotEquipment;

  if (!equipment) {
    errors.push('spotDetails.spotEquipment is required');
  } else {
    const allowedFields = EQUIPMENT_RULES[shipmentType as ShipmentType];
    
    if (!allowedFields) {
      errors.push(`Unsupported shipmentType: ${shipmentType}`);
    } else {
      const selectedFields = allowedFields.filter(
        (field) => equipment[field] !== undefined && equipment[field] !== null
      );

      if (selectedFields.length === 0) {
        errors.push(
          `spotEquipment must have exactly one field selected for ${shipmentType}`
        );
      }

      if (selectedFields.length > 1) {
        errors.push(
          `spotEquipment must have only one field selected for ${shipmentType}. Found: ${selectedFields.join(
            ', '
          )}`
        );
      }

      if (selectedFields.length === 1) {
        const selectedField = selectedFields[0];
        const value = equipment[selectedField];

        // Boolean validations
        const booleanFields = [
          'truck',
          'car',
          'van',
          'dryVan',
          'flatbed',
          'ventilated',
        ];

        if (booleanFields.includes(selectedField)) {
          if (value !== true) {
            errors.push(`spotEquipment.${selectedField} must be true`);
          }
        }

        // Refrigerated validation
        if (selectedField === 'refrigerated') {
          if (!value?.type) {
            errors.push('spotEquipment.refrigerated.type is required');
          }
        }

        // Next flight out validation
        if (selectedField === 'nextFlightOut') {
          if (value?.knownShipper == null) {
            errors.push(
              'spotEquipment.nextFlightOut.knownShipper is required'
            );
          }
        }
      }

      // 🚨 Extra safeguard: reject disallowed fields if accidentally sent
      const disallowedFields = Object.keys(equipment).filter(
        (key) => !allowedFields.includes(key)
      );

      for (const field of disallowedFields) {
        if (equipment[field] != null) {
          errors.push(
            `spotEquipment.${field} is not allowed for ${shipmentType}`
          );
        }
      }
    }
  }
  return errors;
}
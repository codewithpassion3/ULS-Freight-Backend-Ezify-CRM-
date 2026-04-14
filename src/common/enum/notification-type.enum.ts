export enum NotificationType {
  // Quote domain
  QUOTE_CREATED = 'quote.created',
  QUOTE_UPDATED = 'quote.updated',
  QUOTE_DELETED = 'quote.deleted',
  QUOTE_EXPIRED = 'quote.expired',
  
  // Shipment domain  
  SHIPMENT_CREATED = 'shipment.created',
  SHIPMENT_UPDATED = 'shipment.updated',
  SHIPMENT_DELETED = 'shipment.deleted',
  SHIPMENT_STATUS_CHANGED = 'shipment.status_changed',
  
  // AddressBook domain
  ADDRESSBOOK_CREATED = 'addressBook.created',
  ADDRESSBOOK_UPDATED = 'addressBook.updated',
  ADDRESSBOOK_DELETED = 'addressBook.deleted',
  
  // System
  SYSTEM_ANNOUNCEMENT = 'system.announcement'
}

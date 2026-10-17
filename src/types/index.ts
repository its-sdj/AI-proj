export type BikeCondition = 'Mint' | 'Excellent' | 'Good' | 'Fair';
export type BikeCategory = 'Cruiser' | 'Sport' | 'Commuter' | 'Scooter' | 'Street Naked' | 'Electric';
export type BikeStockStatus = 'In Showroom' | 'Under Refurbishment' | 'Test Ride Booked' | 'Sold';

export interface InspectionCheckItem {
  name: string;
  category: 'Engine & Transmission' | 'Chassis & Suspension' | 'Electricals & Battery' | 'Brakes & Tyres' | 'Documentation';
  status: 'Pass' | 'Attention' | 'Replaced';
  note?: string;
}

export interface Bike {
  id: string;
  make: string; // e.g. Royal Enfield, Yamaha, Honda, KTM
  model: string; // e.g. Classic 350, R15 V4, Activa 6G, Duke 250
  year: number;
  variant: string;
  regNumber: string; // e.g. MH 12 AB 4589
  engineCc: number;
  kmsDriven: number;
  fuelType: 'Petrol' | 'Electric';
  category: BikeCategory;
  ownersCount: number;
  color: string;
  purchasePrice: number; // cost to shop
  refurbCost: number; // money spent on repair/servicing
  sellingPrice: number;
  stockStatus: BikeStockStatus;
  dateAdded: string; // YYYY-MM-DD
  insuranceValidUntil: string;
  rcStatus: 'Verified & Clear' | 'Transfer in Progress' | 'First Owner Clear';
  inspectionScore: number; // out of 40
  inspectionItems: InspectionCheckItem[];
  features: string[];
  description: string;
  accentColor: string;
}

export interface SparePart {
  id: string;
  name: string;
  sku: string;
  category: 'Engine & Transmission' | 'Brakes & Suspension' | 'Electricals & Battery' | 'Fluids & Lubricants' | 'Body & Lighting' | 'Tyres & Wheels';
  brand: string; // OEM or aftermarket, e.g. 'Bosch', 'Motul', 'Brembo', 'OEM Honda'
  compatibleBikes: string[]; // e.g. ['Royal Enfield Classic 350', 'Meteor 350', 'Bullet 350']
  stockQuantity: number;
  reorderLevel: number;
  purchaseCost: number;
  sellingPrice: number;
  rackLocation: string;
  warrantyMonths: number;
  inStock: boolean;
  rating: number;
  description: string;
}

export type JobCardStatus = 
  | 'INSPECTION'
  | 'DISASSEMBLY'
  | 'SPARES_REPLACED'
  | 'WASHING'
  | 'ROAD_TEST'
  | 'READY'
  | 'DELIVERED';

export interface JobCardPartUsed {
  partId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface JobCard {
  id: string;
  jobNumber: string; // e.g. JC-2026-104
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  bikeRegNumber: string;
  bikeModel: string;
  currentKm: number;
  serviceType: 'Routine Maintenance' | 'Full Engine Tune-Up' | 'Brake Overhaul' | 'Pre-Purchase Inspection' | 'Crash Repair';
  technicianName: string;
  status: JobCardStatus;
  reportedIssues: string[];
  mechanicNotes: string;
  partsUsed: JobCardPartUsed[];
  laborCharges: number;
  discount: number;
  createdAt: string;
  estimatedDelivery: string;
  completedAt?: string;
  paidStatus: 'Pending' | 'Paid';
}

export interface CustomerServiceRecord {
  serviceId: string;
  date: string;
  kmReading: number;
  serviceType: string;
  technician: string;
  keyWorkDone: string[];
  partsReplaced: string[];
  totalAmount: number;
  invoiceNumber: string;
  nextServiceDueKm: number;
  nextServiceDueDate: string;
}

export interface CustomerVehicleProfile {
  regNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  bikeMake: string;
  bikeModel: string;
  year: number;
  currentKm: number;
  lastServiceDate: string;
  lastServiceKm: number;
  insuranceExpiryDate: string;
  activeJobCardId?: string;
  pastServices: CustomerServiceRecord[];
}

export interface CartItem {
  part: SparePart;
  quantity: number;
}

export interface ServiceBookingFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  bikeRegNumber: string;
  bikeModel: string;
  currentKm: number;
  serviceType: string;
  preferredDate: string;
  preferredTimeSlot: string;
  pickupOption: 'Drop-off at Shop' | 'Doorstep Pickup (+₹250)';
  complaints: string;
}

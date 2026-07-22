export type UserRole = 'courier' | 'security' | 'management';
export type PassStatus = 'waiting' | 'approved' | 'rejected' | 'arrived' | 'completed';
export type DeliveryPlatform = 'Trendyol Go' | 'Yemeksepeti' | 'Getir' | 'DraBornGo' | 'Diğer';

export interface GateProfile {
  userId: string;
  fullName: string;
  phone?: string;
  preferredRole: UserRole;
  avatarUrl?: string;
}

export interface CourierProfile {
  userId: string;
  platform: DeliveryPlatform;
  plate: string;
  rating: number;
  completedToday: number;
}

export interface GateSite {
  id: string;
  name: string;
  address?: string;
  city?: string;
  gateNames: string[];
  isDemo: boolean;
}

export interface CourierPass {
  id: string;
  siteId: string;
  courierUserId?: string;
  courierName: string;
  phone?: string;
  plate: string;
  platform: DeliveryPlatform;
  site: string;
  gate: string;
  block: string;
  apartment: string;
  orderNumber: string;
  note: string;
  screenshotUri?: string;
  createdAt: string;
  etaMinutes: number;
  status: PassStatus;
  approvalCode?: string;
  rejectionReason?: string;
  isDemo: boolean;
}

export interface ActivityItem {
  id: string;
  passId: string;
  title: string;
  detail: string;
  time: string;
  tone: 'cyan' | 'purple' | 'green' | 'orange' | 'red';
  icon: string;
  createdAt: string;
  isDemo: boolean;
}

export interface GateSettings {
  demoDataVersion?: string;
  demoLoadedAt?: string;
}

export interface GateRelease {
  version: string;
  androidVersionCode: number;
  demoDataVersion: string;
  notes: string;
}

export interface CreatePassInput {
  siteId: string;
  gate: string;
  block: string;
  apartment: string;
  orderNumber: string;
  note: string;
  screenshotPath?: string;
  etaMinutes?: number;
}

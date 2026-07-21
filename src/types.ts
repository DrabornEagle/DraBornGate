export type UserRole = 'courier' | 'security' | 'management';

export type PassStatus =
  | 'waiting'
  | 'approved'
  | 'rejected'
  | 'arrived'
  | 'completed';

export type DeliveryPlatform =
  | 'Trendyol Go'
  | 'Yemeksepeti'
  | 'Getir'
  | 'DraBornGo'
  | 'Diğer';

export interface CourierPass {
  id: string;
  courierName: string;
  phone: string;
  platform: DeliveryPlatform;
  plate: string;
  site: string;
  gate: string;
  block: string;
  apartment: string;
  orderNumber: string;
  note: string;
  createdAt: string;
  etaMinutes: number;
  status: PassStatus;
  approvalCode?: string;
  rejectionReason?: string;
  screenshotUri?: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: 'cyan' | 'purple' | 'green' | 'orange' | 'red';
  icon: string;
}

export interface DemoState {
  passes: CourierPass[];
  activities: ActivityItem[];
  courierProfile: {
    name: string;
    phone: string;
    platform: DeliveryPlatform;
    plate: string;
    rating: number;
    completedToday: number;
  };
}

export interface CreatePassInput {
  platform: DeliveryPlatform;
  site: string;
  gate: string;
  block: string;
  apartment: string;
  orderNumber: string;
  note: string;
  screenshotUri?: string;
}

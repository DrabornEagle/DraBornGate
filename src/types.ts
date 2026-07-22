export type UserRole = 'courier' | 'security' | 'management' | 'resident';
export type PassStatus = 'waiting' | 'approved' | 'rejected' | 'arrived' | 'completed' | 'cancelled' | 'expired';
export type VisitorStatus = 'waiting' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type DeliveryPlatform = 'Trendyol Go' | 'Yemeksepeti' | 'Getir' | 'DraBornGo' | 'Diğer';
export type RuleAudience = 'all' | 'courier' | 'visitor';
export type RuleScope = 'site' | 'gate';
export type DuesStatus = 'unpaid' | 'paid' | 'cancelled';

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
  avatarUrl?: string;
}

export interface GateSite {
  id: string;
  name: string;
  address?: string;
  city?: string;
  gateNames: string[];
  latitude?: number;
  longitude?: number;
  financeSummaryVisible: boolean;
  isDemo: boolean;
}

export interface SiteGate {
  id: string;
  siteId: string;
  name: string;
  stage?: string;
  entryPoint?: string;
  latitude?: number;
  longitude?: number;
  airpassEnabled: boolean;
  isDemo: boolean;
}

export interface ResidentProfile {
  id: string;
  userId: string;
  siteId: string;
  block: string;
  floor: string;
  apartment: string;
  addressNote?: string;
  isActive: boolean;
  isDemo: boolean;
}

export interface SiteRule {
  id: string;
  siteId: string;
  gateId?: string;
  audience: RuleAudience;
  scopeType: RuleScope;
  title: string;
  body: string;
  startsAt: string;
  endsAt?: string;
  isCritical: boolean;
  version: number;
  supersedesRuleId?: string;
  isActive: boolean;
  createdAt: string;
  isDemo: boolean;
}

export interface RuleAcceptance {
  id: string;
  ruleId: string;
  userId: string;
  passType: 'courier' | 'visitor';
  passId?: string;
  ruleVersion: number;
  acceptedAt: string;
}

export interface CourierPass {
  id: string;
  siteId: string;
  gateId?: string;
  courierUserId?: string;
  courierName: string;
  phone?: string;
  plate: string;
  platform: DeliveryPlatform;
  site: string;
  gate: string;
  customerName?: string;
  addressText?: string;
  block: string;
  floor?: string;
  apartment: string;
  orderNumber: string;
  note: string;
  screenshotUri?: string;
  ocrText?: string;
  ocrStatus: 'pending' | 'parsed' | 'manual' | 'failed';
  createdAt: string;
  etaMinutes: number;
  status: PassStatus;
  approvalCode?: string;
  rejectionReason?: string;
  rulesVersion?: number;
  rulesAcceptedAt?: string;
  locationVerified: boolean;
  latitude?: number;
  longitude?: number;
  lastDistanceM?: number;
  airpassSentAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  retryOfPassId?: string;
  isDemo: boolean;
}

export interface VisitorPass {
  id: string;
  residentUserId: string;
  siteId: string;
  guestName: string;
  guestPhone?: string;
  plate?: string;
  note?: string;
  visitorCode: string;
  status: VisitorStatus;
  rejectionReason?: string;
  decidedAt?: string;
  completedAt?: string;
  createdAt: string;
  isDemo: boolean;
}

export interface GateNotification {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
  isDemo: boolean;
}

export interface DuesPeriod {
  id: string;
  siteId: string;
  title: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  scopeType: 'site' | 'block' | 'apartment';
  scopeBlock?: string;
  scopeApartment?: string;
  amount: number;
  status: 'draft' | 'active' | 'closed';
  createdAt: string;
  isDemo: boolean;
}

export interface DuesCharge {
  id: string;
  periodId: string;
  siteId: string;
  residentProfileId?: string;
  residentUserId?: string;
  block: string;
  floor?: string;
  apartment: string;
  amount: number;
  status: DuesStatus;
  paidAt?: string;
  paymentNote?: string;
  reminderSentAt?: string;
  createdAt: string;
  isDemo: boolean;
}

export interface FinanceTransaction {
  id: string;
  siteId: string;
  transactionType: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  transactionDate: string;
  visibleToResidents: boolean;
  createdAt: string;
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
  airpassEnabled: boolean;
  notificationsEnabled: boolean;
  financeNotificationsEnabled: boolean;
}

export interface GateRelease {
  version: string;
  androidVersionCode: number;
  demoDataVersion: string;
  notes: string;
}

export interface CreatePassInput {
  siteId: string;
  gateId?: string;
  gate: string;
  customerName: string;
  addressText: string;
  block: string;
  floor: string;
  apartment: string;
  orderNumber: string;
  note: string;
  screenshotPath?: string;
  ocrText?: string;
  ocrPayload?: Record<string, unknown>;
  etaMinutes?: number;
  rulesVersion?: number;
  rulesAccepted: boolean;
}

export interface CreateVisitorInput {
  siteId: string;
  guestName: string;
  guestPhone?: string;
  plate?: string;
  note?: string;
}

export interface CreateDuesInput {
  siteId: string;
  title: string;
  year: number;
  month: number;
  dueDate: string;
  scopeType: 'site' | 'block' | 'apartment';
  scopeBlock?: string;
  scopeApartment?: string;
  amount: number;
}

export interface CreateFinanceInput {
  siteId: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  visible: boolean;
}

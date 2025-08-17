// Operator-specific types and interfaces

export interface OperatorProfile {
  id: string;
  userId: string;
  status: OperatorStatus;
  skills: string[];
  maxSessions: number;
  currentLoad: number;
  lastActiveAt: Date;
  metrics: OperatorMetrics;
  preferences: OperatorPreferences;
}

export enum OperatorStatus {
  ONLINE = 'ONLINE',
  BUSY = 'BUSY',
  AWAY = 'AWAY',
  OFFLINE = 'OFFLINE',
}

export interface OperatorMetrics {
  totalSessions: number;
  activeSessions: number;
  averageResponseTime: number;
  customerSatisfactionScore: number;
  escalationsHandled: number;
  resolutionRate: number;
  dailyStats: DailyStats;
  weeklyStats: WeeklyStats;
}

export interface DailyStats {
  date: string;
  sessionsHandled: number;
  averageHandleTime: number;
  customerRating: number;
  escalationsReceived: number;
  escalationsResolved: number;
}

export interface WeeklyStats {
  weekStart: string;
  totalSessions: number;
  averageRating: number;
  productivityScore: number;
  peakHours: string[];
}

export interface OperatorPreferences {
  autoAcceptChats: boolean;
  maxConcurrentChats: number;
  preferredSkills: string[];
  notificationSettings: NotificationSettings;
  workingHours: WorkingHours;
}

export interface NotificationSettings {
  newChatSound: boolean;
  escalationSound: boolean;
  emailNotifications: boolean;
  slackNotifications: boolean;
  browserNotifications: boolean;
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
  timezone: string;
}

export interface DaySchedule {
  enabled: boolean;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  breaks: BreakPeriod[];
}

export interface BreakPeriod {
  startTime: string;
  endTime: string;
  type: 'lunch' | 'break' | 'meeting';
}

export interface ChatAssignment {
  sessionId: string;
  operatorId: string;
  assignedAt: Date;
  priority: ChatPriority;
  customerTier: string;
  estimatedWaitTime: number;
  skills: string[];
}

export enum ChatPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface QueuedChat {
  sessionId: string;
  customerId: string;
  customerName: string;
  customerTier: string;
  subject: string;
  priority: ChatPriority;
  skills: string[];
  queuedAt: Date;
  waitTime: number;
  previousOperatorId?: string;
  escalationReason?: string;
  metadata: Record<string, any>;
}

export interface ChatTransfer {
  sessionId: string;
  fromOperatorId: string;
  toOperatorId: string;
  reason: TransferReason;
  notes: string;
  transferredAt: Date;
  customerConsent: boolean;
}

export enum TransferReason {
  SKILL_MISMATCH = 'SKILL_MISMATCH',
  ESCALATION = 'ESCALATION',
  WORKLOAD_BALANCE = 'WORKLOAD_BALANCE',
  SHIFT_CHANGE = 'SHIFT_CHANGE',
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
}

export interface OperatorAction {
  sessionId: string;
  operatorId: string;
  action: ActionType;
  timestamp: Date;
  data: Record<string, any>;
  result: ActionResult;
}

export enum ActionType {
  MESSAGE_SENT = 'MESSAGE_SENT',
  SESSION_ACCEPTED = 'SESSION_ACCEPTED',
  SESSION_TRANSFERRED = 'SESSION_TRANSFERRED',
  SESSION_ESCALATED = 'SESSION_ESCALATED',
  SESSION_RESOLVED = 'SESSION_RESOLVED',
  SESSION_CLOSED = 'SESSION_CLOSED',
  NOTE_ADDED = 'NOTE_ADDED',
  TAG_ADDED = 'TAG_ADDED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

export enum ActionResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

export interface TeamMetrics {
  totalOperators: number;
  onlineOperators: number;
  busyOperators: number;
  awayOperators: number;
  totalActiveSessions: number;
  queuedSessions: number;
  averageWaitTime: number;
  averageResponseTime: number;
  resolutionRate: number;
  customerSatisfactionScore: number;
  escalationRate: number;
  peakHours: string[];
  performanceBySkill: SkillPerformance[];
}

export interface SkillPerformance {
  skill: string;
  operatorCount: number;
  averageRating: number;
  totalSessions: number;
  averageHandleTime: number;
}

export interface SupervisorAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  operatorId?: string;
  sessionId?: string;
  message: string;
  data: Record<string, any>;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}

export enum AlertType {
  HIGH_WAIT_TIME = 'HIGH_WAIT_TIME',
  OPERATOR_OVERLOAD = 'OPERATOR_OVERLOAD',
  LOW_SATISFACTION = 'LOW_SATISFACTION',
  ESCALATION_SPIKE = 'ESCALATION_SPIKE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SLA_BREACH = 'SLA_BREACH',
  PERFORMANCE_DEGRADATION = 'PERFORMANCE_DEGRADATION',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface WorkloadBalance {
  operatorId: string;
  currentLoad: number;
  maxCapacity: number;
  utilizationPercentage: number;
  nextAvailableSlot: Date;
  skills: string[];
  averageHandleTime: number;
  recentPerformance: number;
}

export interface ChatSummary {
  sessionId: string;
  customerId: string;
  operatorId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  messageCount: number;
  resolution: ResolutionType;
  customerRating?: number;
  tags: string[];
  notes: string[];
  escalations: EscalationRecord[];
  transfers: TransferRecord[];
}

export enum ResolutionType {
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
  TRANSFERRED = 'TRANSFERRED',
  ABANDONED = 'ABANDONED',
  CLOSED_BY_OPERATOR = 'CLOSED_BY_OPERATOR',
  CLOSED_BY_CUSTOMER = 'CLOSED_BY_CUSTOMER',
}

export interface EscalationRecord {
  id: string;
  sessionId: string;
  fromOperatorId: string;
  toOperatorId: string;
  reason: string;
  escalatedAt: Date;
  resolvedAt?: Date;
  outcome: string;
}

export interface TransferRecord {
  id: string;
  sessionId: string;
  fromOperatorId: string;
  toOperatorId: string;
  reason: TransferReason;
  transferredAt: Date;
  acceptedAt?: Date;
  notes: string;
}
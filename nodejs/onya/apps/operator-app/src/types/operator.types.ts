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
  startTime: string;
  endTime: string;
  breaks: BreakPeriod[];
}

export interface BreakPeriod {
  startTime: string;
  endTime: string;
  type: 'lunch' | 'break' | 'meeting';
}

export interface ChatSession {
  id: string;
  customerId: string;
  customerName: string;
  operatorId?: string;
  status: ChatStatus;
  priority: ChatPriority;
  subject: string;
  skills: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
  messages?: ChatMessage[];
}

export enum ChatStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ESCALATED = 'ESCALATED',
  TRANSFERRED = 'TRANSFERRED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum ChatPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  type: MessageType;
  userId?: string;
  operatorId?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export enum MessageType {
  CUSTOMER = 'customer',
  OPERATOR = 'operator',
  SYSTEM = 'system',
  LLM = 'llm',
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

export interface DashboardMetrics {
  chat: {
    totalSessions: number;
    activeSessions: number;
    queuedSessions: number;
    averageWaitTime: number;
    resolutionRate: number;
    customerSatisfactionScore: number;
  };
  team: TeamMetrics;
  operator: OperatorMetrics;
  timeRange: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  operatorId?: string;
}

export enum UserRole {
  OPERATOR = 'OPERATOR',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface SocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

export enum NotificationType {
  CHAT_ASSIGNED = 'CHAT_ASSIGNED',
  CHAT_ESCALATED = 'CHAT_ESCALATED',
  CHAT_TRANSFERRED = 'CHAT_TRANSFERRED',
  OPERATOR_OFFLINE = 'OPERATOR_OFFLINE',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}
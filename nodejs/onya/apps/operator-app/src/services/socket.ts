import { io, Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { 
  SocketEvent, 
  NotificationEvent, 
  NotificationType,
  ChatSession,
  OperatorStatus 
} from '@/types/operator.types';

export class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.connect();
  }

  private connect(): void {
    const token = localStorage.getItem('onya_operator_token');
    if (!token) return;

    const socketUrl = (import.meta.env?.VITE_OPERATOR_BFF_URL as string) || 'http://localhost:3002';

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to operator socket server');
      this.reconnectAttempts = 0;
      toast.success('Connected to real-time updates');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnect();
    });

    // Chat events
    this.socket.on('chat:assigned', (data) => {
      this.handleChatAssigned(data);
    });

    this.socket.on('chat:message', (data) => {
      this.emit('chat:message', data);
    });

    this.socket.on('chat:updated', (data) => {
      this.emit('chat:updated', data);
    });

    this.socket.on('chat:escalated', (data) => {
      this.handleChatEscalated(data);
    });

    this.socket.on('chat:transferred', (data) => {
      this.handleChatTransferred(data);
    });

    this.socket.on('chat:resolved', (data) => {
      this.handleChatResolved(data);
    });

    this.socket.on('chat:transfer:request', (data) => {
      this.handleTransferRequest(data);
    });

    // Operator events
    this.socket.on('operator:status:changed', (data) => {
      this.emit('operator:status:changed', data);
    });

    this.socket.on('operator:online', (data) => {
      this.emit('operator:online', data);
    });

    this.socket.on('operator:offline', (data) => {
      this.emit('operator:offline', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Real-time connection error');
    });
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      toast.error('Unable to connect to real-time updates');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  // Event handlers
  private handleChatAssigned(data: { sessionId: string; operatorId: string; session: ChatSession }): void {
    const user = JSON.parse(localStorage.getItem('onya_operator_user') || '{}');
    
    if (data.operatorId === user.operatorId) {
      toast.success(`New chat assigned: ${data.session.subject}`);
      this.createNotification({
        type: NotificationType.CHAT_ASSIGNED,
        title: 'New Chat Assigned',
        message: `Chat from ${data.session.customerName}: ${data.session.subject}`,
        data: data.session,
      });
    }
    
    this.emit('chat:assigned', data);
  }

  private handleChatEscalated(data: { sessionId: string; operatorId: string; reason: string; priority?: string }): void {
    toast(`Chat escalated: ${data.reason}`, { icon: '⚠️' });
    this.createNotification({
      type: NotificationType.CHAT_ESCALATED,
      title: 'Chat Escalated',
      message: `Reason: ${data.reason}`,
      data,
    });
    this.emit('chat:escalated', data);
  }

  private handleChatTransferred(data: { sessionId: string; fromOperatorId: string; toOperatorId: string }): void {
    const user = JSON.parse(localStorage.getItem('onya_operator_user') || '{}');
    
    if (data.toOperatorId === user.operatorId) {
      toast.success('Chat transferred to you');
      this.createNotification({
        type: NotificationType.CHAT_TRANSFERRED,
        title: 'Chat Transferred',
        message: 'A chat has been transferred to you',
        data,
      });
    }
    
    this.emit('chat:transferred', data);
  }

  private handleChatResolved(data: { sessionId: string; operatorId: string; resolution: string }): void {
    this.emit('chat:resolved', data);
  }

  private handleTransferRequest(data: { 
    sessionId: string; 
    fromOperatorId: string; 
    reason: string; 
    notes: string 
  }): void {
    toast(`Transfer request: ${data.reason}`, { 
      icon: '🔄',
      duration: 6000,
    });
    this.emit('chat:transfer:request', data);
  }

  // Public methods
  public updateOperatorStatus(status: OperatorStatus): void {
    if (this.socket?.connected) {
      this.socket.emit('operator:status:update', { status });
    }
  }

  public acceptChat(sessionId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:accept', { sessionId });
    }
  }

  public sendMessage(sessionId: string, content: string, type: string = 'operator'): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:message', { sessionId, content, type });
    }
  }

  public requestTransfer(sessionId: string, toOperatorId: string, reason: string, notes: string): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:transfer:request', { sessionId, toOperatorId, reason, notes });
    }
  }

  public escalateChat(sessionId: string, reason: string, priority?: string): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:escalate', { sessionId, reason, priority });
    }
  }

  public resolveChat(sessionId: string, resolution: string, customerSatisfaction?: number, tags?: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:resolve', { sessionId, resolution, customerSatisfaction, tags });
    }
  }

  // Event system
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // Notification system
  private createNotification(notification: Omit<NotificationEvent, 'id' | 'timestamp' | 'read'>): void {
    const fullNotification: NotificationEvent = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };

    // Store in localStorage for persistence
    const existing = JSON.parse(localStorage.getItem('onya_notifications') || '[]');
    const updated = [fullNotification, ...existing].slice(0, 50); // Keep only latest 50
    localStorage.setItem('onya_notifications', JSON.stringify(updated));

    this.emit('notification:new', fullNotification);

    // Request browser notification permission if not already granted
    if (Notification.permission === 'granted') {
      new Notification(fullNotification.title, {
        body: fullNotification.message,
        icon: '/onya-logo.svg',
        badge: '/onya-logo.svg',
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(fullNotification.title, {
            body: fullNotification.message,
            icon: '/onya-logo.svg',
            badge: '/onya-logo.svg',
          });
        }
      });
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
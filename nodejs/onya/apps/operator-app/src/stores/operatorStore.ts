import { create } from 'zustand';
import { 
  OperatorProfile, 
  OperatorStatus, 
  ChatSession, 
  QueuedChat,
  DashboardMetrics 
} from '@/types/operator.types';
import { apiClient } from '@/services/api';
import { socketService } from '@/services/socket';
import { toast } from 'react-hot-toast';

interface OperatorStore {
  // State
  profile: OperatorProfile | null;
  status: OperatorStatus;
  activeSessions: ChatSession[];
  queuedChats: QueuedChat[];
  dashboardMetrics: DashboardMetrics | null;
  selectedSessionId: string | null;
  isLoading: boolean;
  
  // Actions
  loadProfile: () => Promise<void>;
  updateStatus: (status: OperatorStatus) => Promise<void>;
  loadActiveSessions: () => Promise<void>;
  loadChatQueue: () => Promise<void>;
  loadDashboardMetrics: (timeRange?: string) => Promise<void>;
  selectSession: (sessionId: string | null) => void;
  acceptChat: (sessionId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Socket event handlers
  handleChatAssigned: (data: any) => void;
  handleChatUpdated: (data: any) => void;
  handleStatusChanged: (data: any) => void;
}

export const useOperatorStore = create<OperatorStore>((set, get) => ({
  // Initial state
  profile: null,
  status: OperatorStatus.OFFLINE,
  activeSessions: [],
  queuedChats: [],
  dashboardMetrics: null,
  selectedSessionId: null,
  isLoading: false,

  // Actions
  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.getMyProfile();
      if (response.success && response.data) {
        const { profile } = response.data;
        set({ 
          profile, 
          status: profile.status,
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      set({ isLoading: false });
    }
  },

  updateStatus: async (status: OperatorStatus) => {
    const previousStatus = get().status;
    
    // Optimistic update
    set({ status });

    try {
      const response = await apiClient.updateMyStatus(status);
      if (response.success) {
        // Update via socket for real-time sync
        socketService.updateOperatorStatus(status);
        
        // Update profile if available
        const profile = get().profile;
        if (profile) {
          set({ 
            profile: { ...profile, status },
            status 
          });
        }

        toast.success(`Status updated to ${status.toLowerCase()}`);
      } else {
        // Revert on failure
        set({ status: previousStatus });
        toast.error('Failed to update status');
      }
    } catch (error) {
      // Revert on error
      set({ status: previousStatus });
      console.error('Failed to update status:', error);
    }
  },

  loadActiveSessions: async () => {
    try {
      const response = await apiClient.getActiveSessions();
      if (response.success && response.data) {
        set({ activeSessions: response.data.sessions });
      }
    } catch (error) {
      console.error('Failed to load active sessions:', error);
    }
  },

  loadChatQueue: async () => {
    try {
      const response = await apiClient.getChatQueue({ limit: 50 });
      if (response.success && response.data) {
        set({ queuedChats: response.data.sessions });
      }
    } catch (error) {
      console.error('Failed to load chat queue:', error);
    }
  },

  loadDashboardMetrics: async (timeRange: string = '24h') => {
    try {
      const response = await apiClient.getDashboardMetrics(timeRange);
      if (response.success && response.data) {
        set({ dashboardMetrics: response.data });
      }
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
    }
  },

  selectSession: (sessionId: string | null) => {
    set({ selectedSessionId: sessionId });
  },

  acceptChat: async (sessionId: string) => {
    try {
      const response = await apiClient.acceptChat(sessionId);
      if (response.success) {
        // Optimistically move from queue to active
        const queuedChats = get().queuedChats;
        const chatToMove = queuedChats.find(chat => chat.sessionId === sessionId);
        
        if (chatToMove) {
          const newActiveSessions = [...get().activeSessions];
          const newQueuedChats = queuedChats.filter(chat => chat.sessionId !== sessionId);
          
          // Convert queued chat to active session
          const activeSession: ChatSession = {
            id: chatToMove.sessionId,
            customerId: chatToMove.customerId,
            customerName: chatToMove.customerName,
            operatorId: get().profile?.id,
            status: 'ACTIVE' as any,
            priority: chatToMove.priority,
            subject: chatToMove.subject,
            skills: chatToMove.skills,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: chatToMove.metadata,
          };
          
          newActiveSessions.push(activeSession);
          
          set({ 
            activeSessions: newActiveSessions,
            queuedChats: newQueuedChats,
            selectedSessionId: sessionId
          });

          // Notify via socket
          socketService.acceptChat(sessionId);
          toast.success(`Accepted chat from ${chatToMove.customerName}`);
        }
      }
    } catch (error) {
      console.error('Failed to accept chat:', error);
      toast.error('Failed to accept chat');
    }
  },

  refreshData: async () => {
    const store = get();
    await Promise.all([
      store.loadProfile(),
      store.loadActiveSessions(),
      store.loadChatQueue(),
      store.loadDashboardMetrics(),
    ]);
  },

  // Socket event handlers
  handleChatAssigned: (data: any) => {
    const { sessionId, session } = data;
    const activeSessions = get().activeSessions;
    
    // Check if session already exists
    const exists = activeSessions.find(s => s.id === sessionId);
    if (!exists) {
      set({ 
        activeSessions: [...activeSessions, session],
        selectedSessionId: sessionId 
      });
    }
  },

  handleChatUpdated: (data: any) => {
    const { sessionId, updates } = data;
    const activeSessions = get().activeSessions;
    
    const updatedSessions = activeSessions.map(session => 
      session.id === sessionId 
        ? { ...session, ...updates, updatedAt: new Date() }
        : session
    );
    
    set({ activeSessions: updatedSessions });
  },

  handleStatusChanged: (data: any) => {
    const { operatorId, status } = data;
    const profile = get().profile;
    
    if (profile && profile.id === operatorId) {
      set({ 
        profile: { ...profile, status },
        status 
      });
    }
  },
}));

// Setup socket event listeners
socketService.on('chat:assigned', (data: any) => {
  useOperatorStore.getState().handleChatAssigned(data);
});

socketService.on('chat:updated', (data: any) => {
  useOperatorStore.getState().handleChatUpdated(data);
});

socketService.on('operator:status:changed', (data: any) => {
  useOperatorStore.getState().handleStatusChanged(data);
});
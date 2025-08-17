import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Message, ChatSession, EscalationStatus } from '../types/chat.types';

interface ChatState {
  // Current session
  currentSession: ChatSession | null;
  messages: Message[];
  
  // UI state
  isTyping: boolean;
  isSending: boolean;
  isConnected: boolean;
  
  // Escalation state
  escalationStatus: EscalationStatus;
  
  // Customer info
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  
  // Actions
  setCurrentSession: (session: ChatSession | null) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setIsTyping: (typing: boolean) => void;
  setIsSending: (sending: boolean) => void;
  setIsConnected: (connected: boolean) => void;
  setEscalationStatus: (status: EscalationStatus) => void;
  setCustomerInfo: (info: { id: string; name?: string; email?: string }) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentSession: null,
      messages: [],
      isTyping: false,
      isSending: false,
      isConnected: true,
      escalationStatus: { escalated: false },
      customerId: import.meta.env.VITE_CUSTOMER_ID || 'demo-customer',
      customerName: import.meta.env.VITE_CUSTOMER_NAME,
      customerEmail: import.meta.env.VITE_CUSTOMER_EMAIL,

      // Actions
      setCurrentSession: (session) =>
        set({ currentSession: session }, false, 'setCurrentSession'),

      addMessage: (message) =>
        set(
          (state) => ({
            messages: [...state.messages, message],
          }),
          false,
          'addMessage'
        ),

      setMessages: (messages) =>
        set({ messages }, false, 'setMessages'),

      setIsTyping: (typing) =>
        set({ isTyping: typing }, false, 'setIsTyping'),

      setIsSending: (sending) =>
        set({ isSending: sending }, false, 'setIsSending'),

      setIsConnected: (connected) =>
        set({ isConnected: connected }, false, 'setIsConnected'),

      setEscalationStatus: (status) =>
        set({ escalationStatus: status }, false, 'setEscalationStatus'),

      setCustomerInfo: (info) =>
        set(
          {
            customerId: info.id,
            customerName: info.name,
            customerEmail: info.email,
          },
          false,
          'setCustomerInfo'
        ),

      clearChat: () =>
        set(
          {
            currentSession: null,
            messages: [],
            isTyping: false,
            isSending: false,
            escalationStatus: { escalated: false },
          },
          false,
          'clearChat'
        ),
    }),
    {
      name: 'chat-store',
    }
  )
);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatContainer } from '@/features/chat/components/ChatContainer';
import { mockTrpcClient } from '../__mocks__/trpc';

// Mock the useChat hook
const mockUseChat = {
  currentSession: null,
  messages: [],
  isSending: false,
  escalationStatus: { escalated: false, operatorId: null },
  isCreatingSession: false,
  createSession: vi.fn(),
  sendMessage: vi.fn(),
};

vi.mock('@/features/chat/hooks/useChat', () => ({
  useChat: () => mockUseChat,
}));

// Mock tRPC client
vi.mock('@/shared/trpc/client', () => ({
  trpc: mockTrpcClient,
}));

// Mock components
vi.mock('@/features/chat/components/MessageList', () => ({
  MessageList: ({ messages, isTyping }: any) => (
    <div data-testid="message-list">
      <div data-testid="message-count">{messages.length}</div>
      {isTyping && <div data-testid="typing-indicator">Typing...</div>}
    </div>
  ),
}));

vi.mock('@/features/chat/components/MessageInput', () => ({
  MessageInput: ({ onSendMessage, disabled, placeholder }: any) => (
    <div data-testid="message-input">
      <input
        data-testid="message-input-field"
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSendMessage('test message');
          }
        }}
      />
    </div>
  ),
}));

vi.mock('@/features/escalation/components/EscalationNotice', () => ({
  EscalationNotice: ({ escalationStatus, onCancelEscalation }: any) => (
    <div data-testid="escalation-notice">
      {escalationStatus.escalated && (
        <div>
          <span data-testid="escalation-status">Escalated</span>
          <button onClick={onCancelEscalation} data-testid="cancel-escalation">
            Cancel
          </button>
        </div>
      )}
    </div>
  ),
}));

vi.mock('@/shared/components/ui/Button', () => ({
  Button: ({ children, onClick, loading, ...props }: any) => (
    <button onClick={onClick} disabled={loading} {...props}>
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

describe('ChatContainer', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    Object.assign(mockUseChat, {
      currentSession: null,
      messages: [],
      isSending: false,
      escalationStatus: { escalated: false, operatorId: null },
      isCreatingSession: false,
      createSession: vi.fn(),
      sendMessage: vi.fn(),
    });
  });

  it('shows loading state when creating session', () => {
    Object.assign(mockUseChat, {
      isCreatingSession: true,
    });

    render(<ChatContainer />);

    expect(screen.getByText('Connecting to support...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we set up your chat session.')).toBeInTheDocument();
  });

  it('shows error state when no session exists and not creating', () => {
    Object.assign(mockUseChat, {
      currentSession: null,
      isCreatingSession: false,
    });

    render(<ChatContainer />);

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText("We're having trouble connecting to our chat service.")).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('calls createSession when Try Again button is clicked', async () => {
    Object.assign(mockUseChat, {
      currentSession: null,
      isCreatingSession: false,
    });

    render(<ChatContainer />);

    const tryAgainButton = screen.getByText('Try Again');
    await user.click(tryAgainButton);

    expect(mockUseChat.createSession).toHaveBeenCalled();
  });

  it('automatically creates session on mount when none exists', () => {
    Object.assign(mockUseChat, {
      currentSession: null,
      isCreatingSession: false,
    });

    render(<ChatContainer />);

    expect(mockUseChat.createSession).toHaveBeenCalled();
  });

  it('renders chat interface when session exists', () => {
    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      messages: [
        { id: '1', content: 'Hello', type: 'user' },
        { id: '2', content: 'Hi there!', type: 'bot' },
      ],
    });

    render(<ChatContainer />);

    expect(screen.getByText('Customer Support')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
    expect(screen.getByTestId('message-count')).toHaveTextContent('2');
  });

  it('shows "Talk to Human" button when not escalated', () => {
    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      escalationStatus: { escalated: false, operatorId: null },
    });

    render(<ChatContainer />);

    expect(screen.getByText('Talk to Human')).toBeInTheDocument();
  });

  it('hides "Talk to Human" button when escalated', () => {
    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      escalationStatus: { escalated: true, operatorId: null },
    });

    render(<ChatContainer />);

    expect(screen.queryByText('Talk to Human')).not.toBeInTheDocument();
  });

  it('shows correct status when escalated but no operator assigned', () => {
    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      escalationStatus: { escalated: true, operatorId: null },
    });

    render(<ChatContainer />);

    expect(screen.getByText('Waiting for agent...')).toBeInTheDocument();
  });

  it('shows correct status when connected to operator', () => {
    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      escalationStatus: { escalated: true, operatorId: 'op-123' },
    });

    render(<ChatContainer />);

    expect(screen.getByText('Connected to agent')).toBeInTheDocument();
  });

  it('handles message sending', async () => {
    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
    });

    render(<ChatContainer />);

    const messageInput = screen.getByTestId('message-input-field');
    await user.type(messageInput, 'test message');
    await user.keyboard('{Enter}');

    expect(mockUseChat.sendMessage).toHaveBeenCalledWith('test message');
  });

  it('requests escalation when button is clicked', async () => {
    const mockRequestEscalation = vi.fn().mockResolvedValue({});
    mockTrpcClient.escalation.requestEscalation.useMutation.mockReturnValue({
      mutateAsync: mockRequestEscalation,
      isLoading: false,
    });

    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      escalationStatus: { escalated: false, operatorId: null },
    });

    render(<ChatContainer />);

    const escalationButton = screen.getByText('Talk to Human');
    await user.click(escalationButton);

    expect(mockRequestEscalation).toHaveBeenCalledWith({
      sessionId: 'test-session',
      reason: 'Customer requested human agent',
      priority: 'medium',
    });
  });

  it('shows loading state on escalation button when requesting', () => {
    mockTrpcClient.escalation.requestEscalation.useMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: true,
    });

    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      escalationStatus: { escalated: false, operatorId: null },
    });

    render(<ChatContainer />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows typing indicator when sending message', () => {
    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      isSending: true,
    });

    render(<ChatContainer />);

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('disables message input when sending', () => {
    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      isSending: true,
    });

    render(<ChatContainer />);

    const messageInput = screen.getByTestId('message-input-field');
    expect(messageInput).toBeDisabled();
  });

  it('shows different placeholder based on escalation status', () => {
    // Test with operator connected
    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      escalationStatus: { escalated: true, operatorId: 'op-123' },
    });

    const { rerender } = render(<ChatContainer />);

    expect(screen.getByPlaceholderText('Type your message to the agent...')).toBeInTheDocument();

    // Test with escalated but no operator
    Object.assign(mockUseChat, {
      escalationStatus: { escalated: true, operatorId: null },
    });

    rerender(<ChatContainer />);

    expect(screen.getByPlaceholderText('You can continue chatting while waiting for an agent...')).toBeInTheDocument();

    // Test with no escalation
    Object.assign(mockUseChat, {
      escalationStatus: { escalated: false, operatorId: null },
    });

    rerender(<ChatContainer />);

    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  it('renders escalation notice component', () => {
    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      escalationStatus: { escalated: true, operatorId: null },
    });

    render(<ChatContainer />);

    expect(screen.getByTestId('escalation-notice')).toBeInTheDocument();
    expect(screen.getByTestId('escalation-status')).toBeInTheDocument();
  });

  it('handles escalation cancellation', async () => {
    const mockCancelEscalation = vi.fn().mockResolvedValue({});
    mockTrpcClient.escalation.cancelEscalation.useMutation.mockReturnValue({
      mutateAsync: mockCancelEscalation,
      isLoading: false,
    });

    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      escalationStatus: { escalated: true, operatorId: null },
    });

    render(<ChatContainer />);

    const cancelButton = screen.getByTestId('cancel-escalation');
    await user.click(cancelButton);

    expect(mockCancelEscalation).toHaveBeenCalledWith({
      sessionId: 'test-session',
    });
  });

  it('handles errors in message sending gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      sendMessage: vi.fn().mockRejectedValue(new Error('Send failed')),
    });

    render(<ChatContainer />);

    const messageInput = screen.getByTestId('message-input-field');
    await user.type(messageInput, 'test message');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send message:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles errors in escalation request gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockRequestEscalation = vi.fn().mockRejectedValue(new Error('Escalation failed'));
    
    mockTrpcClient.escalation.requestEscalation.useMutation.mockReturnValue({
      mutateAsync: mockRequestEscalation,
      isLoading: false,
    });

    Object.assign(mockUseChat, {
      currentSession: { id: 'test-session', status: 'active' },
      escalationStatus: { escalated: false, operatorId: null },
    });

    render(<ChatContainer />);

    const escalationButton = screen.getByText('Talk to Human');
    await user.click(escalationButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to request escalation:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });
});
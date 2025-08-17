import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '@/features/chat/components/MessageInput';

describe('MessageInput', () => {
  const mockOnSendMessage = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default placeholder', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <MessageInput 
        onSendMessage={mockOnSendMessage} 
        placeholder="Custom placeholder" 
      />
    );
    
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('sends message when send button is clicked', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button');
    
    await user.type(textarea, 'Hello world');
    await user.click(sendButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world');
    expect(textarea).toHaveValue('');
  });

  it('sends message when Enter is pressed', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'Hello world');
    await user.keyboard('{Enter}');
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world');
    expect(textarea).toHaveValue('');
  });

  it('adds new line when Shift+Enter is pressed', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(textarea, 'Line 2');
    
    expect(textarea).toHaveValue('Line 1\nLine 2');
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('trims whitespace from messages', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button');
    
    await user.type(textarea, '  Hello world  ');
    await user.click(sendButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world');
  });

  it('does not send empty or whitespace-only messages', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button');
    
    // Test empty message
    await user.click(sendButton);
    expect(mockOnSendMessage).not.toHaveBeenCalled();
    
    // Test whitespace-only message
    await user.type(textarea, '   ');
    await user.click(sendButton);
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('disables send button when message is empty', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const sendButton = screen.getByRole('button');
    
    expect(sendButton).toBeDisabled();
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello');
    
    expect(sendButton).not.toBeDisabled();
    
    await user.clear(textarea);
    
    expect(sendButton).toBeDisabled();
  });

  it('disables input when disabled prop is true', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} disabled />);
    
    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button');
    
    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('does not send message when disabled', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} disabled />);
    
    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button');
    
    // Try to type (should not work due to disabled state)
    await user.click(textarea);
    await user.keyboard('Hello world');
    
    expect(textarea).toHaveValue('');
    
    // Try to click send button
    await user.click(sendButton);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('shows keyboard shortcuts hint when not disabled', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    expect(screen.getByText('Press Enter to send, Shift+Enter for new line')).toBeInTheDocument();
  });

  it('hides keyboard shortcuts hint when disabled', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} disabled />);
    
    expect(screen.queryByText('Press Enter to send, Shift+Enter for new line')).not.toBeInTheDocument();
  });

  it('auto-resizes textarea based on content', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Initial height should be minimum
    expect(textarea.style.minHeight).toBe('40px');
    
    // Type multiple lines
    await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4');
    
    // Should trigger resize
    fireEvent.input(textarea);
    
    // Height should increase (actual value depends on font size)
    expect(parseInt(textarea.style.height)).toBeGreaterThan(40);
  });

  it('handles rapid typing without losing characters', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    
    // Type quickly
    await user.type(textarea, 'Hello world this is a test message', { delay: 1 });
    
    expect(textarea).toHaveValue('Hello world this is a test message');
  });

  it('maintains focus after sending message', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'Hello');
    await user.keyboard('{Enter}');
    
    // Textarea should still be focused after sending
    expect(textarea).toHaveFocus();
  });

  it('handles long messages correctly', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    const longMessage = 'A'.repeat(1000);
    
    await user.type(textarea, longMessage);
    await user.keyboard('{Enter}');
    
    expect(mockOnSendMessage).toHaveBeenCalledWith(longMessage);
  });

  it('prevents sending during disabled state even with keyboard', async () => {
    const { rerender } = render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'Hello');
    
    // Disable the input
    rerender(<MessageInput onSendMessage={mockOnSendMessage} disabled />);
    
    await user.keyboard('{Enter}');
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('clears input after successful send', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'Test message');
    expect(textarea).toHaveValue('Test message');
    
    await user.keyboard('{Enter}');
    
    expect(textarea).toHaveValue('');
  });
});
import { TRPCProvider } from '@/shared/trpc/provider';
import { ChatContainer } from '@/features/chat/components/ChatContainer';
import './globals.css';

function App() {
  return (
    <TRPCProvider>
      <div className="h-screen w-full">
        <ChatContainer />
      </div>
    </TRPCProvider>
  );
}

export default App;
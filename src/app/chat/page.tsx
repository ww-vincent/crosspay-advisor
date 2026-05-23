import type { Metadata } from 'next';
import { ChatPanel } from '@/components/chat-panel';
import { BackButton } from '@/components/back-button';

export const metadata: Metadata = {
  title: '智能换汇顾问',
  description: 'AI 对话式换汇建议，实时汇率分析',
};

export default function ChatPage() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <BackButton label="智能换汇顾问" />
      <div className="min-h-0 flex-1 overflow-hidden">
        <ChatPanel />
      </div>
    </div>
  );
}

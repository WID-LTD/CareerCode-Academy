import { ChatView } from '@/components/chat/ChatView';

export default function InstructorMessages() {
  return (
    <ChatView
      apiPrefix="/instructor"
      title="Messages"
      subtitle="Real-time direct messaging with your students."
    />
  );
}
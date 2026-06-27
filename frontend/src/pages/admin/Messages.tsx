import { ChatView } from '@/components/chat/ChatView';

export default function AdminMessages() {
  return (
    <ChatView
      apiPrefix="/admin"
      title="Messages"
      subtitle="Direct messaging with platform users."
      showRoleFilter
      showNewChat
    />
  );
}
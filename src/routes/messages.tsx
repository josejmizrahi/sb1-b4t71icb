import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { MessageLayout } from '@/components/messages/MessageLayout';
import { MessagesHeader } from '@/components/messages/MessagesHeader';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageThread } from '@/components/messages/MessageThread';
import { useMessages } from '@/hooks/useMessages';

export default function MessagesPage() {
  const { 
    conversations,
    selectedConversation,
    messages,
    loading,
    error,
    selectConversation,
    sendMessage,
    markAsRead,
    refresh
  } = useMessages();

  const [search, setSearch] = useState('');
  const [showMobileList, setShowMobileList] = useState(true);

  const handleSelectConversation = async (id: string) => {
    await selectConversation(id);
    setShowMobileList(false);
  };

  const handleBack = () => {
    setShowMobileList(true);
  };

  const filteredConversations = conversations.filter(conversation => {
    const otherParticipant = conversation.participants.find(p => p.profile);
    if (!otherParticipant?.profile) return false;

    return (
      otherParticipant.profile.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      otherParticipant.profile.username.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <Container className="h-[calc(100vh-4rem)] py-6" size="xl">
      <MessageLayout
        sidebar={
          <>
            <MessagesHeader
              search={search}
              onSearchChange={setSearch}
              onConversationCreated={refresh}
            />
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConversation?.id}
              onSelect={handleSelectConversation}
              loading={loading}
            />
          </>
        }
        content={
          <MessageThread
            conversation={selectedConversation}
            messages={messages}
            onSend={sendMessage}
            onRead={markAsRead}
            onBack={handleBack}
            error={error}
          />
        }
        selectedConversation={!showMobileList}
      />
    </Container>
  );
}
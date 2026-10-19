import { useReducer } from 'react';
import { conversationReducer, createConversation, getSessionTitle } from './conversation';

export function useConversation() {
  const [conversation, dispatch] = useReducer(conversationReducer, undefined, createConversation);
  const title = getSessionTitle(conversation.messages);

  return { conversation, dispatch, title };
}

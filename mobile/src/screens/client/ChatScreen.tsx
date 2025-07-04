import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import chatService from '../../services/chat.service';
import { Message, ChatResponse } from '../../types/chat';

const ChatScreen: React.FC = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    startConversation();
  }, []);

  const startConversation = async () => {
    try {
      const response = await chatService.startConversation();
      setConversationId(response.conversation_id);
      addMessage({
        id: Date.now().toString(),
        text: response.message,
        sender: 'bot',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !conversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await chatService.sendMessage(conversationId, inputText);
      
      setIsTyping(false);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.message,
        sender: 'bot',
        timestamp: new Date(),
        intent: response.intent,
      };
      
      addMessage(botMessage);

      if (response.needs_agent) {
        // Navigate to ticket tracking
        setTimeout(() => {
          navigation.navigate('TicketDetails', { ticketId: response.ticket_id });
        }, 2000);
      }
    } catch (error) {
      setIsTyping(false);
      console.error('Failed to send message:', error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.text}
          </Text>
          {item.intent && (
            <Text style={styles.intentTag}>#{item.intent}</Text>
          )}
        </View>
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />
      
      {isTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>L'assistant écrit...</Text>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Écrivez votre message..."
          multiline
          maxHeight={100}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || loading}
        >
          <Ionicons 
            name="send" 
            size={24} 
            color={inputText.trim() ? '#007AFF' : '#ccc'} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  botBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  userMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  intentTag: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
});

export default ChatScreen;
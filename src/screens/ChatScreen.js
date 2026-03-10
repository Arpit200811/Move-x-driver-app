import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, ActivityIndicator, StyleSheet
} from 'react-native';
import { ChevronLeft, Send, MessageCircle, Mic } from 'lucide-react-native';
import api, { SOCKET_URL } from '../services/api';
import io from 'socket.io-client';

export default function ChatScreen({ navigation, route }) {
  const { orderId, orderRef, recipientName } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef(null);

  const quickReplies = [
    "I'm at the location",
    "Stuck in traffic",
    "Where are you?",
    "Coming in 5 mins",
    "Order picked up",
  ];

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      setMessages(res.data.order?.messages || []);
    } catch (err) {
      console.log('Chat fetch error', err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchMessages();
    
    const socket = io(SOCKET_URL);
    socket.emit('join_order', orderId);

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => socket.disconnect();
  }, [fetchMessages, orderId]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    const msgText = text.trim();
    setText('');
    setSending(true);
    try {
      await api.post(`/orders/${orderId}/message`, { text: msgText, senderRole: 'driver' });
      listRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      console.log('Send error', err.message);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.senderRole === 'driver';
    return (
      <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.theirMessageRow]}>
        <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>{item.text}</Text>
          <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.theirMessageTime]}>
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} · {item.senderRole}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{recipientName || 'Customer'}</Text>
          <Text style={styles.headerRef}>Order #{orderRef?.slice(-8)}</Text>
        </View>
        <View style={styles.headerIconBox}>
          <MessageCircle size={18} color="#2563EB" />
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#2563EB" size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item, i) => item.timestamp || String(i)}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MessageCircle size={48} color="#e2e8f0" />
                <Text style={styles.emptyText}>
                  No messages yet.{'\n'}Start the conversation!
                </Text>
              </View>
            }
          />
        )}

        {/* Quick Replies Row */}
        {!loading && (
            <View style={styles.quickReplyContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickReplyContent}>
                    {quickReplies.map((reply, i) => (
                        <TouchableOpacity 
                            key={i} 
                            style={styles.quickReplyChip}
                            onPress={() => {
                                setText(reply);
                                // Optional: auto-send if you want true one-tap
                            }}
                        >
                            <Text style={styles.quickReplyText}>{reply}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        )}

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            onPress={() => Alert.alert("SAFETY COMMS", "Voice-to-Text Protocol Initializing... (Premium Access Only)")}
            style={styles.micButton}
          >
            <Mic size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!text.trim() || sending}
            style={[styles.sendButton, { backgroundColor: text.trim() ? '#2563EB' : '#e2e8f0' }]}
          >
            <Send size={18} color={text.trim() ? '#fff' : '#94a3b8'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    headerButton: {
        width: 44,
        height: 44,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginRight: 16,
    },
    headerInfo: {
        flex: 1,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0f172a',
    },
    headerRef: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    headerIconBox: {
        width: 40,
        height: 40,
        backgroundColor: '#eff6ff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 24,
    },
    messageRow: {
        marginBottom: 12,
        flexDirection: 'row',
    },
    myMessageRow: {
        justifyContent: 'end',
        justifyContent: 'flex-end',
    },
    theirMessageRow: {
        justifyContent: 'start',
        justifyContent: 'flex-start',
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    myBubble: {
        backgroundColor: '#2563EB',
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 14,
        fontWeight: '600',
    },
    myMessageText: {
        color: '#fff',
    },
    theirMessageText: {
        color: '#1e293b',
    },
    messageTime: {
        fontSize: 9,
        marginTop: 4,
    },
    myMessageTime: {
        color: 'rgba(255,255,255,0.6)',
    },
    theirMessageTime: {
        color: '#94a3b8',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: '#94a3b8',
        fontWeight: '900',
        fontSize: 12,
        textTransform: 'uppercase',
        marginTop: 16,
        letterSpacing: 1,
        textAlign: 'center',
        lineHeight: 18,
    },
    inputArea: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    textInput: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#0f172a',
        fontWeight: '600',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        maxHeight: 100,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micButton: {
        width: 44,
        height: 44,
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    quickReplyContainer: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    quickReplyContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    quickReplyChip: {
        backgroundColor: '#f8fafc',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    quickReplyText: {
        color: '#0f172a',
        fontWeight: '800',
        fontSize: 12,
        fontStyle: 'italic',
    }
});


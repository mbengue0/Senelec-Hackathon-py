import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ticketService from '../../services/ticket.service';
import { Ticket, TicketStatus } from '../../types/ticket';
import { useSocket } from '../../hooks/useSocket';

const TicketListScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('ticket_updated', handleTicketUpdate);
      socket.on('ticket_created', handleTicketCreated);
      
      return () => {
        socket.off('ticket_updated');
        socket.off('ticket_created');
      };
    }
  }, [socket]);

  const loadTickets = async () => {
    try {
      const data = await ticketService.getMyTickets();
      setTickets(data);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const handleTicketUpdate = (data: { ticket: Ticket }) => {
    setTickets(prev => 
      prev.map(t => t.id === data.ticket.id ? data.ticket : t)
    );
  };

  const handleTicketCreated = (data: { ticket: Ticket }) => {
    setTickets(prev => [data.ticket, ...prev]);
  };

  const getStatusColor = (status: TicketStatus) => {
    const colors = {
      [TicketStatus.RECEIVED]: '#FFA500',
      [TicketStatus.IN_PROGRESS]: '#007AFF',
      [TicketStatus.RESOLVED]: '#4CAF50',
      [TicketStatus.CLOSED]: '#999',
    };
    return colors[status] || '#999';
  };

  const getStatusIcon = (status: TicketStatus) => {
    const icons = {
      [TicketStatus.RECEIVED]: 'time-outline',
      [TicketStatus.IN_PROGRESS]: 'sync-outline',
      [TicketStatus.RESOLVED]: 'checkmark-circle-outline',
      [TicketStatus.CLOSED]: 'archive-outline',
    };
    return icons[status] || 'help-outline';
  };

  const renderTicket = ({ item }: { item: Ticket }) => (
    <TouchableOpacity
      style={styles.ticketCard}
      onPress={() => navigation.navigate('TicketDetails', { ticketId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketTitle}>{item.title}</Text>
          <Text style={styles.ticketId}>#{item.id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons name={getStatusIcon(item.status)} size={16} color="#fff" />
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.ticketDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.ticketFooter}>
        <Text style={styles.ticketDate}>
          {new Date(item.created_at).toLocaleDateString('fr-FR')}
        </Text>
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTicket}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Aucun ticket pour le moment</Text>
          </View>
        }
      />
      
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Chat')}
      >
        <Ionicons name="chatbubble-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ticketId: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  ticketDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketDate: {
    fontSize: 12,
    color: '#999',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  priorityText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default TicketListScreen;
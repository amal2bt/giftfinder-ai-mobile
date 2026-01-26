import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../utils/colors';
import { deliveryAPI } from '../utils/api';
import { format, parseISO } from 'date-fns';

interface DeliveryAssignment {
  id: number;
  order_id: number;
  delivery_worker_id: string;
  delivery_status: 'assigned' | 'in_transit' | 'delivered' | 'failed';
  driver_feedback?: string;
  client_feedback?: string;
  assigned_at: string;
  started_at?: string;
  delivered_at?: string;
  order: {
    id: number;
    total_amount: number;
    status: string;
    payment_status: string;
    needs_delivery: boolean;
    delivery_address: string;
    delivery_phone: string;
    house_name?: string;
    floor?: string;
    created_at: string;
    items: Array<{
      id: number;
      gift_id: number;
      quantity: number;
      price: number;
      subtotal: number;
      gift: {
        id: number;
        name: string;
        category: string;
        image?: string;
      } | null;
    }>;
    customer: {
      id: string;
      username: string;
      email: string;
    } | null;
  };
}

export default function Delivery() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<DeliveryAssignment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [clientFeedback, setClientFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'in_transit' | 'delivered' | 'failed'>('all');

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const response = await deliveryAPI.getMyAssignments();
      setAssignments(response.data?.assignments || []);
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to load assignments');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssignments();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (assignmentId: number, newStatus: 'in_transit' | 'delivered' | 'failed') => {
    const statusMessages = {
      in_transit: 'Start delivery',
      delivered: 'Mark as delivered',
      failed: 'Mark as failed',
    };

    Alert.alert(
      'Update Status',
      `Are you sure you want to ${statusMessages[newStatus].toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              await deliveryAPI.updateDeliveryStatus(assignmentId.toString(), newStatus);
              await loadAssignments();
              if (selectedAssignment?.id === assignmentId) {
                setShowDetailsModal(false);
              }
              Alert.alert('Success', `Status updated to ${newStatus.replace('_', ' ')}`);
            } catch (error: any) {
              console.error('Error updating status:', error);
              Alert.alert('Error', error?.response?.data?.message || 'Failed to update status');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSubmitClientFeedback = async () => {
    if (!selectedAssignment || !clientFeedback.trim()) {
      Alert.alert('Error', 'Please enter client feedback');
      return;
    }

    setLoading(true);
    try {
      await deliveryAPI.submitClientFeedback(selectedAssignment.id.toString(), clientFeedback.trim());
      await loadAssignments();
      setShowFeedbackModal(false);
      setClientFeedback('');
      Alert.alert('Success', 'Client feedback submitted successfully');
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return colors.primary;
      case 'in_transit':
        return colors.warning || '#FFA500';
      case 'delivered':
        return colors.success || '#10B981';
      case 'failed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'time-outline';
      case 'in_transit':
        return 'car-outline';
      case 'delivered':
        return 'checkmark-circle-outline';
      case 'failed':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const filteredAssignments = assignments.filter(
    (assignment) => statusFilter === 'all' || assignment.delivery_status === statusFilter
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Deliveries</Text>
          <Text style={styles.subtitle}>Manage your delivery assignments</Text>
        </View>
      </View>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {(['all', 'assigned', 'in_transit', 'delivered', 'failed'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, statusFilter === filter && styles.activeFilterChip]}
            onPress={() => setStatusFilter(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === filter && styles.activeFilterChipText,
              ]}
            >
              {filter.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Assignments List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredAssignments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No deliveries found</Text>
            <Text style={styles.emptySubtext}>
              {statusFilter === 'all'
                ? 'You have no delivery assignments yet'
                : `No ${statusFilter.replace('_', ' ')} deliveries`}
            </Text>
          </View>
        ) : (
          filteredAssignments.map((assignment) => (
            <TouchableOpacity
              key={assignment.id}
              style={styles.assignmentCard}
              onPress={() => {
                setSelectedAssignment(assignment);
                setShowDetailsModal(true);
              }}
            >
              <View style={styles.assignmentHeader}>
                <View style={styles.assignmentHeaderLeft}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(assignment.delivery_status) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(assignment.delivery_status) as any}
                      size={16}
                      color={getStatusColor(assignment.delivery_status)}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(assignment.delivery_status) },
                      ]}
                    >
                      {assignment.delivery_status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.orderId}>Order #{assignment.order_id}</Text>
                </View>
                <Text style={styles.amount}>${assignment.order.total_amount.toFixed(2)}</Text>
              </View>

              <View style={styles.assignmentDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {assignment.order.delivery_address || 'No address'}
                  </Text>
                </View>
                {assignment.order.delivery_phone && (
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{assignment.order.delivery_phone}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>
                    Assigned: {format(parseISO(assignment.assigned_at), 'MMM dd, yyyy HH:mm')}
                  </Text>
                </View>
                {assignment.order.items && assignment.order.items.length > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="cube-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {assignment.order.items.length} item(s)
                    </Text>
                  </View>
                )}
              </View>

              {assignment.client_feedback && (
                <View style={styles.feedbackContainer}>
                  <Ionicons name="heart" size={16} color={colors.primary} />
                  <Text style={styles.feedbackText} numberOfLines={2}>
                    {assignment.client_feedback}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delivery Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedAssignment && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Order Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Order ID:</Text>
                    <Text style={styles.infoValue}>#{selectedAssignment.order_id}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Total Amount:</Text>
                    <Text style={styles.infoValue}>
                      ${selectedAssignment.order.total_amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        { color: getStatusColor(selectedAssignment.delivery_status) },
                      ]}
                    >
                      {selectedAssignment.delivery_status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Delivery Address</Text>
                  <Text style={styles.addressText}>{selectedAssignment.order.delivery_address}</Text>
                  {selectedAssignment.order.house_name && (
                    <Text style={styles.addressText}>
                      House: {selectedAssignment.order.house_name}
                    </Text>
                  )}
                  {selectedAssignment.order.floor && (
                    <Text style={styles.addressText}>Floor: {selectedAssignment.order.floor}</Text>
                  )}
                  {selectedAssignment.order.delivery_phone && (
                    <View style={styles.phoneRow}>
                      <Ionicons name="call" size={16} color={colors.primary} />
                      <Text style={styles.phoneText}>{selectedAssignment.order.delivery_phone}</Text>
                    </View>
                  )}
                </View>

                {selectedAssignment.order.customer && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Customer</Text>
                    <Text style={styles.customerText}>
                      {selectedAssignment.order.customer.username}
                    </Text>
                    <Text style={styles.customerEmail}>{selectedAssignment.order.customer.email}</Text>
                  </View>
                )}

                {selectedAssignment.order.items && selectedAssignment.order.items.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    {selectedAssignment.order.items.map((item) => (
                      <View key={item.id} style={styles.itemRow}>
                        <Text style={styles.itemName}>
                          {item.gift?.name || `Item #${item.gift_id}`} x{item.quantity}
                        </Text>
                        <Text style={styles.itemPrice}>${item.subtotal.toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {selectedAssignment.client_feedback && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Client Feedback</Text>
                    <View style={styles.feedbackBox}>
                      <Ionicons name="heart" size={20} color={colors.primary} />
                      <Text style={styles.feedbackBoxText}>{selectedAssignment.client_feedback}</Text>
                    </View>
                  </View>
                )}

                {selectedAssignment.driver_feedback && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Your Feedback</Text>
                    <Text style={styles.driverFeedbackText}>{selectedAssignment.driver_feedback}</Text>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Timeline</Text>
                  <View style={styles.timelineRow}>
                    <Ionicons name="time" size={16} color={colors.textSecondary} />
                    <Text style={styles.timelineText}>
                      Assigned: {format(parseISO(selectedAssignment.assigned_at), 'MMM dd, yyyy HH:mm')}
                    </Text>
                  </View>
                  {selectedAssignment.started_at && (
                    <View style={styles.timelineRow}>
                      <Ionicons name="car" size={16} color={colors.textSecondary} />
                      <Text style={styles.timelineText}>
                        Started: {format(parseISO(selectedAssignment.started_at), 'MMM dd, yyyy HH:mm')}
                      </Text>
                    </View>
                  )}
                  {selectedAssignment.delivered_at && (
                    <View style={styles.timelineRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={styles.timelineText}>
                        Delivered: {format(parseISO(selectedAssignment.delivered_at), 'MMM dd, yyyy HH:mm')}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              {selectedAssignment?.delivery_status === 'assigned' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.startButton]}
                  onPress={() => handleUpdateStatus(selectedAssignment.id, 'in_transit')}
                  disabled={loading}
                >
                  <Ionicons name="play" size={20} color={colors.white} />
                  <Text style={styles.actionButtonText}>Start Delivery</Text>
                </TouchableOpacity>
              )}

              {selectedAssignment?.delivery_status === 'in_transit' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deliveredButton]}
                    onPress={() => handleUpdateStatus(selectedAssignment.id, 'delivered')}
                    disabled={loading}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Mark Delivered</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.failedButton]}
                    onPress={() => handleUpdateStatus(selectedAssignment.id, 'failed')}
                    disabled={loading}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Mark Failed</Text>
                  </TouchableOpacity>
                </>
              )}

              {selectedAssignment?.delivery_status === 'delivered' &&
                !selectedAssignment.client_feedback && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.feedbackButton]}
                    onPress={() => {
                      setShowDetailsModal(false);
                      setShowFeedbackModal(true);
                    }}
                  >
                    <Ionicons name="chatbubble" size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Add Client Feedback</Text>
                  </TouchableOpacity>
                )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Client Feedback</Text>
              <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.feedbackLabel}>
                Enter the client's feedback or thank you message:
              </Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="e.g., Client was very happy and thanked the delivery..."
                value={clientFeedback}
                onChangeText={setClientFeedback}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.submitButton]}
                onPress={handleSubmitClientFeedback}
                disabled={loading || !clientFeedback.trim()}
              >
                <Text style={styles.actionButtonText}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  filtersContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  filtersContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.lightGray,
    marginRight: spacing.sm,
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  activeFilterChipText: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  assignmentCard: {
    backgroundColor: colors.white,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  assignmentHeaderLeft: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.xs,
  },
  orderId: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  amount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  assignmentDetails: {
    marginTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.lavender + '20',
    borderRadius: borderRadius.md,
  },
  feedbackText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: spacing.xs,
    flex: 1,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalBody: {
    padding: spacing.md,
  },
  modalSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  phoneText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  customerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  customerEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  itemName: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  itemPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.lavender + '20',
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  feedbackBoxText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
    fontStyle: 'italic',
  },
  driverFeedbackText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  timelineText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  startButton: {
    backgroundColor: colors.primary,
  },
  deliveredButton: {
    backgroundColor: colors.success || '#10B981',
  },
  failedButton: {
    backgroundColor: colors.error,
  },
  feedbackButton: {
    backgroundColor: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  feedbackLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    minHeight: 100,
  },
});


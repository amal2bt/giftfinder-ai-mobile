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
import { remindersAPI } from '../utils/api';
import { format, parseISO, isValid } from 'date-fns';

interface Reminder {
  id: number;
  person: string;
  remind_date: string;
  pref: 'app' | 'email';
  description?: string;
  reminder_type?: 'ai' | 'event';
  is_recurring?: boolean;
  original_date?: string;
  recurrence_type?: 'yearly' | 'monthly' | 'weekly';
  created_at?: string;
  updated_at?: string;
}

type ReminderTab = 'ai' | 'event' | 'all';

export default function Reminders() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [allReminders, setAllReminders] = useState<Reminder[]>([]);
  const [activeTab, setActiveTab] = useState<ReminderTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editPerson, setEditPerson] = useState('');
  const [editDate, setEditDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPerson, setNewPerson] = useState('');
  const [newDate, setNewDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'yearly' | 'monthly' | 'weekly'>('yearly');

  useEffect(() => {
    loadReminders();
  }, []);

  const handleCreateReminder = async () => {
    if (!newPerson.trim()) {
      Alert.alert('Error', 'Person/Event name is required.');
      return;
    }
    if (!newDate.trim()) {
      Alert.alert('Error', 'Date is required.');
      return;
    }

    setLoading(true);
    try {
      await remindersAPI.create({
        person: newPerson.trim(),
        remind_date: newDate,
        pref: 'app',
        reminder_type: 'event',
        is_recurring: isRecurring,
        recurrence_type: isRecurring ? recurrenceType : null
      });
      await loadReminders();
      setShowCreateModal(false);
      setNewPerson('');
      setNewDate('');
      setIsRecurring(false);
      setRecurrenceType('yearly');
      Alert.alert('Success', 'Event reminder created successfully.');
    } catch (error: any) {
      console.error('Error creating reminder:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to create reminder.');
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async () => {
    try {
      // Load all reminders (no filter, get everything)
      const response = await remindersAPI.getAll();
      const allData = response.data || [];
      setAllReminders(allData);
      
      // Filter based on active tab
      filterRemindersByTab(allData, activeTab);
    } catch (error: any) {
      console.error('Error loading reminders:', error);
      Alert.alert('Error', 'Failed to load reminders. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const filterRemindersByTab = (data: Reminder[], tab: ReminderTab) => {
    if (tab === 'all') {
      setReminders(data);
    } else {
      setReminders(data.filter(r => r.reminder_type === tab));
    }
  };

  useEffect(() => {
    filterRemindersByTab(allReminders, activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReminders();
  };

  const handleDelete = (reminder: Reminder) => {
    Alert.alert(
      'Delete Reminder',
      `Are you sure you want to delete the reminder for "${reminder.person}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await remindersAPI.delete(String(reminder.id));
              setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
              Alert.alert('Success', 'Reminder deleted successfully.');
            } catch (error: any) {
              console.error('Error deleting reminder:', error);
              Alert.alert('Error', error?.response?.data?.message || 'Failed to delete reminder.');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditPerson(reminder.person);
    // Format date for input (YYYY-MM-DD)
    const date = parseISO(reminder.remind_date);
    if (isValid(date)) {
      setEditDate(format(date, 'yyyy-MM-dd'));
    } else {
      setEditDate(reminder.remind_date);
    }
  };

  const handleSaveEdit = async () => {
    if (!editPerson.trim()) {
      Alert.alert('Error', 'Person name is required.');
      return;
    }
    if (!editDate.trim()) {
      Alert.alert('Error', 'Date is required.');
      return;
    }

    if (!editingReminder) return;

    setLoading(true);
    try {
      await remindersAPI.update(String(editingReminder.id), {
        person: editPerson.trim(),
        remind_date: editDate,
        pref: editingReminder.pref,
      });
      await loadReminders();
      setEditingReminder(null);
      setEditPerson('');
      setEditDate('');
      Alert.alert('Success', 'Reminder updated successfully.');
    } catch (error: any) {
      console.error('Error updating reminder:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update reminder.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, 'MMM dd, yyyy');
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const getDaysUntil = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reminderDate = new Date(date);
      reminderDate.setHours(0, 0, 0, 0);
      const diffTime = reminderDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const getDateStatus = (dateString: string) => {
    const daysUntil = getDaysUntil(dateString);
    if (daysUntil === null) return { color: colors.textSecondary, text: '' };
    if (daysUntil < 0) return { color: colors.error, text: 'Past due' };
    if (daysUntil === 0) return { color: colors.warning, text: 'Today!' };
    if (daysUntil <= 7) return { color: colors.warning, text: `${daysUntil} days left` };
    return { color: colors.success, text: `${daysUntil} days away` };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Reminders</Text>
          <Text style={styles.subtitle}>Never miss an important date</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.activeTab]}
          onPress={() => setActiveTab('ai')}
        >
          <Ionicons 
            name="sparkles" 
            size={16} 
            color={activeTab === 'ai' ? colors.primary : colors.textSecondary} 
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'ai' && styles.activeTabText]}>AI Reminders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'event' && styles.activeTab]}
          onPress={() => setActiveTab('event')}
        >
          <Ionicons 
            name="calendar" 
            size={16} 
            color={activeTab === 'event' ? colors.primary : colors.textSecondary} 
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'event' && styles.activeTabText]}>Events</Text>
        </TouchableOpacity>
      </View>

      {/* Reminders List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.content}
      >
        {reminders.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No reminders yet</Text>
            <Text style={styles.emptySubtext}>Create reminders through GiftBot to never miss an important date!</Text>
          </View>
        )}

        {reminders.map((reminder) => {
          const status = getDateStatus(reminder.remind_date);
          return (
            <View key={reminder.id} style={styles.reminderCard}>
              <View style={styles.reminderHeader}>
                <View style={styles.reminderIconContainer}>
                  <Ionicons 
                    name={reminder.reminder_type === 'ai' ? 'sparkles' : 'calendar'} 
                    size={24} 
                    color={colors.primary} 
                  />
                </View>
                <View style={styles.reminderInfo}>
                  <View style={styles.reminderPersonRow}>
                    <Text style={styles.reminderPerson}>{reminder.person}</Text>
                    {reminder.is_recurring && (
                      <View style={styles.recurringBadge}>
                        <Ionicons name="repeat" size={12} color={colors.primary} />
                        <Text style={styles.recurringText}>
                          {reminder.recurrence_type === 'yearly' ? 'Yearly' : 
                           reminder.recurrence_type === 'monthly' ? 'Monthly' : 'Weekly'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.reminderDate}>{formatDate(reminder.remind_date)}</Text>
                  {reminder.reminder_type === 'ai' && (
                    <Text style={styles.reminderTypeLabel}>AI Generated</Text>
                  )}
                </View>
              </View>

              {reminder.description && (
                <View style={styles.reminderDescriptionContainer}>
                  <Text style={styles.reminderDescription}>{reminder.description}</Text>
                </View>
              )}

              <View style={styles.reminderFooter}>
                <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.text || 'Scheduled'}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(reminder)}
                  >
                    <Ionicons name="pencil" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(reminder)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editingReminder !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingReminder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Reminder</Text>
              <TouchableOpacity onPress={() => setEditingReminder(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Person / Event Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter person or event name"
                value={editPerson}
                onChangeText={setEditPerson}
                placeholderTextColor={colors.textLight}
              />

              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={editDate}
                onChangeText={setEditDate}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.inputHint}>Format: YYYY-MM-DD (e.g., 2024-12-25)</Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditingReminder(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, loading && { opacity: 0.7 }]}
                onPress={handleSaveEdit}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Event Reminder Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Event Reminder</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Person / Event Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., John's Birthday"
                value={newPerson}
                onChangeText={setNewPerson}
                placeholderTextColor={colors.textLight}
              />

              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={newDate}
                onChangeText={setNewDate}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.inputHint}>Format: YYYY-MM-DD (e.g., 2024-12-25)</Text>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setIsRecurring(!isRecurring)}
                >
                  <Ionicons
                    name={isRecurring ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={isRecurring ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.checkboxLabel}>Recurring Event (e.g., Birthday)</Text>
                </TouchableOpacity>
              </View>

              {isRecurring && (
                <View style={styles.recurrenceOptions}>
                  <Text style={styles.inputLabel}>Repeat Every</Text>
                  <View style={styles.recurrenceButtons}>
                    {(['yearly', 'monthly', 'weekly'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.recurrenceButton,
                          recurrenceType === type && styles.recurrenceButtonActive
                        ]}
                        onPress={() => setRecurrenceType(type)}
                      >
                        <Text
                          style={[
                            styles.recurrenceButtonText,
                            recurrenceType === type && styles.recurrenceButtonTextActive
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewPerson('');
                  setNewDate('');
                  setIsRecurring(false);
                  setRecurrenceType('yearly');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, loading && { opacity: 0.7 }]}
                onPress={handleCreateReminder}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>{loading ? 'Creating...' : 'Create'}</Text>
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
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: colors.lavender,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },
  activeTab: {
    backgroundColor: colors.lavender,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  tabIcon: {
    marginRight: spacing.xs,
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
  content: {
    padding: spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptySubtext: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  reminderCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reminderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.lavender,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  reminderPerson: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginRight: spacing.xs,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lavender,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  recurringText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
    marginLeft: 2,
  },
  reminderTypeLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  reminderDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reminderDescriptionContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.lavender + '20',
    borderRadius: borderRadius.md,
  },
  reminderDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  reminderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalBody: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.lightGray,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  inputHint: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.lightGray,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  checkboxContainer: {
    marginTop: spacing.md,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  recurrenceOptions: {
    marginTop: spacing.md,
  },
  recurrenceButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  recurrenceButton: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
  },
  recurrenceButtonActive: {
    backgroundColor: colors.primary,
  },
  recurrenceButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  recurrenceButtonTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
});


import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationSchedule {
  id: number;
  title: string;
  body: string;
  scheduledAt: Date;
  actionId: string;
}

class NativeNotificationService {
  private isNative: boolean;
  private notificationCounter: number = 1;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  async initialize(): Promise<boolean> {
    if (!this.isNative) {
      console.log('Running in browser - native notifications not available');
      return false;
    }

    try {
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display === 'granted') {
        console.log('Native notification permissions granted');
        
        // Set up notification listeners
        LocalNotifications.addListener('localNotificationReceived', (notification) => {
          console.log('Native notification received:', notification);
        });

        LocalNotifications.addListener('localNotificationActionPerformed', async (notificationAction) => {
          console.log('Native notification action performed:', notificationAction);
          
          // Mark the scheduled action as completed when user taps notification
          const actionId = notificationAction.notification.extra?.actionId;
          if (actionId) {
            await this.markActionCompleted(actionId);
          }
        });

        return true;
      } else {
        console.log('Native notification permissions denied');
        return false;
      }
    } catch (error) {
      console.error('Error initializing native notifications:', error);
      return false;
    }
  }

  private formatRelativeTime(scheduledAt: Date): string {
    const now = new Date();
    const diffMs = scheduledAt.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
    if (diffHours < 24) return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
    if (diffDays < 7) return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
    
    return scheduledAt.toLocaleDateString();
  }

  private createNotificationContent(action: any): { title: string; body: string } {
    const taskTitle = action.tasks?.title || 'Task';
    const actionType = action.action_type;
    const scheduledTime = new Date(action.scheduled_for);
    const relativeTime = this.formatRelativeTime(scheduledTime);
    const absoluteTime = scheduledTime.toLocaleString();
    
    let title = '';
    let body = '';

    // Create context-aware title
    switch (actionType) {
      case 'call':
        const contactName = action.contact_info?.name || 'contact';
        title = `Call ${contactName} ${relativeTime}`;
        break;
      case 'text':
        const textContact = action.contact_info?.name || 'contact';
        title = `Text ${textContact} ${relativeTime}`;
        break;
      case 'email':
        const emailContact = action.contact_info?.name || 'contact';
        title = `Email ${emailContact} ${relativeTime}`;
        break;
      case 'reminder':
        title = `Reminder: ${taskTitle} ${relativeTime}`;
        break;
      default:
        title = `${taskTitle} ${relativeTime}`;
    }

    // Create detailed body
    let bodyParts = [];
    
    if (action.tasks?.description) {
      bodyParts.push(action.tasks.description);
    }
    
    bodyParts.push(`Scheduled for ${absoluteTime}`);
    
    if (action.contact_info?.name) {
      let contactInfo = `Contact: ${action.contact_info.name}`;
      if (action.contact_info.phone) {
        contactInfo += ` (${action.contact_info.phone})`;
      }
      if (action.contact_info.email) {
        contactInfo += ` - ${action.contact_info.email}`;
      }
      bodyParts.push(contactInfo);
    }
    
    body = bodyParts.join('\n');

    return { title, body };
  }

  async scheduleNotification(schedule: NotificationSchedule): Promise<boolean> {
    if (!this.isNative) {
      console.log('Browser environment - cannot schedule native notifications');
      return false;
    }

    try {
      console.log('📱 Attempting to schedule notification:', {
        id: schedule.id,
        title: schedule.title,
        scheduledAt: schedule.scheduledAt,
        timeUntil: Math.round((schedule.scheduledAt.getTime() - Date.now()) / 1000) + ' seconds'
      });

      const result = await LocalNotifications.schedule({
        notifications: [
          {
            id: schedule.id,
            title: schedule.title,
            body: schedule.body,
            schedule: {
              at: schedule.scheduledAt,
            },
            sound: 'default',
            attachments: [],
            actionTypeId: 'OPEN_APP',
            extra: { actionId: schedule.actionId },
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#488AFF',
          },
        ],
      });

      console.log('✅ Native notification scheduled successfully:', result);
      
      // Verify the notification was scheduled
      const pending = await LocalNotifications.getPending();
      console.log('📋 Pending notifications after scheduling:', pending.notifications.length);
      
      return true;
    } catch (error) {
      console.error('❌ Error scheduling native notification:', error);
      return false;
    }
  }

  async cancelNotification(id: number): Promise<boolean> {
    if (!this.isNative) {
      return false;
    }

    try {
      await LocalNotifications.cancel({
        notifications: [{ id }],
      });
      
      console.log('Native notification cancelled:', id);
      return true;
    } catch (error) {
      console.error('Error cancelling native notification:', error);
      return false;
    }
  }

  private async markActionCompleted(actionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('scheduled_actions')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', actionId);

      if (error) {
        console.error('Error marking action as completed:', error);
      } else {
        console.log('Action marked as completed:', actionId);
      }
    } catch (error) {
      console.error('Error updating action status:', error);
    }
  }

  async scheduleActionsFromDatabase(): Promise<void> {
    try {
      // Get all pending actions that are scheduled for the future
      const { data: pendingActions, error } = await supabase
        .from('scheduled_actions')
        .select(`
          *,
          tasks (
            id,
            title,
            description
          )
        `)
        .eq('status', 'pending')
        .gte('scheduled_for', new Date().toISOString());

      if (error) {
        console.error('Error fetching pending actions:', error);
        return;
      }

      console.log(`Scheduling ${pendingActions?.length || 0} native notifications`);

      for (const action of pendingActions || []) {
        const notificationId = this.notificationCounter++;
        const { title, body } = this.createNotificationContent(action);
        
        await this.scheduleNotification({
          id: notificationId,
          title,
          body,
          scheduledAt: new Date(action.scheduled_for),
          actionId: action.id,
        });
      }
    } catch (error) {
      console.error('Error scheduling actions from database:', error);
    }
  }

  getNextNotificationId(): number {
    return this.notificationCounter++;
  }

  isNativePlatform(): boolean {
    return this.isNative;
  }
}

export const nativeNotificationService = new NativeNotificationService();

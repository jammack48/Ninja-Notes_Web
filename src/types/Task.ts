
export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  completed: boolean;
  createdAt: string;
  actionType?: 'reminder' | 'call' | 'text' | 'email' | 'note';
  scheduledFor?: string;
  contactInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  reminderSettings?: {
    web_push?: boolean;
    email?: boolean;
    sms?: boolean;
  };
}

export interface ScheduledAction {
  id: string;
  task_id: string;
  action_type: 'reminder' | 'call' | 'text' | 'email' | 'note';
  scheduled_for: string;
  contact_info?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  notification_settings: {
    web_push: boolean;
    email: boolean;
    sms: boolean;
  };
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  tasks?: {
    id: string;
    title: string;
    description?: string;
  };
}

import React, { useEffect, useState } from 'react';
import { Bell, Clock, Phone, Mail, MessageSquare, Calendar, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ScheduledAction } from '@/types/Task';
import { nativeNotificationService } from '@/services/NativeNotificationService';

export const ActionManager: React.FC = () => {
  const [scheduledActions, setScheduledActions] = useState<ScheduledAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  const { toast } = useToast();

  const fetchScheduledActions = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_actions')
        .select(`
          *,
          tasks (
            id,
            title,
            description
          )
        `)
        .in('status', ['pending', 'completed'])
        .order('scheduled_for', { ascending: true });

      if (error) throw error;

      console.log('Fetched scheduled actions:', data);
      
      // Properly cast the database response to our ScheduledAction interface
      const typedActions: ScheduledAction[] = (data || []).map((action: any) => ({
        id: action.id,
        task_id: action.task_id,
        action_type: action.action_type as 'reminder' | 'call' | 'text' | 'email' | 'note',
        scheduled_for: action.scheduled_for,
        contact_info: action.contact_info ? action.contact_info as { name?: string; phone?: string; email?: string } : undefined,
        notification_settings: {
          web_push: action.notification_settings?.web_push ?? true,
          email: action.notification_settings?.email ?? false,
          sms: action.notification_settings?.sms ?? false
        },
        status: action.status as 'pending' | 'completed' | 'failed',
        created_at: action.created_at,
        updated_at: action.updated_at,
        tasks: action.tasks
      }));
      
      setScheduledActions(typedActions);
    } catch (error) {
      console.error('Error fetching scheduled actions:', error);
      toast({
        title: "Error",
        description: "Failed to load scheduled actions.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const initializeNotifications = async () => {
      const success = await nativeNotificationService.initialize();
      setNotificationsInitialized(success);
      
      if (success) {
        // Schedule all pending notifications
        await nativeNotificationService.scheduleActionsFromDatabase();
      } else if (nativeNotificationService.isNativePlatform()) {
        toast({
          title: "Notification Permission Needed",
          description: "Please enable notifications in your device settings.",
          variant: "destructive"
        });
      }
    };

    fetchScheduledActions();
    initializeNotifications();
    setLoading(false);

    // Set up real-time subscription
    const channel = supabase
      .channel('scheduled_actions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_actions'
        },
        () => {
          console.log('Scheduled actions updated');
          fetchScheduledActions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'reminder': return <Bell className="w-4 h-4" />;
      case 'call': return <Phone className="w-4 h-4" />;
      case 'text': return <MessageSquare className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'reminder': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'call': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'text': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'email': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const formatScheduledTime = (scheduledFor: string) => {
    const date = new Date(scheduledFor);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) return 'Overdue';
    if (diffMinutes < 60) return `In ${diffMinutes} minutes`;
    if (diffHours < 24) return `In ${diffHours} hours`;
    if (diffDays < 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString();
  };

  const handleDeleteAction = async (action: ScheduledAction) => {
    try {
      const { error } = await supabase
        .from('scheduled_actions')
        .delete()
        .eq('id', action.id);

      if (error) throw error;

      toast({
        title: "Action Deleted",
        description: "The scheduled action has been removed."
      });

    } catch (error) {
      console.error('Error deleting action:', error);
      toast({
        title: "Error",
        description: "Failed to delete action.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (action: ScheduledAction) => {
    const now = new Date();
    const scheduledTime = new Date(action.scheduled_for);
    
    if (action.status === 'completed') {
      return <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">Completed</Badge>;
    }
    
    if (scheduledTime < now && action.status === 'pending') {
      return <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30">Overdue</Badge>;
    }
    
    return <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">Scheduled</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const pendingActions = scheduledActions.filter(action => action.status === 'pending');
  const completedActions = scheduledActions.filter(action => action.status === 'completed');

  return (
    <div className="space-y-4 max-h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Scheduled Actions</h2>
          <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
            {scheduledActions.length}
          </Badge>
        </div>
        
        {nativeNotificationService.isNativePlatform() && (
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-cyan-300">
              {notificationsInitialized ? 'Native notifications active' : 'Notifications disabled'}
            </span>
          </div>
        )}
      </div>

      {!nativeNotificationService.isNativePlatform() && (
        <Card className="bg-amber-500/10 backdrop-blur-xl border border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-300">
              <Bell className="w-4 h-4" />
              <span className="text-sm">Running in browser - notifications will appear as tasks when due</span>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingActions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-md font-medium text-white">Pending Actions</h3>
          {pendingActions.map((action: any) => (
            <Card key={action.id} className="bg-slate-800/40 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getActionIcon(action.action_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">
                        {action.tasks?.title || 'Untitled Action'}
                      </h3>
                      {action.tasks?.description && (
                        <p className="text-sm text-slate-300 mt-1 line-clamp-2">
                          {action.tasks.description}
                        </p>
                      )}
                      {action.contact_info?.name && (
                        <p className="text-xs text-slate-400 mt-1">
                          Contact: {action.contact_info.name}
                          {action.contact_info.phone && ` (${action.contact_info.phone})`}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={getActionColor(action.action_type)}>
                          {action.action_type}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {formatScheduledTime(action.scheduled_for)}
                        </span>
                        {getStatusBadge(action)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAction(action)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {completedActions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-md font-medium text-white">Completed Actions</h3>
          {completedActions.slice(0, 5).map((action: any) => (
            <Card key={action.id} className="bg-slate-800/20 backdrop-blur-xl border border-slate-500/20 opacity-75">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="text-green-400">
                    {getActionIcon(action.action_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-300 truncate text-sm">
                      {action.tasks?.title || 'Untitled Action'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                        {action.action_type}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Completed
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {scheduledActions.length === 0 && (
        <Card className="bg-slate-800/40 backdrop-blur-xl border border-slate-500/20">
          <CardContent className="p-6 text-center">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-300">No scheduled actions</p>
            <p className="text-slate-500 text-sm mt-1">Actions will appear here when you schedule reminders</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

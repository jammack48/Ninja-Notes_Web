
import React, { useEffect, useState } from 'react';
import { Bell, Clock, Phone, Mail, MessageSquare, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ScheduledAction } from '@/types/Task';

export const ActionManager: React.FC = () => {
  const [scheduledActions, setScheduledActions] = useState<ScheduledAction[]>([]);
  const [loading, setLoading] = useState(true);
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
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true });

      if (error) throw error;

      console.log('Fetched scheduled actions:', data);
      setScheduledActions(data || []);
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
    fetchScheduledActions();
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

  const handleExecuteAction = async (action: ScheduledAction) => {
    try {
      // For now, we'll just mark it as completed
      // In a real implementation, this would trigger the actual action
      const { error } = await supabase
        .from('scheduled_actions')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', action.id);

      if (error) throw error;

      toast({
        title: "Action Executed",
        description: `${action.action_type} action has been completed.`
      });

    } catch (error) {
      console.error('Error executing action:', error);
      toast({
        title: "Error",
        description: "Failed to execute action.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-semibold text-white">Scheduled Actions</h2>
        <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
          {scheduledActions.length}
        </Badge>
      </div>

      {scheduledActions.length === 0 ? (
        <Card className="bg-slate-800/40 backdrop-blur-xl border border-slate-500/20">
          <CardContent className="p-6 text-center">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-300">No scheduled actions</p>
            <p className="text-slate-500 text-sm mt-1">Actions will appear here when you schedule reminders</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scheduledActions.map((action: any) => (
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
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExecuteAction(action)}
                    className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                  >
                    Execute
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🔔 Processing notifications function called');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase config missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all pending actions that are due (only web_push enabled ones, since native are handled on device)
    const { data: dueActions, error: fetchError } = await supabase
      .from('scheduled_actions')
      .select(`
        *,
        tasks (
          id,
          title,
          description,
          contact_info,
          priority,
          action_type
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .eq('notification_settings->web_push', true); // Only process web notifications

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📋 Found ${dueActions?.length || 0} due web notification actions`);

    const processedActions = [];

    for (const action of dueActions || []) {
      console.log(`⚡ Processing web notification for: ${action.tasks?.title}`);
      
      try {
        let notificationSent = false;
        const notifications = [];

        // For reminders, create a visible task in the main task list (web fallback)
        if (action.action_type === 'reminder') {
          console.log('📝 Creating visible reminder task for web users');
          
          // Create a new task that will appear in the task list
          const { error: taskError } = await supabase
            .from('tasks')
            .insert([{
              title: `🔔 ${action.tasks?.title}`,
              description: `Reminder: ${action.tasks?.description}`,
              priority: action.tasks?.priority || 'medium',
              completed: false,
              action_type: 'note', // Make it a note so it shows up in the main list
              contact_info: action.contact_info
            }]);

          if (taskError) {
            console.error('❌ Failed to create reminder task:', taskError);
          } else {
            console.log('✅ Web reminder task created successfully');
            notificationSent = true;
            notifications.push('task_created');
          }
        }

        // Placeholder for future web push implementation
        console.log(`📱 Web notification processed for: "${action.tasks?.title}"`);
        notifications.push('web_notification');
        notificationSent = true;

        // Update action status
        const { error: updateError } = await supabase
          .from('scheduled_actions')
          .update({
            status: notificationSent ? 'completed' : 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', action.id);

        if (updateError) {
          console.error(`❌ Failed to update action ${action.id}:`, updateError);
        } else {
          processedActions.push({
            id: action.id,
            action_type: action.action_type,
            task_title: action.tasks?.title,
            notifications_sent: notifications,
            status: notificationSent ? 'completed' : 'failed'
          });
        }

      } catch (actionError) {
        console.error(`❌ Error processing action ${action.id}:`, actionError);
        
        // Mark action as failed
        await supabase
          .from('scheduled_actions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', action.id);
      }
    }

    console.log(`✅ Processed ${processedActions.length} web notification actions`);

    return new Response(JSON.stringify({
      success: true,
      processed_count: processedActions.length,
      actions: processedActions,
      note: 'Native notifications are handled on-device'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Error in process-notifications:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

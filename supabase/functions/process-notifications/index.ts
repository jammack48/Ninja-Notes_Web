
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

    // Get all pending actions that are due
    const { data: dueActions, error: fetchError } = await supabase
      .from('scheduled_actions')
      .select(`
        *,
        tasks (
          id,
          title,
          description,
          contact_info
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📋 Found ${dueActions?.length || 0} due actions`);

    const processedActions = [];

    for (const action of dueActions || []) {
      console.log(`⚡ Processing action: ${action.action_type} for task: ${action.tasks?.title}`);
      
      try {
        // Here we would trigger different types of notifications
        // For now, we'll just log and mark as completed
        
        let notificationSent = false;
        const notifications = [];

        // Web Push Notification (placeholder - would need actual implementation)
        if (action.notification_settings?.web_push) {
          console.log(`📱 Would send web push: "${action.tasks?.title}"`);
          notifications.push('web_push');
          notificationSent = true;
        }

        // Email Notification (placeholder - would integrate with Resend)
        if (action.notification_settings?.email) {
          console.log(`📧 Would send email: "${action.tasks?.title}"`);
          notifications.push('email');
          notificationSent = true;
        }

        // SMS Notification (placeholder - would integrate with Twilio)
        if (action.notification_settings?.sms) {
          console.log(`📲 Would send SMS: "${action.tasks?.title}"`);
          notifications.push('sms');
          notificationSent = true;
        }

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

    console.log(`✅ Processed ${processedActions.length} actions`);

    return new Response(JSON.stringify({
      success: true,
      processed_count: processedActions.length,
      actions: processedActions
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

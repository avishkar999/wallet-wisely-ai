CREATE POLICY "Users can delete their own budget alert settings"
ON public.budget_alert_settings FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences"
ON public.notification_preferences FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolio alert settings"
ON public.portfolio_alert_settings FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
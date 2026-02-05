-- Create portfolio alert settings table
CREATE TABLE public.portfolio_alert_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  drift_threshold NUMERIC DEFAULT 5,
  alerts_enabled BOOLEAN DEFAULT true,
  alert_email TEXT,
  last_alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.portfolio_alert_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own alert settings" 
ON public.portfolio_alert_settings 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert settings" 
ON public.portfolio_alert_settings 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert settings" 
ON public.portfolio_alert_settings 
FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_portfolio_alert_settings_updated_at
BEFORE UPDATE ON public.portfolio_alert_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
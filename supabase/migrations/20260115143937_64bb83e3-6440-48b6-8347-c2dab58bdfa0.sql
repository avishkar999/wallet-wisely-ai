-- Create a table for custom savings goals
CREATE TABLE public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  target_date DATE,
  category TEXT,
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a table for budget alert settings
CREATE TABLE public.budget_alert_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_alerts_enabled BOOLEAN DEFAULT true,
  alert_threshold NUMERIC DEFAULT 80, -- percentage threshold (e.g., 80%)
  alert_email TEXT,
  last_alert_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alert_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for savings_goals
CREATE POLICY "Users can view their own savings goals" 
ON public.savings_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own savings goals" 
ON public.savings_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals" 
ON public.savings_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings goals" 
ON public.savings_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for budget_alert_settings
CREATE POLICY "Users can view their own alert settings" 
ON public.budget_alert_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alert settings" 
ON public.budget_alert_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert settings" 
ON public.budget_alert_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_savings_goals_updated_at
BEFORE UPDATE ON public.savings_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_alert_settings_updated_at
BEFORE UPDATE ON public.budget_alert_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
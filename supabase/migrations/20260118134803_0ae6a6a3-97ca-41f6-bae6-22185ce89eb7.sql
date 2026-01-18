-- Create subscription_decisions table to track user decisions on detected subscriptions
CREATE TABLE public.subscription_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'keep', 'to_review', 'cancelled')),
  monthly_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, subscription_name)
);

-- Enable RLS
ALTER TABLE public.subscription_decisions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own subscription decisions"
ON public.subscription_decisions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscription decisions"
ON public.subscription_decisions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription decisions"
ON public.subscription_decisions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription decisions"
ON public.subscription_decisions
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_subscription_decisions_updated_at
BEFORE UPDATE ON public.subscription_decisions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
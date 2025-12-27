-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create transaction categories enum
CREATE TYPE public.transaction_category AS ENUM (
  'food', 'shopping', 'transport', 'entertainment', 'bills', 'health', 'recharges', 'education', 'travel', 'income', 'other'
);

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM (
  'upi', 'debit_card', 'credit_card', 'cash', 'neft', 'auto_pay', 'other'
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category public.transaction_category NOT NULL DEFAULT 'other',
  payment_method public.payment_method NOT NULL DEFAULT 'upi',
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create investment type enum
CREATE TYPE public.investment_type AS ENUM (
  'mutual_fund', 'stock', 'fixed_deposit', 'recurring_deposit', 'crypto', 'gold', 'bonds', 'other'
);

-- Create investments table
CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.investment_type NOT NULL,
  invested_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  current_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  units DECIMAL(12,4),
  nav DECIMAL(12,4),
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on investments
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Investments policies
CREATE POLICY "Users can view their own investments" ON public.investments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own investments" ON public.investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own investments" ON public.investments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own investments" ON public.investments
  FOR DELETE USING (auth.uid() = user_id);

-- Create debt type enum
CREATE TYPE public.debt_type AS ENUM (
  'credit_card', 'personal_loan', 'home_loan', 'car_loan', 'education_loan', 'emi', 'other'
);

-- Create debts table
CREATE TABLE public.debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.debt_type NOT NULL,
  principal_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  minimum_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date INTEGER CHECK (due_date >= 1 AND due_date <= 31),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on debts
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- Debts policies
CREATE POLICY "Users can view their own debts" ON public.debts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own debts" ON public.debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own debts" ON public.debts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own debts" ON public.debts
  FOR DELETE USING (auth.uid() = user_id);

-- Create calendar events table
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('emi_due', 'bill_reminder', 'sip_date', 'custom')),
  event_date DATE NOT NULL,
  amount DECIMAL(12,2),
  related_id UUID,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Calendar events policies
CREATE POLICY "Users can view their own events" ON public.calendar_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own events" ON public.calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own events" ON public.calendar_events
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own events" ON public.calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_debts_updated_at
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
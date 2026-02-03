-- Create rental type enum
CREATE TYPE public.rental_type AS ENUM ('shop', 'home', 'other');

-- Create rental status enum
CREATE TYPE public.rental_status AS ENUM ('active', 'vacant', 'pending', 'terminated');

-- Create rentals table for property management
CREATE TABLE public.rentals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type public.rental_type NOT NULL,
    address TEXT,
    monthly_rent NUMERIC NOT NULL DEFAULT 0,
    security_deposit NUMERIC DEFAULT 0,
    tenant_name TEXT,
    tenant_phone TEXT,
    tenant_email TEXT,
    lease_start_date DATE,
    lease_end_date DATE,
    rent_due_day INTEGER DEFAULT 1,
    status public.rental_status NOT NULL DEFAULT 'vacant',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rental payments table to track income
CREATE TABLE public.rental_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_month DATE NOT NULL,
    is_partial BOOLEAN DEFAULT false,
    late_fee NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rental expenses table (maintenance, repairs, etc.)
CREATE TABLE public.rental_expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rentals
CREATE POLICY "Users can view their own rentals" ON public.rentals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own rentals" ON public.rentals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rentals" ON public.rentals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rentals" ON public.rentals FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for rental_payments
CREATE POLICY "Users can view their own rental payments" ON public.rental_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own rental payments" ON public.rental_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rental payments" ON public.rental_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rental payments" ON public.rental_payments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for rental_expenses
CREATE POLICY "Users can view their own rental expenses" ON public.rental_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own rental expenses" ON public.rental_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rental expenses" ON public.rental_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rental expenses" ON public.rental_expenses FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_rentals_updated_at
    BEFORE UPDATE ON public.rentals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add risk_level column to investments for risk indicators
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'medium';

-- Add reminder fields to debts for payment reminders
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 3;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS next_payment_date DATE;
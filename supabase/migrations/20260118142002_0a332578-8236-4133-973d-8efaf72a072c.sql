-- Add columns for review reminder tracking
ALTER TABLE public.subscription_decisions 
ADD COLUMN marked_for_review_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reminder_days INTEGER DEFAULT 7,
ADD COLUMN reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Update trigger to set marked_for_review_at when status changes to 'to_review'
CREATE OR REPLACE FUNCTION public.set_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'to_review' AND (OLD.status IS NULL OR OLD.status != 'to_review') THEN
    NEW.marked_for_review_at = now();
    NEW.reminder_sent_at = NULL;
  ELSIF NEW.status != 'to_review' THEN
    NEW.marked_for_review_at = NULL;
    NEW.reminder_sent_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_review_timestamp_trigger
BEFORE INSERT OR UPDATE ON public.subscription_decisions
FOR EACH ROW
EXECUTE FUNCTION public.set_review_timestamp();
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'employee', 'payer');

-- Create enum for client status
CREATE TYPE public.client_status AS ENUM (
  'initial_payment_pending',
  'initial_payment_confirmed',
  'in_progress',
  'ics_payment_pending',
  'ics_payment_confirmed',
  'pdf_downloaded',
  'pdf_printed'
);

-- Create enum for application type
CREATE TYPE public.application_type AS ENUM (
  'new_passport',
  'renewal',
  'replacement',
  'other'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  application_type application_type NOT NULL DEFAULT 'new_passport',
  status client_status NOT NULL DEFAULT 'initial_payment_pending',
  
  -- File references
  gov_id_url TEXT,
  birth_certificate_url TEXT,
  initial_payment_receipt_url TEXT,
  ics_payment_receipt_url TEXT,
  
  -- Assignment
  assigned_employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_payer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- EP and Application numbers (filled by employee)
  ep_number TEXT,
  application_number TEXT,
  employee_screenshot_url TEXT,
  
  -- Timestamps for workflow stages
  initial_payment_confirmed_at TIMESTAMPTZ,
  assigned_to_employee_at TIMESTAMPTZ,
  ics_payment_pending_at TIMESTAMPTZ,
  ics_payment_confirmed_at TIMESTAMPTZ,
  pdf_downloaded_at TIMESTAMPTZ,
  pdf_printed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  visible_to_roles app_role[] NOT NULL DEFAULT ARRAY['admin']::app_role[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for clients
CREATE POLICY "Admins can view all clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view assigned clients until ICS confirmed"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'employee') 
    AND assigned_employee_id = auth.uid()
    AND status NOT IN ('ics_payment_confirmed', 'pdf_downloaded', 'pdf_printed')
  );

CREATE POLICY "Payers can view assigned clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'payer') 
    AND assigned_payer_id = auth.uid()
  );

CREATE POLICY "Admins can insert clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can update assigned clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'employee')
    AND assigned_employee_id = auth.uid()
    AND status NOT IN ('ics_payment_confirmed', 'pdf_downloaded', 'pdf_printed')
  );

CREATE POLICY "Payers can update payment receipts"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'payer')
    AND assigned_payer_id = auth.uid()
  );

-- RLS Policies for audit_logs
CREATE POLICY "Users can view logs visible to their role"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = ANY(visible_to_roles)
  );

CREATE POLICY "All authenticated users can insert logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('client-documents', 'client-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
  ('payment-receipts', 'payment-receipts', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf']);

-- Storage policies for client documents
CREATE POLICY "Admins can upload client documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Employees can upload screenshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND public.has_role(auth.uid(), 'employee')
  );

CREATE POLICY "Authenticated users can view documents based on client access"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'client-documents');

-- Storage policies for payment receipts
CREATE POLICY "Admins and payers can upload payment receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'payer')
    )
  );

CREATE POLICY "Authenticated users can view receipts based on role"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-receipts');

-- Function to log client changes
CREATE OR REPLACE FUNCTION public.log_client_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_text TEXT;
  details_json JSONB;
  visible_roles app_role[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_text := 'Client created';
    details_json := to_jsonb(NEW);
    visible_roles := ARRAY['admin']::app_role[];
  ELSIF TG_OP = 'UPDATE' THEN
    action_text := 'Client updated';
    details_json := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
    
    -- Make logs visible based on what changed
    IF NEW.status != OLD.status THEN
      visible_roles := ARRAY['admin', 'employee', 'payer']::app_role[];
    ELSE
      visible_roles := ARRAY['admin']::app_role[];
    END IF;
  END IF;

  INSERT INTO public.audit_logs (user_id, client_id, action, details, visible_to_roles)
  VALUES (auth.uid(), NEW.id, action_text, details_json, visible_roles);

  RETURN NEW;
END;
$$;

-- Trigger to log client changes
CREATE TRIGGER log_client_changes
  AFTER INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.log_client_change();
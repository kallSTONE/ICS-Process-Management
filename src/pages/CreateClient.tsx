import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Upload } from 'lucide-react';

export default function CreateClient() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    phone: '',
    email: '',
    address: '',
    application_type: 'new_passport',
  });
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [birthCertFile, setBirthCertFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!govIdFile || !birthCertFile) {
      toast.error('Please upload both Government ID and Birth Certificate');
      return;
    }

    setLoading(true);

    try {
      // Upload files
      const govIdPath = `${user?.id}/${Date.now()}_gov_id_${govIdFile.name}`;
      const birthCertPath = `${user?.id}/${Date.now()}_birth_cert_${birthCertFile.name}`;

      const { error: govIdError } = await supabase.storage
        .from('client-documents')
        .upload(govIdPath, govIdFile);

      if (govIdError) throw govIdError;

      const { error: birthCertError } = await supabase.storage
        .from('client-documents')
        .upload(birthCertPath, birthCertFile);

      if (birthCertError) throw birthCertError;

      // Create client record
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...formData,
          gov_id_url: govIdPath,
          birth_certificate_url: birthCertPath,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast.success('Client created successfully');
      navigate(`/clients/${data.id}`);
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast.error(error.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Client</h1>
          <p className="text-muted-foreground mt-1">
            Add a new passport application
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>Enter the client's personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  required
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="application_type">Application Type *</Label>
                <Select
                  value={formData.application_type}
                  onValueChange={(value) => setFormData({ ...formData, application_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_passport">New Passport</SelectItem>
                    <SelectItem value="renewal">Renewal</SelectItem>
                    <SelectItem value="replacement">Replacement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold">Required Documents</h3>
              
              <div className="space-y-2">
                <Label htmlFor="gov_id">Government ID *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="gov_id"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setGovIdFile(e.target.files?.[0] || null)}
                    required
                  />
                  {govIdFile && <span className="text-sm text-success">✓</span>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_cert">Birth Certificate *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="birth_cert"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setBirthCertFile(e.target.files?.[0] || null)}
                    required
                  />
                  {birthCertFile && <span className="text-sm text-success">✓</span>}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Client'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/clients')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

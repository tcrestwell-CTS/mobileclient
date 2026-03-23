import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateClient } from "@/hooks/useClients";
import { ArrowLeft, Loader2 } from "lucide-react";

interface QuickAddClientFormProps {
  onClientCreated: (clientId: string) => void;
  onCancel: () => void;
}

export function QuickAddClientForm({ onClientCreated, onCancel }: QuickAddClientFormProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  const createClient = useCreateClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const name = `${formData.first_name} ${formData.last_name}`.trim();
    if (!name) return;

    const result = await createClient.mutateAsync({
      name,
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      email: formData.email || null,
      phone: formData.phone || null,
      status: "lead",
    });

    if (result?.id) {
      onClientCreated(result.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 px-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-medium">Quick Add Client</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quick_first_name">First Name *</Label>
            <Input
              id="quick_first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="John"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick_last_name">Last Name *</Label>
            <Input
              id="quick_last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Doe"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quick_email">Email</Label>
          <Input
            id="quick_email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quick_phone">Phone</Label>
          <Input
            id="quick_phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createClient.isPending || !formData.first_name || !formData.last_name}
          >
            {createClient.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create & Select"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

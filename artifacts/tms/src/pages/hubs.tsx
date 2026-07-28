import { useState } from "react";
import { useListHubs, getListHubsQueryKey, useCreateHub, useUpdateHub, useToggleHubActive } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

interface HubFormData { hubName: string; hubCode: string; address: string; contactNumber: string; }

function HubForm({ hub, onClose }: { hub?: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createHub = useCreateHub();
  const updateHub = useUpdateHub();
  const { register, handleSubmit, formState: { errors } } = useForm<HubFormData>({
    defaultValues: hub ? { hubName: hub.hubName, hubCode: hub.hubCode, address: hub.address, contactNumber: hub.contactNumber } : {},
  });

  const onSubmit = (data: HubFormData) => {
    const action = hub
      ? updateHub.mutateAsync({ hubId: hub.id, data })
      : createHub.mutateAsync({ data });
    action.then(() => {
      queryClient.invalidateQueries({ queryKey: getListHubsQueryKey() });
      toast({ title: hub ? "Hub updated" : "Hub created" });
      onClose();
    }).catch(() => toast({ title: "Error", variant: "destructive" }));
  };

  const isPending = createHub.isPending || updateHub.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label>Hub Name</Label>
        <Input {...register("hubName", { required: true })} data-testid="input-hub-name" />
      </div>
      <div className="space-y-1">
        <Label>Hub Code</Label>
        <Input {...register("hubCode", { required: true })} maxLength={5} className="uppercase" data-testid="input-hub-code" />
      </div>
      <div className="space-y-1">
        <Label>Address</Label>
        <Input {...register("address", { required: true })} data-testid="input-hub-address" />
      </div>
      <div className="space-y-1">
        <Label>Contact Number</Label>
        <Input {...register("contactNumber", { required: true })} data-testid="input-hub-contact" />
      </div>
      <Button type="submit" className="w-full" disabled={isPending} data-testid="button-save-hub">
        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        {hub ? "Update Hub" : "Create Hub"}
      </Button>
    </form>
  );
}

export default function Hubs() {
  const { data: hubs = [], isLoading } = useListHubs({ query: { queryKey: getListHubsQueryKey() } });
  const toggleHub = useToggleHubActive();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editHub, setEditHub] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const handleToggle = (hub: any) => {
    toggleHub.mutate({ hubId: hub.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHubsQueryKey() });
        toast({ title: `Hub ${hub.isActive ? "deactivated" : "activated"}` });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hubs</h2>
          <p className="text-muted-foreground text-sm">{hubs.length} regional hubs</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-hub"><Plus className="w-4 h-4 mr-2" /> Add Hub</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Hub</DialogTitle></DialogHeader>
            <HubForm onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hubs.map(hub => (
            <Card key={hub.id} data-testid={`card-hub-${hub.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{hub.hubName}</p>
                    <p className="text-xs font-mono text-muted-foreground">{hub.hubCode}</p>
                  </div>
                  <Badge variant={hub.isActive ? "default" : "secondary"}>
                    {hub.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{hub.address}</p>
                <p className="text-sm">{hub.contactNumber}</p>
                <div className="flex gap-2">
                  <Dialog open={editHub?.id === hub.id} onOpenChange={open => !open && setEditHub(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setEditHub(hub)}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Edit Hub</DialogTitle></DialogHeader>
                      {editHub && <HubForm hub={editHub} onClose={() => setEditHub(null)} />}
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(hub)}
                    data-testid={`button-toggle-hub-${hub.id}`}
                  >
                    {hub.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

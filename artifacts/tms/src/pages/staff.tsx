import { useState } from "react";
import { useListStaff, getListStaffQueryKey, useCreateStaff, useToggleStaffActive, useListHubs } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

function StaffForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createStaff = useCreateStaff();
  const { data: hubs = [] } = useListHubs();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { name: "", phone: "", email: "", password: "", role: "HUB_STAFF" },
  });

  const onSubmit = (data: any) => {
    createStaff.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
        toast({ title: "Staff created" });
        onClose();
      },
      onError: () => toast({ title: "Error creating staff", variant: "destructive" }),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label>Full Name</Label>
          <Input {...register("name", { required: true })} data-testid="input-staff-name" />
        </div>
        <div className="space-y-1">
          <Label>Phone</Label>
          <Input {...register("phone", { required: true })} data-testid="input-staff-phone" />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" {...register("email", { required: true })} data-testid="input-staff-email" />
        </div>
        <div className="space-y-1">
          <Label>Password</Label>
          <Input type="password" {...register("password", { required: true })} data-testid="input-staff-password" />
        </div>
        <div className="space-y-1">
          <Label>Role</Label>
          <Select defaultValue="HUB_STAFF" onValueChange={v => setValue("role", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="HUB_STAFF">Hub Staff</SelectItem>
              <SelectItem value="HUB_MANAGER">Hub Manager</SelectItem>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={createStaff.isPending} data-testid="button-save-staff">
        {createStaff.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Create Staff
      </Button>
    </form>
  );
}

export default function Staff() {
  const { data: staff = [], isLoading } = useListStaff(undefined, { query: { queryKey: getListStaffQueryKey() } });
  const toggleStaff = useToggleStaffActive();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [filterRole, setFilterRole] = useState("ALL");

  const filtered = filterRole === "ALL" ? staff : staff.filter(s => s.role === filterRole);

  const handleToggle = (s: any) => {
    toggleStaff.mutate({ staffId: s.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
        toast({ title: `Staff ${s.isActive ? "deactivated" : "activated"}` });
      },
    });
  };

  const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: "bg-red-100 text-red-800",
    HUB_MANAGER: "bg-blue-100 text-blue-800",
    HUB_STAFF: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff</h2>
          <p className="text-muted-foreground text-sm">{staff.length} total members</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-staff"><Plus className="w-4 h-4 mr-2" /> Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Staff Member</DialogTitle></DialogHeader>
            <StaffForm onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="HUB_MANAGER">Hub Manager</SelectItem>
            <SelectItem value="HUB_STAFF">Hub Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Contact</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(s => (
                <tr key={s.id} data-testid={`row-staff-${s.id}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground md:hidden">{s.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p>{s.phone}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[s.role] ?? "bg-gray-100"}`}>
                      {s.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.isActive ? "default" : "secondary"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => handleToggle(s)} data-testid={`button-toggle-staff-${s.id}`}>
                      {s.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

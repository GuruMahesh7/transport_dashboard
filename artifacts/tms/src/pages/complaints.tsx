import { useState } from "react";
import { useLocation } from "wouter";
import { useListComplaints, getListComplaintsQueryKey, useUpdateComplaint, useCreateComplaint, useListStaff } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

const STATUS_COLORS: Record<string, string> = {
  RAISED: "bg-red-100 text-red-800",
  INVESTIGATING: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-teal-100 text-teal-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

function ComplaintDetail({ complaint, onClose }: { complaint: any; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateComplaint = useUpdateComplaint();
  const { data: staffList = [] } = useListStaff(undefined, { query: { queryKey: ["staff"] } });
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: { status: complaint.status, assignedTo: complaint.assignedTo, resolutionNotes: complaint.resolutionNotes || "" },
  });

  const onSubmit = (data: any) => {
    updateComplaint.mutate({ complaintId: complaint.id, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListComplaintsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        toast({ title: "Complaint updated" });
        onClose();
      },
    });
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-muted-foreground">Number:</span> <span className="font-mono">{complaint.complaintNumber}</span></div>
        <div><span className="text-muted-foreground">AWB:</span> <span className="font-mono">{complaint.awbNumber}</span></div>
        <div><span className="text-muted-foreground">Type:</span> {complaint.complaintType.replace(/_/g, " ")}</div>
        <div><span className="text-muted-foreground">Raised by:</span> {complaint.raisedByName}</div>
      </div>
      <div><span className="text-muted-foreground">Description:</span><p className="mt-1">{complaint.description}</p></div>

      {user?.role === "SUPER_ADMIN" && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 border-t pt-3">
          <h4 className="font-medium">Update Complaint</h4>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select defaultValue={complaint.status} onValueChange={v => setValue("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RAISED">Raised</SelectItem>
                <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Assign To</Label>
            <Select defaultValue={complaint.assignedTo ? String(complaint.assignedTo) : "NONE"} onValueChange={v => setValue("assignedTo", v === "NONE" ? null : parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Unassigned</SelectItem>
                {staffList.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Resolution Notes</Label>
            <Textarea {...register("resolutionNotes")} rows={3} />
          </div>
          <Button type="submit" disabled={updateComplaint.isPending}>
            {updateComplaint.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Update
          </Button>
        </form>
      )}
    </div>
  );
}

function NewComplaintForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createComplaint = useCreateComplaint();
  const [isFetchingAwb, setIsFetchingAwb] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { awbNumber: "", complaintType: "DAMAGED_PARCEL", description: "" },
  });

  const onSubmit = async (data: any) => {
    try {
      setIsFetchingAwb(true);
      const token = localStorage.getItem("tms_token");
      const res = await fetch(`/api/parcels/awb/${data.awbNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Invalid AWB Number");
      const parcel = await res.json();

      createComplaint.mutate({ 
        data: { 
          parcelId: parcel.id,
          complaintType: data.complaintType,
          description: data.description 
        } 
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListComplaintsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
          toast({ title: "Complaint raised" });
          onClose();
        },
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsFetchingAwb(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label>AWB Number</Label>
        <Input type="text" {...register("awbNumber", { required: true })} placeholder="Enter AWB Number" />
      </div>
      <div className="space-y-1">
        <Label>Complaint Type</Label>
        <Select defaultValue="DAMAGED_PARCEL" onValueChange={v => setValue("complaintType", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="MISSING_PARCEL">Missing Parcel</SelectItem>
            <SelectItem value="MISSING_BOX">Missing Box</SelectItem>
            <SelectItem value="DAMAGED_PARCEL">Damaged Parcel</SelectItem>
            <SelectItem value="WRONG_DELIVERY">Wrong Delivery</SelectItem>
            <SelectItem value="DELAY">Delay</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea {...register("description", { required: true })} rows={3} />
      </div>
      <Button type="submit" className="w-full" disabled={createComplaint.isPending || isFetchingAwb}>
        {(createComplaint.isPending || isFetchingAwb) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Submit Complaint
      </Button>
    </form>
  );
}

export default function Complaints() {
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const params: any = {};
  if (filter !== "ALL") params.status = filter;
  const { data: complaints = [], isLoading } = useListComplaints(params, { query: { queryKey: getListComplaintsQueryKey(params) } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Complaints</h2>
          <p className="text-muted-foreground text-sm">{complaints.length} complaints</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-raise-complaint"><Plus className="w-4 h-4 mr-2" /> Raise Complaint</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Raise a Complaint</DialogTitle></DialogHeader>
            <NewComplaintForm onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          <SelectItem value="RAISED">Raised</SelectItem>
          <SelectItem value="INVESTIGATING">Investigating</SelectItem>
          <SelectItem value="RESOLVED">Resolved</SelectItem>
          <SelectItem value="CLOSED">Closed</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No complaints found</div>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(c)} data-testid={`card-complaint-${c.id}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-sm font-medium">{c.complaintNumber}</p>
                    <p className="text-xs text-muted-foreground">AWB: {c.awbNumber} · {c.complaintType.replace(/_/g, " ")}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] ?? "bg-gray-100"}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-sm mt-2 line-clamp-2">{c.description}</p>
                <p className="text-xs text-muted-foreground mt-1">By {c.raisedByName} · {new Date(c.createdAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complaint Details</DialogTitle></DialogHeader>
          {selected && <ComplaintDetail complaint={selected} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

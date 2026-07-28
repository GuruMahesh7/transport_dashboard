import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateParcel, useListHubs, getListParcelsQueryKey, useListItems, useCreateItem, getListItemsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

const schema = z.object({
  senderName: z.string().min(1, "Required"),
  senderPhone: z.string().min(10, "Valid phone required"),
  senderEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  senderAddress: z.string().min(1, "Required"),
  receiverName: z.string().min(1, "Required"),
  receiverPhone: z.string().min(10, "Valid phone required"),
  receiverEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  receiverAddress: z.string().min(1, "Required"),
  numBoxes: z.coerce.number().min(1),
  weightKg: z.coerce.number().min(0.1),
  itemId: z.coerce.number().min(1, "Required"),
  charges: z.coerce.number().min(0),
  remarks: z.string().optional(),
  destinationHubId: z.coerce.number().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

export default function ParcelNew() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: hubs = [] } = useListHubs();
  const { data: items = [] } = useListItems();
  
  const createParcel = useCreateParcel();
  const createItem = useCreateItem();

  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      numBoxes: 1,
      weightKg: 1,
      charges: 0,
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const selectedItemId = watch("itemId");
  const numBoxes = watch("numBoxes");

  useEffect(() => {
    if (selectedItemId && numBoxes) {
      const item = items.find(i => i.id === selectedItemId);
      if (item) {
        setValue("charges", item.defaultPrice * numBoxes);
      }
    }
  }, [selectedItemId, numBoxes, items, setValue]);

  const onSubmit = (data: FormValues) => {
    createParcel.mutate({ data }, {
      onSuccess: (parcel) => {
        queryClient.invalidateQueries({ queryKey: getListParcelsQueryKey() });
        toast({ title: "Booking Confirmed", description: `AWB: ${parcel.awbNumber}` });
        setLocation(`/parcels/${parcel.id}`);
      },
      onError: () => toast({ title: "Booking Failed", description: "Could not create parcel", variant: "destructive" }),
    });
  };

  const handleAddItem = () => {
    if (!newItemName || !newItemPrice) return;
    createItem.mutate({ data: { name: newItemName, defaultPrice: parseFloat(newItemPrice) } }, {
      onSuccess: (newItem) => {
        queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
        setValue("itemId", newItem.id);
        setIsAddItemOpen(false);
        setNewItemName("");
        setNewItemPrice("");
        toast({ title: "Item Added", description: `${newItem.name} has been added.` });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.response?.data?.error || "Failed to add item", variant: "destructive" });
      }
    });
  };

  const activeHubs = hubs.filter(h => h.isActive);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/parcels")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Booking</h2>
          <p className="text-muted-foreground">Enter booking details below. AWB is generated automatically.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Consignor Details</CardTitle>
              <CardDescription>Sender information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="senderName">Consignor Name</Label>
                <Input id="senderName" {...register("senderName")} autoFocus />
                {errors.senderName && <p className="text-destructive text-xs">{errors.senderName.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="senderPhone">Phone</Label>
                  <Input id="senderPhone" {...register("senderPhone")} />
                  {errors.senderPhone && <p className="text-destructive text-xs">{errors.senderPhone.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="senderEmail">Email (optional)</Label>
                  <Input id="senderEmail" type="email" {...register("senderEmail")} />
                  {errors.senderEmail && <p className="text-destructive text-xs">{errors.senderEmail.message}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="senderAddress">Address</Label>
                <Input id="senderAddress" {...register("senderAddress")} />
                {errors.senderAddress && <p className="text-destructive text-xs">{errors.senderAddress.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Receiver Details</CardTitle>
              <CardDescription>Destination information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="receiverName">Receiver Name</Label>
                <Input id="receiverName" {...register("receiverName")} />
                {errors.receiverName && <p className="text-destructive text-xs">{errors.receiverName.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="receiverPhone">Phone</Label>
                  <Input id="receiverPhone" {...register("receiverPhone")} />
                  {errors.receiverPhone && <p className="text-destructive text-xs">{errors.receiverPhone.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="receiverEmail">Email (optional)</Label>
                  <Input id="receiverEmail" type="email" {...register("receiverEmail")} />
                  {errors.receiverEmail && <p className="text-destructive text-xs">{errors.receiverEmail.message}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="receiverAddress">Address</Label>
                <Input id="receiverAddress" {...register("receiverAddress")} />
                {errors.receiverAddress && <p className="text-destructive text-xs">{errors.receiverAddress.message}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Parcel & Delivery Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div className="space-y-1 md:col-span-2">
              <Label>Item Type</Label>
              <div className="flex gap-2">
                <Select value={selectedItemId ? String(selectedItemId) : ""} onValueChange={v => setValue("itemId", parseInt(v))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Search / Select Item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map(i => (
                      <SelectItem key={i.id} value={String(i.id)}>
                        {i.name} (₹{i.defaultPrice})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" type="button"><Plus className="w-4 h-4 mr-1"/> New Item</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add New Item</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Item Name</Label>
                        <Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="e.g. Document" />
                      </div>
                      <div className="space-y-2">
                        <Label>Base Price (₹)</Label>
                        <Input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddItem} disabled={createItem.isPending || !newItemName || !newItemPrice}>Add Item</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {errors.itemId && <p className="text-destructive text-xs">Please select an item.</p>}
            </div>

            <div className="space-y-1">
              <Label>No. of Boxes</Label>
              <Input type="number" {...register("numBoxes")} />
              {errors.numBoxes && <p className="text-destructive text-xs">{errors.numBoxes.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Total Weight (kg)</Label>
              <Input type="number" step="0.1" {...register("weightKg")} />
              {errors.weightKg && <p className="text-destructive text-xs">{errors.weightKg.message}</p>}
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label>Destination Hub</Label>
              <Select onValueChange={v => setValue("destinationHubId", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select destination hub" /></SelectTrigger>
                <SelectContent>
                  {activeHubs.map(h => <SelectItem key={h.id} value={String(h.id)}>{h.hubName} ({h.hubCode})</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.destinationHubId && <p className="text-destructive text-xs">Destination Hub is required</p>}
            </div>

            <div className="space-y-1">
              <Label>Total Charges (₹)</Label>
              <Input type="number" step="0.01" className="bg-primary/5 border-primary/20 font-bold" {...register("charges")} />
              <p className="text-xs text-muted-foreground">Auto-calculated: Item Price × Boxes</p>
            </div>

            <div className="space-y-1 md:col-span-4">
              <Label>Remarks (optional)</Label>
              <Input {...register("remarks")} placeholder="Any special instructions..." />
            </div>

          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="px-12" disabled={createParcel.isPending}>
            {createParcel.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : "Confirm Booking"}
          </Button>
        </div>
      </form>
    </div>
  );
}

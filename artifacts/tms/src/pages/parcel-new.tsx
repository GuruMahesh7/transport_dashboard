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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  numBoxes: z.coerce.number().min(1),
  weightKg: z.coerce.number().min(0.1),
  itemId: z.coerce.number().min(1, "Required"),
  charges: z.coerce.number().min(0),
  handlingFee: z.coerce.number().min(0),
  totalAmount: z.coerce.number().min(0),
  paymentType: z.string(),
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
      handlingFee: 0,
      totalAmount: 0,
      paymentType: "To-Pay",
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const selectedItemId = watch("itemId");
  const numBoxes = watch("numBoxes");
  const charges = watch("charges");
  const handlingFee = watch("handlingFee");

  useEffect(() => {
    if (selectedItemId && numBoxes) {
      const item = items.find(i => i.id === selectedItemId);
      if (item) {
        setValue("charges", item.defaultPrice * numBoxes);
      }
    }
  }, [selectedItemId, numBoxes, items, setValue]);

  useEffect(() => {
    setValue("totalAmount", (Number(charges) || 0) + (Number(handlingFee) || 0));
  }, [charges, handlingFee, setValue]);

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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/parcels")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">General Booking</h2>
            <p className="text-muted-foreground text-sm">AWB will be auto-generated</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Hubs & Entities */}
        <div className="lg:col-span-8 space-y-6">
          
          <Card className="shadow-sm border-t-4 border-t-primary">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div>
                  <Label className="text-muted-foreground uppercase text-xs font-bold">From</Label>
                  <p className="font-bold text-lg">HYDERABAD</p>
                </div>
                <div>
                  <Label>To *</Label>
                  <Select onValueChange={v => setValue("destinationHubId", parseInt(v))}>
                    <SelectTrigger className="font-medium bg-background"><SelectValue placeholder="Select destination" /></SelectTrigger>
                    <SelectContent>
                      {activeHubs.map(h => <SelectItem key={h.id} value={String(h.id)}>{h.hubName} ({h.hubCode})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.destinationHubId && <p className="text-destructive text-xs">Required</p>}
                </div>
                <div>
                  <Label>Payment Type *</Label>
                  <Select defaultValue="To-Pay" onValueChange={v => setValue("paymentType", v)}>
                    <SelectTrigger className="font-medium bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To-Pay">To-Pay</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="TBB">TBB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <Card className="shadow-sm">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg">Consignor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input {...register("senderName")} autoFocus placeholder="Consignor Name" />
                  {errors.senderName && <p className="text-destructive text-xs">{errors.senderName.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Phone *</Label>
                  <Input {...register("senderPhone")} placeholder="10-digit number" />
                  {errors.senderPhone && <p className="text-destructive text-xs">{errors.senderPhone.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Address *</Label>
                  <Input {...register("senderAddress")} placeholder="Full address" />
                  {errors.senderAddress && <p className="text-destructive text-xs">{errors.senderAddress.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Email (Optional)</Label>
                  <Input type="email" {...register("senderEmail")} placeholder="Email" />
                  {errors.senderEmail && <p className="text-destructive text-xs">{errors.senderEmail.message}</p>}
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

        {/* Right Side: Charges & Details */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-sm border-t-4 border-t-blue-500">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg">Parcel Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1">
                <Label>Item Type</Label>
                <div className="flex gap-2">
                  <Select value={selectedItemId ? String(selectedItemId) : ""} onValueChange={v => setValue("itemId", parseInt(v))}>
                    <SelectTrigger className="flex-1 bg-background">
                      <SelectValue placeholder="Select Item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map(i => (
                        <SelectItem key={i.id} value={String(i.id)}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" type="button" size="icon" className="shrink-0"><Plus className="w-4 h-4"/></Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add New Item</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Item Name</Label>
                          <Input value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Base Price (₹)</Label>
                          <Input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddItem} disabled={createItem.isPending || !newItemName || !newItemPrice}>Add Item</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {errors.itemId && <p className="text-destructive text-xs">Required</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>No. Boxes</Label>
                  <Input type="number" {...register("numBoxes")} />
                  {errors.numBoxes && <p className="text-destructive text-xs">{errors.numBoxes.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Weight (kg)</Label>
                  <Input type="number" step="0.1" {...register("weightKg")} />
                  {errors.weightKg && <p className="text-destructive text-xs">{errors.weightKg.message}</p>}
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <Label>Remarks</Label>
                <Input {...register("remarks")} placeholder="Optional instructions..." />
              </div>

            </CardContent>
          </Card>

          <Card className="shadow-sm border-t-4 border-t-amber-500">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg">Charges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Freight Charges</Label>
                <Input type="number" step="0.01" className="w-32 text-right" {...register("charges")} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Handling Fee</Label>
                <Input type="number" step="0.01" className="w-32 text-right" {...register("handlingFee")} />
              </div>

              <Separator />

              <div className="flex items-center justify-between pt-2">
                <Label className="text-lg font-bold">Total Amount</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">₹</span>
                  <Input type="number" disabled className="w-32 text-right text-xl font-bold border-none bg-transparent px-0 focus-visible:ring-0" {...register("totalAmount")} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full text-lg h-14" disabled={createParcel.isPending}>
            {createParcel.isPending ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</> : "Confirm Booking"}
          </Button>

        </div>

      </form>
    </div>
  );
}

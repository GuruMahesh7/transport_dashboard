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
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const schema = z.object({
  senderName: z.string().min(1, "Required"),
  senderPhone: z.string().optional().or(z.literal("")),
  senderAddress: z.string().optional().or(z.literal("")),
  charges: z.coerce.number().optional(),
  handlingFee: z.coerce.number().optional(),
  totalAmount: z.coerce.number().optional(),
  paymentType: z.string(),
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
  const [newItemHandling, setNewItemHandling] = useState("");
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMainBranchId, setSelectedMainBranchId] = useState<number | null>(null);

  // Local state for tabs
  const [itemTabs, setItemTabs] = useState<Array<{
    id: string;
    itemId: number;
    numBoxes: number;
    weightKg: number;
    remarks: string;
    charges: number;
    handlingFee?: number;
  }>>([
    { id: "1", itemId: 0, numBoxes: 1, weightKg: 1, remarks: "", charges: 0, handlingFee: 0 }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("1");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      charges: 0,
      handlingFee: 0,
      totalAmount: 0,
      paymentType: "To-Pay",
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const charges = watch("charges");
  const handlingFee = watch("handlingFee");

  const activeTab = itemTabs.find(t => t.id === activeTabId) || itemTabs[0];

  const updateActiveTab = (key: string, value: any) => {
    setItemTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        const updated = { ...tab, [key]: value };
        if (key === "itemId") {
          const itm = items.find(i => i.id === value);
          updated.charges = itm ? Number(itm.defaultPrice || 0) * tab.numBoxes : 0;
          updated.handlingFee = itm ? Number(itm.defaultHandlingFee || 0) * tab.numBoxes : 0;
        }
        if (key === "numBoxes") {
          const itm = items.find(i => i.id === tab.itemId);
          updated.charges = itm ? Number(itm.defaultPrice || 0) * value : 0;
          updated.handlingFee = itm ? Number(itm.defaultHandlingFee || 0) * value : 0;
        }
        return updated;
      }
      return tab;
    }));
  };

  // Sum charges across all tabs
  const totalCharges = itemTabs.reduce((sum, tab) => sum + (tab.charges || 0), 0);
  const totalHandlingFee = itemTabs.reduce((sum, tab) => sum + (tab.handlingFee || 0), 0);

  // Sync charges to react-hook-form
  useEffect(() => {
    setValue("charges", totalCharges);
  }, [totalCharges, setValue]);

  useEffect(() => {
    setValue("handlingFee", totalHandlingFee);
  }, [totalHandlingFee, setValue]);

  // Keep total amount in sync
  useEffect(() => {
    setValue("totalAmount", (Number(charges) || 0) + (Number(handlingFee) || 0));
  }, [charges, handlingFee, setValue]);

  const onSubmit = async (data: FormValues) => {
    const invalidTab = itemTabs.find(t => !t.itemId || t.numBoxes < 1 || t.weightKg <= 0);
    if (invalidTab) {
      const idx = itemTabs.findIndex(t => t.id === invalidTab.id);
      setActiveTabId(invalidTab.id);
      toast({ 
        title: "Validation Error", 
        description: `Please complete cargo details for Cargo #${idx + 1}.`, 
        variant: "destructive" 
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payloadItems = itemTabs.map(tab => ({
        itemId: tab.itemId,
        numBoxes: tab.numBoxes,
        weightKg: tab.weightKg,
        charges: tab.charges,
        remarks: tab.remarks || undefined
      }));

      const res = await createParcel.mutateAsync({
        data: {
          senderName: data.senderName,
          senderPhone: data.senderPhone,
          senderAddress: data.senderAddress,
          destinationHubId: data.destinationHubId,
          paymentType: data.paymentType,
          handlingFee: Number(data.handlingFee) || 0,
          items: payloadItems
        } as any
      });

      queryClient.invalidateQueries({ queryKey: getListParcelsQueryKey() });
      toast({ title: "Booking Confirmed", description: `Successfully created booking with ${itemTabs.length} items!` });
      setLocation(`/parcels/${res.id}`);
    } catch (err) {
      toast({ title: "Booking Failed", description: "Could not create parcel booking", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = () => {
    if (!newItemName || !newItemPrice) return;
    createItem.mutate({ data: { name: newItemName, defaultPrice: parseFloat(newItemPrice), defaultHandlingFee: parseFloat(newItemHandling || "0") } }, {
      onSuccess: (newItem) => {
        queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
        updateActiveTab("itemId", newItem.id);
        setIsAddItemOpen(false);
        setNewItemName("");
        setNewItemPrice("");
        setNewItemHandling("");
        toast({ title: "Item Added", description: `${newItem.name} has been added.` });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.response?.data?.error || "Failed to add item", variant: "destructive" });
      }
    });
  };

  const activeHubs = hubs.filter(h => h.isActive);

  return (
    <div className="w-full flex flex-col min-h-[82vh] justify-between space-y-2.5 px-2 py-0">
      {/* Local CSS overrides to expand padding & remove margin space */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 768px) {
          main {
            padding: 0.5rem 1rem !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}} />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-1 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setLocation("/parcels")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-base font-bold tracking-tight">General Booking Console</h2>
            <p className="text-muted-foreground text-[10px]">AWB numbers will be auto-generated per cargo item</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-grow flex flex-col justify-between space-y-2.5">
        {/* Row 1: Route & Billing banner */}
        <Card className="shadow-sm shrink-0">
          <CardContent className="py-2 px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div className="flex flex-col">
                <Label className="text-muted-foreground uppercase text-[10px] font-bold">From Hub</Label>
                <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">HYDERABAD</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="mainBranchId" className="text-xs font-semibold">Main Branch *</Label>
                <Select onValueChange={v => {
                  setSelectedMainBranchId(parseInt(v));
                  setValue("destinationHubId", parseInt(v)); // default to main branch
                }}>
                  <SelectTrigger id="mainBranchId" className="h-8 font-medium bg-background text-xs">
                    <SelectValue placeholder="Select Main Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeHubs.filter(h => !h.parentHubId).map(h => (
                      <SelectItem key={h.id} value={String(h.id)}>
                        {h.hubName} ({h.hubCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="destinationHubId" className="text-xs font-semibold">Sub Branch</Label>
                <Select disabled={!selectedMainBranchId} value={String(watch("destinationHubId") || "")} onValueChange={v => setValue("destinationHubId", parseInt(v))}>
                  <SelectTrigger id="destinationHubId" className="h-8 font-medium bg-background text-xs">
                    <SelectValue placeholder="Select Sub Branch (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedMainBranchId && <SelectItem value={String(selectedMainBranchId)}>None (Direct to Main)</SelectItem>}
                    {activeHubs.filter(h => h.parentHubId === selectedMainBranchId).map(h => (
                      <SelectItem key={h.id} value={String(h.id)}>
                        {h.hubName} ({h.hubCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.destinationHubId && <p className="text-destructive text-[10px] font-semibold">Required</p>}
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="paymentType" className="text-xs font-semibold">Payment Mode *</Label>
                <Select defaultValue="To-Pay" onValueChange={v => setValue("paymentType", v)}>
                  <SelectTrigger id="paymentType" className="h-8 font-medium bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
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

        {/* Row 2: Side-by-Side Cards (Stretched height) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-grow min-h-[300px]">
          {/* Consignor Card */}
          <Card className="shadow-sm flex flex-col h-full">
            <CardHeader className="py-1 px-4 bg-muted/20 border-b flex flex-row justify-between items-center h-8 shrink-0">
              <CardTitle className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">Consignor (Sender)</CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex-grow flex flex-col justify-between">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="senderName" className="text-[11px] font-semibold">Name *</Label>
                    <Input id="senderName" className="h-8 text-xs bg-background" {...register("senderName")} autoFocus placeholder="Consignor Name" />
                    {errors.senderName && <p className="text-destructive text-[10px]">{errors.senderName.message}</p>}
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="senderPhone" className="text-[11px] font-semibold">Phone (Optional)</Label>
                    <Input id="senderPhone" className="h-8 text-xs bg-background" {...register("senderPhone")} placeholder="10-digit number" />
                    {errors.senderPhone && <p className="text-destructive text-[10px]">{errors.senderPhone.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="senderAddress" className="text-[11px] font-semibold">Address (Optional)</Label>
                    <Input id="senderAddress" className="h-8 text-xs bg-background" {...register("senderAddress")} placeholder="Full address" />
                    {errors.senderAddress && <p className="text-destructive text-[10px]">{errors.senderAddress.message}</p>}
                  </div>
                  <div className="space-y-0.5">
                    {/* Empty for grid layout balance */}
                  </div>
                </div>
              </div>
              
              <div className="hidden md:block py-2 text-[10px] text-muted-foreground italic font-mono border-t mt-4">
                Verification terminal: HYD-TERM-01
              </div>
            </CardContent>
          </Card>

          {/* Consignment Items Card (Tabbed UI) */}
          <Card className="shadow-sm flex flex-col h-full">
            <CardHeader className="py-1 px-4 bg-muted/20 border-b flex flex-row justify-between items-center h-8 shrink-0">
              <CardTitle className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">Consignment Items</CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex flex-col flex-grow space-y-2.5 overflow-hidden">
              {/* Tab Header Selector */}
              <div className="flex items-center gap-1 border-b pb-1.5 shrink-0 overflow-x-auto select-none">
                {itemTabs.map((tab, idx) => (
                  <div
                    key={tab.id}
                    className={`flex items-center gap-1.5 px-3 py-1 text-[11px] rounded-md cursor-pointer transition-all border ${
                      activeTabId === tab.id
                        ? "bg-primary border-primary text-primary-foreground font-bold shadow-sm"
                        : "bg-background border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <span>Cargo #{idx + 1}</span>
                    {itemTabs.length > 1 && (
                      <span
                        className="text-[10px] ml-1 opacity-60 hover:opacity-100 font-bold hover:text-red-500 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemTabs(prev => {
                            const filtered = prev.filter(t => t.id !== tab.id);
                            if (activeTabId === tab.id) {
                              setActiveTabId(filtered[0]?.id || "");
                            }
                            return filtered;
                          });
                        }}
                      >
                        ×
                      </span>
                    )}
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 border rounded-md hover:bg-slate-100 dark:hover:bg-slate-850 shrink-0 ml-1"
                  onClick={() => {
                    const newId = String(Date.now());
                    setItemTabs(prev => [
                      ...prev,
                      { id: newId, itemId: 0, numBoxes: 1, weightKg: 1, remarks: "", charges: 0 }
                    ]);
                    setActiveTabId(newId);
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Form inputs for active tab */}
              <div className="flex-grow space-y-2 overflow-y-auto pt-1">
                {/* Item Type */}
                <div className="space-y-0.5">
                  <Label htmlFor="itemTypeSelect" className="text-[11px] font-semibold">Item Type</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={activeTab.itemId ? String(activeTab.itemId) : ""} 
                      onValueChange={v => updateActiveTab("itemId", parseInt(v))}
                    >
                      <SelectTrigger id="itemTypeSelect" className="h-8 text-xs bg-background flex-1">
                        <SelectValue placeholder="Select Item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map(i => (
                          <SelectItem key={i.id} value={String(i.id)}>
                            {i.name} (₹{i.defaultPrice}/u)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="outline" 
                      type="button" 
                      size="icon" 
                      className="h-8 w-8 shrink-0 border-slate-200 dark:border-slate-800"
                      onClick={() => setIsAddItemOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5"/>
                    </Button>
                  </div>
                </div>

                {/* Boxes & Weight Side-by-Side */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="numBoxesInput" className="text-[11px] font-semibold">No. Boxes</Label>
                    <Input 
                      id="numBoxesInput" 
                      type="number" 
                      min="1"
                      className="h-8 text-xs bg-background" 
                      value={activeTab.numBoxes}
                      onChange={e => updateActiveTab("numBoxes", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="weightKgInput" className="text-[11px] font-semibold">Weight (kg)</Label>
                    <Input 
                      id="weightKgInput" 
                      type="number" 
                      step="0.1" 
                      min="0.1"
                      className="h-8 text-xs bg-background" 
                      value={activeTab.weightKg}
                      onChange={e => updateActiveTab("weightKg", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-0.5">
                  <Label htmlFor="remarksInput" className="text-[11px] font-semibold">Remarks</Label>
                  <Input 
                    id="remarksInput" 
                    className="h-8 text-xs bg-background" 
                    placeholder="Optional instructions..." 
                    value={activeTab.remarks}
                    onChange={e => updateActiveTab("remarks", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Horizontal Billing Footer Bar */}
        <Card className="shadow-sm border-t-2 border-t-slate-700 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <CardContent className="py-2 px-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4">
              <div className="flex-grow grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="charges" className="text-xs font-semibold text-muted-foreground">Amount (₹)</Label>
                  <Input id="charges" type="number" step="0.01" className="h-9 font-mono bg-background text-xs" {...register("charges")} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="handlingFee" className="text-xs font-semibold text-muted-foreground">Handling Fee (₹)</Label>
                  <Input id="handlingFee" type="number" step="0.01" className="h-9 font-mono bg-background text-xs" {...register("handlingFee")} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Total Amount</Label>
                  <div className="flex items-center h-9 px-3 bg-background border rounded-md font-mono text-xs font-bold text-slate-800 dark:text-slate-100 shadow-inner">
                    ₹{((Number(charges) || 0) + (Number(handlingFee) || 0)).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
              
              <div className="shrink-0 flex items-end">
                <Button type="submit" size="default" className="h-9 px-8 font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Item Addition Dialog - Styled and Placed at Root */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <h2 className="text-base font-bold">Add Custom Cargo Category</h2>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newItemName" className="text-xs">Item Name</Label>
              <Input id="newItemName" className="h-8 text-xs" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="e.g. Special Tech Parts" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newItemPrice" className="text-xs">Base Price (₹)</Label>
              <Input id="newItemPrice" className="h-8 text-xs" type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="Price per unit box" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newItemHandling" className="text-xs">Handling Fee (₹)</Label>
              <Input id="newItemHandling" className="h-8 text-xs" type="number" value={newItemHandling} onChange={e => setNewItemHandling(e.target.value)} placeholder="Handling fee per box" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleAddItem} disabled={createItem.isPending || !newItemName || !newItemPrice}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

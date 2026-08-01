import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListParcels, getListParcelsQueryKey, useListHubs } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  BOOKED: "bg-blue-100 text-blue-800",
  RECEIVED_AT_ORIGIN: "bg-cyan-100 text-cyan-800",
  DISPATCHED: "bg-amber-100 text-amber-800",
  RECEIVED_AT_DESTINATION: "bg-indigo-100 text-indigo-800",
  READY_FOR_PICKUP: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<string, string> = {
  BOOKED: "Booked",
  RECEIVED_AT_ORIGIN: "At Origin",
  DISPATCHED: "In Transit",
  RECEIVED_AT_DESTINATION: "At Destination",
  READY_FOR_PICKUP: "Ready for Pickup",
  DELIVERED: "Delivered",
};

export default function Parcels() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [hubId, setHubId] = useState<string>("");
  const [subHubId, setSubHubId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [search, setSearch] = useState("");
  const limit = 20;

  const params: any = { page, limit };
  
  // If subHubId is selected, use that, otherwise use hubId
  const activeHubId = (subHubId && subHubId !== "ALL") ? subHubId : ((hubId && hubId !== "ALL") ? hubId : undefined);
  if (activeHubId) params.hubId = parseInt(activeHubId);
  
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const { data: hubsData } = useListHubs();

  const { data, isLoading } = useListParcels(params, {
    query: { queryKey: getListParcelsQueryKey(params) },
  });

  const parcels = data?.parcels ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const filtered = search
    ? parcels.filter(p =>
        p.awbNumber.toLowerCase().includes(search.toLowerCase()) ||
        p.senderName.toLowerCase().includes(search.toLowerCase())
      )
    : parcels;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Parcels</h2>
          <p className="text-muted-foreground text-sm">{total} total parcels</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search AWB, sender..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-parcels"
          />
        </div>
        <Select value={hubId} onValueChange={s => { setHubId(s); setPage(1); }}>
          <SelectTrigger className="w-48" data-testid="select-hub-filter">
            <SelectValue placeholder="All Main Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Main Branches</SelectItem>
            {hubsData?.filter(h => !h.parentHubId).map(h => (
              <SelectItem key={h.id} value={h.id.toString()}>{h.hubName} ({h.hubCode})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subHubId} onValueChange={s => { setSubHubId(s); setPage(1); }}>
          <SelectTrigger className="w-48" data-testid="select-subbranch-filter">
            <SelectValue placeholder="All Sub Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sub Branches</SelectItem>
            {hubsData?.filter(h => h.parentHubId).map(h => (
              <SelectItem key={h.id} value={h.id.toString()}>{h.hubName} ({h.hubCode})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            value={dateFrom} 
            onChange={e => { setDateFrom(e.target.value); setPage(1); }} 
            className="w-36" 
            placeholder="From"
          />
          <span className="text-muted-foreground">-</span>
          <Input 
            type="date" 
            value={dateTo} 
            onChange={e => { setDateTo(e.target.value); setPage(1); }} 
            className="w-36" 
            placeholder="To"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading parcels...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No parcels found</div>
      ) : (
        <>
          <div className="hidden md:block rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">AWB</th>
                  <th className="px-4 py-3 text-left font-medium">Sender</th>
                  <th className="px-4 py-3 text-left font-medium">Destination</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/parcels/${p.id}`)}
                    data-testid={`row-parcel-${p.id}`}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-primary">{p.awbNumber}</td>
                    <td className="px-4 py-3">
                      <div>{p.senderName}</div>
                      <div className="text-muted-foreground text-xs">{p.senderPhone}</div>
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{(p as any).destinationHubName || p.destinationHubCode}</div>
                      {(p as any).destinationHubType === "Sub Branch" && (
                        <div className="text-blue-600 mt-1">Sub-branch of {(p as any).destinationParentHubName}</div>
                      )}
                      {(p as any).destinationHubType === "Main Branch" && (
                        <div className="text-slate-500 mt-1">Main Branch</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[p.currentStatus] ?? "bg-gray-100 text-gray-800"}`}>
                        {STATUS_LABELS[p.currentStatus] ?? p.currentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map(p => (
              <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(`/parcels/${p.id}`)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-sm font-semibold text-primary">{p.awbNumber}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[p.currentStatus] ?? "bg-gray-100 text-gray-800"}`}>
                      {STATUS_LABELS[p.currentStatus] ?? p.currentStatus}
                    </span>
                  </div>
                  <div className="text-sm">{p.senderName}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Destination: {(p as any).destinationHubName || p.destinationHubCode} 
                    {(p as any).destinationHubType === "Sub Branch" && ` (Sub-branch of ${(p as any).destinationParentHubName})`}
                    {' · '}
                    {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

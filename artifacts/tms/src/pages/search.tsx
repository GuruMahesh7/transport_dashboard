import { useState } from "react";
import { useLocation } from "wouter";
import { useSearchParcels, getSearchParcelsQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  BOOKED: "bg-blue-100 text-blue-800",
  RECEIVED_AT_ORIGIN: "bg-cyan-100 text-cyan-800",
  DISPATCHED: "bg-amber-100 text-amber-800",
  RECEIVED_AT_DESTINATION: "bg-indigo-100 text-indigo-800",
  READY_FOR_PICKUP: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
};

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [q, setQ] = useState("");
  const [phone, setPhone] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [searchParams, setSearchParams] = useState<any>({});

  const { data: results = [], isLoading } = useSearchParcels(searchParams, {
    query: { enabled: submitted && Object.keys(searchParams).length > 0, queryKey: getSearchParcelsQueryKey(searchParams) },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: any = {};
    if (q.trim()) params.q = q.trim();
    if (phone.trim()) params.phone = phone.trim();
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    setSearchParams(params);
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Search</h2>
        <p className="text-muted-foreground text-sm">Find parcels by AWB, phone, or date range</p>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="AWB number (e.g. HB202606010001)"
            className="pl-9 font-mono"
            value={q}
            onChange={e => setQ(e.target.value)}
            data-testid="input-search-awb"
          />
        </div>
        <Input
          placeholder="Phone number (sender or receiver)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          data-testid="input-search-phone"
        />
        <div className="flex gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1" />
        </div>
        <Button type="submit" className="w-full" data-testid="button-search">
          <Search className="w-4 h-4 mr-2" /> Search
        </Button>
      </form>

      {submitted && (
        isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Searching...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No results found</div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{results.length} results</p>
            {results.map(p => (
              <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(`/parcels/${p.id}`)} data-testid={`card-result-${p.id}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono font-semibold text-primary">{p.awbNumber}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[p.currentStatus] ?? "bg-gray-100"}`}>
                      {p.currentStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <div><span className="text-muted-foreground">Sender:</span> {p.senderName} ({p.senderPhone})</div>
                    <div><span className="text-muted-foreground">Receiver:</span> {p.receiverName} ({p.receiverPhone})</div>
                    <div><span className="text-muted-foreground">Destination:</span> {p.destinationHubCode}</div>
                    <div><span className="text-muted-foreground">Date:</span> {new Date(p.createdAt).toLocaleDateString()}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}

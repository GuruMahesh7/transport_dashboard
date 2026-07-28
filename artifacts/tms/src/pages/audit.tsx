import { useState } from "react";
import { useListAuditLogs, getListAuditLogsQueryKey, useListStaff } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AuditLogs() {
  const [page, setPage] = useState(1);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const limit = 50;

  const params: any = { page, limit };

  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const { data, isLoading } = useListAuditLogs(params, { query: { queryKey: getListAuditLogsQueryKey(params) } });


  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const ACTION_COLORS: Record<string, string> = {
    CREATE: "text-green-700 bg-green-50",
    UPDATE: "text-blue-700 bg-blue-50",
    DELETE: "text-red-700 bg-red-50",
    STATUS_CHANGE: "text-purple-700 bg-purple-50",
    SCAN: "text-amber-700 bg-amber-50",
    ACTIVATE: "text-cyan-700 bg-cyan-50",
    DEACTIVATE: "text-gray-700 bg-gray-100",
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <p className="text-muted-foreground text-sm">{total} total entries</p>
      </div>

      <div className="flex gap-3 flex-wrap">

        <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="w-40" placeholder="From" />
        <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="w-40" placeholder="To" />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted/30 transition-colors" data-testid={`log-${log.id}`}>
              <span className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap mt-0.5 ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                {log.action}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{log.description || `${log.action} on ${log.entityType} #${log.entityId}`}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {log.performedByName} · {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {logs.length === 0 && <div className="text-center py-8 text-muted-foreground">No audit logs found</div>}
        </div>
      )}

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
    </div>
  );
}

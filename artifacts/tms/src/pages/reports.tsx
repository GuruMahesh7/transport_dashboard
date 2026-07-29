import { useState } from "react";
import { useGetDailyReport, getGetDailyReportQueryKey, useGetHubWiseReport, getGetHubWiseReportQueryKey, useGetMonthlyReport, getGetMonthlyReportQueryKey, useListParcels, getListParcelsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download, Printer } from "lucide-react";

export default function Reports() {
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split("T")[0]);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  const { data: daily } = useGetDailyReport({ date: dailyDate }, { query: { queryKey: getGetDailyReportQueryKey({ date: dailyDate }) } });
  const { data: hubWise = [] } = useGetHubWiseReport({ dateFrom, dateTo }, { query: { queryKey: getGetHubWiseReportQueryKey({ dateFrom, dateTo }) } });
  const { data: monthly = [] } = useGetMonthlyReport({ months: 6 }, { query: { queryKey: getGetMonthlyReportQueryKey({ months: 6 }) } });

  const { data: dailyParcelsData, isLoading: dailyParcelsLoading } = useListParcels({ dateFrom: dailyDate, dateTo: dailyDate, limit: 100 }, { query: { queryKey: getListParcelsQueryKey({ dateFrom: dailyDate, dateTo: dailyDate, limit: 100 }) } });
  const dailyParcels = dailyParcelsData?.parcels ?? [];

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Local print CSS overrides to strip browser headers/footers */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            margin: 0 !important;
          }
          html, body, #root, main, .min-h-screen {
            height: auto !important;
            min-height: 0 !important;
            min-height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            margin: 1.2cm !important;
            background: white !important;
            color: black !important;
          }
        }
      `}} />
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-muted-foreground text-sm">Analytics and performance data</p>
        </div>
        <Button variant="outline" onClick={handleExport} data-testid="button-export" className="print:hidden">
          <Printer className="w-4 h-4 mr-2" /> Print Report
        </Button>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="print:hidden">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="hub-wise">Hub-wise</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <div className="flex items-center gap-3 print:hidden">
            <Label>Date</Label>
            <Input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} className="w-40" data-testid="input-daily-date" />
          </div>
          {daily && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{daily.totalBooked}</p><p className="text-sm text-muted-foreground">Total Booked</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{daily.totalDelivered}</p><p className="text-sm text-muted-foreground">Delivered</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{daily.totalPending}</p><p className="text-sm text-muted-foreground">Pending</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">₹{Number(daily.revenueToday).toFixed(0)}</p><p className="text-sm text-muted-foreground">Revenue</p></CardContent></Card>
            </div>
          )}
          
          {/* Printable Report Wrapper with clear red borders */}
          <div className="hidden print:block border-2 border-red-600 p-6 rounded-md space-y-4 font-sans bg-white text-black">
            {/* Business Header */}
            <div className="text-center border-b-2 border-red-600 pb-3">
              <h1 className="text-2xl font-black tracking-wider uppercase text-slate-900">Laxmi Narayana Transport</h1>
              <p className="text-xs font-semibold tracking-wide text-slate-600">Daily Manifest & Revenue Statement</p>
              <div className="mt-2 text-[10px] font-mono text-slate-500 flex justify-between px-2">
                <span>Date: {dailyDate}</span>
                <span>Generated: {new Date().toLocaleDateString("en-IN")}</span>
              </div>
            </div>

            {/* Manifest Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Parcels Booked Summary ({dailyParcels.length})</h3>
              <table className="w-full text-[11px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-mono uppercase text-[9px] text-slate-600">
                    <th className="border-r border-slate-300 px-2 py-1 text-left">AWB No.</th>
                    <th className="border-r border-slate-300 px-2 py-1 text-left">Sender</th>
                    <th className="border-r border-slate-300 px-2 py-1 text-left">Cargo Category</th>
                    <th className="border-r border-slate-300 px-2 py-1 text-center">Boxes</th>
                    <th className="border-r border-slate-300 px-2 py-1 text-center">Wt (kg)</th>
                    <th className="border-r border-slate-300 px-2 py-1 text-right">Freight</th>
                    <th className="border-r border-slate-300 px-2 py-1 text-right">Handling</th>
                    <th className="px-2 py-1 text-right">Total Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dailyParcels.map((p: any) => (
                    <tr key={p.id}>
                      <td className="border-r border-slate-300 px-2 py-1 font-mono font-bold text-slate-900">{p.awbNumber}</td>
                      <td className="border-r border-slate-300 px-2 py-1">
                        <p className="font-semibold text-slate-850">{p.senderName}</p>
                        <p className="text-[9px] text-slate-500">{p.senderPhone}</p>
                      </td>
                      <td className="border-r border-slate-300 px-2 py-1 text-slate-700">{p.itemName || "Item"}</td>
                      <td className="border-r border-slate-300 px-2 py-1 text-center font-mono">{p.numBoxes}</td>
                      <td className="border-r border-slate-300 px-2 py-1 text-center font-mono">{p.weightKg}</td>
                      <td className="border-r border-slate-300 px-2 py-1 text-right font-mono">₹{Number(p.charges).toFixed(2)}</td>
                      <td className="border-r border-slate-300 px-2 py-1 text-right font-mono">₹{Number(p.handlingFee || 0).toFixed(2)}</td>
                      <td className="px-2 py-1 text-right font-mono font-bold text-slate-950">₹{Number(p.totalAmount || p.charges).toFixed(2)}</td>
                    </tr>
                  ))}
                  {dailyParcels.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-4 italic text-slate-500">No parcels booked on this date.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Manifest Signatures */}
            <div className="pt-8 flex justify-between text-[10px] font-mono border-t border-dashed border-slate-300 mt-6">
              <div>
                <span className="border-t border-slate-400 pt-1 px-4">Authorized Signature</span>
              </div>
              <div>
                <span className="border-t border-slate-400 pt-1 px-4">Prepared By (Staff)</span>
              </div>
            </div>
          </div>

          {/* Screen-Only Table Layout */}
          <div className="mt-8 print:hidden">
            <h3 className="text-lg font-bold mb-4">Parcels Booked ({dailyParcels.length})</h3>
            {dailyParcelsLoading ? (
              <div className="text-muted-foreground">Loading parcels...</div>
            ) : dailyParcels.length === 0 ? (
              <div className="text-muted-foreground">No parcels booked on this date.</div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">AWB</th>
                      <th className="px-4 py-3 text-left font-medium">Sender</th>
                      <th className="px-4 py-3 text-left font-medium">Item Type</th>
                      <th className="px-4 py-3 text-left font-medium">Boxes</th>
                      <th className="px-4 py-3 text-left font-medium">Weight (kg)</th>
                      <th className="px-4 py-3 text-right font-medium">Freight</th>
                      <th className="px-4 py-3 text-right font-medium">Handling</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dailyParcels.map((p: any) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-mono font-medium">{p.awbNumber}</td>
                        <td className="px-4 py-3">
                          <div>{p.senderName}</div>
                          <div className="text-xs text-muted-foreground">{p.senderPhone}</div>
                        </td>
                        <td className="px-4 py-3">{p.itemName || "Item"}</td>
                        <td className="px-4 py-3">{p.numBoxes}</td>
                        <td className="px-4 py-3">{p.weightKg}</td>
                        <td className="px-4 py-3 text-right">₹{Number(p.charges).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">₹{Number(p.handlingFee || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold">₹{Number(p.totalAmount || p.charges).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="hub-wise" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
            </div>
          </div>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Hub</th>
                  <th className="px-4 py-3 text-right font-medium">Bookings</th>
                  <th className="px-4 py-3 text-right font-medium">Delivered</th>
                  <th className="px-4 py-3 text-right font-medium">Pending</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium">Complaints</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {hubWise.map(h => (
                  <tr key={h.hubId} data-testid={`row-hub-report-${h.hubId}`}>
                    <td className="px-4 py-3"><p className="font-medium">{h.hubName}</p><p className="text-xs text-muted-foreground">{h.hubCode}</p></td>
                    <td className="px-4 py-3 text-right">{h.bookings}</td>
                    <td className="px-4 py-3 text-right text-green-700">{h.deliveries}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{h.pending}</td>
                    <td className="px-4 py-3 text-right">₹{Number(h.revenue).toFixed(0)}</td>
                    <td className="px-4 py-3 text-right text-red-700">{h.complaints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="totalParcels" fill="#3b82f6" name="Total" />
                <Bar dataKey="delivered" fill="#22c55e" name="Delivered" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Month</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Delivered</th>
                  <th className="px-4 py-3 text-right font-medium">Delivery %</th>
                  <th className="px-4 py-3 text-right font-medium">Complaint %</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monthly.map((m, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium">{m.label}</td>
                    <td className="px-4 py-3 text-right">{m.totalParcels}</td>
                    <td className="px-4 py-3 text-right text-green-700">{m.delivered}</td>
                    <td className="px-4 py-3 text-right">{m.deliveryPercentage}%</td>
                    <td className="px-4 py-3 text-right">{m.complaintRate}%</td>
                    <td className="px-4 py-3 text-right">₹{Number(m.revenue).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

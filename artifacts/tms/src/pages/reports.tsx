import { useState } from "react";
import { useGetDailyReport, getGetDailyReportQueryKey, useGetHubWiseReport, getGetHubWiseReportQueryKey, useGetMonthlyReport, getGetMonthlyReportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";

export default function Reports() {
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split("T")[0]);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  const { data: daily } = useGetDailyReport({ date: dailyDate }, { query: { queryKey: getGetDailyReportQueryKey({ date: dailyDate }) } });
  const { data: hubWise = [] } = useGetHubWiseReport({ dateFrom, dateTo }, { query: { queryKey: getGetHubWiseReportQueryKey({ dateFrom, dateTo }) } });
  const { data: monthly = [] } = useGetMonthlyReport({ months: 6 }, { query: { queryKey: getGetMonthlyReportQueryKey({ months: 6 }) } });

  const handleExport = () => {
    window.open(`/api/reports/daily?format=csv&date=${dailyDate}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-muted-foreground text-sm">Analytics and performance data</p>
        </div>
        <Button variant="outline" onClick={handleExport} data-testid="button-export">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="hub-wise">Hub-wise</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <div className="flex items-center gap-3">
            <Label>Date</Label>
            <Input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} className="w-40" data-testid="input-daily-date" />
          </div>
          {daily && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{daily.totalBooked}</p><p className="text-sm text-muted-foreground">Total Booked</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{daily.totalDelivered}</p><p className="text-sm text-muted-foreground">Delivered</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{daily.totalPending}</p><p className="text-sm text-muted-foreground">Pending</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">₹{Number(daily.revenueToday).toFixed(0)}</p><p className="text-sm text-muted-foreground">Revenue</p></CardContent></Card>
            </div>
          )}
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

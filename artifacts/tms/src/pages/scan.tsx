import { useState, useEffect, useRef } from "react";
import { useScanParcel } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scan, Camera, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  BOOKED: "bg-blue-100 text-blue-800",
  RECEIVED_AT_ORIGIN: "bg-cyan-100 text-cyan-800",
  DISPATCHED: "bg-amber-100 text-amber-800",
  RECEIVED_AT_DESTINATION: "bg-indigo-100 text-indigo-800",
  READY_FOR_PICKUP: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
};

export default function ScanPage() {
  const [awbInput, setAwbInput] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const scanDivId = "qr-reader";
  const { toast } = useToast();

  const scanParcel = useScanParcel();

  useEffect(() => {
    let scanner: any;
    if (scanning) {
      import("html5-qrcode").then(({ Html5Qrcode }) => {
        scanner = new Html5Qrcode(scanDivId);
        scannerRef.current = scanner;
        scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText: string) => {
            const awb = decodedText.trim();
            setAwbInput(awb);
            setScanning(false);
            scanner.stop().catch(() => {});
            handleScan(awb);
          },
          () => {}
        ).catch((err: any) => {
          setCameraError("Camera unavailable. Use manual entry below.");
          setScanning(false);
        });
      }).catch(() => {
        setCameraError("Scanner not available.");
        setScanning(false);
      });
    }
    return () => {
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, [scanning]);

  const handleScan = (awb: string) => {
    if (!awb.trim()) return;
    scanParcel.mutate({ data: { awbNumber: awb.trim(), action: "AUTO" } }, {
      onSuccess: (result) => {
        setScanResult(result);
        toast({ title: "Scan successful", description: `${result.previousStatus} → ${result.newStatus}` });
      },
      onError: (err: any) => {
        const msg = err?.data?.error || "Parcel not found";
        toast({ title: "Scan failed", description: msg, variant: "destructive" });
        setScanResult(null);
      },
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(awbInput);
  };

  const reset = () => {
    setScanResult(null);
    setAwbInput("");
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Scan Parcel</h2>
        <p className="text-muted-foreground text-sm">Scan QR code or enter AWB manually</p>
      </div>

      {!scanResult ? (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4" /> Camera Scanner</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div id={scanDivId} className={scanning ? "block" : "hidden"} style={{ minHeight: 250 }} />
              {!scanning && (
                <div className="flex items-center justify-center h-48 bg-muted/50 rounded-md border-2 border-dashed">
                  <div className="text-center">
                    <Scan className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Camera preview will appear here</p>
                  </div>
                </div>
              )}
              {cameraError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" /> {cameraError}
                </div>
              )}
              <Button
                className="w-full"
                variant={scanning ? "outline" : "default"}
                onClick={() => { setCameraError(null); setScanning(s => !s); }}
                data-testid="button-toggle-camera"
              >
                <Camera className="w-4 h-4 mr-2" />
                {scanning ? "Stop Camera" : "Start Camera"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Manual AWB Entry</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  value={awbInput}
                  onChange={e => setAwbInput(e.target.value)}
                  placeholder="e.g. HB202606010001"
                  className="font-mono flex-1"
                  data-testid="input-awb-manual"
                  autoCapitalize="characters"
                />
                <Button type="submit" disabled={!awbInput.trim() || scanParcel.isPending} data-testid="button-manual-scan">
                  {scanParcel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" /> Scan Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-mono font-bold">{scanResult.parcel.awbNumber}</p>
              <p className="text-sm text-muted-foreground">{scanResult.actionTaken}</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm px-2 py-1 rounded ${STATUS_COLORS[scanResult.previousStatus] ?? "bg-gray-100"}`}>
                {scanResult.previousStatus.replace(/_/g, " ")}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className={`text-sm px-2 py-1 rounded font-medium ${STATUS_COLORS[scanResult.newStatus] ?? "bg-gray-100"}`}>
                {scanResult.newStatus.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-sm space-y-1 border rounded-md p-3 bg-muted/30">
              <p><span className="text-muted-foreground">Sender:</span> {scanResult.parcel.senderName} ({scanResult.parcel.senderPhone})</p>
              <p><span className="text-muted-foreground">Receiver:</span> {scanResult.parcel.receiverName} ({scanResult.parcel.receiverPhone})</p>
              <p><span className="text-muted-foreground">Route:</span> {scanResult.parcel.sourceHubCode} → {scanResult.parcel.destinationHubCode}</p>
            </div>
            <Button className="w-full" onClick={reset} data-testid="button-scan-another">
              Scan Another Parcel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

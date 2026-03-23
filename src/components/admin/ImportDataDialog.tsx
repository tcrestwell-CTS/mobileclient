import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ImportType = "clients" | "bookings";

interface ImportResult {
  success: boolean;
  recordsImported: number;
  recordsFailed: number;
  errors?: { index: number; error: string; record: unknown }[];
  totalErrors?: number;
}

export function ImportDataDialog() {
  const [open, setOpen] = useState(false);
  const [importType, setImportType] = useState<ImportType>("clients");
  const [jsonData, setJsonData] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const parseCSV = (csvText: string): Record<string, string>[] => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return [];

    // Parse headers - preserve original case for proper field mapping
    const headerLine = lines[0];
    const headers: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < headerLine.length; i++) {
      const char = headerLine[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        headers.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    headers.push(current.trim().replace(/^["']|["']$/g, ""));

    const records: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Parse each row with proper CSV handling (quotes can contain commas)
      const values: string[] = [];
      let currentVal = "";
      let inQuotesVal = false;
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '"') {
          inQuotesVal = !inQuotesVal;
        } else if (char === ',' && !inQuotesVal) {
          values.push(currentVal.trim().replace(/^["']|["']$/g, ""));
          currentVal = "";
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^["']|["']$/g, ""));

      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || "";
      });
      records.push(record);
    }

    return records;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;

      if (file.name.endsWith(".json")) {
        setJsonData(content);
      } else if (file.name.endsWith(".csv")) {
        const parsed = parseCSV(content);
        setJsonData(JSON.stringify(parsed, null, 2));
      } else {
        toast.error("Unsupported file format. Please use CSV or JSON.");
      }
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!user || !jsonData.trim()) {
      toast.error("Please provide data to import");
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      let parsedData;
      try {
        parsedData = JSON.parse(jsonData);
      } catch {
        toast.error("Invalid JSON format");
        setIsImporting(false);
        return;
      }

      if (!Array.isArray(parsedData)) {
        toast.error("Data must be an array of records");
        setIsImporting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("import-data", {
        body: {
          type: importType,
          data: parsedData,
          targetUserId: user.id,
          fileName,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setResult(data as ImportResult);

      if (data.recordsFailed === 0) {
        toast.success(`Successfully imported ${data.recordsImported} ${importType}`);
      } else {
        toast.warning(
          `Imported ${data.recordsImported} ${importType}, ${data.recordsFailed} failed`
        );
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setJsonData("");
    setResult(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clientExample = `[
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1 555-123-4567",
    "location": "New York, NY",
    "status": "active",
    "notes": "VIP client"
  }
]`;

  const bookingExample = `[
  {
    "client_name": "John Doe",
    "booking_reference": "BK-001",
    "destination": "Paris, France",
    "depart_date": "2026-03-15",
    "return_date": "2026-03-22",
    "travelers": 2,
    "total_amount": 4500,
    "status": "confirmed",
    "notes": "Anniversary trip"
  }
]`;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Import clients or bookings from CSV or JSON files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label>Import Type</Label>
            <Select value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clients">Clients</SelectItem>
                <SelectItem value="bookings">Bookings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Upload File</Label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <FileJson className="h-4 w-4" />
                JSON
              </Button>
              {fileName && (
                <span className="text-sm text-muted-foreground self-center ml-2">
                  {fileName}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Data (JSON format)</Label>
            <Textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder={importType === "clients" ? clientExample : bookingExample}
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {importType === "clients"
                ? "Required: name. Optional: email, phone, location, status (active/lead/inactive), notes"
                : "Required: client_name or client_id, booking_reference, destination, depart_date, return_date. Optional: travelers, total_amount, status, notes"}
            </p>
          </div>

          {result && (
            <Alert variant={result.recordsFailed === 0 ? "default" : "destructive"}>
              {result.recordsFailed === 0 ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <p className="font-medium">
                  Imported: {result.recordsImported} | Failed: {result.recordsFailed}
                </p>
                {result.errors && result.errors.length > 0 && (
                  <ul className="mt-2 text-sm space-y-1">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        Row {err.index + 1}: {err.error}
                      </li>
                    ))}
                    {(result.totalErrors || 0) > 5 && (
                      <li>...and {(result.totalErrors || 0) - 5} more errors</li>
                    )}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !jsonData.trim()}>
            {isImporting ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

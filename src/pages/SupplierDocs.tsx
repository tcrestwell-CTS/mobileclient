import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Webhook, Shield, Code, FileJson, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-orchestrator/webhook`;

const eventTypes = [
  {
    event: "booking.created",
    description: "Triggered when a new booking is created in your system",
    note: "Informational only - use sync-booking endpoint for actual creation",
  },
  {
    event: "booking.updated",
    description: "Triggered when booking details are modified (amount, travelers, dates)",
    note: "Updates will be applied to matching bookings",
  },
  {
    event: "booking.cancelled",
    description: "Triggered when a booking is cancelled",
    note: "Sets booking status to 'cancelled' with audit trail",
  },
  {
    event: "booking.status_changed",
    description: "Triggered when booking status changes (confirmed, traveling, etc.)",
    note: "Status will be normalized to our internal workflow",
  },
];

const payloadFields = [
  { field: "event", type: "string", required: true, description: "Event type (booking.created, booking.updated, booking.cancelled, booking.status_changed)" },
  { field: "supplier_id", type: "string", required: true, description: "Your unique supplier identifier" },
  { field: "supplier_name", type: "string", required: true, description: "Your company/system name for audit logs" },
  { field: "confirmation_number", type: "string", required: true, description: "Your booking confirmation/reference number" },
  { field: "timestamp", type: "string", required: true, description: "ISO 8601 timestamp of the event" },
  { field: "data", type: "object", required: false, description: "Additional data depending on event type" },
];

const dataFields = [
  { field: "data.status", type: "string", description: "New status (for status_changed events)" },
  { field: "data.total_amount", type: "number", description: "Updated total amount" },
  { field: "data.travelers", type: "number", description: "Updated traveler count" },
  { field: "data.departure_date", type: "string", description: "Updated departure date (YYYY-MM-DD)" },
  { field: "data.return_date", type: "string", description: "Updated return date (YYYY-MM-DD)" },
  { field: "data.destination", type: "string", description: "Updated destination" },
];

const CodeBlock = ({ children, title }: { children: string; title?: string }) => (
  <div className="rounded-lg border border-border bg-muted/50 overflow-hidden">
    {title && (
      <div className="bg-muted px-4 py-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </div>
    )}
    <ScrollArea className="max-h-96">
      <pre className="p-4 text-sm overflow-x-auto">
        <code className="text-foreground">{children}</code>
      </pre>
    </ScrollArea>
  </div>
);

export default function SupplierDocs() {
  const examplePayloadUpdate = JSON.stringify({
    event: "booking.updated",
    supplier_id: "your-supplier-id",
    supplier_name: "Your Company Name",
    confirmation_number: "ABC123456",
    data: {
      total_amount: 4500,
      travelers: 3
    },
    timestamp: new Date().toISOString()
  }, null, 2);

  const examplePayloadCancel = JSON.stringify({
    event: "booking.cancelled",
    supplier_id: "your-supplier-id",
    supplier_name: "Your Company Name",
    confirmation_number: "ABC123456",
    data: {},
    timestamp: new Date().toISOString()
  }, null, 2);

  const examplePayloadStatus = JSON.stringify({
    event: "booking.status_changed",
    supplier_id: "your-supplier-id",
    supplier_name: "Your Company Name",
    confirmation_number: "ABC123456",
    data: {
      status: "confirmed"
    },
    timestamp: new Date().toISOString()
  }, null, 2);

  const curlExample = `curl -X POST "${WEBHOOK_URL}" \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET" \\
  -d '{
    "event": "booking.updated",
    "supplier_id": "your-supplier-id",
    "supplier_name": "Your Company Name",
    "confirmation_number": "ABC123456",
    "data": {
      "total_amount": 4500,
      "travelers": 3
    },
    "timestamp": "${new Date().toISOString()}"
  }'`;

  const successResponse = JSON.stringify({
    success: true,
    booking_id: "uuid-of-updated-booking",
    event: "booking.updated",
    updates_applied: ["total_amount", "travelers", "notes"]
  }, null, 2);

  const notFoundResponse = JSON.stringify({
    success: false,
    message: "No matching booking found",
    confirmation_number: "ABC123456"
  }, null, 2);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Webhook className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Supplier Webhook Integration</h1>
              <p className="text-muted-foreground">API documentation for integrating your booking system</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="responses">Responses</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Webhook Endpoint
                </CardTitle>
                <CardDescription>Send POST requests to this URL to sync booking updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
                  <Badge variant="secondary" className="mr-2">POST</Badge>
                  {WEBHOOK_URL}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Authentication
                </CardTitle>
                <CardDescription>Secure your webhook requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Include your webhook secret in the request headers for authentication.
                  Contact your account manager to receive your unique webhook secret.
                </p>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Required Header:</p>
                  <code className="text-sm">x-webhook-secret: YOUR_WEBHOOK_SECRET</code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  Payload Structure
                </CardTitle>
                <CardDescription>Required and optional fields for webhook payloads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">Field</th>
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-left p-3 font-medium">Required</th>
                        <th className="text-left p-3 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payloadFields.map((field) => (
                        <tr key={field.field}>
                          <td className="p-3 font-mono text-xs">{field.field}</td>
                          <td className="p-3">
                            <Badge variant="outline">{field.type}</Badge>
                          </td>
                          <td className="p-3">
                            {field.required ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <span className="text-muted-foreground">Optional</span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">{field.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Separator className="my-6" />

                <h4 className="font-medium mb-4">Data Object Fields</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">Field</th>
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-left p-3 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dataFields.map((field) => (
                        <tr key={field.field}>
                          <td className="p-3 font-mono text-xs">{field.field}</td>
                          <td className="p-3">
                            <Badge variant="outline">{field.type}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{field.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            {eventTypes.map((event) => (
              <Card key={event.event}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">{event.event}</CardTitle>
                    <Badge variant="secondary">Event</Badge>
                  </div>
                  <CardDescription>{event.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{event.note}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Examples Tab */}
          <TabsContent value="examples" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>cURL Example</CardTitle>
                <CardDescription>Complete example using cURL</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock title="Terminal">{curlExample}</CodeBlock>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>booking.updated Payload</CardTitle>
                <CardDescription>Update booking amount and traveler count</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock title="JSON">{examplePayloadUpdate}</CodeBlock>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>booking.cancelled Payload</CardTitle>
                <CardDescription>Cancel a booking</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock title="JSON">{examplePayloadCancel}</CodeBlock>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>booking.status_changed Payload</CardTitle>
                <CardDescription>Update booking status</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock title="JSON">{examplePayloadStatus}</CodeBlock>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Responses Tab */}
          <TabsContent value="responses" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">200</Badge>
                  <CardTitle>Success Response</CardTitle>
                </div>
                <CardDescription>Returned when the webhook is processed successfully</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock title="JSON">{successResponse}</CodeBlock>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-accent text-accent-foreground">200</Badge>
                  <CardTitle>No Matching Booking</CardTitle>
                </div>
                <CardDescription>Returned when no booking matches the confirmation number</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock title="JSON">{notFoundResponse}</CodeBlock>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Codes</CardTitle>
                <CardDescription>Possible error responses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Badge variant="destructive">401</Badge>
                    <span className="text-sm">Invalid or missing x-webhook-secret header</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Badge variant="destructive">400</Badge>
                    <span className="text-sm">Missing required fields (event, confirmation_number)</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Badge variant="destructive">500</Badge>
                    <span className="text-sm">Internal server error - contact support</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-12 p-6 bg-muted/50 rounded-lg border border-border">
          <h3 className="font-semibold mb-2">Need Help?</h3>
          <p className="text-sm text-muted-foreground">
            Contact your account manager for webhook secret provisioning or technical integration support.
            For urgent issues, reach out to our API support team.
          </p>
        </div>
      </div>
    </div>
  );
}

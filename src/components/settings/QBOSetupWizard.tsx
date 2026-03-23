import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  AlertTriangle,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";

interface QBOSetupWizardProps {
  onConnect: () => void;
  connectError: {
    current_origin: string;
    allowed_origins: string[];
    redirect_uri?: string;
    allowed_redirect_uris?: string[];
  } | null;
}

const KNOWN_DOMAINS = [
  "https://agents.crestwelltravels.com",
  "https://cts-agent-dash.lovable.app",
  "https://8ab51332-288c-4764-b4d9-392cc428e2fb.lovableproject.com",
];

const STEPS = [
  { id: "prereqs", label: "Prerequisites" },
  { id: "intuit", label: "Intuit Portal" },
  { id: "secrets", label: "Admin Config" },
  { id: "connect", label: "Connect" },
] as const;

export function QBOSetupWizard({ onConnect, connectError }: QBOSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [checklist, setChecklist] = useState({
    hasIntuitAccount: false,
    hasApp: false,
    addedUris: false,
    addedOrigins: false,
  });

  const currentOrigin = window.location.origin;
  const allOrigins = [...new Set([...KNOWN_DOMAINS, currentOrigin])];
  const allRedirectUris = allOrigins.map((d) => `${d}/settings?tab=integrations`);
  const originsSecretValue = allOrigins.join(",");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyButton = ({ text }: { text: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 shrink-0"
      onClick={() => copyToClipboard(text)}
    >
      {copied === text ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </Button>
  );

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const CheckItem = ({
    checked,
    onToggle,
    children,
  }: {
    checked: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-start gap-2.5 text-left w-full group"
    >
      {checked ? (
        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary" />
      )}
      <span
        className={`text-sm ${checked ? "text-muted-foreground line-through" : "text-card-foreground"}`}
      >
        {children}
      </span>
    </button>
  );

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return checklist.hasIntuitAccount && checklist.hasApp;
      case 1:
        return checklist.addedUris;
      case 2:
        return checklist.addedOrigins;
      default:
        return true;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                idx === currentStep
                  ? "bg-primary text-primary-foreground"
                  : idx < currentStep
                    ? "bg-green-100 text-green-700"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {idx < currentStep ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <span className="h-3 w-3 flex items-center justify-center text-[10px]">
                  {idx + 1}
                </span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
        {currentStep === 0 && (
          <>
            <h4 className="text-sm font-semibold text-card-foreground">
              Before You Begin
            </h4>
            <p className="text-xs text-muted-foreground">
              Make sure you have the following ready before connecting QuickBooks.
            </p>
            <div className="space-y-2.5 pt-1">
              <CheckItem
                checked={checklist.hasIntuitAccount}
                onToggle={() => toggleCheck("hasIntuitAccount")}
              >
                You have an Intuit Developer account at{" "}
                <a
                  href="https://developer.intuit.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  developer.intuit.com
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CheckItem>
              <CheckItem
                checked={checklist.hasApp}
                onToggle={() => toggleCheck("hasApp")}
              >
                You have created a QuickBooks app with <strong>Accounting</strong> and{" "}
                <strong>OpenID Connect</strong> scopes enabled
              </CheckItem>
            </div>
          </>
        )}

        {currentStep === 1 && (
          <>
            <h4 className="text-sm font-semibold text-card-foreground">
              Add Redirect URIs in Intuit Developer Portal
            </h4>
            <p className="text-xs text-muted-foreground">
              Go to your app in the{" "}
              <a
                href="https://developer.intuit.com/app/developer/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Intuit Developer Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
              , then navigate to <strong>Keys & OAuth → Redirect URIs</strong> and add each URI
              below:
            </p>
            <div className="space-y-1.5 pt-1">
              {allRedirectUris.map((uri) => (
                <div
                  key={uri}
                  className="flex items-center gap-2 bg-background border border-border rounded px-2 py-1.5"
                >
                  <code className="text-xs font-mono text-foreground flex-1 break-all">
                    {uri}
                  </code>
                  <CopyButton text={uri} />
                </div>
              ))}
            </div>
            <div className="pt-2">
              <CheckItem
                checked={checklist.addedUris}
                onToggle={() => toggleCheck("addedUris")}
              >
                I've added all the URIs above to my Intuit app's Redirect URIs
              </CheckItem>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <h4 className="text-sm font-semibold text-card-foreground">
              Update QBO_ALLOWED_ORIGINS Secret
            </h4>
            <p className="text-xs text-muted-foreground">
              In your admin portal, update the <code className="bg-muted px-1 rounded text-xs">QBO_ALLOWED_ORIGINS</code> secret
              with the comma-separated origins below (no paths, no trailing slashes):
            </p>
            <div className="bg-background border border-border rounded px-2 py-2 mt-1">
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-foreground flex-1 break-all">
                  {originsSecretValue}
                </code>
                <CopyButton text={originsSecretValue} />
              </div>
            </div>
            <div className="pt-2">
              <CheckItem
                checked={checklist.addedOrigins}
                onToggle={() => toggleCheck("addedOrigins")}
              >
                I've updated QBO_ALLOWED_ORIGINS with the value above
              </CheckItem>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <>
            <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              Ready to Connect
            </h4>
            <p className="text-xs text-muted-foreground">
              If you've completed the steps above, click below to start the OAuth flow. You'll be
              redirected to Intuit to authorize access.
            </p>

            {connectError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-destructive">
                      Connection failed — Redirect URI mismatch
                    </p>
                    <p className="text-xs text-destructive/80">
                      Origin <code className="bg-destructive/10 px-1 rounded">{connectError.current_origin}</code> is
                      not registered. Go back to Steps 2 & 3 and ensure this origin is included.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button className="w-full mt-2" onClick={onConnect}>
              Connect to QuickBooks
            </Button>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={currentStep === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-3 w-3" />
          Back
        </Button>
        {currentStep < STEPS.length - 1 && (
          <Button
            size="sm"
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canProceed()}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

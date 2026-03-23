import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, CheckCircle, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import portalHero from "@/assets/portal-hero.jpg";
import crestwellLogo from "@/assets/crestwell-logo.png";

type Mode = "choose" | "magic-link" | "sign-in" | "sign-up";

export default function PortalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("choose");
  const [searchParams] = useSearchParams();
  const { loginWithToken, loginWithPassword, signUp, session } = usePortalAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Crestwell Travel Services - Client";
    return () => { document.title = "Crestwell Travel Services - Agent"; };
  }, []);

  // Handle magic-link token from URL
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      loginWithToken(token).then((result) => {
        if (result.success) {
          navigate("/client", { replace: true });
        } else {
          toast.error(result.error || "Invalid or expired link");
        }
      });
    }
  }, [searchParams, loginWithToken, navigate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (session) navigate("/client", { replace: true });
  }, [session, navigate]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/client/login",
    });
    if (error) {
      toast.error("Failed to start Google sign in.");
      setGoogleLoading(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setAuthLoading(true);
    const result = await loginWithPassword(email, password);
    if (!result.success) {
      toast.error(result.error || "Sign in failed.");
    }
    setAuthLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setAuthLoading(true);
    const result = await signUp(email, password);
    if (!result.success) {
      toast.error(result.error || "Sign up failed.");
    } else if (result.needsConfirmation) {
      setSent(true);
    }
    setAuthLoading(false);
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-auth`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "send-magic-link", email: email.trim(), origin: window.location.origin }),
      });
      if (!res.ok) throw new Error("Failed");
      setSent(true);
    } catch {
      toast.error("Failed to send access link. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Google icon SVG
  const GoogleIcon = () => (
    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  const rightPanel = () => {
    // Confirmation / sent state
    if (sent) {
      return (
        <div className="text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold">Check Your Email</h2>
          <p className="text-muted-foreground">
            {mode === "sign-up"
              ? <>We've sent a confirmation to <strong>{email}</strong>. Click the link to activate your account.</>
              : <>If an account exists for <strong>{email}</strong>, we've sent a secure access link.</>
            }
          </p>
          <Button variant="outline" onClick={() => { setSent(false); setEmail(""); setPassword(""); setMode("choose"); }}>
            Back to Sign In
          </Button>
        </div>
      );
    }

    // Sign in with email/password
    if (mode === "sign-in") {
      return (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
            <p className="text-muted-foreground text-sm">Enter your email and password</p>
          </div>
          <form onSubmit={handlePasswordSignIn} className="space-y-4">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={authLoading}
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={authLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Sign In
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button className="text-primary underline hover:text-primary/80" onClick={() => { setMode("sign-up"); setPassword(""); }}>
              Create one
            </button>
          </p>
          <Button variant="ghost" className="w-full text-sm" onClick={() => { setMode("choose"); setPassword(""); }}>
            ← Back to sign in options
          </Button>
        </div>
      );
    }

    // Sign up with email/password
    if (mode === "sign-up") {
      return (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Create Account</h1>
            <p className="text-muted-foreground text-sm">Set up your client portal account</p>
          </div>
          <form onSubmit={handleSignUp} className="space-y-4">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={authLoading}
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={authLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Account
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button className="text-primary underline hover:text-primary/80" onClick={() => { setMode("sign-in"); setPassword(""); }}>
              Sign in
            </button>
          </p>
          <Button variant="ghost" className="w-full text-sm" onClick={() => { setMode("choose"); setPassword(""); }}>
            ← Back to sign in options
          </Button>
        </div>
      );
    }

    // Magic link mode
    if (mode === "magic-link") {
      return (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Client Portal</h1>
            <p className="text-muted-foreground text-sm">Enter your email to receive a secure access link</p>
          </div>
          <form onSubmit={handleSendLink} className="space-y-4">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={sending}
            />
            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Send Access Link
            </Button>
          </form>
          <Button variant="ghost" className="w-full text-sm" onClick={() => setMode("choose")}>
            ← Back to sign in options
          </Button>
        </div>
      );
    }

    // Choose mode (default)
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Client Portal</h1>
          <p className="text-muted-foreground text-sm">Choose how you'd like to sign in</p>
        </div>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GoogleIcon />}
            Sign in with Google
          </Button>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => setMode("sign-in")}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            Sign in with email
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button variant="ghost" className="w-full text-sm" onClick={() => setMode("magic-link")}>
            <Mail className="h-4 w-4 mr-2" />
            Send me a magic link instead
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center px-4">
          Your travel agent will have registered your email. Contact them if you have trouble signing in.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Left hero panel */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden">
        <img
          src={portalHero}
          alt="Tropical beach paradise"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <div>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 inline-block">
              <img src={crestwellLogo} alt="Crestwell Travel Services" className="h-16 w-auto" />
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-white">Your Travel Portal</h2>
            <p className="text-white/85 text-lg max-w-md">
              View your trips, track payments, download invoices, and message your travel agent — all in one place.
            </p>
          </div>
          <p className="text-white/60 text-sm">
            © {new Date().getFullYear()} Crestwell Travel Services. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right sign-in panel */}
      <div className="w-full lg:w-[40%] flex flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm flex-1 flex flex-col justify-center">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={crestwellLogo} alt="Crestwell Travel Services" className="h-14 w-auto" />
          </div>
          {rightPanel()}
        </div>
        <div className="text-center text-sm text-muted-foreground flex items-center gap-3 pt-6">
          <a href="https://crestwellgetaways.com/term-and-conditions" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline">Terms and Conditions</a>
          <span>·</span>
          <a href="https://crestwellgetaways.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}

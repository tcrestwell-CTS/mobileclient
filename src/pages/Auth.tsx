import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";
import crestwellLogo from "@/assets/crestwell-logo.png";
import { devLog, devError } from "@/lib/logger";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, signOut } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authMode, setAuthMode] = useState<"google" | "email">("google");
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [signupStep, setSignupStep] = useState<"email" | "otp" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [storedInvitationToken, setStoredInvitationToken] = useState<string | null>(null);
  const inviteToken = searchParams.get("invite");
  const switchAccount = searchParams.get("switch");
  const postAuthRunning = useRef(false);

  // If switch=true, sign out immediately
  useEffect(() => {
    if (switchAccount === "true" && user && !isSigningOut) {
      setIsSigningOut(true);
      signOut().then(() => {
        setIsSigningOut(false);
        window.history.replaceState({}, "", "/auth");
      });
    }
  }, [switchAccount, user, signOut, isSigningOut]);

  // If there's an invite token, default to signup mode but keep showing both auth options
  useEffect(() => {
    if (inviteToken) {
      setEmailMode("signup");
      // Keep authMode as "google" to show both options
    }
  }, [inviteToken]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (postAuthRunning.current) return;

    const handlePostAuth = async () => {
      postAuthRunning.current = true;
      setIsValidating(true);
      const userEmail = user.email?.toLowerCase();

      devLog("[Auth] Starting post-auth validation", {
        userId: user.id,
        userEmail,
        hasInviteToken: !!inviteToken,
        inviteToken: inviteToken ? `${inviteToken.substring(0, 8)}...` : null,
      });

      try {
        // Check if user is already a team member (has a profile)
        const { data: existingProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        devLog("[Auth] Profile check result", {
          hasProfile: !!existingProfile,
          profileId: existingProfile?.id,
          error: profileError?.message,
        });

        if (existingProfile) {
          devLog("[Auth] User has existing profile, redirecting to agent dashboard");
          navigate("/", { replace: true });
          return;
        }

        // New user - check for valid invitation
        let hasValidInvitation = false;

        // First try: Check by invite token in URL
        if (inviteToken) {
          devLog("[Auth] Checking invitation by token");
          const { data: tokenInvite, error: tokenError } = await supabase
            .from("invitations")
            .select("id, email, status, expires_at")
            .eq("token", inviteToken)
            .eq("status", "pending")
            .maybeSingle();

          devLog("[Auth] Token invitation lookup result", {
            found: !!tokenInvite,
            inviteEmail: tokenInvite?.email,
            status: tokenInvite?.status,
            expiresAt: tokenInvite?.expires_at,
            isExpired: tokenInvite ? new Date(tokenInvite.expires_at) <= new Date() : null,
            emailMatch: tokenInvite?.email === userEmail,
            error: tokenError?.message,
          });

          if (tokenInvite && new Date(tokenInvite.expires_at) > new Date()) {
            if (tokenInvite.email === userEmail) {
              hasValidInvitation = true;
              devLog("[Auth] Token matches, accepting invitation via RPC");
              const { data, error } = await supabase.rpc("accept_invitation", {
                invitation_token: inviteToken,
                accepting_user_id: user.id,
              });

              devLog("[Auth] accept_invitation RPC result (token)", {
                success: data,
                error: error?.message,
                errorCode: error?.code,
                errorDetails: error?.details,
              });

              if (error) {
                devError("[Auth] Error accepting invitation via token:", error);
                toast.error("Failed to accept invitation. Please try again.");
              } else if (data) {
                toast.success("Welcome! Your account has been set up.");
              }
            } else {
              devLog("[Auth] Email mismatch - invitation email does not match user email");
              toast.error("This invitation was sent to a different email address.");
              await signOut();
              setIsValidating(false);
              return;
            }
          } else {
            devLog("[Auth] Token invitation invalid or expired");
          }
        }

        // Second try: Fallback to email-based lookup
        if (!hasValidInvitation && userEmail) {
          devLog("[Auth] Falling back to email-based invitation lookup", { userEmail });
          const { data: emailInvite, error: emailError } = await supabase
            .from("invitations")
            .select("id, token, status, expires_at")
            .eq("email", userEmail)
            .eq("status", "pending")
            .maybeSingle();

          devLog("[Auth] Email invitation lookup result", {
            found: !!emailInvite,
            inviteId: emailInvite?.id,
            status: emailInvite?.status,
            expiresAt: emailInvite?.expires_at,
            isExpired: emailInvite ? new Date(emailInvite.expires_at) <= new Date() : null,
            error: emailError?.message,
          });

          if (emailInvite && new Date(emailInvite.expires_at) > new Date()) {
            hasValidInvitation = true;
            devLog("[Auth] Email invitation valid, accepting via RPC");
            const { data, error } = await supabase.rpc("accept_invitation", {
              invitation_token: emailInvite.token,
              accepting_user_id: user.id,
            });

            devLog("[Auth] accept_invitation RPC result (email)", {
              success: data,
              error: error?.message,
              errorCode: error?.code,
              errorDetails: error?.details,
            });

            if (error) {
              devError("[Auth] Error accepting invitation via email:", error);
              toast.error("Failed to accept invitation. Please try again.");
            } else if (data) {
              toast.success("Welcome! Your account has been set up.");
            }
          } else {
            devLog("[Auth] No valid email-based invitation found");
          }
        }

        devLog("[Auth] Final invitation status", { hasValidInvitation });

        if (!hasValidInvitation) {
          devLog("[Auth] Access denied - no valid invitation found, signing out");
          toast.error("Access denied. You must be a registered user. If not, please contact the administrator.");
          await signOut();
          setIsValidating(false);
          return;
        }

        devLog("[Auth] Invitation accepted successfully, redirecting to agent dashboard");
        navigate("/", { replace: true });
      } catch (err) {
        devError("[Auth] Unexpected error during validation:", err);
        toast.error("An error occurred while validating your access.");
        await signOut();
    } finally {
      setIsValidating(false);
      postAuthRunning.current = false;
    }
    };

    handlePostAuth();
  }, [user, loading, navigate, inviteToken, signOut]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth" + (inviteToken ? `?invite=${inviteToken}` : ""),
        extraParams: {
          prompt: "select_account",
        },
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to sign in with Google");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Sign in error:", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    setEmailError("");
    setPasswordError("");

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setEmailError(emailResult.error.errors[0].message);
      isValid = false;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setPasswordError(passwordResult.error.errors[0].message);
      isValid = false;
    }

    if (emailMode === "signup" && password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      isValid = false;
    }

    return isValid;
  };

  const handleEmailSignIn = async () => {
    if (!validateForm()) return;

    setIsSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please try again.");
        } else {
          toast.error(error.message);
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Sign in error:", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSendOtp = async () => {
    setEmailError("");
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setEmailError(emailResult.error.errors[0].message);
      return;
    }

    setIsSendingOtp(true);
    try {
      const emailLower = email.toLowerCase().trim();

      const response = await supabase.functions.invoke("send-signup-otp", {
        body: { email: emailLower },
      });

      if (response.error) {
        const errorMsg = response.error.message || "Failed to send verification code";
        toast.error(errorMsg);
        return;
      }

      const data = response.data;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      // Store the invitation token returned by the edge function
      if (data?.invitation_token) {
        setStoredInvitationToken(data.invitation_token);
      }

      toast.success("Verification code sent to your email!");
      setSignupStep("otp");
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Send OTP error:", error);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }

    setIsSigningIn(true);
    try {
      const emailLower = email.toLowerCase().trim();

      const response = await supabase.functions.invoke("send-signup-otp", {
        body: { email: emailLower, action: "verify", code: otpCode },
      });

      if (response.error) {
        toast.error("Invalid verification code. Please try again.");
        setIsSigningIn(false);
        return;
      }

      const data = response.data;
      if (data?.error) {
        if (data.error.includes("expired")) {
          toast.error("Verification code has expired. Please request a new one.");
          setSignupStep("email");
          setOtpCode("");
        } else {
          toast.error(data.error);
        }
        setIsSigningIn(false);
        return;
      }

      if (data?.verified) {
        toast.success("Email verified! Now set your password.");
        setSignupStep("password");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Verify OTP error:", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!validateForm()) return;

    setIsSigningIn(true);
    try {
      const emailLower = email.toLowerCase().trim();

      // Use the invitation token stored from the OTP step (validated server-side)
      if (!storedInvitationToken) {
        toast.error("Invitation token not found. Please start over.");
        setSignupStep("email");
        setIsSigningIn(false);
        return;
      }

      // Create the account - auto-confirm is enabled so no email verification needed
      const redirectUrl = `${window.location.origin}/auth?invite=${storedInvitationToken}`;
      const { error } = await supabase.auth.signUp({
        email: emailLower,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
          setEmailMode("signin");
          setSignupStep("email");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Account created successfully!");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Sign up error:", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <img
            src={crestwellLogo}
            alt="Crestwell Travel Services"
            className="h-14 w-auto object-contain"
          />
          <div className="flex items-center gap-3">
            <svg
              className="animate-spin h-5 w-5 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-muted-foreground">
              {isValidating ? "Setting up your account..." : "Loading..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-ocean p-12 flex-col justify-between">
        <div className="bg-white/95 rounded-xl p-4 w-fit">
          <img
            alt="Crestwell Travel Services"
            className="h-16 w-auto object-contain"
            src="/lovable-uploads/ca8734b5-c59b-4dd9-9431-498d1e25746a.png"
          />
        </div>

        <div className="space-y-6">
          <p className="text-lg text-white/80">
            Manage clients, bookings, commissions, and training all in one place.
            Built for modern travel professionals.
          </p>
          <div className="flex items-center gap-8 pt-4">
            <div>
              <p className="text-3xl font-semibold text-white">500+</p>
              <p className="text-white/70">Travel Agents</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-white">$2M+</p>
              <p className="text-white/70">Commissions Tracked</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-white">10K+</p>
              <p className="text-white/70">Bookings Made</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-white/60">
          © 2026 Crestwell Travel Services. All rights reserved.
        </p>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src={crestwellLogo}
              alt="Crestwell Travel Services"
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-semibold text-foreground tracking-tight">
              {inviteToken 
                ? (authMode === "email" && emailMode === "signup" && signupStep === "otp" 
                    ? "Verify Your Email"
                    : authMode === "email" && emailMode === "signup" && signupStep === "password"
                    ? "Set Your Password"
                    : "Accept Your Invitation")
                : (emailMode === "signup" ? "Create your account" : "Welcome back")}
            </h2>
            <p className="text-muted-foreground mt-2">
              {inviteToken 
                ? (authMode === "email" && emailMode === "signup" && signupStep === "otp"
                    ? "Enter the 6-digit code sent to your email"
                    : authMode === "email" && emailMode === "signup" && signupStep === "password"
                    ? "Choose a secure password for your account"
                    : "Choose how you'd like to create your account")
                : (emailMode === "signup" 
                    ? "Set up your account using your invited email" 
                    : "Sign in to access your travel agency dashboard")}
            </p>
          </div>

          {authMode === "google" ? (
            <div className="space-y-4">
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-3 h-12"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isSigningIn ? "Signing in..." : (inviteToken ? "Sign up with Google" : "Continue with Google")}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {inviteToken ? "Or create account with email" : "Or continue with email"}
                  </span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="lg"
                className="w-full gap-3 h-12"
                onClick={() => setAuthMode("email")}
              >
                <Mail className="h-5 w-5" />
                {inviteToken ? "Sign up with Email & Password" : "Use Email & Password"}
              </Button>

              {!inviteToken && (
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("email");
                      setEmailMode("signin");
                    }}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sign-in mode OR signup step: email */}
              {(emailMode === "signin" || (emailMode === "signup" && signupStep === "email")) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError("");
                      }}
                      className={emailError ? "border-destructive" : ""}
                    />
                    {emailError && (
                      <p className="text-sm text-destructive">{emailError}</p>
                    )}
                  </div>

                  {emailMode === "signin" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setPasswordError("");
                            }}
                            className={passwordError ? "border-destructive pr-10" : "pr-10"}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {passwordError && (
                          <p className="text-sm text-destructive">{passwordError}</p>
                        )}
                      </div>

                      <Button
                        size="lg"
                        className="w-full h-12"
                        onClick={handleEmailSignIn}
                        disabled={isSigningIn}
                      >
                        {isSigningIn ? "Signing in..." : "Sign In"}
                      </Button>
                    </>
                  )}

                  {emailMode === "signup" && (
                    <Button
                      size="lg"
                      className="w-full h-12"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                    >
                      {isSendingOtp ? "Sending verification code..." : "Send Verification Code"}
                    </Button>
                  )}
                </>
              )}

              {/* Signup step: OTP verification */}
              {emailMode === "signup" && signupStep === "otp" && (
                <>
                  <div className="text-center space-y-2">
                    <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      We sent a 6-digit code to <strong>{email}</strong>
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={setOtpCode}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button
                    size="lg"
                    className="w-full h-12"
                    onClick={handleVerifyOtp}
                    disabled={isSigningIn || otpCode.length !== 6}
                  >
                    {isSigningIn ? "Verifying..." : "Verify Code"}
                  </Button>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSignupStep("email");
                        setOtpCode("");
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      ← Back to email
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpCode("");
                        handleSendOtp();
                      }}
                      disabled={isSendingOtp}
                      className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
                    >
                      {isSendingOtp ? "Sending..." : "Resend Code"}
                    </button>
                  </div>
                </>
              )}

              {/* Signup step: Set password */}
              {emailMode === "signup" && signupStep === "password" && (
                <>
                  <div className="text-center space-y-2">
                    <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Email verified! Set your password for <strong>{email}</strong>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPasswordError("");
                        }}
                        className={passwordError ? "border-destructive pr-10" : "pr-10"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-sm text-destructive">{passwordError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <Button
                    size="lg"
                    className="w-full h-12"
                    onClick={handleEmailSignUp}
                    disabled={isSigningIn}
                  >
                    {isSigningIn ? "Creating account..." : "Create Account"}
                  </Button>
                </>
              )}

              <div className="flex flex-col gap-2 text-center">
                {!inviteToken && emailMode === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode("signup");
                      setSignupStep("email");
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    New user? Create an account
                  </button>
                )}
                {!inviteToken && emailMode === "signup" && signupStep === "email" && (
                  <button
                    type="button"
                    onClick={() => setEmailMode("signin")}
                    className="text-sm text-primary hover:underline"
                  >
                    Already have an account? Sign in
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("google");
                    setSignupStep("email");
                    setOtpCode("");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to Google sign-in
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                This site is for members of Crestwell Travel Services only. All
                data contained within is proprietary and confidential.
                Unauthorized access is subject to legal prosecution.
              </p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-center">
              <p className="text-sm font-medium text-primary">
                🔒 You must be a registered user. If not, contact the administrator.
              </p>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              By signing in, you agree to our{" "}
              <a href="https://app.crestwelltravels.com/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a href="https://app.crestwelltravels.com/privacy-policy-2" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

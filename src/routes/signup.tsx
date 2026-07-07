import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, KeyRound, Building, User } from "lucide-react";
import { registerUser, verifyOTP, registerMember, getActiveOrganizations } from "@/lib/db-actions";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — Duesly" }, { name: "description", content: "Onboard your association onto Duesly in minutes." }] }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("Market");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Dual onboarding states
  const [role, setRole] = useState<"admin" | "vendor">("admin");
  const [activeOrgs, setActiveOrgs] = useState<{ id: string; name: string; type: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [phone, setPhone] = useState("");
  const [coordinate, setCoordinate] = useState("");
  const [section, setSection] = useState("");

  // 4-step wizard state
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // OTP flow states
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Load active organizations for members to join
  useEffect(() => {
    getActiveOrganizations()
      .then(setActiveOrgs)
      .catch(console.error);
  }, []);

  const nextStep = () => {
    if (step === 2) {
      if (role === "admin") {
        if (!orgName.trim()) {
          toast.error("Please enter your organization name");
          return;
        }
      } else {
        if (!selectedOrgId) {
          toast.error("Please select an organization to join");
          return;
        }
      }
    }
    if (step === 3) {
      if (!firstName.trim() || !lastName.trim()) {
        toast.error("Please enter your first and last names");
        return;
      }
      if (role === "vendor" && (!phone.trim() || !coordinate.trim() || !section.trim())) {
        toast.error("Please complete all member details");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      nextStep();
      return;
    }

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      if (role === "admin") {
        const res = await registerUser({
          data: {
            firstName,
            lastName,
            orgName,
            orgType,
            email,
            password
          }
        });
        if (res.success) {
          if (res.otpRequired) {
            setOtpRequired(true);
            if ((res as any).devOtp) {
              toast.info(`Dev Mode: SMTP bypass active. Verification code: ${(res as any).devOtp}`, {
                duration: 10000
              });
              setOtpCode((res as any).devOtp);
            } else {
              toast.success("Verification code sent to your email!");
            }
          } else if ((res as any).user) {
            localStorage.setItem("user", JSON.stringify((res as any).user));
            toast.success(`Account created successfully! Welcome, ${firstName}.`);
            navigate({ to: "/dashboard" });
          }
        } else {
          toast.error(res.error || "Failed to create account");
        }
      } else {
        if (!selectedOrgId) {
          toast.error("Please select an organization to join");
          setLoading(false);
          return;
        }
        const res = await registerMember({
          data: {
            firstName,
            lastName,
            email,
            password,
            phone,
            orgId: selectedOrgId,
            shop: coordinate,
            section
          }
        });
        if (res.success && res.user) {
          localStorage.setItem("user", JSON.stringify(res.user));
          toast.success(`Successfully joined organization! Welcome, ${firstName}.`);
          navigate({ to: "/vendor-portal" });
        } else {
          toast.error(res.error || "Failed to self-onboard member");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error creating your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }
    setVerifying(true);
    try {
      const res = await verifyOTP({
        data: {
          email: email.toLowerCase(),
          code: otpCode
        }
      });
      if (res.success && res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        toast.success(`Email verified successfully! Welcome to Duesly, ${firstName || res.user.name}.`);
        navigate({ to: "/dashboard" });
      } else {
        toast.error(res.error || "Invalid verification code.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during verification.");
    } finally {
      setVerifying(false);
    }
  };

  if (otpRequired) {
    return (
      <AuthShell title="Verify your email" subtitle={`We sent a 6-digit code to ${email}. Enter it below to launch your portal.`}>
        <form onSubmit={handleOTPSubmit} className="space-y-4">
          <div className="space-y-2 text-center">
            <Label htmlFor="otp" className="text-left block text-xs">Verification Code</Label>
            <div className="relative">
              <Input 
                id="otp" 
                maxLength={6} 
                required 
                value={otpCode} 
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))} 
                placeholder="123456" 
                className="text-center font-display text-2xl tracking-[10px] h-12"
              />
              <KeyRound className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={verifying}>
            {verifying ? "Verifying..." : <>Confirm Verification <ArrowRight className="h-4 w-4 ml-2" /></>}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Didn't receive the email? Check your spam folder or contact support@theduesly.com.
          </p>
        </form>
      </AuthShell>
    );
  }

  // Resolve selected organization type to display correct terminology labels
  const selectedOrg = activeOrgs.find(o => o.id === selectedOrgId);
  const selectedOrgType = selectedOrg?.type || "Market";

  const coordinateLabel = selectedOrgType === "Estate" 
    ? "House / Villa / Block No" 
    : selectedOrgType === "Cooperative" 
      ? "Member ID / Staff No" 
      : "Stall / Shop Number";

  const sectionLabel = selectedOrgType === "Estate" 
    ? "Street / Zone" 
    : selectedOrgType === "Cooperative" 
      ? "Department / Division" 
      : "Market Section / Line";

  const getOrgPlaceholder = () => {
    switch (orgType) {
      case "Estate":
        return "e.g. Oakwood Heights Estate";
      case "Cooperative":
        return "e.g. Chevron Staff Thrift Cooperative";
      case "Trade-Group":
        return "e.g. Association of Nigerian Food Traders";
      default:
        return "e.g. Balogun Market Association";
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Account Type";
      case 2: return role === "admin" ? "Organization Setup" : "Find Association";
      case 3: return role === "admin" ? "Personal Profile" : "Member Details";
      case 4: return "Account Security";
      default: return "";
    }
  };

  return (
    <AuthShell 
      title={role === "admin" ? "Get your association onboard" : "Join your association"} 
      subtitle={role === "admin" ? "Set up Duesly in minutes. No card required." : "Register to access your dedicated bank account and invoices."}
    >
      {/* Moving Progress Line */}
      <div className="mb-6">
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-emerald rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground font-bold">
          <span>STEP {step} OF 4</span>
          <span className="text-navy uppercase tracking-wider font-extrabold">{getStepTitle()}</span>
        </div>
      </div>

      <form onSubmit={handleSignupSubmit} className="space-y-4">
        {/* STEP 1: ROLE SELECTION */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in-up">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Select how you want to get started with Duesly:
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  role === "admin"
                    ? "border-emerald bg-emerald/5 ring-1 ring-emerald shadow-soft"
                    : "border-border hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`grid h-8 w-8 place-items-center rounded-lg ${role === "admin" ? "bg-emerald text-white" : "bg-secondary text-navy"}`}>
                    <Building className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-navy text-sm">Organization Administrator</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                  Onboard your market plaza, residential estate, trade group, or thrift cooperative. Create dues, manage ledger lists, and auto-reconcile transfers.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole("vendor")}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  role === "vendor"
                    ? "border-emerald bg-emerald/5 ring-1 ring-emerald shadow-soft"
                    : "border-border hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`grid h-8 w-8 place-items-center rounded-lg ${role === "vendor" ? "bg-emerald text-white" : "bg-secondary text-navy"}`}>
                    <User className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-navy text-sm">Association Member / Resident</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                  Join a registered organization. View outstanding invoices, access your dedicated Nomba account number for bank transfers, and download verified receipts.
                </p>
              </button>
            </div>

            <Button type="button" onClick={nextStep} variant="hero" size="lg" className="w-full mt-2">
              Proceed to Setup <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {role === "admin" ? (
          <>
            {/* ADMIN STEP 2: ORG TYPE & NAME */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="space-y-1.5">
                  <Label>Organization Type</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[
                      { value: "Market", label: "Market / Plaza" },
                      { value: "Estate", label: "Residential Estate" },
                      { value: "Cooperative", label: "Cooperative Union" },
                      { value: "Trade-Group", label: "Trade Group" }
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setOrgType(type.value)}
                        className={`rounded-xl border p-2.5 text-center text-xs font-medium transition-all cursor-pointer ${
                          orgType === type.value
                            ? "border-emerald bg-emerald/5 text-navy font-semibold ring-1 ring-emerald"
                            : "border-border hover:bg-secondary/40 text-muted-foreground"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="org">Organization name</Label>
                  <Input 
                    id="org" 
                    required 
                    value={orgName} 
                    onChange={(e) => setOrgName(e.target.value)} 
                    placeholder={getOrgPlaceholder()} 
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="button" onClick={prevStep} variant="outline" size="lg" className="flex-1">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button type="button" onClick={nextStep} variant="hero" size="lg" className="flex-1">
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ADMIN STEP 3: PERSONAL DETAILS */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fn">First name</Label>
                    <Input id="fn" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Adaeze" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ln">Last name</Label>
                    <Input id="ln" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Okeke" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" onClick={prevStep} variant="outline" size="lg" className="flex-1">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button type="button" onClick={nextStep} variant="hero" size="lg" className="flex-1">
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ADMIN STEP 4: CREDENTIALS */}
            {step === 4 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Create password (min 6 chars)</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>

                {/* Anti-Fraud Settlement Policy Box */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-navy">Platform Payout & Anti-Fraud Policy</Label>
                  <div className="max-h-24 overflow-y-auto border border-border p-3 rounded-xl text-[10px] bg-secondary/50 text-muted-foreground leading-relaxed">
                    <p className="font-semibold text-navy mb-1">Anti-Fraud Settlement Payout Lock:</p>
                    <p className="mb-2">
                      To prevent unauthorized diversion of member dues, Duesly restricts direct admin withdrawals. All funds collected are securely settled on-rail and can only be routed to pre-authorized settlement account destinations (e.g. security service providers, central union treasury) configured during setup.
                    </p>
                    <p className="mb-2">
                      Any attempts to transfer funds to unverified personal accounts will trigger an automatic system flag, freezing the transfer pending super-admin audit.
                    </p>
                    <p>
                      By checking the box below, you acknowledge and agree to this security lock policy.
                    </p>
                  </div>
                  <label className="flex items-start gap-2 pt-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      required 
                      checked={termsAccepted} 
                      onChange={(e) => setTermsAccepted(e.target.checked)} 
                      className="mt-0.5 rounded border-border text-emerald focus:ring-emerald h-3.5 w-3.5"
                    />
                    <span className="text-[10px] text-muted-foreground select-none">
                      I agree to the Anti-Fraud Settlement Policy and Duesly's Terms.
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button type="button" onClick={prevStep} variant="outline" size="lg" className="flex-1">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button type="submit" variant="hero" size="lg" className="flex-1" disabled={loading || !termsAccepted}>
                    {loading ? "Registering..." : <>Create Admin <ArrowRight className="h-4 w-4 ml-1" /></>}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* MEMBER STEP 2: FIND ASSOCIATION */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="space-y-1.5">
                  <Label htmlFor="select-org">Select your Organization</Label>
                  <select
                    id="select-org"
                    required
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- Choose Organization --</option>
                    {activeOrgs.map(org => (
                      <option key={org.id} value={org.id}>{org.name} ({org.type})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button type="button" onClick={prevStep} variant="outline" size="lg" className="flex-1">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button type="button" onClick={nextStep} variant="hero" size="lg" className="flex-1">
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* MEMBER STEP 3: MEMBER PROFILE DETAILS */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fn">First name</Label>
                    <Input id="fn" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Adaeze" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ln">Last name</Label>
                    <Input id="ln" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Okeke" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="coord">{coordinateLabel}</Label>
                    <Input id="coord" required value={coordinate} onChange={(e) => setCoordinate(e.target.value)} placeholder="e.g. Block B-42" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sect">{sectionLabel}</Label>
                    <Input id="sect" required value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. Main Line" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 08012345678" />
                </div>

                <div className="flex gap-2">
                  <Button type="button" onClick={prevStep} variant="outline" size="lg" className="flex-1">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button type="button" onClick={nextStep} variant="hero" size="lg" className="flex-1">
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* MEMBER STEP 4: CREDENTIALS */}
            {step === 4 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Create password (min 6 chars)</Label>
                  <Input id="password" type="password" required value={password} placeholder="••••••••" />
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      required 
                      checked={termsAccepted} 
                      onChange={(e) => setTermsAccepted(e.target.checked)} 
                      className="mt-0.5 rounded border-border text-emerald focus:ring-emerald h-3.5 w-3.5"
                    />
                    <span className="text-[10px] text-muted-foreground select-none">
                      I agree to the Duesly payment policies, terms and conditions.
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button type="button" onClick={prevStep} variant="outline" size="lg" className="flex-1">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button type="submit" variant="hero" size="lg" className="flex-1" disabled={loading || !termsAccepted}>
                    {loading ? "Registering..." : <>Join Association <ArrowRight className="h-4 w-4 ml-1" /></>}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          By signing up, you agree to Duesly's <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
        <p className="text-center text-sm text-muted-foreground mt-2">
          Already have an account? <Link to="/login" className="font-semibold text-navy hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

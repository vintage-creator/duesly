import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { ArrowRight, ArrowLeft, KeyRound, Building, User, Search, Eye, EyeOff } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const filteredOrgs = useMemo(() => {
    if (!searchQuery.trim()) return activeOrgs;
    const lower = searchQuery.toLowerCase();
    return activeOrgs.filter(org => 
      org.name.toLowerCase().includes(lower) || 
      org.type.toLowerCase().includes(lower)
    );
  }, [activeOrgs, searchQuery]);
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
      if (role === "vendor") {
        if (!phone.trim() || !coordinate.trim() || !section.trim()) {
          toast.error("Please complete all member details");
          return;
        }
        const cleanPhone = phone.replace(/[\s-+]/g, "");
        if (!/^[0-9]{10,15}$/.test(cleanPhone)) {
          toast.error("Please enter a valid phone number (10 to 15 digits)");
          return;
        }
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
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

  const coordinatePlaceholder = selectedOrgType === "Estate" 
    ? "e.g. House 4, Street 2" 
    : selectedOrgType === "Cooperative" 
      ? "e.g. EMP-992" 
      : "e.g. Block B-42";

  const sectionPlaceholder = selectedOrgType === "Estate" 
    ? "e.g. Phase 2" 
    : selectedOrgType === "Cooperative" 
      ? "e.g. Accounts Dept" 
      : "e.g. Main Line";

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
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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
              <div className="space-y-4 animate-fade-in-up relative z-20">
                <div className="space-y-1.5 relative">
                  <Label>Select your Association</Label>
                  
                  {/* Custom Dropdown Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left cursor-pointer"
                    >
                      {selectedOrg ? (
                        <span className="font-semibold text-foreground">
                          {selectedOrg.name} ({selectedOrg.type})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Choose Association / Organization...</span>
                      )}
                      <span className="pointer-events-none ml-2 text-slate-400">▼</span>
                    </button>

                    {/* Dropdown Menu Popup */}
                    {dropdownOpen && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg animate-fade-in">
                        {/* Integrated Search Input */}
                        <div className="flex items-center border-b px-3 py-2 bg-slate-50/50">
                          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Type to search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex h-8 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            autoFocus
                          />
                        </div>
                        
                        {/* Scrollable Association List */}
                        <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                          {filteredOrgs.map((org) => (
                            <button
                              key={org.id}
                              type="button"
                              onClick={() => {
                                setSelectedOrgId(org.id);
                                setDropdownOpen(false);
                              }}
                              className={`flex w-full items-center rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-slate-50 cursor-pointer ${
                                selectedOrgId === org.id ? "bg-slate-100/80 text-foreground font-semibold" : "text-muted-foreground"
                              }`}
                            >
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{org.name}</p>
                                <p className="text-[10px] text-muted-foreground">{org.type} · ID: {org.id}</p>
                              </div>
                            </button>
                          ))}
                          {filteredOrgs.length === 0 && (
                            <div className="py-6 text-center text-xs text-muted-foreground">
                              No organizations found.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Backdrop Closer */}
                  {dropdownOpen && (
                    <div 
                      className="fixed inset-0 z-40 bg-transparent" 
                      onClick={() => setDropdownOpen(false)} 
                    />
                  )}
                </div>

                <div className="flex gap-2 relative z-10">
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
                    <Input id="coord" required value={coordinate} onChange={(e) => setCoordinate(e.target.value)} placeholder={coordinatePlaceholder} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sect">{sectionLabel}</Label>
                    <Input id="sect" required value={section} onChange={(e) => setSection(e.target.value)} placeholder={sectionPlaceholder} />
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
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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

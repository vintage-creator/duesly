import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DueslyLogo } from "@/components/duesly/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/duesly/status-badge";
import { ArrowDownLeft, ArrowUpRight, Copy, MessageCircle, Download, LogOut, Receipt, Search, Bell, Lock, Printer, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { formatNaira } from "@/lib/sample-data";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getVendorPortal, completeVendorOnboarding, getNotifications, markNotificationRead, clearAllNotifications, submitSupportTicket, updateUserProfile, submitWithdrawalRequest, setVendorWithdrawalPin } from "@/lib/db-actions";
import { getReceiptVerificationCode } from "@/lib/receipt-utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/vendor-portal")({
  head: () => ({ meta: [{ title: "Vendor Portal — Duesly" }, { name: "description", content: "Track your dues, dedicated account, and receipts." }] }),
  component: Page,
});

type VendorInfo = {
  id: string;
  name: string;
  shop: string;
  phone: string;
  section: string;
  virtualAccount: string;
  due: number;
  paid: number;
  status: "paid" | "partial" | "unpaid" | "overpaid";
};

type PaymentInfo = {
  id: string;
  amount: number;
  category: string;
  date: string;
  status: string;
};

type ReceiptInfo = {
  id: string;
  category: string;
  amount: number;
  date: string;
  status: string;
};

function Page() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      const localUser = localStorage.getItem("user");
      const savedLookup = sessionStorage.getItem("vendorLookupQuery");
      if (localUser || savedLookup) {
        return true;
      }
    }
    return false;
  });
  const [vendor, setVendor] = useState<any | null>(null);

  const [vPassword, setVPassword] = useState("");
  const [updatingVProfile, setUpdatingVProfile] = useState(false);

  const handleVendorProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !vendor.email) {
      toast.error("Account email is not configured. Please complete onboarding first.");
      return;
    }
    if (vPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setUpdatingVProfile(true);
    try {
      const res = await updateUserProfile({
        data: {
          email: vendor.email,
          name: vendor.name,
          password: vPassword
        }
      });
      if (res.success && res.user) {
        toast.success("Credentials updated successfully!");
        setVPassword("");
      } else {
        toast.error(res.error || "Failed to update credentials");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating credentials");
    } finally {
      setUpdatingVProfile(false);
    }
  };
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [receipts, setReceipts] = useState<ReceiptInfo[]>([]);
  const [duesCategories, setDuesCategories] = useState<any[]>([]);
  const [notiOpen, setNotiOpen] = useState(false);
  const [showAllDues, setShowAllDues] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [supportCategory, setSupportCategory] = useState("Billing Inquiry");
  const [supportMessage, setSupportMessage] = useState("");
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalBankName, setWithdrawalBankName] = useState("Zenith Bank");
  const [withdrawalAccountNumber, setWithdrawalAccountNumber] = useState("");
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Verification onboarding states
  const [isLookupOnly, setIsLookupOnly] = useState(true);
  const [onboardDialogOpen, setOnboardDialogOpen] = useState(false);
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardPassword, setOnboardPassword] = useState("");
  const [onboardPin, setOnboardPin] = useState("");
  const [submittingOnboard, setSubmittingOnboard] = useState(false);
  const [showOnboardPass, setShowOnboardPass] = useState(false);
  const [setupPinDialogOpen, setSetupPinDialogOpen] = useState(false);
  const [setupPinValue, setSetupPinValue] = useState("");
  const [submittingSetupPin, setSubmittingSetupPin] = useState(false);
  const [withdrawalPinInput, setWithdrawalPinInput] = useState("");
  const [activeNotis, setActiveNotis] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const selectedReceiptLink = selectedReceipt && typeof window !== "undefined" ? `${window.location.origin}/receipts/${selectedReceipt.id}` : "";
  const canCompleteOnboarding = isLookupOnly && !vendor?.email;

  const formatSignedNaira = (amount: number) => {
    const numericAmount = Number(amount) || 0;
    const sign = numericAmount < 0 ? "-" : "";
    return `${sign}${formatNaira(Math.abs(numericAmount))}`;
  };

  const handleCopyAccount = async () => {
    if (!vendor?.virtualAccount) return;

    await navigator.clipboard?.writeText(vendor.virtualAccount);
    setCopiedAccount(true);
    toast.success("Nomba account number copied. Paste it in your bank app.");
    window.setTimeout(() => setCopiedAccount(false), 2000);
  };

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(1046.50, audioCtx.currentTime, 0.45); // C6
      playTone(1567.98, audioCtx.currentTime + 0.12, 0.6); // G6
    } catch (err) {
      console.warn("Web Audio chime failed:", err);
    }
  };

  const fetchNotis = () => {
    if (vendor) {
      getNotifications({
        data: {
          role: "vendor",
          orgId: vendor.orgId,
          vendorId: vendor.id
        }
      })
      .then((res) => {
        setActiveNotis(res || []);
        setUnreadCount((res || []).filter((n: any) => !n.read).length);
      })
      .catch(console.error);
    }
  };

  useEffect(() => {
    if (!vendor) return;
    
    fetchNotis();

    const interval = setInterval(() => {
      getNotifications({
        data: {
          role: "vendor",
          orgId: vendor.orgId,
          vendorId: vendor.id
        }
      })
      .then((res) => {
        const fresh = res || [];
        const freshUnread = fresh.filter((n: any) => !n.read);
        
        setActiveNotis((prev) => {
          const prevIds = new Set(prev.map(p => p.id));
          const newNotifications = fresh.filter(f => !prevIds.has(f.id));
          
          if (newNotifications.length > 0) {
            playChime();
            newNotifications.forEach(n => {
              toast.success(n.title, {
                description: n.message,
                duration: 6000,
              });
            });
            const hasReconciled = newNotifications.some(n => 
              n.title.toLowerCase().includes("reconciled") || 
              n.title.toLowerCase().includes("payment") ||
              n.title.toLowerCase().includes("withdrawal") ||
              n.title.toLowerCase().includes("approved") ||
              n.title.toLowerCase().includes("refund")
            );
            if (hasReconciled) {
              const query = localStorage.getItem("user") ? (JSON.parse(localStorage.getItem("user")!).email || JSON.parse(localStorage.getItem("user")!).name) : sessionStorage.getItem("vendorLookupQuery");
              if (query) {
                getVendorPortal({ data: { searchQuery: query } }).then(freshData => {
                  if (freshData.success && freshData.vendor) {
                    setVendor(freshData.vendor as any);
                    setPayments(freshData.payments || []);
                    setReceipts(freshData.receipts || []);
                    setDuesCategories(freshData.duesCategories || []);
                  }
                });
              }
            }
          }
          return fresh;
        });
        setUnreadCount(freshUnread.length);
      })
      .catch(console.error);
    }, 5000);

    return () => clearInterval(interval);
  }, [vendor, notiOpen]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead({ data: { id } });
      fetchNotis();
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleClearAll = async () => {
    if (vendor) {
      try {
        await clearAllNotifications({
          data: {
            role: "vendor",
            orgId: vendor.orgId,
            vendorId: vendor.id
          }
        });
        toast.success("All alerts cleared!");
        fetchNotis();
      } catch (err) {
        console.error("Failed to clear notifications:", err);
      }
    }
  };

  const [sendingTicket, setSendingTicket] = useState(false);

  const handleContactAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    if (!supportMessage.trim()) {
      toast.error("Please type a message before sending");
      return;
    }
    setSendingTicket(true);
    const toastId = toast.loading("Submitting support inquiry to your administrator...");
    try {
      const res = await submitSupportTicket({
        data: {
          vendorId: vendor.id,
          orgId: vendor.orgId,
          category: supportCategory,
          message: supportMessage
        }
      });
      if (res.success) {
        toast.success("Support ticket successfully submitted! Your admin has been notified.", { id: toastId });
        setSupportMessage("");
        setSupportDialogOpen(false);
        fetchNotis();
      } else {
        toast.error(res.error || "Failed to submit support ticket", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting support ticket", { id: toastId });
    } finally {
      setSendingTicket(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    const amountNum = parseFloat(withdrawalAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount greater than ₦0");
      return;
    }
    if (amountNum > 100000) {
      toast.error("Withdrawal amount cannot exceed ₦100,000 per single request");
      return;
    }
    if (!withdrawalAccountNumber || withdrawalAccountNumber.length < 10) {
      toast.error("Please enter a valid 10-digit account number");
      return;
    }
    if (withdrawalPinInput.length !== 4) {
      toast.error("Please enter your 4-digit transaction security PIN");
      return;
    }
    setSubmittingWithdrawal(true);
    const toastId = toast.loading("Submitting withdrawal request to admin...");
    try {
      const localUser = localStorage.getItem("user");
      const parsed = localUser ? JSON.parse(localUser) : null;
      const res = await submitWithdrawalRequest({
        data: {
          vendorId: vendor.id,
          orgId: vendor.orgId,
          amount: amountNum,
          bankName: withdrawalBankName,
          accountNumber: withdrawalAccountNumber,
          email: parsed?.email || "",
          sessionToken: parsed?.sessionToken || "",
          pin: withdrawalPinInput
        }
      });
      if (res.success) {
        toast.success("Withdrawal request logged successfully! Pending administrator approval.", { id: toastId });
        setWithdrawalAmount("");
        setWithdrawalAccountNumber("");
        setWithdrawalPinInput("");
        setWithdrawalDialogOpen(false);
        fetchNotis();
      } else {
        toast.error(res.error || "Failed to log withdrawal request", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting withdrawal request", { id: toastId });
    } finally {
      setSubmittingWithdrawal(false);
    }
  };


  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-login member session from unified login screen or lookup session
  useEffect(() => {
    const localUser = localStorage.getItem("user");
    const savedLookup = sessionStorage.getItem("vendorLookupQuery");
    
    if (localUser || savedLookup) {
      setLoading(true);
      const query = localUser ? (JSON.parse(localUser).email || JSON.parse(localUser).name) : savedLookup;
      getVendorPortal({ data: { searchQuery: query } })
        .then((res) => {
          if (res.success && res.vendor) {
            setVendor(res.vendor as any);
            setDuesCategories(res.duesCategories || []);
            setPayments(res.payments || []);
            setReceipts(res.receipts || []);
            setIsLookupOnly(!localUser);
          } else {
            if (localUser) {
              localStorage.removeItem("user");
              sessionStorage.clear();
              toast.error("Your session has expired. Please sign in again.");
              navigate({ to: "/login" });
            }
          }
        })
        .catch((err) => {
          console.error(err);
          if (localUser) {
            localStorage.removeItem("user");
            sessionStorage.clear();
            navigate({ to: "/login" });
          }
        })
        .finally(() => setLoading(false));
    }
  }, []);

  // Trigger force PIN setup modal for onboarded logged-in vendors without a PIN
  useEffect(() => {
    if (vendor && !isLookupOnly && !vendor.withdrawalPinSet) {
      setSetupPinDialogOpen(true);
    } else {
      setSetupPinDialogOpen(false);
    }
  }, [vendor, isLookupOnly]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const res = await getVendorPortal({ data: { searchQuery } });
      if (res.success && res.vendor) {
        if (res.vendor.email && searchQuery.includes("@")) {
          sessionStorage.removeItem("vendorLookupQuery");
          toast.info("This vendor portal already has a secure login. Please sign in again.");
          navigate({ to: "/login", search: { email: res.vendor.email } as any });
          return;
        }
        sessionStorage.setItem("vendorLookupQuery", searchQuery);
        setVendor(res.vendor as any);
        setDuesCategories(res.duesCategories || []);
        setPayments(res.payments || []);
        setReceipts(res.receipts || []);
        setIsLookupOnly(true);
        toast.success(`Welcome, ${res.vendor.name}!`);
      } else {
        toast.error(res.error || "No matching record found.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during lookup.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    if (!onboardEmail.trim() || onboardPassword.length < 6) {
      toast.error("Please provide a valid email and a password of at least 6 characters");
      return;
    }
    if (onboardPin.length !== 4) {
      toast.error("Please choose a 4-digit transaction security PIN.");
      return;
    }
    setSubmittingOnboard(true);
    try {
      const res = await completeVendorOnboarding({
        data: {
          vendorId: vendor.id,
          email: onboardEmail,
          password: onboardPassword,
          withdrawalPin: onboardPin
        }
      });
      if (res.success && res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        setIsLookupOnly(false);
        setOnboardDialogOpen(false);
        setVendor({ ...vendor, email: onboardEmail, withdrawalPinSet: true });
        toast.success("Portal access secured! Your email login is now active.");
      } else {
        toast.error(res.error || "Failed to complete onboarding");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error securing portal credentials");
    } finally {
      setSubmittingOnboard(false);
    }
  };

  const handleSetupPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    if (setupPinValue.length !== 4) {
      toast.error("Please enter a 4-digit PIN.");
      return;
    }
    setSubmittingSetupPin(true);
    const toastId = toast.loading("Saving your withdrawal security PIN...");
    try {
      const localUser = localStorage.getItem("user");
      const parsed = localUser ? JSON.parse(localUser) : null;
      const res = await setVendorWithdrawalPin({
        data: {
          vendorId: vendor.id,
          email: parsed?.email || vendor.email || "",
          sessionToken: parsed?.sessionToken || "",
          pin: setupPinValue
        }
      });
      if (res.success) {
        toast.success("Security PIN set successfully!", { id: toastId });
        setSetupPinDialogOpen(false);
        setVendor({ ...vendor, withdrawalPinSet: true });
        setSetupPinValue("");
      } else {
        toast.error(res.error || "Failed to set security PIN", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error setting security PIN", { id: toastId });
    } finally {
      setSubmittingSetupPin(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("vendorLookupQuery");
    setVendor(null);
    setPayments([]);
    setReceipts([]);
    setDuesCategories([]);
    setShowAllDues(false);
    setSearchQuery("");
    toast.success("Signed out of portal");
  };

  if (!isMounted || (loading && !vendor)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald border-t-transparent" />
          <p className="text-sm font-medium text-slate-600 animate-pulse">Securing portal access...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4">
        <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-elevated">
          <div className="flex justify-center mb-6">
            <DueslyLogo />
          </div>
          <div className="text-center mb-6">
            <h1 className="font-display text-xl font-bold text-navy">Access Vendor Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Check your dedicated account details, current due balances, and download receipts instantly.</p>
          </div>
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <Label htmlFor="search">Lookup details</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Phone number, shop, or account number"
                  className="pl-9"
                />
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? "Searching..." : "Access Portal"}
            </Button>
          </form>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-navy underline">Go back home</Link>
          </div>
        </div>
      </div>
    );
  }

  const initials = vendor.name.split(" ").map(p => p[0]).slice(0, 2).join("");
  const outstanding = Math.max(0, vendor.due - vendor.paid);

  // Calculate active dues categories total sum
  const activeDuesTotal = duesCategories.reduce((acc, cat) => acc + parseFloat(cat.amount), 0);
  const arrearsAmount = Math.max(0, vendor.due - activeDuesTotal);

  const billsList: any[] = [];
  if (arrearsAmount > 0) {
    billsList.push({
      id: "arrears",
      name: "Arrears & Carryover Balances",
      amount: arrearsAmount,
      frequency: "Past Billing Cycles",
      isArrears: true,
      deadline: "Immediate",
      deadlineMsg: "Overdue"
    });
  }

  duesCategories.forEach(cat => {
    billsList.push({
      id: cat.id,
      name: cat.name,
      amount: parseFloat(cat.amount),
      frequency: cat.frequency,
      isArrears: false
    });
  });

  // Distribute paid amount in a waterfall manner (FIFO: Arrears first, then current dues)
  let remainingPaid = vendor ? vendor.paid : 0;
  const duesWithStatus = billsList.map(bill => {
    const billAmount = bill.amount;
    let billPaid = 0;
    let billStatus = "unpaid";
    
    if (remainingPaid >= billAmount) {
      billPaid = billAmount;
      remainingPaid -= billAmount;
      billStatus = "paid";
    } else if (remainingPaid > 0) {
      billPaid = remainingPaid;
      remainingPaid = 0;
      billStatus = "partial";
    } else {
      billStatus = "unpaid";
    }
    
    let deadline = bill.deadline;
    let deadlineMsg = bill.deadlineMsg;
    let isUrgent = bill.isArrears;

    let percentElapsed = 100;

    if (!bill.isArrears) {
      const now = new Date();
      let deadlineDate = new Date();
      let totalDays = 30;
      
      if (bill.frequency === "Daily") {
        totalDays = 1;
        deadlineDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (bill.frequency === "Weekly") {
        totalDays = 7;
        const day = now.getDay();
        const daysToFriday = (5 - day + 7) % 7;
        deadlineDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (daysToFriday === 0 ? 7 : daysToFriday));
      } else if (bill.frequency === "Monthly") {
        totalDays = 30;
        deadlineDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of month
      } else if (bill.frequency === "Quarterly") {
        totalDays = 90;
        const currentQuarter = Math.floor(now.getMonth() / 3);
        deadlineDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
      } else if (bill.frequency === "Annually") {
        totalDays = 365;
        deadlineDate = new Date(now.getFullYear(), 11, 31);
      } else {
        deadlineDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      
      const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      deadline = deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      percentElapsed = Math.min(100, Math.max(0, ((totalDays - Math.max(0, daysLeft)) / totalDays) * 100));

      if (billStatus === "paid") {
        deadlineMsg = "Fully Paid";
        percentElapsed = 100;
      } else if (daysLeft < 0) {
        deadlineMsg = `Overdue by ${Math.abs(daysLeft)} days`;
        isUrgent = true;
        percentElapsed = 100;
      } else if (daysLeft === 0) {
        deadlineMsg = "Due today!";
        isUrgent = true;
        percentElapsed = 100;
      } else {
        deadlineMsg = `${daysLeft} days left`;
        isUrgent = daysLeft <= 3;
      }
    }

    return {
      ...bill,
      paid: billPaid,
      status: billStatus,
      deadline,
      deadlineMsg,
      isUrgent,
      percentElapsed
    };
  });

  const notificationsList = [
    ...(outstanding > 0 ? [{
      id: "alert-1",
      title: "Levy Overdue Notice",
      message: `Your outstanding dues of ${formatNaira(outstanding)} are overdue. Please transfer to your dedicated payment account number.`,
      date: "Today"
    }] : []),
    ...(receipts.length > 0 ? [{
      id: "alert-2",
      title: "Payment Reconciled",
      message: `Your payment of ${formatNaira(receipts[0].amount)} was matched and receipt ${receipts[0].id} was dispatched.`,
      date: receipts[0].date
    }] : []),
    {
      id: "alert-3",
      title: "Association Announcement",
      message: "Monthly dues coordination holds this Friday at the main secretariat by 4:00 PM.",
      date: "Yesterday"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <DueslyLogo />
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-navy">{vendor.name}</p>
              <p className="text-xs text-muted-foreground">Shop {vendor.shop} · {vendor.section}</p>
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative cursor-pointer" onClick={() => setNotiOpen(!notiOpen)}>
                <Bell className="h-4 w-4 text-navy" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
                )}
              </Button>
              {notiOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-card p-3 shadow-elevated z-50 text-left text-xs animate-fade-in-up">
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <p className="font-bold text-navy">Member Alerts ({unreadCount} new)</p>
                    {activeNotis.length > 0 && (
                      <button 
                        className="text-[10px] text-emerald hover:underline font-semibold cursor-pointer" 
                        onClick={handleClearAll}
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {activeNotis.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => handleMarkRead(n.id)}
                        className={cn(
                          "border-b border-border/60 pb-2 last:border-0 last:pb-0 cursor-pointer p-2 rounded-xl transition-colors hover:bg-secondary/40",
                          !n.read ? "bg-emerald/5 border-l-2 border-l-emerald pl-2.5" : ""
                        )}
                      >
                        <p className="font-semibold text-navy text-[11px] flex items-center justify-between">
                          {n.title}
                          {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-emerald" />}
                        </p>
                        <p className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[8px] text-muted-foreground/60 mt-1">
                          {new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    ))}
                    {activeNotis.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">No member alerts.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-emerald text-sm font-semibold text-white shadow-emerald">
              {initials}
            </div>
            <Button variant="ghost" className="text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 cursor-pointer h-9 px-3 rounded-xl gap-2 font-medium" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {canCompleteOnboarding && (
          <div className="mb-6 rounded-2xl border border-emerald/20 bg-emerald/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-fade-in-up">
            <div className="space-y-1">
              <h4 className="font-bold text-navy text-sm flex items-center gap-1.5">
                <Lock className="h-4 w-4" /> Lock your portal with a password
              </h4>
              <p className="text-xs text-muted-foreground font-sans">Set up your email and password to securely log in directly next time without entering search terms.</p>
            </div>
            <Dialog open={onboardDialogOpen} onOpenChange={setOnboardDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="hero" className="shrink-0 cursor-pointer" onClick={() => setOnboardDialogOpen(true)}>Complete Onboarding</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display font-bold text-navy text-lg">Set Portal Credentials</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCompleteOnboarding} className="space-y-4 py-2">
                  <div>
                    <Label htmlFor="onboard-email">Email Address</Label>
                    <Input id="onboard-email" type="email" required value={onboardEmail} onChange={(e) => setOnboardEmail(e.target.value)} placeholder="e.g. ngozi.obi@email.com" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="onboard-pass">Choose Password</Label>
                    <div className="relative mt-1">
                      <Input 
                        id="onboard-pass" 
                        type={showOnboardPass ? "text" : "password"} 
                        required 
                        value={onboardPassword} 
                        onChange={(e) => setOnboardPassword(e.target.value)} 
                        placeholder="At least 6 characters" 
                        className="pr-10" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowOnboardPass(!showOnboardPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy cursor-pointer flex items-center justify-center"
                      >
                        {showOnboardPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="onboard-pin">Choose 4-Digit Withdrawal PIN</Label>
                    <Input 
                      id="onboard-pin" 
                      type="password" 
                      maxLength={4}
                      pattern="\d{4}"
                      required 
                      value={onboardPin} 
                      onChange={(e) => setOnboardPin(e.target.value.replace(/\D/g, ""))} 
                      placeholder="e.g. 1234 (Numbers only)" 
                      className="mt-1" 
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" onClick={() => setOnboardDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" variant="hero" disabled={submittingOnboard}>
                      {submittingOnboard ? "Completing..." : "Save & Secure Portal"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <div className="rounded-3xl bg-gradient-hero p-6 text-white shadow-elevated sm:p-8">
          <p className="text-sm text-white/70">Welcome back,</p>
          <h1 className="font-display text-3xl font-bold">{vendor.name}</h1>
          <p className="mt-1 text-sm text-white/70">{vendor.orgName} · {vendor.orgType === "Estate" ? "House" : vendor.orgType === "Cooperative" ? "Member ID" : "Shop"} {vendor.shop} · {vendor.section}</p>

          <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-white/70">Your dedicated payment account · fund from any bank</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-display text-3xl font-bold tracking-wider">{vendor.virtualAccount}</p>
                <p className="mt-0.5 text-xs text-white/70">Nomba MFB Account Number · {vendor.name}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Button variant="hero" onClick={handleCopyAccount}>
                  {copiedAccount ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedAccount ? "Copied" : "Copy Account"}
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white cursor-pointer text-xs"
                  onClick={() => setWithdrawalDialogOpen(true)}
                >
                  Request Refund / Withdrawal
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card label="Current dues" value={formatNaira(vendor.due)} sub="Total expected bill" />
          <Card label="Amount paid" value={formatNaira(vendor.paid)} sub="Total payments logged" accent="emerald" />
          <Card label="Outstanding" value={formatNaira(outstanding)} sub={<StatusBadge status={vendor.status} />} />
        </div>

        {/* Active Bills Breakdown Section */}
        <div className="mt-6 rounded-2xl border bg-card p-5 shadow-soft animate-fade-in">
          <h3 className="font-display text-lg font-bold text-navy flex items-center justify-between flex-wrap gap-2 mb-4 w-full">
            <span>Active Dues Breakdown</span>
            <Dialog>
              <DialogTrigger asChild>
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium underline flex items-center gap-1 cursor-pointer">
                  How are payments reconciled?
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-2xl p-6 bg-card border border-border shadow-elevated">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg font-bold text-navy flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" /> Automated Reconciliation
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
                  <p>
                    Your payments are fully matched and reconciled automatically. Every member gets a dedicated virtual account number.
                  </p>
                  <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-100">
                    <div className="flex gap-2">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold font-sans">1</span>
                      <p className="text-xs">Transfer money from any bank app or USSD portal to your dedicated account number.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold font-sans">2</span>
                      <p className="text-xs">Duesly matches the incoming funds with your profile reference details instantly.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold font-sans">3</span>
                      <p className="text-xs">The server updates your dashboard status and generates your official receipt automatically.</p>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <DialogTrigger asChild>
                    <Button variant="hero" className="w-full cursor-pointer">Got it, thanks!</Button>
                  </DialogTrigger>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </h3>
          
          <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {(showAllDues ? duesWithStatus : duesWithStatus.slice(0, 3)).map((item) => (
              <div key={item.id} className="min-w-[280px] sm:min-w-[310px] snap-start relative rounded-2xl border p-4 bg-background shadow-sm hover:shadow-soft transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-navy text-sm">{item.name}</h4>
                      <p className="text-[10px] text-muted-foreground uppercase mt-0.5">{item.frequency}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider",
                      item.status === "paid" ? "bg-emerald/10 text-emerald-700" :
                      item.status === "partial" ? "bg-amber/10 text-amber-700" :
                      "bg-rose/10 text-rose-700"
                    )}>
                      {item.status}
                    </span>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-baseline border-t pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Amount Due</p>
                      <p className="text-lg font-bold text-slate-800">{formatNaira(item.amount)}</p>
                    </div>
                    {item.status !== "paid" && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                        <p className="text-sm font-semibold text-rose-600">{formatNaira(item.amount - item.paid)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deadline progress track */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Deadline: {item.deadline}</span>
                    <span className={cn(
                      "font-semibold",
                      item.isUrgent && item.status !== "paid" ? "text-rose-600 animate-pulse" : "text-slate-500"
                    )}>
                      {item.deadlineMsg}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden relative">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-700 relative overflow-hidden",
                        item.status === "paid" ? "bg-emerald-500" :
                        item.isUrgent ? "bg-rose-500" :
                        "bg-blue-500"
                      )}
                      style={{ width: `${item.percentElapsed}%` }}
                    >
                      {/* Animated moving bar overlay */}
                      {item.status !== "paid" && (
                        <div className="absolute inset-0 animate-shimmer" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {duesWithStatus.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-muted-foreground w-full">
                No active dues configured for your association.
              </div>
            )}
          </div>

          {duesWithStatus.length > 3 && (
            <div className="mt-4 text-center border-t pt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAllDues(!showAllDues)}
                className="text-xs font-semibold cursor-pointer rounded-xl"
              >
                {showAllDues ? "Show Less" : `See All Active Dues (${duesWithStatus.length})`}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-soft">
            <h3 className="font-display text-lg font-bold text-navy">Payment history & receipts</h3>
            <div className="mt-3 space-y-2">
              {receipts.map((h) => {
                const isDebit = Number(h.amount) < 0;
                const amount = Math.abs(Number(h.amount));

                return (
                  <div
                    key={h.id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-3",
                      isDebit ? "border-rose-100 bg-rose-50/60" : "border-emerald-100 bg-emerald-50/60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-lg",
                          isDebit ? "bg-rose-100 text-rose-700" : "bg-emerald/10 text-emerald"
                        )}
                      >
                        {isDebit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{h.category}</p>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                              isDebit ? "bg-rose-100 text-rose-700" : "bg-emerald/10 text-emerald-700"
                            )}
                          >
                            {isDebit ? "Debit" : "Credit"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{h.id} · {h.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("font-semibold", isDebit ? "text-rose-700" : "text-emerald-700")}>
                        {isDebit ? formatSignedNaira(h.amount) : `+${formatNaira(amount)}`}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedReceipt(h);
                          setReceiptDialogOpen(true);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {receipts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/5 text-emerald">
                    <Receipt className="h-6 w-6 animate-pulse" />
                    <div className="absolute inset-0 rounded-2xl border border-emerald/10 scale-110 animate-ping opacity-25" />
                  </div>
                  <h4 className="font-semibold text-navy text-sm">No receipts generated yet</h4>
                  <p className="mt-1.5 max-w-[240px] text-xs text-muted-foreground leading-relaxed">
                    Once you make a bank transfer to your dedicated account number, your verified receipts will show up here instantly.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <h3 className="font-display text-lg font-bold text-navy">Need help?</h3>
              <p className="mt-1 text-sm text-muted-foreground">Reach your association admin directly.</p>
              <Button 
                variant="hero" 
                className="mt-4 w-full cursor-pointer" 
                onClick={() => setSupportDialogOpen(true)}
              >
                <MessageCircle className="h-4 w-4" /> Contact admin
              </Button>
            </div>

            {/* Account settings */}
            {!isLookupOnly && vendor.email && (
              <div className="rounded-2xl border bg-card p-5 shadow-soft">
                <h3 className="font-display text-base font-bold text-navy">Account Profile</h3>
                <p className="mt-1 text-xs text-muted-foreground">Manage your credentials and password.</p>
                <form onSubmit={handleVendorProfileUpdate} className="mt-3 space-y-3">
                  <div>
                    <Label className="text-xs text-slate-500">Email Address</Label>
                    <Input disabled value={vendor.email} className="bg-secondary text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">New Password</Label>
                    <Input 
                      type="password" 
                      value={vPassword} 
                      onChange={(e) => setVPassword(e.target.value)} 
                      placeholder="Type to update password" 
                      className="text-xs" 
                    />
                  </div>
                  <Button type="submit" variant="hero" size="sm" className="w-full text-xs" disabled={updatingVProfile}>
                    {updatingVProfile ? "Updating..." : "Update Credentials"}
                  </Button>
                </form>
              </div>
            )}

            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <h3 className="font-display text-base font-bold text-navy">How to pay</h3>
              <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>1. Open your bank app or USSD portal.</li>
                <li>2. Transfer to <span className="font-mono text-navy font-semibold">{vendor.virtualAccount}</span> (Nomba MFB Dedicated Account).</li>
                <li>3. Receive an instant SMS notification & receipt.</li>
              </ol>
            </div>
          </div>
        </div>
      </main>

      {/* Receipt Preview Dialog */}
      <Dialog
        open={receiptDialogOpen}
        onOpenChange={(open) => {
          setReceiptDialogOpen(open);
          if (!open) {
            window.setTimeout(() => setSelectedReceipt(null), 200);
          }
        }}
      >
        <DialogContent className="max-w-sm sm:max-w-md p-6 bg-card border border-border shadow-elevated rounded-3xl animate-fade-in-up">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-receipt, #printable-receipt * {
                visibility: visible;
              }
              #printable-receipt {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                max-width: 100%;
                border: none;
                box-shadow: none;
                background: white !important;
                color: black !important;
              }
              .print-hide {
                display: none !important;
              }
            }
          `}</style>
          <div id="printable-receipt" className="space-y-6 text-center">
            {/* Header */}
            <div className="flex flex-col items-center">
              <DueslyLogo className="scale-90" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-2.5">Official Platform Receipt</p>
              <p className="text-xs text-muted-foreground mt-0.5">Issued on behalf of {vendor?.orgName || "Ariaria Market Association"}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
                <CheckCircle2 className="h-4 w-4" /> Verified by Duesly
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-border/80" />

            {/* Amount */}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {Number(selectedReceipt?.amount || 0) < 0 ? "Amount Debited" : "Amount Received"}
              </p>
              <p className={cn(
                "font-display text-4xl font-extrabold mt-1",
                Number(selectedReceipt?.amount || 0) < 0 ? "text-rose-700" : "text-navy"
              )}>
                {selectedReceipt ? formatSignedNaira(selectedReceipt.amount) : ""}
              </p>
              <p className="text-[10px] text-muted-foreground/80 mt-1">Processed securely via Duesly Payment Infrastructure</p>
            </div>

            {/* Receipt Details Box */}
            <div className="rounded-2xl bg-secondary/40 p-4 text-left text-xs space-y-3 font-sans">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Receipt Reference</span>
                <span className="font-mono font-semibold text-navy">{selectedReceipt?.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Verification Code</span>
                <span className="font-mono font-semibold text-navy">{getReceiptVerificationCode(selectedReceipt?.id)}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-muted-foreground">Payment Rail</span>
                <span className="font-semibold text-navy">Nomba MFB Virtual Account</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payer ({vendor?.orgType === "Estate" ? "Resident" : vendor?.orgType === "Cooperative" ? "Member" : "Vendor"})</span>
                <span className="font-semibold text-navy">{vendor.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Levy Category</span>
                <span className="font-semibold text-navy">{selectedReceipt?.category}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Date</span>
                <span className="font-semibold text-navy">{selectedReceipt?.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <span className="text-emerald font-bold uppercase tracking-wider text-[10px]">{selectedReceipt?.status || "Issued"}</span>
              </div>
              <div className="border-t border-border/70 pt-3">
                <span className="text-muted-foreground">Verify Online</span>
                <p className="mt-1 break-all font-mono text-[11px] font-semibold text-navy">{selectedReceiptLink}</p>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-[10px] text-muted-foreground/60 leading-relaxed">
              This receipt exists in the Duesly receipt registry and can be verified with the reference and verification code above.
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-row justify-end gap-2 border-t pt-4 print-hide">
            <Button variant="outline" className="cursor-pointer flex-1 sm:flex-none" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="hero" className="cursor-pointer flex-1 sm:flex-none" onClick={() => {
              if (selectedReceipt) {
                window.open(`/receipts/${selectedReceipt.id}?print=true`, "_blank");
                toast.success("Opening print window...");
              }
              setReceiptDialogOpen(false);
              window.setTimeout(() => setSelectedReceipt(null), 200);
            }}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Admin / Support Request Dialog */}
      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="max-w-md p-6 bg-card border border-border shadow-elevated rounded-3xl animate-fade-in-up">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="font-display font-bold text-navy text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald" /> Contact Administrator
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleContactAdminSubmit} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="support-category" className="text-xs font-semibold text-slate-600">Inquiry Category</Label>
              <select 
                id="support-category"
                value={supportCategory}
                onChange={(e) => setSupportCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-navy outline-none focus:ring-2 focus:ring-emerald/20"
              >
                <option value="Billing Inquiry">Billing Inquiry</option>
                <option value="Facility & Shop Maintenance">Facility & Shop Maintenance</option>
                <option value="Ownership / Tenant Change Request">Ownership / Tenant Change Request</option>
                <option value="General Inquiry">General Inquiry</option>
              </select>
            </div>

            <div>
              <Label htmlFor="support-message" className="text-xs font-semibold text-slate-600">Message / Explanation</Label>
              <textarea 
                id="support-message"
                required
                rows={4}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Describe your issue or change request here..."
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-navy outline-none focus:ring-2 focus:ring-emerald/20 resize-none"
              />
            </div>

            <DialogFooter className="mt-6 flex flex-row justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" className="cursor-pointer flex-1 sm:flex-none" onClick={() => setSupportDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" className="cursor-pointer flex-1 sm:flex-none" disabled={sendingTicket}>
                {sendingTicket ? "Sending inquiry..." : "Send Inquiry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Refund / Withdrawal Dialog */}
      <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
        <DialogContent className="max-w-md p-6 bg-card border border-border shadow-elevated rounded-3xl animate-fade-in-up">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="font-display font-bold text-navy text-lg flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-emerald" /> Request Payout / Refund
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleWithdrawalSubmit} className="mt-4 space-y-4">
            <div className="bg-emerald/5 rounded-2xl p-4 border border-emerald/10 text-xs text-emerald-800 space-y-1">
              <p className="font-semibold">Dedicated Virtual Account Balance Payout</p>
              <p>You can request a withdrawal or refund of funds sitting in your virtual account. Upon admin approval, funds will be disbursed back to your personal bank account.</p>
            </div>

            <div>
              <Label htmlFor="withdrawal-amount" className="text-xs font-semibold text-slate-600">Amount (₦)</Label>
              <Input 
                id="withdrawal-amount"
                type="number"
                required
                min="1"
                placeholder="e.g. 5000"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="withdrawal-bank" className="text-xs font-semibold text-slate-600">Destination Bank Name</Label>
              <select 
                id="withdrawal-bank"
                value={withdrawalBankName}
                onChange={(e) => setWithdrawalBankName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-navy outline-none focus:ring-2 focus:ring-emerald/20"
              >
                <option value="Zenith Bank">Zenith Bank</option>
                <option value="Access Bank">Access Bank</option>
                <option value="Guaranty Trust Bank (GTB)">Guaranty Trust Bank (GTB)</option>
                <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                <option value="First Bank">First Bank</option>
                <option value="OPay (Paycom)">OPay (Paycom)</option>
                <option value="PalmPay">PalmPay</option>
                <option value="Moniepoint MFB">Moniepoint MFB</option>
                <option value="Kuda Microfinance Bank">Kuda Microfinance Bank</option>
                <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                <option value="Sterling Bank">Sterling Bank</option>
                <option value="Union Bank">Union Bank</option>
                <option value="Wema Bank">Wema Bank</option>
                <option value="Fidelity Bank">Fidelity Bank</option>
                <option value="Polaris Bank">Polaris Bank</option>
                <option value="FCMB">FCMB</option>
                <option value="Nombank MFB">Nombank MFB</option>
              </select>
            </div>

            <div>
              <Label htmlFor="withdrawal-account" className="text-xs font-semibold text-slate-600">Destination Account Number</Label>
              <Input 
                id="withdrawal-account"
                type="text"
                required
                maxLength={10}
                placeholder="10-digit Nuban account number"
                value={withdrawalAccountNumber}
                onChange={(e) => setWithdrawalAccountNumber(e.target.value.replace(/\D/g, ""))}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="withdrawal-pin-confirm" className="text-xs font-semibold text-slate-600">4-Digit Transaction security PIN</Label>
              <Input 
                id="withdrawal-pin-confirm"
                type="password"
                required
                maxLength={4}
                pattern="\d{4}"
                placeholder="Enter your 4-digit PIN"
                value={withdrawalPinInput}
                onChange={(e) => setWithdrawalPinInput(e.target.value.replace(/\D/g, ""))}
                className="mt-1.5"
              />
            </div>

            <DialogFooter className="mt-6 flex flex-row justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" className="cursor-pointer flex-1 sm:flex-none" onClick={() => setWithdrawalDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" className="cursor-pointer flex-1 sm:flex-none" disabled={submittingWithdrawal}>
                {submittingWithdrawal ? "Submitting..." : "Submit Payout"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Force Setup Withdrawal PIN Dialog */}
      <Dialog open={setupPinDialogOpen} onOpenChange={() => {}}>
        <DialogContent 
          className="max-w-md p-6 bg-card border border-border shadow-elevated rounded-3xl animate-fade-in-up" 
          onPointerDownOutside={(e) => e.preventDefault()} 
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="font-display font-bold text-navy text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald" /> Secure Your Wallet Payouts
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSetupPinSubmit} className="mt-4 space-y-4">
            <div className="bg-emerald/5 rounded-2xl p-4 border border-emerald/10 text-xs text-emerald-800 space-y-1">
              <p className="font-semibold">Setup 4-Digit Payout Security PIN</p>
              <p>For security, please set up a 4-digit transaction PIN. This PIN is required to authorize all future withdrawal and refund requests from your Duesly wallet.</p>
            </div>

            <div>
              <Label htmlFor="setup-pin-input" className="text-xs font-semibold text-slate-600">Choose 4-Digit PIN</Label>
              <Input 
                id="setup-pin-input"
                type="password"
                required
                maxLength={4}
                pattern="\d{4}"
                placeholder="Choose a 4-digit PIN (numbers only)"
                value={setupPinValue}
                onChange={(e) => setSetupPinValue(e.target.value.replace(/\D/g, ""))}
                className="mt-1.5"
              />
            </div>

            <DialogFooter className="mt-6 flex flex-row justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" className="cursor-pointer flex-1 sm:flex-none" onClick={handleLogout}>
                Sign Out
              </Button>
              <Button type="submit" variant="hero" className="cursor-pointer flex-1 sm:flex-none" disabled={submittingSetupPin}>
                {submittingSetupPin ? "Saving..." : "Set Security PIN"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Footer component */}
      <footer className="mt-16 border-t border-border/80 bg-background/50 py-8 text-center text-xs text-muted-foreground print-hide">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-navy text-sm">Duesly</span>
            <span className="text-[10px] bg-emerald/10 text-emerald-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              {vendor?.orgType === "Estate" ? "Resident Portal" : vendor?.orgType === "Cooperative" ? "Member Portal" : "Vendor Portal"}
            </span>
          </div>
          <p>© {new Date().getFullYear()} Duesly Technologies. All rights reserved. Powered by Nomba MFB.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
            <a href="#" className="hover:underline">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Card({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub: React.ReactNode; accent?: "emerald" }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold ${accent === "emerald" ? "text-emerald" : "text-foreground"}`}>{value}</p>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

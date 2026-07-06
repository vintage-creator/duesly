import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DueslyLogo } from "@/components/duesly/logo";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { submitContactForm } from "@/lib/db-actions";
import { NavigationHeader } from "@/components/duesly/header";
import { NavigationFooter } from "@/components/duesly/footer";
import { ScrollTopButton } from "@/components/duesly/scroll-top";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact Us — Duesly" }] }),
  component: Page,
});

function Page() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const res = await submitContactForm({
        data: { name, email, subject, message }
      });

      if (res.success) {
        toast.success("Message sent! Our team will get back to you shortly.");
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavigationHeader />

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald">
                Get In Touch
              </span>
              <h1 className="mt-3 font-display text-4xl font-bold text-navy sm:text-5xl">
                Let's simplify your collections.
              </h1>
              <p className="mt-4 text-base text-muted-foreground max-w-md">
                Have questions about dedicated account routing, automatic reconciliation, or onboarding your association? Fill out the form and our team will reach out within 24 hours.
              </p>

              <div className="mt-10 space-y-6">

                <div className="flex gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald/15 text-emerald">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy">Call sales</h3>
                    <p className="mt-1 text-sm text-muted-foreground">+234 (0) 706 573 7817</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald/15 text-emerald">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy">Office address</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Lekki Phase 1, Lagos, Nigeria</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-card p-8 shadow-soft">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Chinedu Okafor" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="chinedu@example.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Onboarding our cooperative" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us about your market union or estate..." />
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={sending}>
                  {sending ? "Sending..." : <>Send Message <Send className="ml-2 h-4 w-4" /></>}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <NavigationFooter />
      <ScrollTopButton />
    </div>
  );
}

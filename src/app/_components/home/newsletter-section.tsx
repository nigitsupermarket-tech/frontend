"use client";
// frontend/src/app/_components/home/newsletter-section.tsx

import { useState } from "react";
import { Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { apiPost } from "@/lib/api";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await apiPost<any>("/subscribe", {
        email: email.trim(),
        name: name.trim() || undefined,
        source: "homepage",
      });
      setMessage(res.message || "Thank you for subscribing!");
      setStatus("done");
      setEmail("");
      setName("");
    } catch (err: any) {
      setMessage(
        err?.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  return (
    <section className="bg-gradient-to-br from-green-700 to-green-800 py-16 lg:py-20">
      <div className="container max-w-4xl text-center">
        {/* Icon */}
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Mail className="w-7 h-7 text-white" />
        </div>

        <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-3">
          Stay in the Loop
        </h2>
        <p className="text-green-100 text-lg mb-8 max-w-xl mx-auto">
          Get weekly deals, new arrivals and grocery tips delivered straight to
          your inbox. No spam — unsubscribe anytime.
        </p>

        {status === "done" ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-gray-900" />
            </div>
            <p className="text-white font-semibold text-lg">{message}</p>
            <p className="text-green-200 text-sm">
              Watch your inbox for the best deals from NigitTriple PH.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your first name (optional)"
              className="flex-1 px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-green-300 focus:outline-none focus:border-amber-400 text-sm transition-colors"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address *"
              disabled={status === "loading"}
              className="flex-1 px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-green-300 focus:outline-none focus:border-amber-400 text-sm transition-colors disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-400 text-gray-900 font-bold rounded-xl hover:bg-amber-500 transition-colors disabled:opacity-60 whitespace-nowrap text-sm"
            >
              {status === "loading" ? (
                <span className="animate-pulse">Subscribing…</span>
              ) : (
                <>
                  Subscribe <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-red-300 text-sm">{message}</p>
        )}

        <p className="text-green-300 text-xs mt-6">
          Join thousands of shoppers in Nigeria already enjoying exclusive
          deals.
        </p>
      </div>
    </section>
  );
}

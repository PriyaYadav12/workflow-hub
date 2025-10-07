"use client";

import { useMemo, useState } from "react";

export type TimelineUnit = "days" | "weeks";

export type ContentCalendarFormValues = {
  productOrService: string;
  audience: string;
  goal: string;
  timelineValue: number; // integer
  timelineUnit: TimelineUnit; // days | weeks
  additionalInstructions: string;
  channels: string[];
  brandLink: string; // can be website or social profile URL
};

export type ContentCalendarFormProps = {
  initial?: Partial<ContentCalendarFormValues>;
  onSubmit: (values: ContentCalendarFormValues) => Promise<void> | void;
  submitting?: boolean;
  webhookConfigured?: boolean;
};

export default function ContentCalendarForm({ initial, onSubmit, submitting, webhookConfigured }: ContentCalendarFormProps) {
  const [values, setValues] = useState<ContentCalendarFormValues>({
    productOrService: initial?.productOrService || "",
    audience: initial?.audience || "",
    goal: initial?.goal || "",
    timelineValue: initial?.timelineValue ?? 4,
    timelineUnit: initial?.timelineUnit || "weeks",
    additionalInstructions: initial?.additionalInstructions || "",
    channels: initial?.channels || [],
    brandLink: initial?.brandLink || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const channelOptions = useMemo(
    () => [
      "Instagram",
      "Facebook",
      "YouTube",
      "Blog",
      "Email",
    ],
    []
  );

  const toggleChannel = (ch: string) => {
    setValues((prev) => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter((c) => c !== ch)
        : [...prev.channels, ch],
    }));
  };

  const isValidUrl = (s: string) => {
    try {
      // Allow bare instagram/facebook handles by prefixing in backend; here we validate only if it looks like a URL
      new URL(s);
      return true;
    } catch {
      return false;
    }
  };

  const validate = (v: ContentCalendarFormValues) => {
    const e: Record<string, string> = {};
    if (!v.productOrService.trim()) e.productOrService = "Product/Service is required";
    if (!v.audience.trim()) e.audience = "Audience is required";
    if (!v.goal.trim()) e.goal = "Goal is required";
    if (!Number.isInteger(v.timelineValue) || v.timelineValue <= 0) e.timelineValue = "Enter a positive integer";
    if (!v.timelineUnit) e.timelineUnit = "Timeline unit is required";
    if (v.channels.length === 0) e.channels = "Select at least one channel";
    if (v.brandLink && !isValidUrl(v.brandLink)) e.brandLink = "Enter a valid URL (https://...)";
    return e;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const eMap = validate(values);
    setErrors(eMap);
    if (Object.keys(eMap).length > 0) return;
    await onSubmit(values);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white/90">Content Calendar Brief</h2>
      <p className="mt-1 text-sm text-white/60">Provide inputs to generate a content calendar.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Product/Service */}
        <div>
          <label className="block text-sm font-medium text-white/80">Product/Service <span className="text-rose-300">*</span></label>
          <div className={`mt-2 rounded-xl border px-3 py-2 focus-within:ring-2 ${errors.productOrService ? "border-rose-400/50 ring-rose-400/30 bg-rose-500/5" : "border-white/15 ring-white/20 bg-white/5"}`}>
            <input
              value={values.productOrService}
              onChange={(e) => setValues((p) => ({ ...p, productOrService: e.target.value }))}
              placeholder="What are we promoting?"
              className="w-full bg-transparent outline-none text-sm placeholder-white/40"
            />
          </div>
          {errors.productOrService ? <p className="mt-1 text-xs text-rose-300">{errors.productOrService}</p> : null}
        </div>

        {/* Audience */}
        <div>
          <label className="block text-sm font-medium text-white/80">Audience <span className="text-rose-300">*</span></label>
          <div className={`mt-2 rounded-xl border px-3 py-2 focus-within:ring-2 ${errors.audience ? "border-rose-400/50 ring-rose-400/30 bg-rose-500/5" : "border-white/15 ring-white/20 bg-white/5"}`}>
            <textarea
              value={values.audience}
              onChange={(e) => setValues((p) => ({ ...p, audience: e.target.value }))}
              placeholder="Who are we targeting? Demographics, interests, markets..."
              rows={3}
              className="w-full bg-transparent outline-none text-sm placeholder-white/40 resize-y"
            />
          </div>
          {errors.audience ? <p className="mt-1 text-xs text-rose-300">{errors.audience}</p> : null}
        </div>

        {/* Goal */}
        <div>
          <label className="block text-sm font-medium text-white/80">Goal <span className="text-rose-300">*</span></label>
          <div className={`mt-2 rounded-xl border px-3 py-2 focus-within:ring-2 ${errors.goal ? "border-rose-400/50 ring-rose-400/30 bg-rose-500/5" : "border-white/15 ring-white/20 bg-white/5"}`}>
            <input
              value={values.goal}
              onChange={(e) => setValues((p) => ({ ...p, goal: e.target.value }))}
              placeholder="e.g., Awareness, Engagement, Leads, Sales"
              className="w-full bg-transparent outline-none text-sm placeholder-white/40"
            />
          </div>
          {errors.goal ? <p className="mt-1 text-xs text-rose-300">{errors.goal}</p> : null}
        </div>

        {/* Timeline */}
        <div>
          <label className="block text-sm font-medium text-white/80">Timeline <span className="text-rose-300">*</span></label>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <div className={`col-span-1 rounded-xl border px-3 py-2 focus-within:ring-2 ${errors.timelineValue ? "border-rose-400/50 ring-rose-400/30 bg-rose-500/5" : "border-white/15 ring-white/20 bg-white/5"}`}>
              <input
                type="number"
                min={1}
                step={1}
                value={values.timelineValue}
                onChange={(e) => setValues((p) => ({ ...p, timelineValue: parseInt(e.target.value, 10) }))}
                placeholder="4"
                className="w-full bg-transparent outline-none text-sm placeholder-white/40"
              />
            </div>
            <div className={`col-span-2 rounded-xl border px-3 py-2 ${errors.timelineUnit ? "border-rose-400/50 bg-rose-500/5" : "border-white/15 bg-white/5"}`}>
              <select
                value={values.timelineUnit}
                onChange={(e) => setValues((p) => ({ ...p, timelineUnit: e.target.value as TimelineUnit }))}
                className="w-full bg-transparent outline-none text-sm"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
          </div>
          {errors.timelineValue ? <p className="mt-1 text-xs text-rose-300">{errors.timelineValue}</p> : null}
        </div>

        {/* Additional Instructions */}
        <div>
          <label className="block text-sm font-medium text-white/80">Additional Instructions</label>
          <div className="mt-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 focus-within:ring-2 ring-white/20">
            <textarea
              value={values.additionalInstructions}
              onChange={(e) => setValues((p) => ({ ...p, additionalInstructions: e.target.value }))}
              placeholder="Tone, constraints, brand notes, references, hashtags, promo dates..."
              rows={4}
              className="w-full bg-transparent outline-none text-sm placeholder-white/40 resize-y"
            />
          </div>
        </div>

        {/* Brand Link (optional) */}
        <div>
          <label className="block text-sm font-medium text-white/80">Brand Link <span className="text-rose-300">*</span></label>
          <p className="mt-1 text-xs text-white/60">Website or social profile URL we can scrape for context.</p>
          <div className={`mt-3 rounded-xl border px-3 py-2 focus-within:ring-2 ${errors.brandLink ? "border-rose-400/50 ring-rose-400/30 bg-rose-500/5" : "border-white/15 ring-white/20 bg-white/5"}`}>
            <input
              value={values.brandLink}
              required
              onChange={(e) => setValues((p) => ({ ...p, brandLink: e.target.value }))}
              placeholder="https://www.brand.com or https://instagram.com/brand"
              className="w-full bg-transparent outline-none text-sm placeholder-white/40"
            />
          </div>
          {errors.brandLink ? <p className="mt-1 text-xs text-rose-300">{errors.brandLink}</p> : null}
        </div>

        {/* Channels */}
        <div>
          <div className="text-sm font-medium text-white/80">Channels <span className="text-rose-300">*</span></div>
          <div className="mt-3 flex flex-wrap gap-2">
            {channelOptions.map((ch) => {
              const active = values.channels.includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  className={`px-3 py-2 rounded-xl text-sm border transition-colors ${
                    active ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {ch}
                </button>
              );
            })}
          </div>
          {errors.channels ? <p className="mt-1 text-xs text-rose-300">{errors.channels}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-xs text-white/60">
            {webhookConfigured ? (
              <span className="bg-emerald-400/10 border border-emerald-300/20 text-emerald-200/90 px-2 py-1 rounded-lg">Webhook set</span>
            ) : (
              <span className="bg-white/5 border border-white/10 text-white/70 px-2 py-1 rounded-lg">No webhook configured</span>
            )}
          </div>
          <button
            type="submit"
            className="px-4 h-10 rounded-xl border border-indigo-400/30 bg-indigo-500/40 text-white text-sm hover:bg-indigo-500/50 disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Generate Calendar"}
          </button>
        </div>
      </form>
    </section>
  );
}

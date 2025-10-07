"use client";

import Link from "next/link";
import WebhookBar from "@/components/WebhookBar";
import { ContentCalendarUrl } from "@/data/webhookUrl";
import { useEffect, useState } from "react";
import ContentCalendarForm, { ContentCalendarFormValues } from "@/components/ContentCalendarForm";
import ContentCalendarResultPanel from "@/components/ContentCalendarResultPanel";

export default function ContentCalendarPage() {
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [submitTime, setSubmitTime] = useState<number | null>(null);
  const [lastPayload, setLastPayload] = useState<ContentCalendarFormValues | null>(null);

  // load webhook URL persisted by WebhookBar
  useEffect(() => {
    try {
      const val = localStorage.getItem("content-calendar:webhook") || ContentCalendarUrl;
      setWebhookUrl(val || "");
    } catch {}
  }, []);

  const timestamped = (form: ContentCalendarFormValues) => ({ ...form, timestamp: new Date().toISOString() });

  async function onSubmit(formValues: ContentCalendarFormValues) {
    setSubmitting(true);
    setMessage(null);
    setSubmitTime(Date.now());
    const payload = timestamped(formValues);
    setLastPayload(formValues);
    setResult(null);
    try {
      if (webhookUrl) {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "content-calendar:submit", data: payload }),
          mode: ("cors" as RequestMode),
        }).catch(() => null);

        if (res && res.ok) {
          try {
            const data = await res.json();
            setResult(data);
          } catch {
            // response might be empty or not JSON
          }
          setMessage("Submitted to webhook");
        } else {
          setMessage("Submitted locally. Configure webhook for remote processing.");
        }
      } else {
        setMessage("No webhook URL set. Saved data locally.");
      }
    } catch (err) {
      setMessage("Submit failed. Check console or webhook.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-white/60 hover:text-white/80">← Back</Link>

      <div className="mt-8">
        <WebhookBar
          title="Content Calendar"
          subtitle="Webhook configuration"
          storageKey="content-calendar:webhook"
          defaultUrl={ContentCalendarUrl}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContentCalendarForm
          submitting={submitting}
          webhookConfigured={!!webhookUrl}
          onSubmit={onSubmit}
        />
        <ContentCalendarResultPanel result={result} submitTime={submitTime} onResultUpdate={setResult} originalPayload={lastPayload}/>
      </div>

      {message ? (
        <div className="mt-4 text-xs text-white/80">{message}</div>
      ) : null}
    </main>
  );
}

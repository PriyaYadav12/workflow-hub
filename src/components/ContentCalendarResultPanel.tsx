"use client";

import { useEffect, useState } from "react";
import DownloadPdfButton from "@/components/DownloadPdfButton";
import { MOCK_RESULT } from "@/components/mockResult";
import { ContentCalendarUrl } from "@/data/webhookUrl";

const USE_MOCK = false;

/* -----------------------------
   🔧 Type Definitions
------------------------------ */
type CampaignDay = {
  day?: string;
  platform?: string;
  theme?: string;
  post_idea?: string;
  content_type?: string;
  cta?: string;
};

type BrandStrategy = Record<string, unknown>;

type WorkflowResult = {
    Product?: string;
    brand_strategy?: string | Record<string, unknown>;
    campaign_week?: { campaign?: CampaignDay[] } | CampaignDay[];
    deliverableType?: string;
    clientName?: string;
    deliverablesRequested?: string;
};

/* -----------------------------
   🧠 Recursive Renderer
------------------------------ */
function RenderDeliverable({ item }: { item: unknown }) {
  if (!item) return null;

  // Try to parse stringified JSON
  let parsed = item;
  if (typeof item === "string") {
    try {
      parsed = JSON.parse(item);
    } catch {
      parsed = item;
    }
  }

  // Primitive values
  if (typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean") {
    return <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{String(parsed)}</p>;
  }

  // Arrays
  if (Array.isArray(parsed)) {
    return (
      <div className="space-y-2 text-sm text-white/80">
        {parsed.map((val, i) => (
          <div key={i} className="leading-relaxed">
            <RenderDeliverable item={val} />
          </div>
        ))}
      </div>
    );
  }

  // Objects
  if (typeof parsed === "object" && parsed !== null) {
    const entries = Object.entries(parsed);
    return (
      <div className="space-y-4">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4 backdrop-blur-sm">
            <h6 className="text-xs font-semibold uppercase tracking-wider text-purple-300/80 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60"></span>
              {key.replace(/_/g, " ")}
            </h6>
            <RenderDeliverable item={value} />
          </div>
        ))}
      </div>
    );
  }

  return null;
}

/* -----------------------------
   🗓️ Main Component
------------------------------ */
export default function ContentCalendarResultPanel({
  result,
  submitTime,
  onResultUpdate,
  originalPayload,
}: {
  result: unknown;
  submitTime: number | null;
  onResultUpdate?: (data: unknown) => void;
  originalPayload?: unknown;
}) {
  const Testresult = USE_MOCK ? MOCK_RESULT : result;
  const [workflowTime, setWorkflowTime] = useState("--");
  const [timeSaved, setTimeSaved] = useState("--");
  const [isComplete, setIsComplete] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);


  const workflowResult = Testresult as WorkflowResult[] | WorkflowResult | null;
  // Access the first element if it's an array, otherwise use as-is
  const output = (Array.isArray(workflowResult) ? workflowResult[0] : workflowResult) || {};
  console.log('workflowResult:',workflowResult)
  /* --------------------------------
     🧭 Parse Brand Strategy JSON
  ---------------------------------- */
  let brandStrategy: BrandStrategy | null = null;
  console.log('output:',output);
  if (output.brand_strategy) {
    if (typeof output.brand_strategy === "string") {
      try {
        const parsed = JSON.parse(output.brand_strategy);
        brandStrategy = parsed.brand_strategy_brief || parsed;
      } catch {
        brandStrategy = { raw: output.brand_strategy };
      }
    } else if (typeof output.brand_strategy === "object") {
      brandStrategy = (output.brand_strategy as Record<string, unknown>).brand_strategy_brief as BrandStrategy || output.brand_strategy as BrandStrategy;
    }
  }

  /* --------------------------------
     📅 Parse Campaign Week
  ---------------------------------- */
  let campaignWeek: CampaignDay[] = [];
  if (Array.isArray(output.campaign_week)) {
    campaignWeek = output.campaign_week as CampaignDay[];
  } else if (output.campaign_week && typeof output.campaign_week === "object") {
    campaignWeek = (output.campaign_week.campaign || []) as CampaignDay[];
  }

  const hasValidResult = !!(brandStrategy || campaignWeek.length > 0);

  /* --------------------------------
     ⏱️ Workflow Timer
  ---------------------------------- */
  useEffect(() => {
    if (!submitTime || !hasValidResult || isComplete) return;

    const elapsedMs = Date.now() - submitTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    let timeStr = "";

    if (elapsedSeconds < 60) timeStr = `${elapsedSeconds}s`;
    else if (elapsedSeconds < 3600)
      timeStr = `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;
    else {
      const hours = Math.floor(elapsedSeconds / 3600);
      const minutes = Math.floor((elapsedSeconds % 3600) / 60);
      timeStr = `${hours}h ${minutes}m`;
    }

    setWorkflowTime(timeStr);

    const oldProcessSeconds = 86400;
    const savedSeconds = Math.max(0, oldProcessSeconds - elapsedSeconds);
    const savedHours = Math.floor(savedSeconds / 3600);
    const savedMinutes = Math.floor((savedSeconds % 3600) / 60);
    setTimeSaved(savedHours >= 24 ? `~${Math.floor(savedHours / 24)}d ${savedHours % 24}h` : `~${savedHours}h ${savedMinutes}m`);
    setIsComplete(true);
  }, [submitTime, hasValidResult, isComplete]);
  // 💬 Feedback handler
    const handleSendFeedback = async () => {
      if (!feedback.trim() || !workflowResult) return;
      setIsSendingFeedback(true);
      try {
        const feedbackPayload = {
          ...(typeof originalPayload === "object" && originalPayload !== null ? originalPayload : {}),
          type: "feedback",
          feedback: feedback.trim(),
          timestamp: new Date().toISOString(),
        };
  
        const webhookUrl =
          localStorage.getItem("content-calendar:webhook") || ContentCalendarUrl;
  
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "content-calendar:submit",
            data: feedbackPayload,
          }),
        });
        console.log('response:',response)
        if (response.ok) {
          try {
            const data = await response.json();
            if (onResultUpdate && data) onResultUpdate(data);
          } catch (error) {
            console.error("Failed to parse response:", error);
          }
          setFeedbackSent(true);
          setTimeout(() => {
            setFeedback("");
            setFeedbackSent(false);
          }, 3000);
        } else {
          console.error("Feedback response not OK:", response.status);
        }
      } catch (error) {
        console.error("Failed to send feedback:", error);
      } finally {
        setIsSendingFeedback(false);
      }
    };
  /* --------------------------------
     🎨 Render UI
  ---------------------------------- */
  return (
    <aside className="lg:sticky lg:top-8 h-fit rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-white/90">Result</h3>
      <p className="mt-1 text-sm text-white/60">
        {hasValidResult
          ? "Your generated strategy and campaign plan are ready!"
          : "This area will display your content calendar and strategy output."}
      </p>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
        {hasValidResult ? (
          <div className="space-y-6">
            {/* ⚡ Workflow Time Tracker */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/30 p-4 shadow-lg shadow-green-500/5">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-400/30 flex items-center justify-center">
                    <span className="text-lg">⚡</span>
                  </div>
                  <span className="text-sm font-semibold text-white/90">Workflow Performance</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-black/20 border border-white/10">
                    <div className="text-xs font-medium text-green-300/70 mb-1">Current Workflow</div>
                    <div className="text-xl font-bold text-green-300">{workflowTime}</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-black/20 border border-white/10">
                    <div className="text-xs font-medium text-white/50 mb-1">Old Process</div>
                    <div className="text-xl font-bold text-white/40">1 day</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-black/20 border border-emerald-400/20">
                    <div className="text-xs font-medium text-emerald-300/70 mb-1">Time Saved</div>
                    <div className="text-xl font-bold text-emerald-400">{timeSaved}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* 📤 Download PDF */}
            <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 p-4">
              <DownloadPdfButton result={Testresult} disabled={!hasValidResult} />
            </div>
            {/* 🧭 Brand Strategy */}
            {brandStrategy && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                    <span className="text-base">🧭</span>
                  </div>
                  <h4 className="text-base font-bold text-white/90">Brand Strategy</h4>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/5 p-5 shadow-lg shadow-purple-500/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/5 to-transparent"></div>
                  <div className="relative">
                    <RenderDeliverable item={brandStrategy} />
                  </div>
                </div>
              </div>
            )}

            {/* 📅 Campaign Week */}
            {campaignWeek.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                    <span className="text-base">📅</span>
                  </div>
                  <h4 className="text-base font-bold text-white/90">Campaign Calendar</h4>
                </div>
                <div className="space-y-4">
                  {campaignWeek.map((day, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-blue-500/5 p-5 shadow-lg shadow-blue-500/5 hover:shadow-blue-500/10 transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-transparent"></div>
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/30">
                            <span className="text-sm font-bold text-blue-300">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-base font-bold text-white/95">
                              {day.day || `Day ${index + 1}`}
                            </h5>
                            <p className="text-xs text-blue-300/80 font-medium">{day.platform}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {day.theme && (
                            <div className="rounded-lg bg-black/20 border border-white/10 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs">🎨</span>
                                <h6 className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">Theme</h6>
                              </div>
                              <p className="text-sm text-white/85 leading-relaxed">{day.theme}</p>
                            </div>
                          )}
                          {day.post_idea && (
                            <div className="rounded-lg bg-black/20 border border-white/10 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs">💡</span>
                                <h6 className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">Post Idea</h6>
                              </div>
                              <p className="text-sm text-white/85 leading-relaxed">{day.post_idea}</p>
                            </div>
                          )}
                          {day.content_type && (
                            <div className="rounded-lg bg-black/20 border border-white/10 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs">📹</span>
                                <h6 className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">Content Type</h6>
                              </div>
                              <p className="text-sm text-white/85 leading-relaxed">{day.content_type}</p>
                            </div>
                          )}
                          {day.cta && (
                            <div className="rounded-lg bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-400/30 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs">🎯</span>
                                <h6 className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">Call to Action</h6>
                              </div>
                              <p className="text-sm text-white/85 leading-relaxed font-medium">{day.cta}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Section */}
            <div className="border-t border-white/10 pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white/80">💬 Feedback</span>
                {feedbackSent && (
                  <span className="text-xs text-green-400 animate-pulse">✓ Sent successfully!</span>
                )}
              </div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your thoughts, request revisions, or provide additional context..."
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none transition-all"
                rows={4}
                disabled={isSendingFeedback || feedbackSent}
              />
              <button
                onClick={handleSendFeedback}
                disabled={!feedback.trim() || isSendingFeedback || feedbackSent}
                className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 disabled:shadow-none"
              >
                {isSendingFeedback ? "Sending..." : feedbackSent ? "Sent ✓" : "Send Feedback"}
              </button>
            </div>
          </div>
        ) : Testresult ? (
          <pre className="text-xs text-white/80 whitespace-pre-wrap break-words">
            {JSON.stringify(Testresult, null, 2)}
          </pre>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
              <span className="text-2xl">🗓️</span>
            </div>
            <p className="text-sm text-white/60">
              No result yet. Submit the form to preview your content calendar.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

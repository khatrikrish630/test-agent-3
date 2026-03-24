import { useState, useEffect, useCallback } from "react";
import { Badge, Card, Button, TabBar, TextArea, Input } from "./components/UI.jsx";
import { generateContent, publishToFacebook, checkHealth, toggleScheduler, getSchedulerStatus } from "./lib/api.js";
import { RUSSELL_BRUNSON_FRAMEWORKS, GHL_TOPICS, DREAM_CUSTOMER_KEYWORDS, POST_TIMES } from "./lib/constants.js";

export default function App() {
  const [activeTab, setActiveTab] = useState("content");
  const [serverStatus, setServerStatus] = useState(null);

  // Content state
  const [selectedFramework, setSelectedFramework] = useState("hook_story_offer");
  const [customTopic, setCustomTopic] = useState("");
  const [generatedPost, setGeneratedPost] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [postQueue, setPostQueue] = useState([]);
  const [postHistory, setPostHistory] = useState([]);

  // Schedule state
  const [schedulerOn, setSchedulerOn] = useState(false);

  // Groups state
  const [savedPosts, setSavedPosts] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [postReplies, setPostReplies] = useState({});

  // Leads state
  const [dreamAvatar, setDreamAvatar] = useState({ keywords: "GoHighLevel, GHL, funnel builder, marketing automation, CRM setup", location: "", industry: "Digital Marketing Agency" });
  const [scrapedLeads, setScrapedLeads] = useState([]);
  const [friendQueue, setFriendQueue] = useState([]);
  const [isScrapingLeads, setIsScrapingLeads] = useState(false);

  // Publish state
  const [publishStates, setPublishStates] = useState({});

  // ─── Check server health on mount ────────────────────────────────────────
  useEffect(() => {
    checkHealth()
      .then(setServerStatus)
      .catch(() => setServerStatus({ status: "error", fbConfigured: false, anthropicConfigured: false }));
  }, []);

  // ─── CONTENT GENERATION ──────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const framework = RUSSELL_BRUNSON_FRAMEWORKS[selectedFramework];
      const topic = customTopic || GHL_TOPICS[Math.floor(Math.random() * GHL_TOPICS.length)];
      const result = await generateContent(framework.template("GoHighLevel (GHL) Expert", topic));
      setGeneratedPost(result.text);
    } catch (err) {
      setGeneratedPost(`⚠️ Error: ${err.message}`);
    }
    setIsGenerating(false);
  }, [selectedFramework, customTopic]);

  const handleGenerateImage = useCallback(async () => {
    try {
      const result = await generateContent(
        `Based on this Facebook post, create a simple, clean image description for an accompanying graphic. The image should be a branded quote card or visual that reinforces the post's message. Keep the description under 50 words. Post: "${generatedPost.substring(0, 500)}"`,
        "You describe social media graphics. Be specific about colors, text overlay, and layout."
      );
      setGeneratedImage({ prompt: result.text, status: "ready" });
    } catch (err) {
      setGeneratedImage({ prompt: `Error: ${err.message}`, status: "error" });
    }
  }, [generatedPost]);

  const handleAddToQueue = useCallback(() => {
    if (!generatedPost) return;
    const now = new Date();
    const nextSlot = new Date(now);
    nextSlot.setHours(postQueue.length % 2 === 0 ? 9 : 21, 0, 0, 0);
    if (nextSlot <= now) nextSlot.setDate(nextSlot.getDate() + 1);
    nextSlot.setDate(nextSlot.getDate() + Math.floor(postQueue.length / 2));

    setPostQueue((prev) => [...prev, {
      id: Date.now().toString(),
      content: generatedPost,
      framework: selectedFramework,
      image: generatedImage,
      scheduledFor: nextSlot.toISOString(),
      status: "queued",
      createdAt: new Date().toISOString(),
    }]);
    setGeneratedPost("");
    setGeneratedImage(null);
  }, [generatedPost, selectedFramework, generatedImage, postQueue.length]);

  // ─── PUBLISH ─────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async (post) => {
    setPublishStates((p) => ({ ...p, [post.id]: { loading: true, error: null, success: false } }));
    try {
      const result = await publishToFacebook(post.content);
      setPublishStates((p) => ({ ...p, [post.id]: { loading: false, error: null, success: true } }));
      setTimeout(() => {
        setPostQueue((prev) => prev.filter((p) => p.id !== post.id));
        setPostHistory((prev) => [{ ...post, fbPostId: result.postId, publishedAt: new Date().toISOString(), status: "published" }, ...prev]);
        setPublishStates((p) => { const n = { ...p }; delete n[post.id]; return n; });
      }, 1500);
    } catch (err) {
      setPublishStates((p) => ({ ...p, [post.id]: { loading: false, error: err.message, success: false } }));
    }
  }, []);

  // ─── GROUP REPLY GENERATION ──────────────────────────────────────────────
  const handleGenerateReply = useCallback(async (post) => {
    setPostReplies((p) => ({ ...p, [post.id]: { loading: true, reply: null, error: null, copied: false } }));
    try {
      const result = await generateContent(
        `You are a GoHighLevel (GHL) Expert who just saw this post in a Facebook group. This person is a potential client/lead.

Their post: "${post.content}"
Their name: ${post.authorName}
Group: ${post.groupName}

Write a helpful, genuine comment reply that:
- Addresses them by first name naturally
- Offers real value or insight related to their need
- Positions you as an expert WITHOUT being salesy
- Ends with a soft invitation to connect (DM, call, etc.)
- Keep it under 80 words
- Sound like a real human helping out, NOT a bot or marketer
- Reference something specific from their post to show you actually read it`,
        "You write authentic, helpful Facebook group comments that position the author as a knowledgeable expert. Never sound like a bot."
      );
      setPostReplies((p) => ({ ...p, [post.id]: { loading: false, reply: result.text, error: null, copied: false } }));
    } catch (err) {
      setPostReplies((p) => ({ ...p, [post.id]: { loading: false, reply: null, error: err.message, copied: false } }));
    }
  }, []);

  const handleRegenerateReply = useCallback(async (post) => {
    setPostReplies((p) => ({ ...p, [post.id]: { ...p[post.id], loading: true, error: null } }));
    try {
      const result = await generateContent(
        `You are a GHL Expert. Write a DIFFERENT reply to this Facebook group post than before. Be creative, use a new angle.

Their post: "${post.content}"
Their name: ${post.authorName}
Group: ${post.groupName}

Rules: Under 80 words, genuine, positions you as expert, ends with soft CTA. No bot phrases.`,
        "You write authentic Facebook group comments. Each generation should feel unique."
      );
      setPostReplies((p) => ({ ...p, [post.id]: { loading: false, reply: result.text, error: null, copied: false } }));
    } catch (err) {
      setPostReplies((p) => ({ ...p, [post.id]: { ...p[post.id], loading: false, error: err.message } }));
    }
  }, []);

  const handleCopyReply = useCallback((postId) => {
    const reply = postReplies[postId]?.reply;
    if (reply) {
      navigator.clipboard.writeText(reply);
      setPostReplies((p) => ({ ...p, [postId]: { ...p[postId], copied: true } }));
      setTimeout(() => setPostReplies((p) => ({ ...p, [postId]: { ...p[postId], copied: false } })), 2000);
    }
  }, [postReplies]);

  // ─── GROUP SCANNING (mock + real structure) ──────────────────────────────
  const handleScanGroups = useCallback(async () => {
    setIsScanning(true);
    const mockResults = [
      { id: "gp_" + Date.now() + "_1", groupName: "GoHighLevel Official Community", authorName: "Sarah Mitchell", content: "HIRING: Looking for an experienced GHL expert to set up our agency's automations, funnels, and reputation management. Budget: $2,000-5,000. Must have portfolio. DM me!", postedAt: new Date(Date.now() - 3600000).toISOString(), matchedKeywords: ["GHL expert", "hiring", "funnels", "automations"], priority: "high" },
      { id: "gp_" + Date.now() + "_2", groupName: "Digital Marketing Agency Owners", authorName: "Mark Thompson", content: "Does anyone know a good funnel builder who also understands GoHighLevel? Need someone ASAP for a client project. Willing to pay premium for quality work.", postedAt: new Date(Date.now() - 7200000).toISOString(), matchedKeywords: ["funnel builder", "GoHighLevel"], priority: "high" },
      { id: "gp_" + Date.now() + "_3", groupName: "GHL Automation Masters", authorName: "Jessica Lee", content: "Looking for recommendations: Who's the best GHL automation expert you've worked with? Need help with a complex workflow involving Twilio + GHL + Stripe integration.", postedAt: new Date(Date.now() - 14400000).toISOString(), matchedKeywords: ["GHL automation expert"], priority: "medium" },
    ];
    setTimeout(() => { setSavedPosts((prev) => [...mockResults, ...prev]); setIsScanning(false); }, 2000);
  }, []);

  // ─── LEAD SCRAPING (mock) ────────────────────────────────────────────────
  const handleScrapLeads = useCallback(async () => {
    setIsScrapingLeads(true);
    const mockLeads = [
      { id: "l1_" + Date.now(), name: "David Park", title: "Agency Owner at GrowthSpark", mutualFriends: 12, matchScore: 95, keywords: ["GHL", "agency"], status: "new" },
      { id: "l2_" + Date.now(), name: "Amanda Foster", title: "Marketing Consultant", mutualFriends: 8, matchScore: 88, keywords: ["funnel builder", "CRM"], status: "new" },
      { id: "l3_" + Date.now(), name: "Ryan Nguyen", title: "Founder at DigitalFlow Agency", mutualFriends: 15, matchScore: 92, keywords: ["automation", "GHL"], status: "new" },
      { id: "l4_" + Date.now(), name: "Emily Carter", title: "Real Estate Marketing Expert", mutualFriends: 5, matchScore: 78, keywords: ["CRM", "lead gen"], status: "new" },
      { id: "l5_" + Date.now(), name: "Jason Williams", title: "SaaS Agency Owner", mutualFriends: 20, matchScore: 97, keywords: ["GoHighLevel", "white label"], status: "new" },
    ];
    setTimeout(() => { setScrapedLeads((prev) => [...mockLeads, ...prev]); setIsScrapingLeads(false); }, 3000);
  }, []);

  const addToFriendQueue = useCallback((lead) => {
    setFriendQueue((prev) => [...prev, { ...lead, queuedAt: new Date().toISOString() }]);
    setScrapedLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: "queued" } : l)));
  }, []);

  // ─── STATUS BANNER ───────────────────────────────────────────────────────
  const StatusBanner = () => {
    if (!serverStatus) return (
      <div style={{ padding: "12px 32px", background: "rgba(251,191,36,0.08)", borderBottom: "1px solid rgba(251,191,36,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
        <span style={{ color: "#fbbf24", fontSize: 13 }}>Connecting to backend server...</span>
      </div>
    );
    if (serverStatus.status === "error") return (
      <div style={{ padding: "12px 32px", background: "rgba(248,113,113,0.08)", borderBottom: "1px solid rgba(248,113,113,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
        <span>❌</span>
        <span style={{ color: "#f87171", fontSize: 13 }}>Backend server not running. Start it with <code style={{ background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>npm run dev</code></span>
      </div>
    );
    if (!serverStatus.anthropicConfigured) return (
      <div style={{ padding: "12px 32px", background: "rgba(251,191,36,0.08)", borderBottom: "1px solid rgba(251,191,36,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
        <span>⚠️</span>
        <span style={{ color: "#fbbf24", fontSize: 13 }}>Add your <code style={{ background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>ANTHROPIC_API_KEY</code> to the .env file to enable AI content generation.</span>
      </div>
    );
    return null;
  };

  // ─── CONTENT TAB ─────────────────────────────────────────────────────────
  const ContentTab = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <h3 style={{ color: "#f9fafb", fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 16, fontFamily: "'Instrument Serif', serif" }}>Russell Brunson Framework</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(RUSSELL_BRUNSON_FRAMEWORKS).map(([key, fw]) => (
              <div key={key} onClick={() => setSelectedFramework(key)} style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${selectedFramework === key ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.06)"}`, background: selectedFramework === key ? "rgba(96,165,250,0.08)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ color: selectedFramework === key ? "#60a5fa" : "#d1d5db", fontSize: 13, fontWeight: 600 }}>{fw.name}</div>
                <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{fw.description}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 style={{ color: "#f9fafb", fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 12, fontFamily: "'Instrument Serif', serif" }}>Topic</h3>
          <Input value={customTopic} onChange={setCustomTopic} placeholder="Enter a topic or leave blank for AI-suggested..." />
          <button onClick={() => setCustomTopic(GHL_TOPICS[Math.floor(Math.random() * GHL_TOPICS.length)])} style={{ marginTop: 8, background: "none", border: "none", color: "#60a5fa", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0 }}>
            🎲 Random GHL topic
          </button>
        </Card>
        <Button variant="primary" size="lg" onClick={handleGenerate} disabled={isGenerating} style={{ width: "100%" }}>
          {isGenerating ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</span> Generating with {RUSSELL_BRUNSON_FRAMEWORKS[selectedFramework].name}...</> : <>✨ Generate Post</>}
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: "#f9fafb", fontSize: 16, fontWeight: 600, margin: 0, fontFamily: "'Instrument Serif', serif" }}>Post Preview</h3>
            <Badge variant={generatedPost ? "success" : "default"}>{generatedPost ? "Ready" : "Empty"}</Badge>
          </div>
          {generatedPost ? (
            <div>
              <div style={{ background: "#1c1e21", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>Y</div>
                  <div>
                    <div style={{ color: "#e4e6eb", fontSize: 14, fontWeight: 600 }}>Your Name</div>
                    <div style={{ color: "#b0b3b8", fontSize: 12 }}>Just now · 🌐</div>
                  </div>
                </div>
                <div style={{ color: "#e4e6eb", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto" }}>{generatedPost}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <Button variant="success" size="sm" onClick={handleAddToQueue}>📅 Add to Queue</Button>
                <Button variant="secondary" size="sm" onClick={handleGenerateImage}>🖼️ Generate Image</Button>
                <Button variant="secondary" size="sm" onClick={handleGenerate}>🔄 Regenerate</Button>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(generatedPost)}>📋 Copy</Button>
              </div>
              {generatedImage && (
                <div style={{ marginTop: 16, padding: 16, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12 }}>
                  <div style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>IMAGE PROMPT</div>
                  <div style={{ color: "#d1d5db", fontSize: 13, lineHeight: 1.6 }}>{generatedImage.prompt}</div>
                  <p style={{ color: "#6b7280", fontSize: 11, marginTop: 8, marginBottom: 0 }}>Use this prompt in Midjourney / DALL-E / Canva AI to create the image</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "#4b5563" }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>✍️</div>
              <p style={{ fontSize: 14 }}>Select a framework and generate your first post</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );

  // ─── SCHEDULE TAB ────────────────────────────────────────────────────────
  const ScheduleTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Card><div style={{ color: "#6b7280", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Queued Posts</div><div style={{ color: "#f9fafb", fontSize: 32, fontWeight: 700, fontFamily: "'Instrument Serif', serif", marginTop: 4 }}>{postQueue.length}</div><div style={{ color: "#4b5563", fontSize: 12, marginTop: 2 }}>{Math.ceil(postQueue.length / 2)} days of content</div></Card>
        <Card><div style={{ color: "#6b7280", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Published</div><div style={{ color: "#34d399", fontSize: 32, fontWeight: 700, fontFamily: "'Instrument Serif', serif", marginTop: 4 }}>{postHistory.length}</div><div style={{ color: "#4b5563", fontSize: 12, marginTop: 2 }}>Total posts sent</div></Card>
        <Card><div style={{ color: "#6b7280", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Schedule</div><div style={{ color: "#60a5fa", fontSize: 32, fontWeight: 700, fontFamily: "'Instrument Serif', serif", marginTop: 4 }}>2x</div><div style={{ color: "#4b5563", fontSize: 12, marginTop: 2 }}>Posts per day (9 AM / 9 PM)</div></Card>
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "#f9fafb", fontSize: 18, fontWeight: 600, margin: 0, fontFamily: "'Instrument Serif', serif" }}>Post Queue</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant={schedulerOn ? "danger" : "success"} size="sm" onClick={async () => { try { const r = await toggleScheduler(); setSchedulerOn(r.enabled); } catch(e) { setSchedulerOn(!schedulerOn); } }}>
              {schedulerOn ? "⏸ Pause Auto-Post" : "▶️ Enable Auto-Post"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setActiveTab("content")}>+ Create Post</Button>
          </div>
        </div>
        {postQueue.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#4b5563" }}><div style={{ fontSize: 48, opacity: 0.5, marginBottom: 12 }}>📭</div><p>No posts queued. Generate content first!</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {postQueue.map((post, i) => (
              <div key={post.id} style={{ display: "flex", gap: 16, padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, alignItems: "flex-start" }}>
                <div style={{ minWidth: 36, height: 36, borderRadius: 10, background: "rgba(96,165,250,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa", fontWeight: 700, fontSize: 14 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#d1d5db", fontSize: 13, lineHeight: 1.6, maxHeight: 60, overflow: "hidden" }}>{post.content.substring(0, 150)}...</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                    <Badge>{RUSSELL_BRUNSON_FRAMEWORKS[post.framework]?.name}</Badge>
                    <Badge variant="info">{new Date(post.scheduledFor).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} {new Date(post.scheduledFor).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</Badge>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="success" size="sm" onClick={() => handlePublish(post)} disabled={publishStates[post.id]?.loading || publishStates[post.id]?.success}>
                      {publishStates[post.id]?.loading ? "⏳ Publishing..." : publishStates[post.id]?.success ? "✅ Published!" : "Publish Now"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setPostQueue((prev) => prev.filter((p) => p.id !== post.id))} disabled={publishStates[post.id]?.loading}>✕</Button>
                  </div>
                  {publishStates[post.id]?.error && <div style={{ fontSize: 11, color: "#f87171", maxWidth: 220, textAlign: "right", lineHeight: 1.4 }}>{publishStates[post.id].error}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {postHistory.length > 0 && (
        <Card>
          <h3 style={{ color: "#f9fafb", fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 16, fontFamily: "'Instrument Serif', serif" }}>Published History</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {postHistory.map((post, i) => (
              <div key={post.fbPostId || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)", borderRadius: 10 }}>
                <div style={{ color: "#d1d5db", fontSize: 13 }}>{post.content.substring(0, 80)}...</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#6b7280", fontSize: 11 }}>{new Date(post.publishedAt).toLocaleString()}</span>
                  <Badge variant="success">Published</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  // ─── GROUPS TAB ──────────────────────────────────────────────────────────
  const GroupsTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <h3 style={{ color: "#f9fafb", fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 8, fontFamily: "'Instrument Serif', serif" }}>Group Monitor</h3>
        <p style={{ color: "#6b7280", fontSize: 13, margin: 0, marginBottom: 16 }}>Scans for posts mentioning GHL, funnel building, hiring automation experts, and more.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>{DREAM_CUSTOMER_KEYWORDS.map((kw) => <Badge key={kw} variant="info">{kw}</Badge>)}</div>
        <Button variant="primary" onClick={handleScanGroups} disabled={isScanning}>{isScanning ? "⏳ Scanning Groups..." : "🔍 Scan Groups Now"}</Button>
      </Card>

      {savedPosts.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: "#f9fafb", fontSize: 18, fontWeight: 600, margin: 0, fontFamily: "'Instrument Serif', serif" }}>Matched Posts ({savedPosts.length})</h3>
            <Badge variant="live">Live Monitoring</Badge>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {savedPosts.map((post) => (
              <div key={post.id} style={{ padding: 20, background: post.priority === "high" ? "rgba(52,211,153,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${post.priority === "high" ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)"}`, borderRadius: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ color: "#f9fafb", fontSize: 14, fontWeight: 600 }}>{post.authorName}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{post.groupName}</div>
                  </div>
                  <Badge variant={post.priority === "high" ? "success" : "warning"}>{post.priority === "high" ? "🔥 Hot Lead" : "Warm"}</Badge>
                </div>
                <p style={{ color: "#d1d5db", fontSize: 13, lineHeight: 1.7, margin: "12px 0" }}>{post.content}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{post.matchedKeywords.map((kw) => <Badge key={kw} variant="info">{kw}</Badge>)}</div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button variant="success" size="sm" onClick={() => handleGenerateReply(post)} disabled={postReplies[post.id]?.loading}>
                    {postReplies[post.id]?.loading ? "⏳ Generating..." : postReplies[post.id]?.reply ? "💬 Reply Ready" : "💬 Generate Reply"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(post.content)}>📌 Save Post</Button>
                </div>

                {postReplies[post.id]?.loading && (
                  <div style={{ marginTop: 12, padding: 16, background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⚙️</span>
                      <span style={{ color: "#60a5fa", fontSize: 13 }}>Crafting a personalized reply for {post.authorName}...</span>
                    </div>
                  </div>
                )}

                {postReplies[post.id]?.reply && !postReplies[post.id]?.loading && (
                  <div style={{ marginTop: 12, padding: 16, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ color: "#34d399", fontSize: 12, fontWeight: 600, letterSpacing: "0.03em" }}>YOUR AI-GENERATED REPLY</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button variant="ghost" size="sm" onClick={() => handleCopyReply(post.id)}>{postReplies[post.id]?.copied ? "✅ Copied!" : "📋 Copy"}</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRegenerateReply(post)}>🔄 New Version</Button>
                      </div>
                    </div>
                    <div style={{ color: "#e5e7eb", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>{postReplies[post.id].reply}</div>
                    <p style={{ color: "#6b7280", fontSize: 11, marginTop: 8, marginBottom: 0 }}>Copy this reply and paste it as a comment on their post in the Facebook group.</p>
                  </div>
                )}

                {postReplies[post.id]?.error && !postReplies[post.id]?.loading && (
                  <div style={{ marginTop: 12, padding: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10 }}>
                    <span style={{ color: "#f87171", fontSize: 13 }}>{postReplies[post.id].error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  // ─── LEADS TAB ───────────────────────────────────────────────────────────
  const LeadsTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <h3 style={{ color: "#f9fafb", fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 16, fontFamily: "'Instrument Serif', serif" }}>Dream Customer Avatar</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Keywords / Interests</label><TextArea value={dreamAvatar.keywords} onChange={(v) => setDreamAvatar((p) => ({ ...p, keywords: v }))} rows={3} /></div>
            <div><label style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Industry</label><Input value={dreamAvatar.industry} onChange={(v) => setDreamAvatar((p) => ({ ...p, industry: v }))} /></div>
            <div><label style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Location (optional)</label><Input value={dreamAvatar.location} onChange={(v) => setDreamAvatar((p) => ({ ...p, location: v }))} /></div>
            <Button variant="primary" onClick={handleScrapLeads} disabled={isScrapingLeads}>{isScrapingLeads ? "⏳ Scraping Leads..." : "🔎 Find Leads"}</Button>
          </div>
        </Card>
        <Card>
          <h3 style={{ color: "#f9fafb", fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 12, fontFamily: "'Instrument Serif', serif" }}>Friend Request Queue</h3>
          <p style={{ color: "#6b7280", fontSize: 13, margin: 0, marginBottom: 16 }}>Approved leads waiting to be added. Max 10-15/day to stay safe.</p>
          {friendQueue.length === 0 ? <div style={{ textAlign: "center", padding: 24, color: "#4b5563" }}><p style={{ fontSize: 13 }}>No leads in queue yet.</p></div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {friendQueue.map((lead) => (<div key={lead.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}><div><div style={{ color: "#d1d5db", fontSize: 13, fontWeight: 500 }}>{lead.name}</div><div style={{ color: "#6b7280", fontSize: 11 }}>{lead.title}</div></div><Badge variant="warning">Pending</Badge></div>))}
            </div>
          )}
        </Card>
      </div>

      {scrapedLeads.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: "#f9fafb", fontSize: 18, fontWeight: 600, margin: 0, fontFamily: "'Instrument Serif', serif" }}>Scraped Leads ({scrapedLeads.length})</h3>
            <Button variant="secondary" size="sm" onClick={() => scrapedLeads.filter((l) => l.status === "new").forEach(addToFriendQueue)}>Add All to Queue</Button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead><tr>{["Name", "Title", "Match", "Mutual", "Keywords", "Status", "Action"].map((h) => (<th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>))}</tr></thead>
              <tbody>
                {scrapedLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td style={{ padding: "12px", color: "#e5e7eb", fontSize: 13, fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{lead.name}</td>
                    <td style={{ padding: "12px", color: "#9ca3af", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{lead.title}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ color: lead.matchScore >= 90 ? "#34d399" : lead.matchScore >= 80 ? "#fbbf24" : "#9ca3af", fontWeight: 700, fontSize: 13 }}>{lead.matchScore}%</span></td>
                    <td style={{ padding: "12px", color: "#9ca3af", fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{lead.mutualFriends}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><div style={{ display: "flex", gap: 4 }}>{lead.keywords.map((kw) => <Badge key={kw}>{kw}</Badge>)}</div></td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><Badge variant={lead.status === "queued" ? "warning" : "default"}>{lead.status}</Badge></td>
                    <td style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{lead.status === "new" && <Button variant="success" size="sm" onClick={() => addToFriendQueue(lead)}>+ Queue</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );

  // ─── RENDER ──────────────────────────────────────────────────────────────
  const tabs = [
    { id: "content", label: "Content Engine", icon: "✍️" },
    { id: "schedule", label: "Schedule", icon: "📅", count: postQueue.length },
    { id: "groups", label: "Group Monitor", icon: "🔍", count: savedPosts.length },
    { id: "leads", label: "Lead Scraper", icon: "🎯", count: scrapedLeads.length },
  ];

  return (
    <div>
      <StatusBanner />
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚡</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "'Instrument Serif', serif", color: "#f9fafb" }}>Facebook AI Agent</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>GHL Expert Edition · Russell Brunson Frameworks</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {serverStatus?.status === "ok" && <Badge variant="live">Server Connected</Badge>}
          {serverStatus?.fbConfigured && <Badge variant="success">FB Ready</Badge>}
        </div>
      </div>
      <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}><TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} /></div>
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          {activeTab === "content" && <ContentTab />}
          {activeTab === "schedule" && <ScheduleTab />}
          {activeTab === "groups" && <GroupsTab />}
          {activeTab === "leads" && <LeadsTab />}
        </div>
      </div>
    </div>
  );
}

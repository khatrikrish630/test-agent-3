import React from 'react';

export const Badge = ({ children, variant = "default" }) => {
  const colors = {
    default: { bg: "rgba(255,255,255,0.06)", color: "#9ca3af", border: "rgba(255,255,255,0.08)" },
    success: { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.2)" },
    warning: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.2)" },
    danger: { bg: "rgba(248,113,113,0.1)", color: "#f87171", border: "rgba(248,113,113,0.2)" },
    info: { bg: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "rgba(96,165,250,0.2)" },
    live: { bg: "rgba(52,211,153,0.15)", color: "#34d399", border: "rgba(52,211,153,0.3)" },
  };
  const c = colors[variant] || colors.default;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {variant === "live" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", animation: "pulse 2s infinite" }} />}
      {children}
    </span>
  );
};

export const Card = ({ children, style, onClick, hoverable }) => (
  <div
    onClick={onClick}
    style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: 24,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      cursor: hoverable ? "pointer" : "default",
      ...style,
    }}
    onMouseEnter={(e) => { if (hoverable) { e.currentTarget.style.borderColor = "rgba(96,165,250,0.3)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
    onMouseLeave={(e) => { if (hoverable) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "translateY(0)"; } }}
  >
    {children}
  </div>
);

export const Button = ({ children, variant = "primary", size = "md", onClick, disabled, style }) => {
  const variants = {
    primary: { bg: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", shadow: "0 4px 15px rgba(59,130,246,0.3)" },
    secondary: { bg: "rgba(255,255,255,0.06)", color: "#d1d5db", border: "1px solid rgba(255,255,255,0.1)", shadow: "none" },
    success: { bg: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none", shadow: "0 4px 15px rgba(16,185,129,0.3)" },
    danger: { bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", shadow: "none" },
    ghost: { bg: "transparent", color: "#9ca3af", border: "1px solid transparent", shadow: "none" },
  };
  const sizes = { sm: { px: 12, py: 6, fs: 12 }, md: { px: 20, py: 10, fs: 13 }, lg: { px: 28, py: 14, fs: 14 } };
  const v = variants[variant];
  const s = sizes[size];
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: v.bg, color: v.color, border: v.border, boxShadow: v.shadow, padding: `${s.py}px ${s.px}px`, fontSize: s.fs, fontWeight: 600, borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.01em", transition: "all 0.2s ease", display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", ...style }}>
      {children}
    </button>
  );
};

export const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
    {tabs.map((tab) => (
      <button key={tab.id} onClick={() => onChange(tab.id)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: active === tab.id ? "rgba(59,130,246,0.15)" : "transparent", color: active === tab.id ? "#60a5fa" : "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 16 }}>{tab.icon}</span>
        {tab.label}
        {tab.count !== undefined && (
          <span style={{ background: active === tab.id ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 10, fontSize: 11 }}>{tab.count}</span>
        )}
      </button>
    ))}
  </div>
);

export const TextArea = ({ value, onChange, placeholder, rows = 4, style }) => (
  <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16, color: "#e5e7eb", fontSize: 14, fontFamily: "'DM Sans', sans-serif", resize: "vertical", outline: "none", lineHeight: 1.7, boxSizing: "border-box", transition: "border-color 0.2s", ...style }} onFocus={(e) => (e.target.style.borderColor = "rgba(96,165,250,0.4)")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")} />
);

export const Input = ({ value, onChange, placeholder, type = "text", style }) => (
  <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px", color: "#e5e7eb", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", ...style }} onFocus={(e) => (e.target.style.borderColor = "rgba(96,165,250,0.4)")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")} />
);

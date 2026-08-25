import React, { useState, useMemo, useEffect } from "react";
import {
  Search, MapPin, Calendar, Users, ChevronRight, ChevronLeft, QrCode,
  TrendingUp, Wallet, Package, LayoutGrid, Star, Clock, ArrowRight,
  CreditCard, Smartphone, Building2, CheckCircle2, Car, Plane,
  Mountain, Waves, User, LogIn, Ticket, Download, Copy, ArrowUpRight,
  Upload, ShieldCheck, MessageCircle, Send, CircleDashed, XCircle, FileCheck2,
  HelpCircle, Inbox, Mail, Star as StarIcon, ThumbsUp, Gift, CalendarClock
} from "lucide-react";

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');";

const palette = {
  ocean: "#0F3A3D",
  teal: "#166E73",
  tealLight: "#E5F1EF",
  sand: "#F4ECDA",
  sandDeep: "#E9DBBB",
  rice: "#6E8F45",
  coral: "#E1613C",
  coralDark: "#B8471F",
  ink: "#182421",
  inkSoft: "#4B5854",
};

const PRODUCTS = [
  {
    id: "gili-snorkel",
    type: "tour",
    typeLabel: "Tour",
    title: "Gili Islands Snorkeling Trip",
    location: "Gili Trawangan, Meno & Air",
    duration: "8 hours",
    price: 75,
    rating: 5.0,
    reviews: 214,
    icon: Waves,
    color: palette.teal,
    desc: "A full day among three islands, turtles, and reef — private boat, private guide, no fixed groups.",
  },
  {
    id: "rinjani-trek",
    type: "activity",
    typeLabel: "Activity",
    bookingMode: "request_confirmation",
    title: "Mount Rinjani Trek — Summit",
    location: "Mount Rinjani, North Lombok",
    duration: "3 days / 2 nights",
    price: 345,
    rating: 5.0,
    reviews: 168,
    icon: Mountain,
    color: palette.rice,
    desc: "Crater rim to summit, guided by locals who've climbed it for decades. Camping and meals included.",
  },
  {
    id: "car-driver",
    type: "car_hire",
    typeLabel: "Car hire",
    title: "Private Car with Driver",
    location: "Anywhere in Lombok",
    duration: "From 6 hours",
    price: 32,
    rating: 4.9,
    reviews: 96,
    icon: Car,
    color: palette.coral,
    desc: "Air-conditioned car, English-speaking driver, fuel included. Pick your car size and duration — go wherever the day takes you.",
    priceIDR: 450000,
  },
  {
    id: "airport-transfer",
    type: "transport",
    typeLabel: "Transport",
    title: "Airport Transfer",
    location: "Lombok International Airport ⇄ your area",
    duration: "Point-to-point",
    rating: 4.8,
    reviews: 302,
    icon: Plane,
    color: palette.ocean,
    desc: "Meet-and-greet transfer, priced by your starting area. Flight tracked — we wait if you're delayed.",
    priceIDR: 270000,
  },
];

const MEETING_POINTS = [
  "Senggigi",
  "Kuta Lombok",
  "Gili Bangsal Harbour",
  "Lombok International Airport",
  "Mataram City",
  "Other — enter your address",
];

const CAR_TYPES = [
  {
    id: "avanza",
    model: "Toyota Avanza",
    capacity: 4,
    packages: [
      {
        hours: 6, overtimePerHour: 60000,
        pricesByArea: { "Senggigi": 450000, "Kuta Lombok": 500000, "Gili Bangsal Harbour": 480000, "Lombok International Airport": 420000, "Mataram City": 440000 },
      },
      {
        hours: 8, overtimePerHour: 60000,
        pricesByArea: { "Senggigi": 550000, "Kuta Lombok": 600000, "Gili Bangsal Harbour": 580000, "Lombok International Airport": 520000, "Mataram City": 540000 },
      },
      {
        hours: 10, overtimePerHour: 60000,
        pricesByArea: { "Senggigi": 650000, "Kuta Lombok": 720000, "Gili Bangsal Harbour": 690000, "Lombok International Airport": 610000, "Mataram City": 630000 },
      },
    ],
  },
  {
    id: "innova",
    model: "Toyota Innova",
    capacity: 6,
    packages: [
      {
        hours: 6, overtimePerHour: 75000,
        pricesByArea: { "Senggigi": 600000, "Kuta Lombok": 660000, "Gili Bangsal Harbour": 640000, "Lombok International Airport": 570000, "Mataram City": 590000 },
      },
      {
        hours: 8, overtimePerHour: 75000,
        pricesByArea: { "Senggigi": 730000, "Kuta Lombok": 800000, "Gili Bangsal Harbour": 770000, "Lombok International Airport": 690000, "Mataram City": 710000 },
      },
      {
        hours: 10, overtimePerHour: 75000,
        pricesByArea: { "Senggigi": 850000, "Kuta Lombok": 930000, "Gili Bangsal Harbour": 900000, "Lombok International Airport": 800000, "Mataram City": 820000 },
      },
    ],
  },
];

function areaPrice(pricesByArea, meetingPoint) {
  if (pricesByArea[meetingPoint] != null) return { price: pricesByArea[meetingPoint], isEstimate: false };
  const max = Math.max(...Object.values(pricesByArea));
  return { price: max, isEstimate: true };
}

const TRANSPORT_PRICES = {
  "Senggigi": 270000,
  "Kuta Lombok": 480000,
  "Gili Bangsal Harbour": 320000,
  "Lombok International Airport": 150000,
  "Mataram City": 220000,
};

const REVIEWS = {
  "gili-snorkel": [
    { name: "Sofia M.", rating: 5, date: "2 weeks ago", text: "Anto took great care of us all day. Saw turtles at Gili Meno, would book again." },
    { name: "James T.", rating: 5, date: "1 month ago", text: "Private boat, no crowds, exactly as described. Great value." },
    { name: "Priya R.", rating: 4, date: "1 month ago", text: "Lovely trip, water was a little choppy in the afternoon but still worth it." },
  ],
  "rinjani-trek": [
    { name: "Mark D.", rating: 5, date: "3 weeks ago", text: "Tough but incredible. Guide knew exactly when to push and when to rest the group." },
    { name: "Elin S.", rating: 5, date: "2 months ago", text: "Best sunrise of my life. Camp food was better than expected too." },
  ],
  "car-driver": [
    { name: "Rachel K.", rating: 5, date: "1 week ago", text: "Driver was on time, car was spotless, very flexible with our stops." },
  ],
  "airport-transfer": [
    { name: "Tom B.", rating: 5, date: "4 days ago", text: "Flight was delayed 40 min and they were still there waiting. Perfect." },
    { name: "Wei L.", rating: 4, date: "2 weeks ago", text: "Smooth transfer, driver spoke good English." },
  ],
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "tour", label: "Tours" },
  { key: "activity", label: "Activities" },
  { key: "car_hire", label: "Car hire" },
  { key: "transport", label: "Transport" },
];

const SALES_DATA = [
  { month: "Mar", commission: 410000 },
  { month: "Apr", commission: 620000 },
  { month: "May", commission: 545000 },
  { month: "Jun", commission: 890000 },
  { month: "Jul", commission: 1120000 },
  { month: "Aug", commission: 980000 },
];

const AGENT_BOOKINGS = [
  { id: "BK-8841", product: "Gili Islands Snorkeling Trip", date: "18 Aug 2026", pax: 2, commission: 90000, status: "confirmed" },
  { id: "BK-8836", product: "Airport Transfer — LOP", date: "17 Aug 2026", pax: 4, commission: 21600, status: "confirmed" },
  { id: "BK-8829", product: "Private Car with Driver", date: "15 Aug 2026", pax: 1, commission: 66000, status: "completed" },
  { id: "BK-8811", product: "Mount Rinjani Trek", date: "12 Aug 2026", pax: 2, commission: 414000, status: "completed" },
];

const PAYOUTS = [
  { period: "July 2026", amount: 1120000, status: "paid", date: "5 Aug 2026" },
  { period: "June 2026", amount: 890000, status: "paid", date: "5 Jul 2026" },
  { period: "May 2026", amount: 545000, status: "paid", date: "5 Jun 2026" },
  { period: "August 2026", amount: 980000, status: "pending", date: "5 Sep 2026 (upcoming)" },
];

function fmtIDR(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

function Pill({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize: 13,
        fontWeight: 600,
        padding: "8px 16px",
        borderRadius: 999,
        border: `1px solid ${active ? palette.teal : palette.sandDeep}`,
        background: active ? palette.teal : "transparent",
        color: active ? "#fff" : palette.inkSoft,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function Badge({ children, tone = "sand" }) {
  const tones = {
    sand: { bg: palette.sand, color: palette.ink },
    teal: { bg: palette.tealLight, color: palette.teal },
    coral: { bg: "#FCE6DD", color: palette.coralDark },
    green: { bg: "#EAF1DF", color: "#3F5A22" },
    gray: { bg: "#EFEDE6", color: palette.inkSoft },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        padding: "4px 9px",
        borderRadius: 6,
        background: t.bg,
        color: t.color,
      }}
    >
      {children}
    </span>
  );
}

function ProductIllustration({ product, size = 64 }) {
  const Icon = product.icon;
  return (
    <div
      style={{
        width: "100%",
        height: size,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${product.color}1A, ${product.color}33)`,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, opacity: 0.5 }} viewBox="0 0 200 80" preserveAspectRatio="none">
        <path d="M0,60 Q40,20 80,50 T160,40 T200,55" stroke={product.color} strokeWidth="1.5" fill="none" strokeDasharray="3,4" opacity="0.6" />
      </svg>
      <Icon size={28} color={product.color} strokeWidth={1.6} />
    </div>
  );
}

function ProductCard({ product, onClick, showCommission, commissionPct, onAsk }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `1px solid ${palette.sandDeep}`,
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        background: "#fff",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(15,58,61,0.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ padding: 10 }}>
        <ProductIllustration product={product} size={110} />
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Badge tone="teal">{product.typeLabel}</Badge>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft }}>
            <Star size={12} fill={palette.coral} color={palette.coral} />
            {product.rating} <span style={{ color: "#B7B2A2" }}>({product.reviews})</span>
          </div>
        </div>
        <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600, color: palette.ink, margin: "0 0 6px" }}>
          {product.title}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft, marginBottom: 4 }}>
          <MapPin size={12} /> {product.location}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft, marginBottom: 12 }}>
          <Clock size={12} /> {product.duration}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A9A290" }}>From{product.priceIDR ? " (Senggigi)" : ""}</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, color: palette.ocean }}>
              {product.priceIDR ? fmtIDR(product.priceIDR) : `$${product.price}`}
            </div>
          </div>
          {showCommission && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A9A290" }}>Your cut</div>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 14, fontWeight: 500, color: palette.rice }}>
                {commissionPct}%
              </div>
            </div>
          )}
        </div>
        {onAsk && (
          <button
            onClick={(e) => { e.stopPropagation(); onAsk(product); }}
            style={{
              width: "100%", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: palette.tealLight, border: "none", borderRadius: 8, padding: "8px 0",
              fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.teal, cursor: "pointer",
            }}
          >
            <HelpCircle size={13} /> Ask about this
          </button>
        )}
      </div>
    </div>
  );
}

function TopSwitch({ mode, setMode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: palette.sand,
        borderRadius: 999,
        padding: 4,
        gap: 2,
      }}
    >
      {["customer", "agent", "admin"].map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            padding: "8px 18px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            background: mode === m ? palette.ocean : "transparent",
            color: mode === m ? "#fff" : palette.inkSoft,
            transition: "all 0.15s",
          }}
        >
          {m === "customer" ? "Traveler app" : m === "agent" ? "Agency portal" : "Admin (preview)"}
        </button>
      ))}
    </div>
  );
}

function Header({ mode, setMode, agentQR, onAccountClick, isLoggedIn, onSignInClick }) {
  return (
    <div style={{ padding: "20px 28px", borderBottom: `1px solid ${palette.sandDeep}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: palette.ocean, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mountain size={18} color={palette.sand} strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: 16, color: palette.ink, lineHeight: 1.1 }}>Adventure Lombok</div>
          <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, color: "#A9A290", letterSpacing: 0.5 }}>
            booking.adventure-lombok.com {agentQR && <span style={{ color: palette.coral }}>· via {agentQR}</span>}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {mode === "customer" && isLoggedIn && onAccountClick && (
          <button
            onClick={onAccountClick}
            style={{ display: "flex", alignItems: "center", gap: 7, background: palette.sand, border: "none", borderRadius: 999, padding: "8px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12.5, color: palette.ink, cursor: "pointer" }}
          >
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: palette.tealLight, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: palette.teal }}>S</div>
            My account
          </button>
        )}
        {mode === "customer" && !isLoggedIn && onSignInClick && (
          <button
            onClick={onSignInClick}
            style={{ display: "flex", alignItems: "center", gap: 6, background: palette.ocean, border: "none", borderRadius: 999, padding: "8px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12.5, color: "#fff", cursor: "pointer" }}
          >
            <LogIn size={13} /> Sign in
          </button>
        )}
        <TopSwitch mode={mode} setMode={setMode} />
      </div>
    </div>
  );
}

function CustomerHome({ onSearch, filter, setFilter, onSelect }) {
  const filtered = filter === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.type === filter);
  return (
    <div style={{ padding: "36px 28px 48px" }}>
      <div
        style={{
          position: "relative",
          borderRadius: 20,
          background: `linear-gradient(120deg, ${palette.ocean}, ${palette.teal})`,
          padding: "40px 32px",
          marginBottom: 32,
          overflow: "hidden",
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 800 220" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0, opacity: 0.35 }}>
          <path d="M-20,180 C 100,100 180,220 280,140 S 460,60 560,130 S 720,200 830,110" stroke={palette.sand} strokeWidth="2" fill="none" strokeDasharray="1,10" strokeLinecap="round" />
          <circle cx="100" cy="180" r="4" fill={palette.sand} />
          <circle cx="280" cy="140" r="4" fill={palette.sand} />
          <circle cx="560" cy="130" r="4" fill={palette.sand} />
          <circle cx="800" cy="120" r="4" fill={palette.sand} />
        </svg>
        <div style={{ position: "relative", maxWidth: 480 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: palette.sand, opacity: 0.8, marginBottom: 10 }}>
            Local since 2006
          </div>
          <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 34, fontWeight: 600, color: "#fff", lineHeight: 1.15, margin: "0 0 14px" }}>
            Book Lombok, your way
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14.5, color: palette.tealLight, lineHeight: 1.6, margin: "0 0 24px", maxWidth: 400 }}>
            Tours, activities, private cars, and transfers — real availability, secure checkout, no back-and-forth on WhatsApp.
          </p>
          <div style={{ display: "flex", background: "#fff", borderRadius: 12, padding: 6, gap: 6, maxWidth: 420 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
              <Search size={16} color="#A9A290" />
              <input
                placeholder="Search tours, transfers, car hire…"
                style={{ border: "none", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 13.5, width: "100%", background: "transparent" }}
              />
            </div>
            <button onClick={onSearch} style={{ background: palette.coral, color: "#fff", border: "none", borderRadius: 8, padding: "0 18px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
              Search
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 600, color: palette.ink, margin: 0 }}>
          Most booked right now
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          {FILTERS.map((f) => (
            <Pill key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</Pill>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} onClick={() => onSelect(p)} />
        ))}
      </div>
    </div>
  );
}

function PickupMeetingPicker({ pickupTime, setPickupTime, meetingPoint, setMeetingPoint, customAddress, setCustomAddress }) {
  const isOther = meetingPoint === "Other — enter your address";
  return (
    <>
      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Pickup time</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
        <Clock size={14} color={palette.inkSoft} />
        <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} style={{ border: "none", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 13, width: "100%" }} />
      </div>

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Meeting point</label>
      <select
        value={meetingPoint}
        onChange={(e) => setMeetingPoint(e.target.value)}
        style={{ width: "100%", border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "9px 12px", fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", marginBottom: isOther ? 8 : 14, background: "#fff", boxSizing: "border-box" }}
      >
        {MEETING_POINTS.map((mp) => <option key={mp} value={mp}>{mp}</option>)}
      </select>
      {isOther && (
        <input
          value={customAddress}
          onChange={(e) => setCustomAddress(e.target.value)}
          placeholder="Hotel name / full address"
          style={{ width: "100%", border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "9px 12px", fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", marginBottom: 14, boxSizing: "border-box" }}
        />
      )}
    </>
  );
}

function CarHireSelector({ date, setDate, carTypeId, setCarTypeId, packageHours, setPackageHours, pickupTime, setPickupTime, meetingPoint, setMeetingPoint, customAddress, setCustomAddress, onBook }) {
  const carType = CAR_TYPES.find((c) => c.id === carTypeId);
  const pkg = carType.packages.find((p) => p.hours === packageHours);
  const { price: currentPrice, isEstimate } = areaPrice(pkg.pricesByArea, meetingPoint);
  return (
    <div style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 16, padding: 22, height: "fit-content", position: "sticky", top: 20 }}>
      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Capacity</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {CAR_TYPES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCarTypeId(c.id)}
            style={{
              flex: 1, padding: "8px 6px", borderRadius: 8, cursor: "pointer",
              border: `1.5px solid ${carTypeId === c.id ? palette.teal : palette.sandDeep}`,
              background: carTypeId === c.id ? palette.tealLight : "#fff",
              fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600,
              color: carTypeId === c.id ? palette.teal : palette.inkSoft,
            }}
          >
            {c.capacity}-seater
          </button>
        ))}
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A9A290", marginBottom: 4, lineHeight: 1.5 }}>
        10-seaters require a licensed guide by Indonesian regulation, so Car Hire is capped at 6 seats — larger groups can book a guided tour instead.
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
        <Car size={13} /> {carType.model}
      </div>

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Starting area</label>
      <select
        value={meetingPoint}
        onChange={(e) => setMeetingPoint(e.target.value)}
        style={{ width: "100%", border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "9px 12px", fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", marginBottom: 6, background: "#fff", boxSizing: "border-box" }}
      >
        {MEETING_POINTS.map((mp) => <option key={mp} value={mp}>{mp}</option>)}
      </select>
      {meetingPoint === "Other — enter your address" && (
        <input
          value={customAddress}
          onChange={(e) => setCustomAddress(e.target.value)}
          placeholder="Hotel name / full address"
          style={{ width: "100%", border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "9px 12px", fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" }}
        />
      )}
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A9A290", marginBottom: 16 }}>
        Prices below are shown for <strong style={{ color: palette.inkSoft }}>{meetingPoint === "Other — enter your address" ? "your custom location" : meetingPoint}</strong>{meetingPoint === MEETING_POINTS[0] ? " (default)" : ""}.
      </div>

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Duration package</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {carType.packages.map((p) => {
          const { price, isEstimate: est } = areaPrice(p.pricesByArea, meetingPoint);
          return (
            <div
              key={p.hours}
              onClick={() => setPackageHours(p.hours)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                border: `1.5px solid ${packageHours === p.hours ? palette.teal : palette.sandDeep}`,
                background: packageHours === p.hours ? palette.tealLight : "#fff",
                borderRadius: 10, padding: "10px 13px", cursor: "pointer",
              }}
            >
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: palette.ink }}>{p.hours} hours</span>
              <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: palette.ocean }}>{est ? "Quote on request" : fmtIDR(price)}</span>
            </div>
          );
        })}
      </div>

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Pickup date</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
        <Calendar size={14} color={palette.inkSoft} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: "none", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 13, width: "100%" }} />
      </div>

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Pickup time</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>
        <Clock size={14} color={palette.inkSoft} />
        <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} style={{ border: "none", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 13, width: "100%" }} />
      </div>

      <div style={{ background: palette.sand, borderRadius: 10, padding: "10px 13px", marginBottom: 16, fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft, lineHeight: 1.6 }}>
        Runs over {pkg.hours} hours? Extra time is {fmtIDR(pkg.overtimePerHour)}/hour, paid directly to your driver in cash — nothing extra charged in the app.
      </div>

      {isEstimate ? (
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: palette.tealLight, borderRadius: 8, padding: "10px 13px", marginBottom: 16, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.teal, fontWeight: 600 }}>
          <ShieldCheck size={14} /> Custom location — our team will confirm your exact price before payment.
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: palette.ink, marginBottom: 18 }}>
          <span>Total</span><span>{fmtIDR(currentPrice)}</span>
        </div>
      )}
      <button
        onClick={() => onBook({ carType: carType.model, hours: pkg.hours, date, priceIDR: currentPrice, isEstimate, pickupTime, meetingPoint: meetingPoint === "Other — enter your address" ? customAddress : meetingPoint })}
        style={{ width: "100%", background: palette.coral, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
      >
        Continue to checkout <ArrowRight size={15} />
      </button>
    </div>
  );
}

function RequestToBookPanel({ date, setDate, pax, setPax, insurance, setInsurance, docsUploaded, setDocsUploaded, onSubmit }) {
  const insuranceFee = insurance === "park" ? 290000 * pax : 0;
  return (
    <div style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 16, padding: 22, height: "fit-content", position: "sticky", top: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, background: palette.tealLight, borderRadius: 8, padding: "8px 11px", marginBottom: 16, fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.teal, fontWeight: 600 }}>
        <ShieldCheck size={14} /> Confirmed manually — we check park ticket availability first
      </div>

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Start date</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
        <Calendar size={14} color={palette.inkSoft} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: "none", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 13, width: "100%" }} />
      </div>

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Trekkers</label>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 13 }}><Users size={14} color={palette.inkSoft} /> {pax} people</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setPax(Math.max(1, pax - 1))} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${palette.sandDeep}`, background: "#fff", cursor: "pointer" }}>−</button>
          <button onClick={() => setPax(pax + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${palette.sandDeep}`, background: "#fff", cursor: "pointer" }}>+</button>
        </div>
      </div>

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Passport copy (each trekker)</label>
      <div
        onClick={() => setDocsUploaded(true)}
        style={{
          border: `1.5px dashed ${docsUploaded ? palette.rice : palette.sandDeep}`,
          background: docsUploaded ? "#EAF1DF" : "#fff",
          borderRadius: 10, padding: "14px", marginBottom: 14, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 9,
        }}
      >
        {docsUploaded ? <FileCheck2 size={17} color={palette.rice} /> : <Upload size={17} color={palette.inkSoft} />}
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: docsUploaded ? "#3F5A22" : palette.inkSoft }}>
          {docsUploaded ? `${pax} passport scan${pax > 1 ? "s" : ""} attached` : "Tap to upload photo or scan"}
        </span>
      </div>

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Trekking insurance</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <div
          onClick={() => setInsurance("own")}
          style={{ border: `1.5px solid ${insurance === "own" ? palette.teal : palette.sandDeep}`, background: insurance === "own" ? palette.tealLight : "#fff", borderRadius: 10, padding: "10px 13px", cursor: "pointer" }}
        >
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}>I already have trekking insurance</div>
          {insurance === "own" && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input placeholder="Policy number" style={{ ...inputStyle, fontSize: 12 }} />
              <input placeholder="Insurance company" style={{ ...inputStyle, fontSize: 12 }} />
            </div>
          )}
        </div>
        <div
          onClick={() => setInsurance("park")}
          style={{ border: `1.5px solid ${insurance === "park" ? palette.teal : palette.sandDeep}`, background: insurance === "park" ? palette.tealLight : "#fff", borderRadius: 10, padding: "10px 13px", cursor: "pointer", display: "flex", justifyContent: "space-between" }}
        >
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}>Use national park insurance</div>
          <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12.5, color: palette.ocean }}>Rp 290k / person</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 6 }}>
        <span>{pax} × $345</span><span>${pax * 345}</span>
      </div>
      {insurance === "park" && (
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 6 }}>
          <span>Park insurance</span><span>{fmtIDR(insuranceFee)}</span>
        </div>
      )}
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#A9A290", marginBottom: 16, lineHeight: 1.5 }}>
        No payment now — we'll confirm park ticket availability first, then send a payment link with a 24-hour window.
      </div>
      <button
        onClick={() => onSubmit({ pax, date, insurance, docsUploaded })}
        style={{ width: "100%", background: palette.coral, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
      >
        Submit request <ArrowRight size={15} />
      </button>
    </div>
  );
}

function ChatThread({ compact, title, initialMessages }) {
  const [messages, setMessages] = useState(initialMessages || [
    { from: "staff", text: "Hi! We're checking Rinjani park ticket availability for your dates now — usually takes a few hours.", time: "10:12" },
    { from: "customer", text: "Great, thank you! Let me know if you need anything else.", time: "10:15" },
  ]);
  const [draft, setDraft] = useState("");
  const send = () => {
    if (!draft.trim()) return;
    setMessages([...messages, { from: "customer", text: draft, time: "now" }]);
    setDraft("");
  };
  return (
    <div style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${palette.sandDeep}`, display: "flex", alignItems: "center", gap: 8, background: palette.sand }}>
        <MessageCircle size={15} color={palette.ocean} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: palette.ink }}>{title || "Chat with Adventure Lombok"}</span>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, maxHeight: compact ? 180 : 260, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.from === "customer" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
            <div style={{
              background: m.from === "customer" ? palette.ocean : palette.sand,
              color: m.from === "customer" ? "#fff" : palette.ink,
              borderRadius: 12, padding: "8px 12px", fontFamily: "Inter, sans-serif", fontSize: 12.5, lineHeight: 1.5,
            }}>
              {m.text}
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#A9A290", marginTop: 3, textAlign: m.from === "customer" ? "right" : "left" }}>{m.time}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${palette.sandDeep}` }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message our team…"
          style={{ flex: 1, border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "8px 12px", fontFamily: "Inter, sans-serif", fontSize: 12.5, outline: "none" }}
        />
        <button onClick={send} style={{ background: palette.coral, border: "none", borderRadius: 8, width: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Send size={14} color="#fff" />
        </button>
      </div>
      <div style={{ padding: "8px 14px", borderTop: `1px solid ${palette.sandDeep}`, fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A9A290" }}>
        Prefer WhatsApp? Reach us at +62 812-3811-1101
      </div>
    </div>
  );
}

function RequestSubmitted({ product, request, onHome }) {
  const code = "REQ-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  return (
    <div style={{ padding: "40px 28px 48px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: palette.tealLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <CircleDashed size={26} color={palette.teal} />
      </div>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, textAlign: "center", marginBottom: 6 }}>Request submitted</h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: palette.inkSoft, textAlign: "center", marginBottom: 24 }}>
        We're checking Rinjani park ticket availability for {request.date}. You'll get a payment link here and by email once confirmed — usually within a few hours.
      </p>

      <div style={{ border: `1.5px dashed ${palette.sandDeep}`, borderRadius: 14, padding: 18, background: palette.sand, marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: palette.ocean }}>{code}</span>
          <Badge tone="coral">Awaiting review</Badge>
        </div>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{product.title}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft }}>{request.pax} trekkers · {request.insurance === "park" ? "Park insurance added" : "Own insurance provided"}</div>
      </div>

      <ChatThread compact />

      <button onClick={onHome} style={{ marginTop: 22, background: "none", border: "none", color: palette.teal, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
        <ChevronLeft size={15} /> Back to home
      </button>
    </div>
  );
}

function StarRow({ rating, size = 12 }) {
  return (
    <div style={{ display: "flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={size} fill={i <= rating ? palette.coral : "none"} color={palette.coral} />
      ))}
    </div>
  );
}

function ReviewsSection({ product }) {
  const reviews = REVIEWS[product.id] || [];
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : product.rating;
  return (
    <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${palette.sandDeep}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, margin: 0 }}>Reviews</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StarRow rating={Math.round(avg)} size={13} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft }}>{avg} · {product.reviews} verified reviews</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {reviews.map((r, i) => (
          <div key={i} style={{ borderBottom: i < reviews.length - 1 ? `1px solid ${palette.sandDeep}` : "none", paddingBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: palette.tealLight, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: palette.teal }}>
                  {r.name.charAt(0)}
                </div>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                <Badge tone="green">Verified</Badge>
              </div>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#A9A290" }}>{r.date}</span>
            </div>
            <StarRow rating={r.rating} />
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, lineHeight: 1.6, margin: "6px 0 0" }}>{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailPreview({ product, onClose }) {
  return (
    <div style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 14, overflow: "hidden", background: "#fff" }}>
      <div style={{ background: palette.sand, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${palette.sandDeep}` }}>
        <Mail size={14} color={palette.inkSoft} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft }}>Sent automatically the day your trip ends</span>
      </div>
      <div style={{ padding: "24px 26px" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#A9A290", marginBottom: 4 }}>Subject</div>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, marginBottom: 20 }}>How was your {product.title}?</div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: palette.inkSoft, lineHeight: 1.7 }}>
          Hi there — thanks for exploring Lombok with us. We'd love to hear how your {product.title.toLowerCase()} went. It only takes a minute, and it genuinely helps other travelers (and our guides) know what's working.
        </p>
        <div style={{ textAlign: "center", margin: "24px 0" }}>
          <div style={{ display: "inline-block", background: palette.coral, color: "#fff", borderRadius: 10, padding: "12px 28px", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14 }}>
            Write your review
          </div>
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#A9A290", lineHeight: 1.6 }}>
          This link is unique to your booking and works without logging in — it expires in 30 days. — Adventure Lombok Tour
        </p>
      </div>
      {onClose && (
        <div style={{ borderTop: `1px solid ${palette.sandDeep}`, padding: "10px 16px" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: palette.teal, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12.5, cursor: "pointer", padding: 0 }}>
            Close preview
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewForm({ productTitle, onSubmit, onBack }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div style={{ padding: "48px 28px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: palette.tealLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <ThumbsUp size={24} color={palette.teal} />
        </div>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 21, fontWeight: 600, marginBottom: 8 }}>Thanks for sharing!</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: palette.inkSoft, marginBottom: 22 }}>
          {rating >= 4
            ? "Your review is live on the product page now."
            : "Thanks for the honest feedback — our team will take a quick look before it's published."}
        </p>
        <button onClick={onBack} style={{ background: palette.ocean, color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 28px 48px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, background: palette.tealLight, borderRadius: 8, padding: "8px 11px", marginBottom: 20, fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.teal, fontWeight: 600 }}>
        <CheckCircle2 size={14} /> Verified booking — no login needed
      </div>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, marginBottom: 6 }}>How was your {productTitle}?</h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: palette.inkSoft, marginBottom: 22 }}>Your review helps other travelers and our guides.</p>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} onClick={() => setRating(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <StarIcon size={30} fill={i <= rating ? palette.coral : "none"} color={palette.coral} />
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell us about your trip…"
        rows={5}
        style={{ width: "100%", border: `1px solid ${palette.sandDeep}`, borderRadius: 10, padding: 12, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", resize: "none", marginBottom: 18, boxSizing: "border-box" }}
      />

      <button
        onClick={() => rating > 0 && setSubmitted(true)}
        disabled={rating === 0}
        style={{ width: "100%", background: rating === 0 ? palette.sandDeep : palette.coral, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: rating === 0 ? "default" : "pointer" }}
      >
        Submit review
      </button>
    </div>
  );
}

function ListingDetail({ product, onBack, onBook, onRequest, agentQR }) {
  const [pax, setPax] = useState(2);
  const [date, setDate] = useState("2026-09-14");
  const [carTypeId, setCarTypeId] = useState("innova");
  const [packageHours, setPackageHours] = useState(10);
  const [insurance, setInsurance] = useState("park");
  const [docsUploaded, setDocsUploaded] = useState(false);
  const [pickupTime, setPickupTime] = useState("09:00");
  const [meetingPoint, setMeetingPoint] = useState(MEETING_POINTS[0]);
  const [customAddress, setCustomAddress] = useState("");
  const isCarHire = product.type === "car_hire";
  const isTransport = product.type === "transport";
  const needsPickup = isCarHire || isTransport;
  const isRequestConfirm = product.bookingMode === "request_confirmation";
  const Icon = product.icon;
  return (
    <div style={{ padding: "28px 28px 48px", maxWidth: 900, margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 18, padding: 0 }}>
        <ChevronLeft size={16} /> Back to search
      </button>

      {agentQR && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FCE6DD", border: `1px solid ${palette.coral}55`, borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.coralDark }}>
          <QrCode size={15} /> Referred by sales partner <strong>{agentQR}</strong> — commission will be tracked automatically.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32 }}>
        <div>
          <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ height: 220, background: `linear-gradient(135deg, ${product.color}22, ${product.color}44)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none" style={{ position: "absolute", opacity: 0.5 }}>
                <path d="M0,70 Q60,30 120,60 T240,45 T400,60" stroke={product.color} strokeWidth="2" fill="none" strokeDasharray="3,5" />
              </svg>
              <Icon size={56} color={product.color} strokeWidth={1.4} />
            </div>
          </div>
          <Badge tone="teal">{product.typeLabel}</Badge>
          <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 600, color: palette.ink, margin: "10px 0 8px" }}>
            {product.title}
          </h1>
          <div style={{ display: "flex", gap: 16, fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 18 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} />{product.location}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={13} />{product.duration}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Star size={13} fill={palette.coral} color={palette.coral} />{product.rating} ({product.reviews})</span>
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14.5, lineHeight: 1.7, color: palette.inkSoft }}>
            {product.desc} Every booking is run by our own local team — certified guides, trusted drivers, and 24/7 support during your trip. Free cancellation up to 48 hours before departure.
          </p>

          <ReviewsSection product={product} />
        </div>

        {isCarHire ? (
          <CarHireSelector
            date={date} setDate={setDate}
            carTypeId={carTypeId} setCarTypeId={setCarTypeId}
            packageHours={packageHours} setPackageHours={setPackageHours}
            pickupTime={pickupTime} setPickupTime={setPickupTime}
            meetingPoint={meetingPoint} setMeetingPoint={setMeetingPoint}
            customAddress={customAddress} setCustomAddress={setCustomAddress}
            onBook={onBook}
          />
        ) : isRequestConfirm ? (
          <RequestToBookPanel
            date={date} setDate={setDate}
            pax={pax} setPax={setPax}
            insurance={insurance} setInsurance={setInsurance}
            docsUploaded={docsUploaded} setDocsUploaded={setDocsUploaded}
            onSubmit={onRequest}
          />
        ) : (
        <div style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 16, padding: 22, height: "fit-content", position: "sticky", top: 20 }}>
          {isTransport ? (
            (() => {
              const { price: tPrice, isEstimate: tEstimate } = areaPrice(TRANSPORT_PRICES, meetingPoint);
              return (
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, color: palette.ocean, marginBottom: 2 }}>
                  {tEstimate ? "Quote on request" : fmtIDR(tPrice)}<span style={{ fontSize: 13, fontWeight: 400, color: palette.inkSoft }}> / trip</span>
                </div>
              );
            })()
          ) : (
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, color: palette.ocean, marginBottom: 2 }}>${product.price}<span style={{ fontSize: 13, fontWeight: 400, color: palette.inkSoft }}> / person</span></div>
          )}
          <div style={{ height: 1, background: palette.sandDeep, margin: "16px 0" }} />
          {isTransport && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A9A290", marginBottom: 14 }}>
              Price shown for <strong style={{ color: palette.inkSoft }}>{meetingPoint === "Other — enter your address" ? "your custom location" : meetingPoint}</strong>{meetingPoint === MEETING_POINTS[0] ? " (default)" : ""} — select your starting area below.
            </div>
          )}
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Date</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
            <Calendar size={14} color={palette.inkSoft} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: "none", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 13, width: "100%" }} />
          </div>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Travelers</label>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 13 }}><Users size={14} color={palette.inkSoft} /> {pax} people</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPax(Math.max(1, pax - 1))} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${palette.sandDeep}`, background: "#fff", cursor: "pointer" }}>−</button>
              <button onClick={() => setPax(pax + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${palette.sandDeep}`, background: "#fff", cursor: "pointer" }}>+</button>
            </div>
          </div>
          {isTransport && (
            <PickupMeetingPicker
              pickupTime={pickupTime} setPickupTime={setPickupTime}
              meetingPoint={meetingPoint} setMeetingPoint={setMeetingPoint}
              customAddress={customAddress} setCustomAddress={setCustomAddress}
            />
          )}
          {isTransport ? (
            (() => {
              const { price: tPrice, isEstimate: tEstimate } = areaPrice(TRANSPORT_PRICES, meetingPoint);
              return tEstimate ? (
                <div style={{ display: "flex", alignItems: "center", gap: 7, background: palette.tealLight, borderRadius: 8, padding: "10px 13px", marginBottom: 16, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.teal, fontWeight: 600 }}>
                  <ShieldCheck size={14} /> Custom location — our team will confirm your exact price before payment.
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: palette.ink, marginBottom: 18 }}>
                  <span>Total</span><span>{fmtIDR(tPrice)}</span>
                </div>
              );
            })()
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 6 }}>
                <span>{pax} × ${product.price}</span><span>${pax * product.price}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: palette.ink, marginBottom: 18 }}>
                <span>Total</span><span>${pax * product.price}</span>
              </div>
            </>
          )}
          <button
            onClick={() => {
              if (isTransport) {
                const { price: tPrice, isEstimate: tEstimate } = areaPrice(TRANSPORT_PRICES, meetingPoint);
                onBook({ pax, date, priceIDR: tPrice, isEstimate: tEstimate, pickupTime, meetingPoint: meetingPoint === "Other — enter your address" ? customAddress : meetingPoint });
              } else {
                onBook({ pax, date });
              }
            }}
            style={{ width: "100%", background: palette.coral, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            Continue to checkout <ArrowRight size={15} />
          </button>
        </div>
        )}
      </div>
    </div>
  );
}

function Checkout({ product, booking, onPay, onBack }) {
  const [method, setMethod] = useState("card");
  const isCarHire = product.type === "car_hire";
  const isTransport = product.type === "transport";
  const usesIDR = isCarHire || isTransport;
  const total = usesIDR ? booking.priceIDR : product.price * booking.pax;
  const methods = [
    { key: "card", label: "Credit / debit card", icon: CreditCard },
    { key: "ewallet", label: "GoPay / OVO / DANA", icon: Smartphone },
    { key: "bank", label: "Bank transfer", icon: Building2 },
    { key: "qris", label: "QRIS", icon: QrCode },
  ];
  return (
    <div style={{ padding: "28px 28px 48px", maxWidth: 780, margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 18, padding: 0 }}>
        <ChevronLeft size={16} /> Back
      </button>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 600, color: palette.ink, marginBottom: 22 }}>Secure checkout</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 28 }}>
        <div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: palette.inkSoft, marginBottom: 10 }}>
            Payment method — powered by Xendit
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
            {methods.map((m) => (
              <div
                key={m.key}
                onClick={() => setMethod(m.key)}
                style={{
                  border: `1.5px solid ${method === m.key ? palette.teal : palette.sandDeep}`,
                  background: method === m.key ? palette.tealLight : "#fff",
                  borderRadius: 10,
                  padding: "13px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <m.icon size={16} color={method === m.key ? palette.teal : palette.inkSoft} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: palette.ink }}>{m.label}</span>
              </div>
            ))}
          </div>

          {method === "card" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="Card number" style={inputStyle} />
              <div style={{ display: "flex", gap: 10 }}>
                <input placeholder="MM / YY" style={inputStyle} />
                <input placeholder="CVC" style={inputStyle} />
              </div>
              <input placeholder="Name on card" style={inputStyle} />
            </div>
          )}
          {method !== "card" && (
            <div style={{ border: `1px dashed ${palette.sandDeep}`, borderRadius: 10, padding: 20, textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft }}>
              You'll be redirected to complete payment via {methods.find((m) => m.key === method).label} on Xendit's secure page.
            </div>
          )}
        </div>

        <div style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 14, padding: 20, height: "fit-content" }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            {isCarHire ? `${booking.carType} — ${booking.hours}h` : product.title}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft, marginBottom: 2 }}>
            {booking.date} · {isCarHire ? "with driver" : isTransport ? "1 trip" : `${booking.pax} travelers`}
          </div>
          {booking.pickupTime && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft, marginBottom: 2, display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={12} /> Pickup {booking.pickupTime} · <MapPin size={12} /> {booking.meetingPoint}
            </div>
          )}
          <div style={{ height: 1, background: palette.sandDeep, margin: "14px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: palette.inkSoft }}>Subtotal</span><span>{usesIDR ? fmtIDR(total) : `$${total}`}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 13, marginBottom: 14 }}>
            <span style={{ color: palette.inkSoft }}>Booking fee</span><span>{usesIDR ? "Rp 0" : "$0"}</span>
          </div>
          {isCarHire && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#A9A290", marginBottom: 14, lineHeight: 1.5 }}>
              Extra time beyond your package is paid directly to the driver in cash.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, marginBottom: 18 }}>
            <span>Total</span><span>{usesIDR ? fmtIDR(total) : `$${total}`}</span>
          </div>
          <button onClick={onPay} style={{ width: "100%", background: palette.coral, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
            Pay {usesIDR ? fmtIDR(total) : `$${total}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  border: `1px solid ${palette.sandDeep}`,
  borderRadius: 8,
  padding: "10px 12px",
  fontFamily: "Inter, sans-serif",
  fontSize: 13,
  outline: "none",
  flex: 1,
};

function Confirmation({ product, booking, onHistory, onHome }) {
  const code = "ALT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const isCarHire = product.type === "car_hire";
  return (
    <div style={{ padding: "48px 28px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: palette.tealLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
        <CheckCircle2 size={28} color={palette.teal} />
      </div>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Booking confirmed</h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: palette.inkSoft, marginBottom: 26 }}>
        A confirmation has been sent to your email. Your guide will be in touch before your trip.
      </p>

      <div style={{ border: `1.5px dashed ${palette.sandDeep}`, borderRadius: 16, padding: 24, textAlign: "left", background: palette.sand }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A9A290", textTransform: "uppercase", letterSpacing: 0.5 }}>Booking code</div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 18, fontWeight: 500, color: palette.ocean }}>{code}</div>
          </div>
          <Ticket size={22} color={palette.coral} />
        </div>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
          {isCarHire ? `${booking.carType} — ${booking.hours}h with driver` : product.title}
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft }}>
          {booking.date} · {isCarHire ? "Pickup" : `${booking.pax} travelers`}
        </div>
        {booking.pickupTime && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} /> {booking.pickupTime} · <MapPin size={12} /> {booking.meetingPoint}
          </div>
        )}
      </div>
      {booking.pickupTime && (
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#A9A290", marginTop: 12 }}>
          Plans change? You can revise your pickup time anytime from Booking history.
        </p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "center" }}>
        <button onClick={onHistory} style={{ background: "#fff", border: `1px solid ${palette.sandDeep}`, borderRadius: 10, padding: "11px 18px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          View booking history
        </button>
        <button onClick={onHome} style={{ background: palette.ocean, color: "#fff", border: "none", borderRadius: 10, padding: "11px 18px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          Back to home
        </button>
      </div>
    </div>
  );
}

function BookingHistory({ onHome, onWriteReview, onViewDetails, embedded }) {
  const [rows, setRows] = useState([
    { code: "ALT-9F2K1L", title: "Gili Islands Snorkeling Trip", date: "14 Sep 2026", status: "upcoming", pax: 2, participantNames: ["Sofia M.", "Elena R."] },
    { code: "ALT-5K3N8P", title: "Airport Transfer — LOP to Senggigi", date: "28 Aug 2026", status: "upcoming", hasPickup: true, pickupTime: "14:30", meetingPoint: "Lombok International Airport", pax: 3 },
    { code: "ALT-7B8M2Q", title: "Airport Transfer — LOP", date: "02 Jul 2026", status: "completed", reviewed: false, pax: 1 },
    { code: "ALT-3D9P4R", title: "Lombok Rice Field Walk", date: "22 Jun 2026", status: "completed", reviewed: true, pax: 2 },
  ]);
  const [editingCode, setEditingCode] = useState(null);
  const [draftTime, setDraftTime] = useState("");

  const startEdit = (r) => { setEditingCode(r.code); setDraftTime(r.pickupTime); };
  const saveEdit = (code) => {
    setRows(rows.map((r) => (r.code === code ? { ...r, pickupTime: draftTime } : r)));
    setEditingCode(null);
  };

  return (
    <div style={embedded ? {} : { padding: "36px 28px 48px", maxWidth: 640, margin: "0 auto" }}>
      {!embedded && <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 600, marginBottom: 20 }}>Booking history</h1>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.code} style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{r.title}</div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5, color: "#A9A290" }}>{r.code} · {r.date}</div>
              </div>
              <Badge tone={r.status === "upcoming" ? "coral" : "green"}>{r.status}</Badge>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
              <button onClick={() => onViewDetails(r)} style={{ background: "none", border: "none", color: palette.teal, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 3 }}>
                View details <ChevronRight size={13} />
              </button>
              {r.status === "completed" && !r.reviewed && (
                <button onClick={() => onWriteReview(r)} style={{ background: palette.coral, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 11.5, cursor: "pointer" }}>
                  Write a review
                </button>
              )}
              {r.status === "completed" && r.reviewed && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#3F5A22" }}>
                  <CheckCircle2 size={12} /> Reviewed
                </span>
              )}
            </div>

            {r.hasPickup && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${palette.sandDeep}` }}>
                {editingCode === r.code ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="time" value={draftTime} onChange={(e) => setDraftTime(e.target.value)} style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 6, padding: "5px 8px", fontFamily: "Inter, sans-serif", fontSize: 12.5 }} />
                    <button onClick={() => saveEdit(r.code)} style={{ background: palette.teal, color: "#fff", border: "none", borderRadius: 6, padding: "5px 11px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Save</button>
                    <button onClick={() => setEditingCode(null)} style={{ background: "none", border: "none", color: palette.inkSoft, fontFamily: "Inter, sans-serif", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft }}>
                      <Clock size={12} /> Pickup {r.pickupTime} · <MapPin size={12} /> {r.meetingPoint}
                    </span>
                    <button onClick={() => startEdit(r)} style={{ background: "none", border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "5px 11px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 11.5, color: palette.teal, cursor: "pointer" }}>
                      Change pickup time
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {!embedded && (
        <button onClick={onHome} style={{ marginTop: 22, background: "none", border: "none", color: palette.teal, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={15} /> Back to home
        </button>
      )}
    </div>
  );
}

// ---------- AGENCY PORTAL ----------

function AgentTabs({ tab, setTab }) {
  const tabs = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "catalog", label: "Catalog", icon: Package },
    { key: "sales", label: "Sales report", icon: TrendingUp },
    { key: "payouts", label: "Payouts", icon: Wallet },
    { key: "support", label: "Support", icon: MessageCircle },
    { key: "profile", label: "Profile", icon: User },
  ];
  return (
    <div style={{ display: "flex", gap: 4, padding: "0 28px", borderBottom: `1px solid ${palette.sandDeep}` }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "13px 16px", background: "none", border: "none", cursor: "pointer",
            fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 600,
            color: tab === t.key ? palette.ocean : "#A9A290",
            borderBottom: `2px solid ${tab === t.key ? palette.coral : "transparent"}`,
            marginBottom: -1,
          }}
        >
          <t.icon size={15} /> {t.label}
        </button>
      ))}
    </div>
  );
}

function AgentQRTicket() {
  const cells = useMemo(() => Array.from({ length: 49 }, () => Math.random() > 0.55), []);
  return (
    <div
      style={{
        background: palette.ocean,
        borderRadius: 18,
        padding: "26px 26px 20px",
        color: "#fff",
        position: "relative",
        maxWidth: 340,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, letterSpacing: 1.2, textTransform: "uppercase", color: palette.tealLight, opacity: 0.7 }}>
            Official sales partner
          </div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, marginTop: 2 }}>Hotel Senggigi Bay</div>
        </div>
        <Badge tone="coral">Silver tier</Badge>
      </div>

      <div style={{ background: "#fff", borderRadius: 10, padding: 12, width: "fit-content", marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, width: 98 }}>
          {cells.map((filled, i) => (
            <div key={i} style={{ width: 12, height: 12, background: filled ? palette.ocean : "transparent" }} />
          ))}
        </div>
      </div>

      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 15, fontWeight: 500, letterSpacing: 1 }}>AGT-BALI7</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: palette.tealLight, opacity: 0.75, marginTop: 2 }}>
        booking.adventure-lombok.com/r/AGT-BALI7
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 11px", fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
          <Copy size={12} /> Copy link
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 11px", fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
          <Download size={12} /> Download card
        </div>
      </div>

      <svg width="100%" height="14" style={{ position: "absolute", bottom: -7, left: 0 }} viewBox="0 0 340 14" preserveAspectRatio="none">
        {Array.from({ length: 22 }).map((_, i) => (
          <circle key={i} cx={i * 16 + 8} cy="7" r="6" fill="var(--surface-0, #fff)" />
        ))}
      </svg>
    </div>
  );
}

function StatCard({ label, value, sub, tone }) {
  return (
    <div style={{ background: palette.sand, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: palette.ink }}>{value}</div>
      {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: tone === "up" ? "#3F5A22" : "#A9A290", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
        {tone === "up" && <ArrowUpRight size={12} />} {sub}
      </div>}
    </div>
  );
}

function NotificationEmail({ toneColor, kicker, heading, rows, bodyText, ctaLabel, ctaNote, onCta }) {
  return (
    <div style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 14, overflow: "hidden", background: "#fff" }}>
      <div style={{ background: toneColor, padding: "20px 24px" }}>
        <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", color: "#fff", opacity: 0.75, marginBottom: 8 }}>{kicker}</div>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: "#fff" }}>{heading}</div>
      </div>
      <div style={{ padding: "20px 24px" }}>
        {bodyText && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, lineHeight: 1.6, margin: "0 0 16px" }}>{bodyText}</p>}
        {rows && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 18 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: i > 0 ? `1px solid ${palette.sandDeep}` : "none" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "#A9A290" }}>{r.label}</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: palette.ink, textAlign: "right" }}>{r.value}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={onCta} style={{ width: "100%", background: toneColor, color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {ctaLabel}
        </button>
        {ctaNote && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: "#A9A290", marginTop: 8, marginBottom: 0 }}>{ctaNote}</p>}
      </div>
    </div>
  );
}

function AgentOverview({ onOpenBooking }) {
  return (
    <div style={{ padding: "28px 28px 48px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 32 }}>
        <AgentQRTicket />
        <div>
          <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, marginBottom: 14 }}>This month</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            <StatCard label="Bookings" value="14" sub="+4 vs last month" tone="up" />
            <StatCard label="Commission pending" value={fmtIDR(980000)} />
            <StatCard label="Current tier" value="Silver · 10%" sub="4 more bookings to Gold" />
          </div>
          <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, marginBottom: 14 }}>Recent bookings via your code</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {AGENT_BOOKINGS.slice(0, 3).map((b) => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${palette.sandDeep}`, borderRadius: 10, padding: "11px 14px" }}>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600 }}>{b.product}</div>
                  <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#A9A290" }}>{b.id} · {b.date}</div>
                </div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: palette.rice, fontWeight: 500 }}>+{fmtIDR(b.commission)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, margin: "32px 0 6px" }}>Emails we send you</h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 16 }}>
        Sent the moment something happens on a booking tagged with your code — the button always takes you to your dashboard, logging in first if needed.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <NotificationEmail
          toneColor={palette.teal}
          kicker="New booking"
          heading="You've got a new booking!"
          rows={[
            { label: "Product", value: "Gili Islands Snorkeling Trip" },
            { label: "Date", value: "18 Sep 2026" },
            { label: "Travelers", value: "2" },
            { label: "Commission earned", value: fmtIDR(90000) },
          ]}
          ctaLabel="Open in dashboard"
          ctaNote="You'll be asked to log in first."
          onCta={onOpenBooking}
        />
        <NotificationEmail
          toneColor={palette.coral}
          kicker="Booking cancelled"
          heading="A booking didn't go through"
          bodyText="The customer cancelled this booking. It's been removed from your pending commission."
          rows={[
            { label: "Product", value: "Airport Transfer" },
            { label: "Original date", value: "20 Sep 2026" },
          ]}
          ctaLabel="Open in dashboard"
          ctaNote="You'll be asked to log in first."
          onCta={onOpenBooking}
        />
        <NotificationEmail
          toneColor={palette.ocean}
          kicker="Booking rescheduled"
          heading="A booking date changed"
          rows={[
            { label: "Product", value: "Mount Rinjani Trek" },
            { label: "Was", value: "2 Oct 2026" },
            { label: "Now", value: "9 Oct 2026" },
          ]}
          ctaLabel="Open in dashboard"
          ctaNote="You'll be asked to log in first."
          onCta={onOpenBooking}
        />
      </div>
    </div>
  );
}

function AgentCatalog({ onAskAbout }) {
  const commissionByType = { tour: 10, activity: 10, car_hire: 8, transport: 6 };
  return (
    <div style={{ padding: "28px 28px 48px" }}>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, marginBottom: 6 }}>Your bookable catalog</h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 20 }}>Every product a customer books through your QR or link. Commission rate shown is your current Silver tier. Not sure about something? Ask our team directly from any card.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
        {PRODUCTS.map((p) => (
          <ProductCard key={p.id} product={p} onClick={() => {}} showCommission commissionPct={commissionByType[p.type]} onAsk={onAskAbout} />
        ))}
      </div>
    </div>
  );
}

function SimpleBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.commission));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 160, padding: "0 4px" }}>
      {data.map((d) => (
        <div key={d.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 8 }}>
          <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, color: palette.inkSoft }}>
            {(d.commission / 1000).toFixed(0)}k
          </div>
          <div style={{ width: "100%", height: (d.commission / max) * 110, background: palette.teal, borderRadius: "6px 6px 0 0" }} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: palette.inkSoft }}>{d.month}</div>
        </div>
      ))}
    </div>
  );
}

function AgentSales() {
  const totalPeriod = SALES_DATA.reduce((s, d) => s + d.commission, 0);
  const totalPaid = PAYOUTS.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = PAYOUTS.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  return (
    <div style={{ padding: "28px 28px 48px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total commission, last 6 months" value={fmtIDR(totalPeriod)} />
        <StatCard label="Paid out to date" value={fmtIDR(totalPaid)} />
        <StatCard label="Pending payout" value={fmtIDR(totalPending)} sub="Next payout 5 Sep" />
      </div>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, marginBottom: 18 }}>Commission earned, last 6 months</h2>
      <div style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 14, padding: "20px 24px", marginBottom: 28 }}>
        <SimpleBarChart data={SALES_DATA} />
      </div>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, marginBottom: 14 }}>All bookings via your code</h2>
      <div style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
          <thead>
            <tr style={{ background: palette.sand, textAlign: "left" }}>
              {["Booking", "Product", "Date", "Pax", "Commission", "Status"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.4, color: palette.inkSoft, fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AGENT_BOOKINGS.map((b) => (
              <tr key={b.id} style={{ borderTop: `1px solid ${palette.sandDeep}` }}>
                <td style={{ padding: "11px 16px", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>{b.id}</td>
                <td style={{ padding: "11px 16px" }}>{b.product}</td>
                <td style={{ padding: "11px 16px", color: palette.inkSoft }}>{b.date}</td>
                <td style={{ padding: "11px 16px", color: palette.inkSoft }}>{b.pax}</td>
                <td style={{ padding: "11px 16px", fontFamily: "IBM Plex Mono, monospace", color: palette.rice }}>{fmtIDR(b.commission)}</td>
                <td style={{ padding: "11px 16px" }}><Badge tone={b.status === "completed" ? "green" : "teal"}>{b.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgentPayouts() {
  return (
    <div style={{ padding: "28px 28px 48px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, margin: 0 }}>Payouts</h2>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft, display: "flex", alignItems: "center", gap: 6 }}>
          <Wallet size={14} /> Paid automatically to BCA •••• 4471 on the 5th of each month
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {PAYOUTS.map((p) => (
          <div key={p.period} style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600 }}>{p.period}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft }}>{p.date}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 15, fontWeight: 500 }}>{fmtIDR(p.amount)}</div>
                <Badge tone={p.status === "paid" ? "green" : "coral"}>{p.status}</Badge>
              </div>
            </div>
            {p.status === "paid" && (
              <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${palette.sandDeep}` }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#A9A290" }}>Download statement:</span>
                <button style={{ background: "none", border: "none", color: palette.teal, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 11.5, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  <Download size={12} /> PDF
                </button>
                <button style={{ background: "none", border: "none", color: palette.teal, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 11.5, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  <Download size={12} /> CSV
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocUpload({ label, hint, uploaded, onToggle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>{label}</label>
      {hint && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#A9A290", margin: "0 0 6px", lineHeight: 1.5 }}>{hint}</p>}
      <div
        onClick={onToggle}
        style={{
          border: `1.5px dashed ${uploaded ? palette.rice : palette.sandDeep}`,
          background: uploaded ? "#EAF1DF" : "#fff",
          borderRadius: 10, padding: "12px 14px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 9,
        }}
      >
        {uploaded ? <FileCheck2 size={16} color={palette.rice} /> : <Upload size={16} color={palette.inkSoft} />}
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: uploaded ? "#3F5A22" : palette.inkSoft }}>
          {uploaded ? "Uploaded — tap to replace" : "Tap to upload photo or scan"}
        </span>
      </div>
    </div>
  );
}

function AgentProfile() {
  const [bankChanged, setBankChanged] = useState(false);
  const [businessType, setBusinessType] = useState("Hotel");
  const isIndividual = businessType === "Individual";
  const [nibCert, setNibCert] = useState(true);
  const [picId, setPicId] = useState(true);
  const [idCard, setIdCard] = useState(false);
  const [idSelfie, setIdSelfie] = useState(false);
  const verificationStatus = isIndividual ? (idCard && idSelfie ? "pending" : "incomplete") : "verified";

  return (
    <div style={{ padding: "28px 28px 48px", maxWidth: 480 }}>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, marginBottom: 4 }}>Business profile</h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 22 }}>Keep your details up to date — this is what customers and our team see.</p>

      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: palette.ink, marginBottom: 12 }}>Business details</div>
      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Business name</label>
      <input defaultValue="Hotel Senggigi Bay" style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box" }} />

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Contact name</label>
      <input defaultValue="Made Wirawan" style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box" }} />

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Contact email</label>
      <input defaultValue="frontdesk@senggigibayhotel.com" style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box" }} />

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Contact phone</label>
      <input defaultValue="+62 812 3811 1101" style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box" }} />

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Business type</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
        {["Hotel", "Restaurant", "Individual", "Other"].map((t) => (
          <button
            key={t}
            onClick={() => setBusinessType(t)}
            style={{
              flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer",
              border: `1.5px solid ${businessType === t ? palette.teal : palette.sandDeep}`,
              background: businessType === t ? palette.tealLight : "#fff",
              fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600,
              color: businessType === t ? palette.teal : palette.inkSoft,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ height: 1, background: palette.sandDeep, margin: "6px 0 20px" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: palette.ink }}>Verification</div>
        <Badge tone={verificationStatus === "verified" ? "green" : verificationStatus === "pending" ? "coral" : "gray"}>
          {verificationStatus === "verified" ? "Verified" : verificationStatus === "pending" ? "Pending review" : "Incomplete"}
        </Badge>
      </div>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft, marginBottom: 14, lineHeight: 1.5 }}>
        Required before your QR code goes live and commission starts accruing. Documents are stored privately and only visible to you and our team.
      </p>

      {isIndividual ? (
        <>
          <DocUpload label="ID card (KTP)" uploaded={idCard} onToggle={() => setIdCard(!idCard)} />
          <DocUpload
            label="ID card selfie"
            hint="A photo of you holding your ID card next to your face — confirms the ID belongs to you."
            uploaded={idSelfie}
            onToggle={() => setIdSelfie(!idSelfie)}
          />
        </>
      ) : (
        <>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>NIB number</label>
          <input defaultValue="0123456789012" style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box" }} placeholder="Nomor Induk Berusaha" />
          <DocUpload label="NIB certificate" uploaded={nibCert} onToggle={() => setNibCert(!nibCert)} />

          <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>PIC (Person in Charge) name</label>
          <input defaultValue="Made Wirawan" style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box" }} placeholder="Who's responsible for bookings on the app?" />
          <DocUpload label="PIC ID document" uploaded={picId} onToggle={() => setPicId(!picId)} />
        </>
      )}

      <div style={{ height: 1, background: palette.sandDeep, margin: "6px 0 20px" }} />

      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: palette.ink, marginBottom: 4 }}>Payout bank account</div>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
        Your commission is disbursed here on the 5th of each month. Changing this sends a confirmation email to the address on file before it takes effect.
      </p>
      <div style={{ display: "flex", gap: 10, marginBottom: bankChanged ? 10 : 0 }}>
        <input defaultValue="Bank Central Asia (BCA)" style={{ ...inputStyle, flex: 1, boxSizing: "border-box" }} onChange={() => setBankChanged(true)} />
        <input defaultValue="•••• •••• 4471" style={{ ...inputStyle, flex: 1, boxSizing: "border-box" }} onChange={() => setBankChanged(true)} />
      </div>
      {bankChanged && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#FCE6DD", borderRadius: 8, padding: "9px 12px", fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.coralDark }}>
          <ShieldCheck size={13} /> We'll email frontdesk@senggigibayhotel.com to confirm this change before your next payout.
        </div>
      )}

      <div style={{ height: 1, background: palette.sandDeep, margin: "20px 0" }} />

      <SecuritySection authProvider="email" />

      <button style={{ marginTop: 24, width: "100%", background: palette.ocean, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
        Save changes
      </button>
    </div>
  );
}

function AgentSupportChat({ prefillProduct, onConsumePrefill }) {
  const [messages, setMessages] = useState([
    { from: "staff", text: "Hi Hotel Senggigi Bay! This is your dedicated line to our team — ask us anything about products, pricing, or a specific guest's booking.", time: "09:02" },
  ]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (prefillProduct) {
      setDraft(`Hi, I have a question about ${prefillProduct.title} — `);
      onConsumePrefill();
    }
  }, [prefillProduct]);

  const send = () => {
    if (!draft.trim()) return;
    setMessages([...messages, { from: "agent", text: draft, time: "now" }]);
    setDraft("");
  };

  const chips = [
    "Is there availability this weekend?",
    "How is my commission calculated?",
    "Can I get printed QR flyers?",
  ];

  return (
    <div style={{ padding: "28px 28px 48px", maxWidth: 640 }}>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, marginBottom: 6 }}>Talk to our team</h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 18 }}>
        One ongoing thread with Adventure Lombok — use it for product questions, a specific guest's booking, or anything else.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setDraft(c)}
            style={{ background: palette.sand, border: "none", borderRadius: 999, padding: "7px 13px", fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft, cursor: "pointer" }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${palette.sandDeep}`, display: "flex", alignItems: "center", gap: 8, background: palette.sand }}>
          <MessageCircle size={15} color={palette.ocean} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: palette.ink }}>Adventure Lombok team</span>
        </div>
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, maxHeight: 280, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.from === "agent" ? "flex-end" : "flex-start", maxWidth: "82%" }}>
              <div style={{
                background: m.from === "agent" ? palette.ocean : palette.sand,
                color: m.from === "agent" ? "#fff" : palette.ink,
                borderRadius: 12, padding: "8px 12px", fontFamily: "Inter, sans-serif", fontSize: 12.5, lineHeight: 1.5,
              }}>
                {m.text}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#A9A290", marginTop: 3, textAlign: m.from === "agent" ? "right" : "left" }}>{m.time}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${palette.sandDeep}` }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about a product, a booking, anything…"
            style={{ flex: 1, border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "8px 12px", fontFamily: "Inter, sans-serif", fontSize: 12.5, outline: "none" }}
          />
          <button onClick={send} style={{ background: palette.coral, border: "none", borderRadius: 8, width: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Send size={14} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordScreen({ onBack, onSent }) {
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <div style={{ padding: "48px 28px", maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: palette.tealLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Mail size={24} color={palette.teal} />
        </div>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 21, fontWeight: 600, marginBottom: 8 }}>Check your email</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: palette.inkSoft, marginBottom: 22 }}>
          If an account exists for that email, we've sent a link to reset your password.
        </p>
        <button onClick={onBack} style={{ background: palette.ocean, color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          Back to login
        </button>
      </div>
    );
  }
  return (
    <div style={{ padding: "40px 28px 48px", maxWidth: 420, margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 18, padding: 0 }}>
        <ChevronLeft size={16} /> Back to login
      </button>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Reset your password</h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 22 }}>Enter your email and we'll send you a reset link.</p>
      <input placeholder="Email" style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginBottom: 16 }} />
      <button
        onClick={() => setSent(true)}
        style={{ width: "100%", background: palette.coral, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
      >
        Send reset link
      </button>
    </div>
  );
}

function AuthScreen({ mode, setMode, onAuthed, contextNote }) {
  const isSignup = mode === "signup";
  const [showForgot, setShowForgot] = useState(false);

  if (showForgot) {
    return <ForgotPasswordScreen onBack={() => setShowForgot(false)} />;
  }

  return (
    <div style={{ padding: "40px 28px 48px", maxWidth: 420, margin: "0 auto" }}>
      {contextNote && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: palette.tealLight, borderRadius: 8, padding: "10px 13px", marginBottom: 22, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.teal, fontWeight: 600 }}>
          <ShieldCheck size={14} /> {contextNote}
        </div>
      )}
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 600, marginBottom: 6 }}>
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 24 }}>
        {isSignup ? "Takes less than a minute." : "Log in to continue."}
      </p>

      <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, border: `1px solid ${palette.sandDeep}`, background: "#fff", borderRadius: 10, padding: "11px 0", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: palette.ink, cursor: "pointer", marginBottom: 16 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "linear-gradient(135deg, #4285F4, #EA4335, #FBBC05, #34A853)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: "#fff" }}>G</div>
        Continue with Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
        <div style={{ flex: 1, height: 1, background: palette.sandDeep }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A9A290" }}>or</span>
        <div style={{ flex: 1, height: 1, background: palette.sandDeep }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: isSignup ? 18 : 8 }}>
        {isSignup && <input placeholder="Full name" style={{ ...inputStyle, boxSizing: "border-box" }} />}
        <input placeholder="Email" style={{ ...inputStyle, boxSizing: "border-box" }} />
        {isSignup && <input placeholder="Phone" style={{ ...inputStyle, boxSizing: "border-box" }} />}
        <input placeholder="Password" type="password" style={{ ...inputStyle, boxSizing: "border-box" }} />
      </div>

      {!isSignup && (
        <div style={{ textAlign: "right", marginBottom: 16 }}>
          <span onClick={() => setShowForgot(true)} style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.teal, fontWeight: 600, cursor: "pointer" }}>
            Forgot password?
          </span>
        </div>
      )}

      <button
        onClick={onAuthed}
        style={{ width: "100%", background: palette.coral, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer", marginBottom: 16 }}
      >
        {isSignup ? "Create account" : "Log in"}
      </button>

      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft, textAlign: "center" }}>
        {isSignup ? "Already have an account? " : "New here? "}
        <span onClick={() => setMode(isSignup ? "login" : "signup")} style={{ color: palette.teal, fontWeight: 600, cursor: "pointer" }}>
          {isSignup ? "Log in" : "Create an account"}
        </span>
      </p>
    </div>
  );
}

const CUSTOMER_CONVERSATIONS = [
  {
    id: "conv-1",
    title: "Mount Rinjani Trek — Summit",
    lastMessage: "Great, thank you! Let me know if you need anything else.",
    time: "10:15",
    messages: [
      { from: "staff", text: "Hi! We're checking Rinjani park ticket availability for your dates now — usually takes a few hours.", time: "10:12" },
      { from: "customer", text: "Great, thank you! Let me know if you need anything else.", time: "10:15" },
    ],
  },
  {
    id: "conv-2",
    title: "Airport Transfer — LOP to Senggigi",
    lastMessage: "Our driver will hold a sign with your name at arrivals.",
    time: "Yesterday",
    messages: [
      { from: "customer", text: "Hi, my flight now lands at 2:30pm instead of 1pm — is that ok?", time: "2:04" },
      { from: "staff", text: "No problem at all, we've updated your pickup time. Our driver will hold a sign with your name at arrivals.", time: "2:11" },
    ],
  },
];

function AccountTabs({ tab, setTab }) {
  const tabs = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "bookings", label: "My Bookings", icon: Ticket },
    { key: "messages", label: "Messages", icon: MessageCircle },
    { key: "profile", label: "Profile", icon: User },
  ];
  return (
    <div style={{ display: "flex", gap: 4, padding: "0 28px", borderBottom: `1px solid ${palette.sandDeep}` }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "13px 16px", background: "none", border: "none", cursor: "pointer",
            fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 600,
            color: tab === t.key ? palette.ocean : "#A9A290",
            borderBottom: `2px solid ${tab === t.key ? palette.coral : "transparent"}`,
            marginBottom: -1,
          }}
        >
          <t.icon size={15} /> {t.label}
        </button>
      ))}
    </div>
  );
}

function AccountOverview({ onGoTab }) {
  return (
    <div style={{ padding: "28px 28px 48px" }}>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Welcome back, Sofia</h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 22 }}>Here's what's coming up.</p>

      <div style={{ border: `1.5px solid ${palette.teal}`, background: palette.tealLight, borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: palette.teal, marginBottom: 8 }}>Next trip</div>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: palette.ink, marginBottom: 4 }}>Gili Islands Snorkeling Trip</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 14 }}>14 Sep 2026 · Booking code ALT-9F2K1L</div>
        <button onClick={() => onGoTab("bookings")} style={{ background: palette.teal, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
          View booking
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        <StatCard label="Total trips" value="4" />
        <StatCard label="Reviews written" value="1" />
        <StatCard label="Member since" value="2025" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <button onClick={() => onGoTab("bookings")} style={{ textAlign: "left", border: `1px solid ${palette.sandDeep}`, borderRadius: 12, padding: 16, background: "#fff", cursor: "pointer" }}>
          <Ticket size={16} color={palette.teal} style={{ marginBottom: 8 }} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: palette.ink }}>All bookings</div>
        </button>
        <button onClick={() => onGoTab("messages")} style={{ textAlign: "left", border: `1px solid ${palette.sandDeep}`, borderRadius: 12, padding: 16, background: "#fff", cursor: "pointer" }}>
          <MessageCircle size={16} color={palette.teal} style={{ marginBottom: 8 }} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: palette.ink }}>Messages</div>
        </button>
        <button onClick={() => onGoTab("profile")} style={{ textAlign: "left", border: `1px solid ${palette.sandDeep}`, borderRadius: 12, padding: 16, background: "#fff", cursor: "pointer" }}>
          <User size={16} color={palette.teal} style={{ marginBottom: 8 }} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: palette.ink }}>Edit profile</div>
        </button>
      </div>
    </div>
  );
}

function AccountMessages() {
  const [activeId, setActiveId] = useState(null);
  const active = CUSTOMER_CONVERSATIONS.find((c) => c.id === activeId);

  if (active) {
    return (
      <div style={{ padding: "28px 28px 48px", maxWidth: 560 }}>
        <button onClick={() => setActiveId(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 16, padding: 0 }}>
          <ChevronLeft size={16} /> All messages
        </button>
        <ChatThread title={active.title} initialMessages={active.messages} />
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 28px 48px", maxWidth: 560 }}>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, marginBottom: 6 }}>Messages</h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 18 }}>Every conversation with our team, across all your bookings, in one place.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {CUSTOMER_CONVERSATIONS.map((c) => (
          <div
            key={c.id}
            onClick={() => setActiveId(c.id)}
            style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 12, padding: "13px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{c.title}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft, maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMessage}</div>
            </div>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A9A290", flexShrink: 0, marginLeft: 12 }}>{c.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecuritySection({ authProvider }) {
  const isGoogle = authProvider === "google";
  return (
    <>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: palette.ink, marginBottom: 4 }}>Security</div>
      {isGoogle ? (
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft, lineHeight: 1.5 }}>
          You sign in with Google — no password needed here.
        </p>
      ) : (
        <>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft, marginBottom: 12 }}>Change your password.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="Current password" type="password" style={{ ...inputStyle, boxSizing: "border-box" }} />
            <input placeholder="New password" type="password" style={{ ...inputStyle, boxSizing: "border-box" }} />
            <input placeholder="Confirm new password" type="password" style={{ ...inputStyle, boxSizing: "border-box" }} />
          </div>
          <button style={{ marginTop: 12, background: "none", border: `1px solid ${palette.sandDeep}`, borderRadius: 8, padding: "9px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12.5, color: palette.ink, cursor: "pointer" }}>
            Update password
          </button>
        </>
      )}
    </>
  );
}

function AccountProfile() {
  const [savedDocs, setSavedDocs] = useState(true);
  return (
    <div style={{ padding: "28px 28px 48px", maxWidth: 480 }}>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, marginBottom: 18 }}>Profile</h2>

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Full name</label>
      <input defaultValue="Sofia M." style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box" }} />

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Email</label>
      <input defaultValue="sofia.m@example.com" style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box" }} />

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Phone</label>
      <input defaultValue="+39 345 019 8822" style={{ ...inputStyle, width: "100%", marginBottom: 14, boxSizing: "border-box" }} />

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Language</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
        {["English", "Bahasa Indonesia"].map((l, i) => (
          <button key={l} style={{
            flex: 1, padding: "8px 6px", borderRadius: 8, cursor: "pointer",
            border: `1.5px solid ${i === 0 ? palette.teal : palette.sandDeep}`,
            background: i === 0 ? palette.tealLight : "#fff",
            fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600,
            color: i === 0 ? palette.teal : palette.inkSoft,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ height: 1, background: palette.sandDeep, margin: "6px 0 20px" }} />

      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: palette.ink, marginBottom: 4 }}>Saved trekking documents</div>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
        From your Rinjani Trek booking. We'll offer to reuse these next time you book Rinjani, with your confirmation — never automatically.
      </p>
      {savedDocs ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${palette.sandDeep}`, borderRadius: 10, padding: "11px 14px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft }}>
            <FileCheck2 size={15} color={palette.rice} /> Passport scan + insurance details on file
          </span>
          <button onClick={() => setSavedDocs(false)} style={{ background: "none", border: "none", color: palette.coral, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Remove</button>
        </div>
      ) : (
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "#A9A290" }}>No documents saved.</div>
      )}

      <div style={{ height: 1, background: palette.sandDeep, margin: "20px 0" }} />

      <SecuritySection authProvider="email" />

      <button style={{ marginTop: 24, width: "100%", background: palette.ocean, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
        Save changes
      </button>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderTop: `1px solid ${palette.sandDeep}` }}>
      <Icon size={14} color="#A9A290" style={{ marginTop: 1, flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A9A290" }}>{label}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.ink, fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}

function ActionRow({ icon: Icon, label, tone, onClick }) {
  const color = tone === "danger" ? palette.coral : tone === "muted" ? "#A9A290" : palette.teal;
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 0", background: "none", border: "none", borderTop: `1px solid ${palette.sandDeep}`, cursor: "pointer", textAlign: "left" }}>
      <Icon size={15} color={color} />
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: tone === "danger" ? color : palette.ink, flex: 1 }}>{label}</span>
      <ChevronRight size={14} color="#A9A290" />
    </button>
  );
}

function BookingDetail({ booking, onBack, onWriteReview, onPreviewEmail, onViewConfirmation, onViewCancellation, onMessage, onReschedule, onSendGift }) {
  const r = booking;
  const isUpcoming = r.status === "upcoming";
  return (
    <div style={{ padding: "28px 28px 48px", maxWidth: 520, margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 18, padding: 0 }}>
        <ChevronLeft size={16} /> Back to bookings
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 21, fontWeight: 600, margin: 0, maxWidth: 340 }}>{r.title}</h1>
        <Badge tone={isUpcoming ? "coral" : "green"}>{r.status}</Badge>
      </div>

      <div style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 14, padding: "4px 16px", marginBottom: 20 }}>
        <DetailRow icon={Ticket} label="Booking code" value={r.code} />
        <DetailRow icon={Calendar} label="Date" value={r.date} />
        {r.hasPickup && <DetailRow icon={Clock} label="Pickup time" value={`${r.pickupTime} · ${r.meetingPoint}`} />}
        <DetailRow
          icon={Users}
          label={`Participants (${r.pax})`}
          value={r.participantNames && r.participantNames.length ? r.participantNames.join(", ") : `${r.pax} traveler${r.pax > 1 ? "s" : ""} — no individual names added`}
        />
        <DetailRow icon={User} label="Lead traveler" value="Sofia M." />
        <DetailRow icon={Mail} label="Contact email" value="sofia.m@example.com" />
        <DetailRow icon={Smartphone} label="Contact phone" value="+39 345 019 8822" />
      </div>

      <div style={{ border: `1px solid ${palette.sandDeep}`, borderRadius: 14, padding: "0 16px", marginBottom: 8 }}>
        {isUpcoming ? (
          <>
            <ActionRow icon={Mail} label="View confirmation email" onClick={() => onViewConfirmation(r)} />
            <ActionRow icon={MessageCircle} label="Message us about this trip" onClick={() => onMessage(r)} />
            <ActionRow icon={CalendarClock} label="Request reschedule" onClick={() => onReschedule(r, "reschedule")} />
            <ActionRow icon={Gift} label="Send as gift" onClick={() => onReschedule(r, "gift")} />
            <ActionRow icon={XCircle} label="Cancel booking" tone="danger" onClick={() => onViewCancellation(r)} />
          </>
        ) : (
          <>
            {!r.reviewed && <ActionRow icon={Star} label="Write a review" onClick={() => onWriteReview(r)} />}
            <ActionRow icon={Mail} label="View the review-request email" onClick={() => onPreviewEmail(r)} />
            <ActionRow icon={MessageCircle} label="Message us about this trip" onClick={() => onMessage(r)} />
          </>
        )}
      </div>
      {isUpcoming && (
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#A9A290", lineHeight: 1.5, marginTop: 4 }}>
          Reschedule and gift requests need a force-majeure reason (illness, emergency, etc.) and are reviewed by our team — they're not an unrestricted date change. Just need a different date for convenience? Cancel and rebook instead.
        </p>
      )}
    </div>
  );
}

function ForceMajeureRequestForm({ booking, initialOutcome, onBack, onSubmitted }) {
  const [outcome, setOutcome] = useState(initialOutcome);
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div style={{ padding: "48px 28px", maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: palette.tealLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CircleDashed size={24} color={palette.teal} />
        </div>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 21, fontWeight: 600, marginBottom: 8 }}>Request submitted</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: palette.inkSoft, marginBottom: 22 }}>
          Our team will review your {outcome === "gift" ? "gift request" : "reschedule request"} and get back to you here and by email — usually within 24 hours.
        </p>
        <button onClick={onSubmitted} style={{ background: palette.ocean, color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          Back to booking
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 28px 48px", maxWidth: 460, margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 18, padding: 0 }}>
        <ChevronLeft size={16} /> Back to booking
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 7, background: palette.tealLight, borderRadius: 8, padding: "10px 13px", marginBottom: 20, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.teal, fontWeight: 600 }}>
        <ShieldCheck size={14} /> For illness, emergencies, or other unavoidable circumstances — reviewed by our team, no fee if approved.
      </div>

      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 21, fontWeight: 600, marginBottom: 18 }}>{booking.title}</h1>

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>What would you like?</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button
          onClick={() => setOutcome("reschedule")}
          style={{ flex: 1, padding: "10px 6px", borderRadius: 8, cursor: "pointer", border: `1.5px solid ${outcome === "reschedule" ? palette.teal : palette.sandDeep}`, background: outcome === "reschedule" ? palette.tealLight : "#fff", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: outcome === "reschedule" ? palette.teal : palette.inkSoft }}
        >
          Reschedule
        </button>
        <button
          onClick={() => setOutcome("gift")}
          style={{ flex: 1, padding: "10px 6px", borderRadius: 8, cursor: "pointer", border: `1.5px solid ${outcome === "gift" ? palette.teal : palette.sandDeep}`, background: outcome === "gift" ? palette.tealLight : "#fff", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: outcome === "gift" ? palette.teal : palette.inkSoft }}
        >
          Send as gift
        </button>
      </div>

      {outcome === "reschedule" ? (
        <>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Preferred new date</label>
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginBottom: 16 }} />
        </>
      ) : (
        <>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Recipient's name</label>
          <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginBottom: 12 }} placeholder="Who's this for?" />
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>Recipient's email or phone</label>
          <input value={recipientContact} onChange={(e) => setRecipientContact(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginBottom: 16 }} placeholder="So we can send them the voucher" />
        </>
      )}

      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: palette.inkSoft, display: "block", marginBottom: 6 }}>What happened?</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        placeholder="Briefly tell us what's going on — a supporting document (e.g. medical note) can be attached too."
        style={{ width: "100%", border: `1px solid ${palette.sandDeep}`, borderRadius: 10, padding: 12, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", resize: "none", marginBottom: 12, boxSizing: "border-box" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 9, border: `1.5px dashed ${palette.sandDeep}`, borderRadius: 10, padding: "12px 14px", marginBottom: 20, cursor: "pointer" }}>
        <Upload size={16} color={palette.inkSoft} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft }}>Attach supporting document (optional)</span>
      </div>

      <button
        onClick={() => setSubmitted(true)}
        style={{ width: "100%", background: palette.coral, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
      >
        Submit request
      </button>
    </div>
  );
}

function CustomerAccount({ accountTab, setAccountTab, onWriteReview, onViewDetails }) {
  return (
    <>
      <AccountTabs tab={accountTab} setTab={setAccountTab} />
      {accountTab === "overview" && <AccountOverview onGoTab={setAccountTab} />}
      {accountTab === "bookings" && (
        <div style={{ padding: "28px 28px 0" }}>
          <BookingHistory
            embedded
            onWriteReview={onWriteReview}
            onViewDetails={onViewDetails}
          />
        </div>
      )}
      {accountTab === "messages" && <AccountMessages />}
      {accountTab === "profile" && <AccountProfile />}
    </>
  );
}

const ADMIN_ROLES = [
  { role: "Super Admin", color: palette.ocean, access: "Everything — including managing other admin accounts, agent commission tiers, and all financial data." },
  { role: "Reservations", color: palette.teal, access: "Rinjani request queue, cancellations/reschedules, pickup-time overrides, review moderation, unified inbox. No payout or financial-report access." },
  { role: "Accounting", color: palette.rice, access: "Payouts and disbursement monitoring, refund processing, financial reports." },
  { role: "Support", color: "#A9A290", access: "Unified inbox only — for a lower-trust hire answering routine chat questions.", optional: true },
];

function AdminRolesCard() {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, marginBottom: 4 }}>Admin roles</h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 18, lineHeight: 1.6 }}>
        Built into the data model from day one, but only enforced once there's a second admin account to apply it to — right now, a single Super Admin (you) covers everything below without friction.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ADMIN_ROLES.map((r) => (
          <div key={r.role} style={{ display: "flex", gap: 14, border: `1px solid ${palette.sandDeep}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ width: 6, borderRadius: 3, background: r.color, flexShrink: 0 }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "Fraunces, serif", fontSize: 14.5, fontWeight: 600, color: palette.ink }}>{r.role}</span>
                {r.optional && <Badge tone="gray">Add when hired</Badge>}
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: palette.inkSoft, lineHeight: 1.5, margin: 0 }}>{r.access}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminReviewInbox() {
  return (
    <div style={{ padding: "36px 28px 48px", maxWidth: 720, margin: "0 auto" }}>
      <AdminRolesCard />

      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Review notifications (preview)</h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 24 }}>
        This is what lands in your inbox the moment a new review comes in — same format as the GetYourGuide emails, adapted to our moderation rule from §6d: 4–5 stars publish immediately, 3 and below need your decision.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <NotificationEmail
          toneColor={palette.teal}
          kicker="New review · auto-published"
          heading="New review on Gili Islands Snorkeling Trip"
          bodyText={'"Anto took great care of us all day. Saw turtles at Gili Meno, would book again." — Sofia M., ★★★★★'}
          ctaLabel="View review"
          ctaNote="Already live on the product page — no action needed."
        />
        <NotificationEmail
          toneColor={palette.coral}
          kicker="New review · action needed"
          heading="New review on Airport Transfer"
          bodyText={'"Driver was 25 minutes late and didn\'t call ahead. Car was clean at least." — Daniel R., ★★★☆☆'}
          ctaLabel="Review & moderate"
          ctaNote="Held from publishing until you approve, edit, or reject it."
        />
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("customer");
  const [view, setView] = useState("home");
  const [filter, setFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [booking, setBooking] = useState(null);
  const [agentTab, setAgentTab] = useState("overview");
  const [simulateAgentRef, setSimulateAgentRef] = useState(false);
  const [supportPrefill, setSupportPrefill] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [accountTab, setAccountTab] = useState("overview");
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authReturnTo, setAuthReturnTo] = useState(null);
  const [viewedBooking, setViewedBooking] = useState(null);
  const [fmOutcome, setFmOutcome] = useState("reschedule");

  const agentQR = simulateAgentRef ? "AGT-BALI7" : null;

  const requireAuth = (destinationView) => {
    if (isLoggedIn) {
      setView(destinationView);
    } else {
      setAuthReturnTo(destinationView);
      setAuthMode("login");
      setView("auth");
    }
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#FFFEFB", minHeight: 600, borderRadius: 16, overflow: "hidden", border: `1px solid ${palette.sandDeep}` }}>
      <style>{FONT_IMPORT}</style>
      <Header
        mode={mode}
        setMode={setMode}
        agentQR={mode === "customer" ? agentQR : null}
        isLoggedIn={isLoggedIn}
        onAccountClick={() => { setAccountTab("overview"); setView("account"); }}
        onSignInClick={() => { setAuthReturnTo(null); setAuthMode("login"); setView("auth"); }}
      />

      {mode === "customer" && (
        <>
          {view !== "account" && view !== "auth" && (
            <div style={{ padding: "10px 28px 0", display: "flex", justifyContent: "flex-end", gap: 18, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft, cursor: "pointer" }}>
                <input type="checkbox" checked={!isLoggedIn} onChange={(e) => setIsLoggedIn(!e.target.checked)} />
                Simulate signed-out visitor
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "Inter, sans-serif", fontSize: 12, color: palette.inkSoft, cursor: "pointer" }}>
                <input type="checkbox" checked={simulateAgentRef} onChange={(e) => setSimulateAgentRef(e.target.checked)} />
                Simulate arriving via an agent QR scan
              </label>
            </div>
          )}

          {view === "account" && (
            <CustomerAccount
              accountTab={accountTab}
              setAccountTab={setAccountTab}
              onWriteReview={(r) => { setReviewTarget(r); setView("writeReview"); }}
              onViewDetails={(r) => { setViewedBooking(r); setView("bookingDetail"); }}
            />
          )}

          {view === "bookingDetail" && (
            <BookingDetail
              booking={viewedBooking}
              onBack={() => setView("account")}
              onWriteReview={(r) => { setReviewTarget(r); setView("writeReview"); }}
              onPreviewEmail={(r) => { setReviewTarget(r); setView("emailPreview"); }}
              onViewConfirmation={(r) => { setReviewTarget(r); setView("confirmationEmailPreview"); }}
              onViewCancellation={(r) => { setReviewTarget(r); setView("cancellationEmailPreview"); }}
              onMessage={() => { setAccountTab("messages"); setView("account"); }}
              onReschedule={(r, outcome) => { setViewedBooking(r); setFmOutcome(outcome); setView("forceMajeureForm"); }}
            />
          )}

          {view === "forceMajeureForm" && (
            <ForceMajeureRequestForm
              booking={viewedBooking}
              initialOutcome={fmOutcome}
              onBack={() => setView("bookingDetail")}
              onSubmitted={() => setView("bookingDetail")}
            />
          )}

          {view === "auth" && (
            <AuthScreen
              mode={authMode}
              setMode={setAuthMode}
              contextNote={authReturnTo ? "Sign in to continue your booking — nothing you've selected will be lost." : null}
              onAuthed={() => {
                setIsLoggedIn(true);
                if (authReturnTo) {
                  setView(authReturnTo);
                  setAuthReturnTo(null);
                } else {
                  setAccountTab("overview");
                  setView("account");
                }
              }}
            />
          )}

          {view === "home" && (
            <CustomerHome
              filter={filter}
              setFilter={setFilter}
              onSearch={() => {}}
              onSelect={(p) => { setSelectedProduct(p); setView("detail"); }}
            />
          )}
          {view === "detail" && (
            <ListingDetail
              product={selectedProduct}
              agentQR={agentQR}
              onBack={() => setView("home")}
              onBook={(b) => { setBooking(b); requireAuth("checkout"); }}
              onRequest={(r) => { setBooking(r); requireAuth("requestSubmitted"); }}
            />
          )}
          {view === "checkout" && (
            <Checkout
              product={selectedProduct}
              booking={booking}
              onBack={() => setView("detail")}
              onPay={() => setView("confirmation")}
            />
          )}
          {view === "confirmation" && (
            <Confirmation
              product={selectedProduct}
              booking={booking}
              onHistory={() => { setAccountTab("bookings"); setView("account"); }}
              onHome={() => setView("home")}
            />
          )}
          {view === "writeReview" && (
            <ReviewForm productTitle={reviewTarget.title} onBack={() => setView("home")} />
          )}
          {view === "emailPreview" && (
            <div style={{ padding: "36px 28px 48px", maxWidth: 520, margin: "0 auto" }}>
              <button onClick={() => setView(viewedBooking ? "bookingDetail" : "account")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 16, padding: 0 }}>
                <ChevronLeft size={16} /> Back
              </button>
              <EmailPreview product={{ title: reviewTarget.title }} />
            </div>
          )}
          {view === "confirmationEmailPreview" && (
            <div style={{ padding: "36px 28px 48px", maxWidth: 480, margin: "0 auto" }}>
              <button onClick={() => setView(viewedBooking ? "bookingDetail" : "account")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 16, padding: 0 }}>
                <ChevronLeft size={16} /> Back
              </button>
              <NotificationEmail
                toneColor={palette.teal}
                kicker="Booking confirmed"
                heading="You're all set!"
                bodyText={`Thanks for booking with Adventure Lombok. Here's your confirmation for ${reviewTarget.title}.`}
                rows={[
                  { label: "Booking code", value: reviewTarget.code },
                  { label: "Date", value: reviewTarget.date },
                  ...(reviewTarget.hasPickup ? [
                    { label: "Pickup time", value: reviewTarget.pickupTime },
                    { label: "Meeting point", value: reviewTarget.meetingPoint },
                  ] : []),
                ]}
                ctaLabel="View my booking"
                ctaNote="You'll be asked to log in first."
                onCta={() => setView(viewedBooking ? "bookingDetail" : "account")}
              />
            </div>
          )}
          {view === "cancellationEmailPreview" && (
            <div style={{ padding: "36px 28px 48px", maxWidth: 480, margin: "0 auto" }}>
              <button onClick={() => setView(viewedBooking ? "bookingDetail" : "account")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, color: palette.inkSoft, marginBottom: 16, padding: 0 }}>
                <ChevronLeft size={16} /> Back
              </button>
              <NotificationEmail
                toneColor={palette.coral}
                kicker="Booking cancelled"
                heading="Your booking has been cancelled"
                bodyText="Since this was cancelled 2 or more days before departure, a 10% payment gateway fee applies per our cancellation policy."
                rows={[
                  { label: "Booking code", value: reviewTarget.code },
                  { label: "Refund", value: "90% · " + fmtIDR(1215000) },
                  { label: "Expected in your account", value: "3–5 business days" },
                ]}
                ctaLabel="View my booking"
                ctaNote="You'll be asked to log in first."
                onCta={() => setView(viewedBooking ? "bookingDetail" : "account")}
              />
            </div>
          )}
          {view === "requestSubmitted" && (
            <RequestSubmitted product={selectedProduct} request={booking} onHome={() => setView("home")} />
          )}
        </>
      )}

      {mode === "agent" && (
        <>
          <AgentTabs tab={agentTab} setTab={setAgentTab} />
          {agentTab === "overview" && <AgentOverview onOpenBooking={() => setAgentTab("sales")} />}
          {agentTab === "catalog" && (
            <AgentCatalog onAskAbout={(p) => { setSupportPrefill(p); setAgentTab("support"); }} />
          )}
          {agentTab === "sales" && <AgentSales />}
          {agentTab === "payouts" && <AgentPayouts />}
          {agentTab === "support" && (
            <AgentSupportChat prefillProduct={supportPrefill} onConsumePrefill={() => setSupportPrefill(null)} />
          )}
          {agentTab === "profile" && <AgentProfile />}
        </>
      )}

      {mode === "admin" && <AdminReviewInbox />}
    </div>
  );
}

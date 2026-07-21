import React, { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  Scissors, ClipboardList, Package, Settings, Plus, Search, X,
  ClipboardList as ClipboardIcon, Layers, Tag, CheckCircle2, AlertTriangle, Phone, User,
  Car, Palette, Trash2, ChevronRight, Loader2, Save, Minus, Eye
} from "lucide-react";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
`;

const STATUSES = [
  { id: "alindi", label: "Sipariş Alındı", icon: ClipboardIcon, color: "#6B7280", bg: "#F1F2F4" },
  { id: "kesim", label: "Kesim", icon: Scissors, color: "#2C5F8A", bg: "#E7F0F7" },
  { id: "dikim", label: "Dikim", icon: Layers, color: "#7C5CBF", bg: "#EFE9F9" },
  { id: "logo_topuklu", label: "Logo + Topuklu", icon: Tag, color: "#B8860B", bg: "#FBF1DC" },
  { id: "hazir", label: "Hazır", icon: AlertTriangle, color: "#E8590C", bg: "#FDECE1" },
  { id: "teslim", label: "Teslim Edildi", icon: CheckCircle2, color: "#2F7D5C", bg: "#E7F3ED" },
];

const COLOR_PALETTE = [
  { id: "siyah", name: "Siyah", hex: "#1C1C1C" },
  { id: "antrasit", name: "Antrasit", hex: "#3B3F45" },
  { id: "gri", name: "Gri", hex: "#8B8F94" },
  { id: "beyaz", name: "Beyaz", hex: "#F5F5F0" },
  { id: "krem", name: "Krem", hex: "#EDE3D0" },
  { id: "bej", name: "Bej", hex: "#D9C7A8" },
  { id: "kahve", name: "Kahverengi", hex: "#6B4226" },
  { id: "lacivert", name: "Lacivert", hex: "#1B2A4A" },
  { id: "mavi", name: "Mavi", hex: "#1F6FB2" },
  { id: "turkuaz", name: "Turkuaz", hex: "#158C8C" },
  { id: "yesil", name: "Yeşil", hex: "#2F7D4F" },
  { id: "haki", name: "Haki", hex: "#6B7A3A" },
  { id: "sari", name: "Sarı", hex: "#E8B923" },
  { id: "turuncu", name: "Turuncu", hex: "#E0611F" },
  { id: "kirmizi", name: "Kırmızı", hex: "#C1272D" },
  { id: "bordo", name: "Bordo", hex: "#6E1423" },
  { id: "mor", name: "Mor", hex: "#6A3FA0" },
  { id: "pembe", name: "Pembe", hex: "#D96C9E" },
];

const colorHex = (name) => COLOR_PALETTE.find((c) => c.name === name)?.hex || "#CCCCCC";

const DEFAULT_PRICES = { set: 1600, topuklu: 300, logo: 100 };

const DEFAULT_STOCK = [
  { id: "t-siyah", renk: "Siyah", tip: "Taban", metre: 40, esik: 10 },
  { id: "t-gri", renk: "Gri", tip: "Taban", metre: 25, esik: 10 },
  { id: "t-bej", renk: "Bej", tip: "Taban", metre: 15, esik: 10 },
  { id: "t-lacivert", renk: "Lacivert", tip: "Taban", metre: 12, esik: 8 },
  { id: "k-siyah", renk: "Siyah", tip: "Kenarlık", metre: 20, esik: 8 },
  { id: "k-kirmizi", renk: "Kırmızı", tip: "Kenarlık", metre: 18, esik: 8 },
  { id: "k-mavi", renk: "Mavi", tip: "Kenarlık", metre: 12, esik: 8 },
  { id: "k-sari", renk: "Sarı", tip: "Kenarlık", metre: 9, esik: 8 },
];

// Firestore: tek koleksiyon "shopData" içinde 3 doküman (orders, stock, prices).
// onSnapshot ile gerçek zamanlı dinleniyor: bir cihazda değişen veri, tüm
// diğer cihazlarda anında güncelleniyor.
function useStorage() {
  const [ready, setReady] = useState({ orders: false, stock: false, prices: false });
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState(DEFAULT_STOCK);
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubOrders = onSnapshot(
      doc(db, "shopData", "orders"),
      (snap) => {
        if (snap.exists()) setOrders(snap.data().list || []);
        setReady((r) => ({ ...r, orders: true }));
      },
      (e) => {
        console.error("orders dinleme hatası:", e);
        setError(`Bağlantı hatası (siparişler): ${e.message}`);
        setReady((r) => ({ ...r, orders: true }));
      }
    );
    const unsubStock = onSnapshot(
      doc(db, "shopData", "stock"),
      (snap) => {
        if (snap.exists()) setStock(snap.data().list || DEFAULT_STOCK);
        setReady((r) => ({ ...r, stock: true }));
      },
      (e) => {
        console.error("stock dinleme hatası:", e);
        setError(`Bağlantı hatası (stok): ${e.message}`);
        setReady((r) => ({ ...r, stock: true }));
      }
    );
    const unsubPrices = onSnapshot(
      doc(db, "shopData", "prices"),
      (snap) => {
        if (snap.exists()) setPrices({ ...DEFAULT_PRICES, ...snap.data() });
        setReady((r) => ({ ...r, prices: true }));
      },
      (e) => {
        console.error("prices dinleme hatası:", e);
        setError(`Bağlantı hatası (fiyatlar): ${e.message}`);
        setReady((r) => ({ ...r, prices: true }));
      }
    );
    return () => {
      unsubOrders();
      unsubStock();
      unsubPrices();
    };
  }, []);

  const persistOrders = useCallback(async (next) => {
    setOrders(next);
    try {
      await setDoc(doc(db, "shopData", "orders"), { list: next });
    } catch (e) {
      console.error("orders kayıt hatası:", e);
      setError(`Sipariş kaydedilemedi: ${e.message}`);
    }
  }, []);

  const persistStock = useCallback(async (next) => {
    setStock(next);
    try {
      await setDoc(doc(db, "shopData", "stock"), { list: next });
    } catch (e) {
      console.error("stock kayıt hatası:", e);
      setError(`Stok kaydedilemedi: ${e.message}`);
    }
  }, []);

  const persistPrices = useCallback(async (next) => {
    setPrices(next);
    try {
      await setDoc(doc(db, "shopData", "prices"), next);
    } catch (e) {
      console.error("prices kayıt hatası:", e);
      setError(`Fiyat listesi kaydedilemedi: ${e.message}`);
    }
  }, []);

  const allReady = ready.orders && ready.stock && ready.prices;
  return { ready: allReady, orders, stock, prices, error, setError, persistOrders, persistStock, persistPrices };
}

function StatusBadge({ statusId, small }) {
  const s = STATUSES.find((x) => x.id === statusId) || STATUSES[0];
  const Icon = s.icon;
  return (
    <span
      style={{ color: s.color, background: s.bg }}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      }`}
    >
      <Icon size={small ? 11 : 13} strokeWidth={2.5} />
      {s.label}
    </span>
  );
}

function ColorSwatchPicker({ label, value, onChange }) {
  return (
    <div>
      <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#6B7280" }}>{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PALETTE.map((c) => {
          const active = value === c.name;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.name)}
              title={c.name}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-transform"
              style={{
                background: c.hex,
                border: active ? "2.5px solid #14213D" : "2px solid #FFFFFF",
                outline: active ? "1.5px solid #14213D" : "1px solid #DCE1E7",
                transform: active ? "scale(1.12)" : "scale(1)",
              }}
            />
          );
        })}
      </div>
      <div className="text-[12px] font-semibold mt-1.5" style={{ color: "#14213D" }}>{value}</div>
    </div>
  );
}

function MatPreview({ marka, model, yil, tabanRengi, kenarRengi, carRengi, topuklu, logoAdet }) {
  const tabanHex = colorHex(tabanRengi);
  const kenarHex = colorHex(kenarRengi);
  const carHex = colorHex(carRengi);
  const arac = [marka, model, yil].filter(Boolean).join(" ");

  return (
    <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid #DCE1E7", position: "sticky", top: 16 }}>
      <div className="text-[11px] font-bold tracking-widest mb-3 flex items-center gap-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#8A93A0" }}>
        <Eye size={13} /> ÖNİZLEME
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: carHex, border: "1.5px solid #FFF", outline: "1px solid #DCE1E7" }} />
        <span className="text-[14px] font-semibold truncate" style={{ color: "#14213D" }}>
          {arac || "Araç bilgisi girin"}
        </span>
      </div>

      <svg viewBox="0 0 300 190" className="w-full rounded-md" style={{ background: "#F3F5F7" }}>
        <path d="M22,28 L118,28 L108,88 L18,94 Z" fill={tabanHex} stroke={kenarHex} strokeWidth="7" strokeLinejoin="round" />
        <path d="M182,28 L278,28 L282,94 L192,88 Z" fill={tabanHex} stroke={kenarHex} strokeWidth="7" strokeLinejoin="round" />
        <path d="M28,104 L112,98 L108,158 L38,158 Z" fill={tabanHex} stroke={kenarHex} strokeWidth="7" strokeLinejoin="round" />
        <path d="M188,98 L272,104 L262,158 L192,158 Z" fill={tabanHex} stroke={kenarHex} strokeWidth="7" strokeLinejoin="round" />
        {logoAdet > 0 && (
          <>
            <circle cx="70" cy="58" r="6" fill="#FFFFFF" opacity="0.85" />
            <circle cx="230" cy="58" r="6" fill="#FFFFFF" opacity="0.85" />
          </>
        )}
      </svg>

      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "#F1F2F4", color: "#6B7280" }}>
          {tabanRengi} taban
        </span>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "#F1F2F4", color: "#6B7280" }}>
          {kenarRengi} kenar
        </span>
        {topuklu && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "#FDECE1", color: "#E8590C" }}>
            Topuklu
          </span>
        )}
        {logoAdet > 0 && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "#FBF1DC", color: "#B8860B" }}>
            {logoAdet}x Logo
          </span>
        )}
      </div>
      <div className="text-[10px] mt-3" style={{ color: "#B0B6BE" }}>
        * Şekil temsilidir, araca özel kalıp değildir.
      </div>
    </div>
  );
}

function TicketCard({ order, onAdvance, onCancel, onDelete }) {
  const statusIdx = STATUSES.findIndex((s) => s.id === order.durum);
  const next = STATUSES[statusIdx + 1];
  const s = STATUSES[statusIdx];
  const extrasLabel = [
    order.topuklu ? "Topuklu" : null,
    order.logoAdet > 0 ? `${order.logoAdet}x Logo` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="relative bg-white rounded-lg overflow-hidden" style={{ border: "1px solid #DCE1E7", boxShadow: "0 1px 2px rgba(20,33,61,0.04)" }}>
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: s.color }} />
      <div className="pl-5 pr-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] tracking-widest font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#8A93A0" }}>
              {order.kod}
            </div>
            <div className="font-semibold text-[15px] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: "#14213D" }}>
              {order.musteri}
            </div>
          </div>
          <StatusBadge statusId={order.durum} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]" style={{ color: "#4B5563" }}>
          <div className="flex items-center gap-1.5">
            <Car size={13} strokeWidth={2} />
            {order.arac || "—"}
            {order.carRengi && (
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colorHex(order.carRengi), border: "1px solid #FFF", outline: "1px solid #DCE1E7" }} title={order.carRengi} />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Phone size={13} strokeWidth={2} />
            {order.telefon || "—"}
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <Palette size={13} strokeWidth={2} />
            {order.tabanRengi} taban / {order.kenarRengi} kenar
            {extrasLabel ? ` · ${extrasLabel}` : ""}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="font-bold text-[15px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#14213D" }}>
            {order.fiyat.toLocaleString("tr-TR")} ₺
          </div>
          <div className="flex items-center gap-2">
            {order.durum !== "teslim" && (
              <button onClick={() => onCancel(order.id)} className="text-[12px] px-2 py-1 rounded-md font-medium hover:bg-red-50 transition-colors" style={{ color: "#B91C1C" }}>
                İptal
              </button>
            )}
            {next && (
              <button onClick={() => onAdvance(order.id)} className="text-[12px] px-3 py-1.5 rounded-md font-semibold flex items-center gap-1 text-white hover:opacity-90 transition-opacity" style={{ background: "#14213D" }}>
                {next.label} <ChevronRight size={13} />
              </button>
            )}
            {order.durum === "teslim" && (
              <button onClick={() => onDelete(order.id)} className="text-[12px] px-2 py-1 rounded-md hover:bg-gray-100 transition-colors" style={{ color: "#9CA3AF" }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewOrderForm({ prices, onCreate }) {
  const [musteri, setMusteri] = useState("");
  const [telefon, setTelefon] = useState("");
  const [marka, setMarka] = useState("");
  const [model, setModel] = useState("");
  const [yil, setYil] = useState("");
  const [carRengi, setCarRengi] = useState("Beyaz");
  const [tabanRengi, setTabanRengi] = useState("Siyah");
  const [kenarRengi, setKenarRengi] = useState("Siyah");
  const [topuklu, setTopuklu] = useState(false);
  const [logoAdet, setLogoAdet] = useState(0);
  const [override, setOverride] = useState("");
  const [notlar, setNotlar] = useState("");

  const hesaplananFiyat = prices.set + (topuklu ? prices.topuklu : 0) + logoAdet * prices.logo;
  const fiyat = override !== "" ? Number(override) : hesaplananFiyat;

  const handleSubmit = () => {
    if (!musteri.trim() || !marka.trim()) return;
    onCreate({
      musteri: musteri.trim(),
      telefon: telefon.trim(),
      arac: [marka, model, yil].filter(Boolean).join(" "),
      carRengi,
      tabanRengi,
      kenarRengi,
      topuklu,
      logoAdet,
      fiyat,
      notlar: notlar.trim(),
    });
    setMusteri(""); setTelefon(""); setMarka(""); setModel(""); setYil("");
    setCarRengi("Beyaz"); setTopuklu(false); setLogoAdet(0); setOverride(""); setNotlar("");
  };

  const inputClass = "w-full rounded-md px-3 py-2 text-[14px] outline-none transition-colors focus:ring-2";
  const inputStyle = { border: "1px solid #DCE1E7", color: "#14213D" };

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.85fr] gap-5 items-start">
      <div
        className="rounded-lg p-5"
        style={{
          background: "#FFFFFF", border: "1px solid #DCE1E7",
          backgroundImage: "linear-gradient(#EEF1F4 1px, transparent 1px), linear-gradient(90deg, #EEF1F4 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        <div className="text-[11px] font-bold tracking-widest mb-3 flex items-center gap-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#8A93A0" }}>
          <User size={13} /> MÜŞTERİ &amp; ARAÇ
        </div>
        <div className="space-y-3">
          <input placeholder="Müşteri adı *" value={musteri} onChange={(e) => setMusteri(e.target.value)} className={inputClass} style={inputStyle} />
          <input placeholder="Telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} className={inputClass} style={inputStyle} />
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Marka *" value={marka} onChange={(e) => setMarka(e.target.value)} className={inputClass} style={inputStyle} />
            <input placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} style={inputStyle} />
            <input placeholder="Yıl" value={yil} onChange={(e) => setYil(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <textarea placeholder="Not (opsiyonel)" value={notlar} onChange={(e) => setNotlar(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
          <ColorSwatchPicker label="Araç rengi" value={carRengi} onChange={setCarRengi} />
        </div>
      </div>

      <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid #DCE1E7" }}>
        <div className="text-[11px] font-bold tracking-widest mb-3 flex items-center gap-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#8A93A0" }}>
          <Palette size={13} /> RENK &amp; SEÇENEKLER
        </div>

        <div className="grid grid-cols-1 gap-4 mb-4">
          <ColorSwatchPicker label="Taban rengi" value={tabanRengi} onChange={setTabanRengi} />
          <ColorSwatchPicker label="Kenarlık (şerit) rengi" value={kenarRengi} onChange={setKenarRengi} />
        </div>

        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setTopuklu((v) => !v)}
            className="flex-1 flex items-center justify-between rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors"
            style={{
              border: topuklu ? "1.5px solid #E8590C" : "1px solid #DCE1E7",
              background: topuklu ? "#FDECE1" : "#FFF",
              color: "#14213D",
            }}
          >
            <span>Topuklu</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>+{prices.topuklu}₺</span>
          </button>
          <div className="flex items-center rounded-md" style={{ border: "1px solid #DCE1E7" }}>
            <button onClick={() => setLogoAdet((n) => Math.max(0, n - 1))} className="w-8 h-9 flex items-center justify-center" style={{ color: "#6B7280" }}>
              <Minus size={13} />
            </button>
            <div className="w-16 text-center text-[13px] font-medium" style={{ color: "#14213D" }}>
              {logoAdet}x Logo
            </div>
            <button onClick={() => setLogoAdet((n) => n + 1)} className="w-8 h-9 flex items-center justify-center" style={{ color: "#6B7280" }}>
              <Plus size={13} />
            </button>
          </div>
        </div>
        {logoAdet > 0 && (
          <div className="text-[11px] mb-3" style={{ color: "#9CA3AF" }}>
            {logoAdet} logo × {prices.logo}₺ = {logoAdet * prices.logo}₺
          </div>
        )}

        <div className="flex items-center justify-between rounded-md px-3 py-2.5 mb-4 mt-3" style={{ background: "#F7F8F9" }}>
          <span className="text-[13px] font-medium" style={{ color: "#6B7280" }}>Toplam fiyat</span>
          <div className="flex items-center gap-2">
            <span style={{ color: "#9CA3AF", fontSize: 12 }}>₺</span>
            <input
              type="number"
              value={override !== "" ? override : hesaplananFiyat}
              onChange={(e) => setOverride(e.target.value)}
              className="w-24 text-right font-bold rounded px-2 py-1 text-[15px]"
              style={{ fontFamily: "'JetBrains Mono', monospace", border: "1px solid #DCE1E7", color: "#14213D" }}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!musteri.trim() || !marka.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-md py-2.5 font-semibold text-[14px] text-white transition-opacity disabled:opacity-40"
          style={{ background: "#14213D" }}
        >
          <Plus size={16} /> Sipariş Oluştur — Fişi Bas
        </button>
      </div>

      <MatPreview
        marka={marka} model={model} yil={yil}
        tabanRengi={tabanRengi} kenarRengi={kenarRengi} carRengi={carRengi}
        topuklu={topuklu} logoAdet={logoAdet}
      />
    </div>
  );
}

function StockPanel({ stock, onUpdate }) {
  const [renk, setRenk] = useState(COLOR_PALETTE[0].name);
  const [tip, setTip] = useState("Taban");
  const inputStyle = { border: "1px solid #DCE1E7", color: "#14213D" };

  const change = (id, delta) => {
    onUpdate(stock.map((s) => (s.id === id ? { ...s, metre: Math.max(0, +(s.metre + delta).toFixed(1)) } : s)));
  };

  const addStockItem = () => {
    const id = `${tip[0].toLowerCase()}-${renk.toLowerCase()}-${Date.now()}`;
    if (stock.some((s) => s.renk === renk && s.tip === tip)) return;
    onUpdate([...stock, { id, renk, tip, metre: 10, esik: 8 }]);
  };

  const removeItem = (id) => onUpdate(stock.filter((s) => s.id !== id));

  return (
    <div>
      <div className="rounded-lg p-4 mb-4 flex flex-wrap items-end gap-2" style={{ background: "#FFF", border: "1px solid #DCE1E7" }}>
        <div>
          <label className="text-[11px] font-medium block mb-1" style={{ color: "#6B7280" }}>Renk</label>
          <select value={renk} onChange={(e) => setRenk(e.target.value)} className="rounded-md px-2 py-1.5 text-[13px]" style={inputStyle}>
            {COLOR_PALETTE.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium block mb-1" style={{ color: "#6B7280" }}>Tip</label>
          <select value={tip} onChange={(e) => setTip(e.target.value)} className="rounded-md px-2 py-1.5 text-[13px]" style={inputStyle}>
            <option>Taban</option>
            <option>Kenarlık</option>
          </select>
        </div>
        <button onClick={addStockItem} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: "#14213D" }}>
          <Plus size={13} /> Stoğa Ekle
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {stock.map((s) => {
          const low = s.metre <= s.esik;
          const swatch = COLOR_PALETTE.find((c) => c.name === s.renk)?.hex || "#CCC";
          return (
            <div key={s.id} className="rounded-lg p-4 flex items-center justify-between" style={{ background: "#FFFFFF", border: `1px solid ${low ? "#F3B99A" : "#DCE1E7"}` }}>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: swatch, border: "1.5px solid #FFF", outline: "1px solid #DCE1E7" }} />
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: "#14213D" }}>{s.renk}</div>
                  <div className="text-[11px] font-medium" style={{ color: "#9CA3AF" }}>{s.tip}</div>
                  {low && (
                    <div className="text-[11px] font-semibold flex items-center gap-1 mt-0.5" style={{ color: "#E8590C" }}>
                      <AlertTriangle size={11} /> Stok azaldı
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => change(s.id, -1)} className="w-7 h-7 rounded-md font-bold" style={{ border: "1px solid #DCE1E7", color: "#6B7280" }}>–</button>
                <div className="w-14 text-center font-bold text-[14px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: low ? "#E8590C" : "#14213D" }}>
                  {s.metre}m
                </div>
                <button onClick={() => change(s.id, 1)} className="w-7 h-7 rounded-md font-bold" style={{ border: "1px solid #DCE1E7", color: "#6B7280" }}>+</button>
                <button onClick={() => removeItem(s.id)} className="ml-1 w-7 h-7 rounded-md flex items-center justify-center" style={{ color: "#9CA3AF" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsPanel({ prices, onSave }) {
  const [set, setSet] = useState(prices.set);
  const [topuklu, setTopuklu] = useState(prices.topuklu);
  const [logo, setLogo] = useState(prices.logo);
  const inputStyle = { border: "1px solid #DCE1E7", color: "#14213D" };

  const row = (label, value, setter) => (
    <div className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid #F1F2F4" }}>
      <span className="flex-1 text-[14px] font-medium" style={{ color: "#14213D" }}>{label}</span>
      <input type="number" value={value} onChange={(e) => setter(Number(e.target.value))}
        className="w-24 rounded px-2 py-1.5 text-[14px] font-bold text-right"
        style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
      <span className="text-[12px]" style={{ color: "#9CA3AF" }}>₺</span>
    </div>
  );

  return (
    <div className="max-w-md">
      <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid #DCE1E7" }}>
        <div className="text-[11px] font-bold tracking-widest mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#8A93A0" }}>SABİT FİYATLAR</div>
        {row("Set (taban + kenarlık)", set, setSet)}
        {row("Topuklu", topuklu, setTopuklu)}
        {row("Logo (adet başına)", logo, setLogo)}
        <button
          onClick={() => onSave({ set, topuklu, logo })}
          className="mt-4 flex items-center gap-2 rounded-md px-4 py-2 font-semibold text-[13px] text-white"
          style={{ background: "#14213D" }}
        >
          <Save size={14} /> Fiyatları Kaydet
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { ready, orders, stock, prices, error, setError, persistOrders, persistStock, persistPrices } = useStorage();
  const [tab, setTab] = useState("yeni");
  const [filter, setFilter] = useState("aktif");
  const [q, setQ] = useState("");

  const nextCode = () => `KYS-${String(orders.length + 1).padStart(4, "0")}`;

  const createOrder = (data) => {
    const order = { id: `${Date.now()}`, kod: nextCode(), tarih: new Date().toISOString(), durum: "alindi", ...data };
    persistOrders([order, ...orders]);
    setTab("siparisler");
    setFilter("aktif");
  };

  const advanceOrder = (id) => {
    const next = orders.map((o) => {
      if (o.id !== id) return o;
      const idx = STATUSES.findIndex((s) => s.id === o.durum);
      const nextStatus = STATUSES[idx + 1];
      return nextStatus ? { ...o, durum: nextStatus.id } : o;
    });
    persistOrders(next);
  };

  const cancelOrder = (id) => persistOrders(orders.filter((o) => o.id !== id));
  const deleteOrder = (id) => persistOrders(orders.filter((o) => o.id !== id));

  const filtered = orders.filter((o) => {
    const matchesQ = !q || o.musteri.toLowerCase().includes(q.toLowerCase()) || o.arac?.toLowerCase().includes(q.toLowerCase()) || o.kod.toLowerCase().includes(q.toLowerCase());
    if (!matchesQ) return false;
    if (filter === "aktif") return o.durum !== "teslim";
    if (filter === "hepsi") return true;
    return o.durum === filter;
  });

  const counts = { hazir: orders.filter((o) => o.durum === "hazir").length };

  const tabs = [
    { id: "yeni", label: "Yeni Sipariş", icon: Plus },
    { id: "siparisler", label: "Siparişler", icon: ClipboardList },
    { id: "stok", label: "Stok", icon: Package },
    { id: "ayarlar", label: "Fiyat Listesi", icon: Settings },
  ];

  if (!ready) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center" style={{ background: "#EEF1F4" }}>
        <style>{FONT_IMPORT}</style>
        <Loader2 className="animate-spin" size={22} style={{ color: "#2C5F8A" }} />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen" style={{ background: "#EEF1F4", fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <div className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#14213D" }}>
              <Scissors size={22} style={{ color: "#E8590C" }} strokeWidth={2.5} />
              EVA ATÖLYE
            </div>
            <div className="text-[12px] font-medium" style={{ color: "#8A93A0" }}>Kayseri · Sipariş &amp; Stok Takip · Tüm cihazlarla senkronize</div>
          </div>
          {counts.hazir > 0 && (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: "#FDECE1", color: "#E8590C" }}>
              <AlertTriangle size={13} /> {counts.hazir} sipariş teslime hazır
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center justify-between rounded-md px-3 py-2 text-[13px]" style={{ background: "#FDECE1", color: "#B45309" }}>
            <span className="flex items-center gap-2"><AlertTriangle size={14} /> {error}</span>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        <div className="flex gap-1 mb-5 rounded-lg p-1 w-fit flex-wrap" style={{ background: "#E2E6EA" }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors"
                style={{ background: active ? "#FFFFFF" : "transparent", color: active ? "#14213D" : "#6B7280", boxShadow: active ? "0 1px 2px rgba(20,33,61,0.08)" : "none" }}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "yeni" && <NewOrderForm prices={prices} onCreate={createOrder} />}

        {tab === "siparisler" && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Müşteri, araç veya fiş no ara..."
                  className="w-full rounded-md pl-8 pr-3 py-2 text-[13px] outline-none" style={{ border: "1px solid #DCE1E7", color: "#14213D", background: "#FFF" }} />
              </div>
              {["aktif", "hepsi", ...STATUSES.map((s) => s.id)].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className="rounded-full px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors"
                  style={{ background: filter === f ? "#14213D" : "#FFF", color: filter === f ? "#FFF" : "#6B7280", border: "1px solid #DCE1E7" }}>
                  {f === "aktif" ? "Aktif" : f === "hepsi" ? "Hepsi" : STATUSES.find((s) => s.id === f)?.label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16 rounded-lg" style={{ background: "#FFF", border: "1px dashed #DCE1E7", color: "#9CA3AF" }}>
                <ClipboardList size={28} className="mx-auto mb-2" />
                <div className="text-[14px] font-medium">Bu filtreye uyan sipariş yok</div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filtered.map((o) => <TicketCard key={o.id} order={o} onAdvance={advanceOrder} onCancel={cancelOrder} onDelete={deleteOrder} />)}
              </div>
            )}
          </div>
        )}

        {tab === "stok" && <StockPanel stock={stock} onUpdate={persistStock} />}

        {tab === "ayarlar" && <SettingsPanel prices={prices} onSave={persistPrices} />}
      </div>
    </div>
  );
}

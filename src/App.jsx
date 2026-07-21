import React, { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  Scissors, ClipboardList, Package, Settings, Plus, Search, X,
  ClipboardList as ClipboardIcon, Layers, Tag, CheckCircle2, AlertTriangle, Phone, User,
  Car, Palette, Trash2, ChevronRight, Loader2, Save, Minus, Eye, TrendingUp, RotateCcw, Edit3, Lock, LogOut
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
  { id: "iade", label: "İade Edildi", icon: RotateCcw, color: "#78716C", bg: "#F1F0EF" },
];

const DEFAULT_COLORS = [
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

const colorHex = (colors, name) => colors.find((c) => c.name === name)?.hex || "#CCCCCC";

const DEFAULT_PRICES = { set: 1600, topuklu: 300, logo: 100, bagaj: 400 };

// NOT: Bunlar test/başlangıç şifreleridir — istersen bana yenilerini söyle, değiştireyim.
const AUTH_PASSWORDS = { admin: "admin1234", yonetici: "yonetici1234", calisan: "calisan1234" };
const ROLE_LABELS = { admin: "Admin", yonetici: "Yönetici", calisan: "Çalışan" };

const STOCK_UNIT = { Taban: "levha", Kenarlık: "m", "Marka Logosu": "adet", Topuklu: "adet" };
const STOCK_TYPES = ["Taban", "Kenarlık", "Marka Logosu", "Topuklu"];

const DEFAULT_STOCK = [
  { id: "t-siyah", renk: "Siyah", tip: "Taban", miktar: 40, esik: 10 },
  { id: "t-gri", renk: "Gri", tip: "Taban", miktar: 25, esik: 10 },
  { id: "t-bej", renk: "Bej", tip: "Taban", miktar: 15, esik: 10 },
  { id: "t-lacivert", renk: "Lacivert", tip: "Taban", miktar: 12, esik: 8 },
  { id: "k-siyah", renk: "Siyah", tip: "Kenarlık", miktar: 20, esik: 8 },
  { id: "k-kirmizi", renk: "Kırmızı", tip: "Kenarlık", miktar: 18, esik: 8 },
  { id: "k-mavi", renk: "Mavi", tip: "Kenarlık", miktar: 12, esik: 8 },
  { id: "k-sari", renk: "Sarı", tip: "Kenarlık", miktar: 9, esik: 8 },
  { id: "m-ford", renk: "Ford", tip: "Marka Logosu", miktar: 15, esik: 5 },
  { id: "m-renault", renk: "Renault", tip: "Marka Logosu", miktar: 15, esik: 5 },
  { id: "m-fiat", renk: "Fiat", tip: "Marka Logosu", miktar: 15, esik: 5 },
  { id: "topuklu", renk: "Topuklu", tip: "Topuklu", miktar: 30, esik: 10 },
];

function useStorage() {
  const [readyMap, setReadyMap] = useState({
    orders: false, stock: false, prices: false, colors: false, tabanColors: false, kenarColors: false,
  });
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState(DEFAULT_STOCK);
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [tabanColors, setTabanColors] = useState(DEFAULT_COLORS);
  const [kenarColors, setKenarColors] = useState(DEFAULT_COLORS);
  const [error, setError] = useState(null);

  const markReady = (key) => setReadyMap((r) => ({ ...r, [key]: true }));

  useEffect(() => {
    const unsubOrders = onSnapshot(
      doc(db, "shopData", "orders"),
      (snap) => { if (snap.exists()) setOrders(snap.data().list || []); markReady("orders"); },
      (e) => { console.error("orders:", e); setError(`Bağlantı hatası (siparişler): ${e.message}`); markReady("orders"); }
    );
    const unsubStock = onSnapshot(
      doc(db, "shopData", "stock"),
      (snap) => { if (snap.exists()) setStock(snap.data().list || DEFAULT_STOCK); markReady("stock"); },
      (e) => { console.error("stock:", e); setError(`Bağlantı hatası (stok): ${e.message}`); markReady("stock"); }
    );
    const unsubPrices = onSnapshot(
      doc(db, "shopData", "prices"),
      (snap) => { if (snap.exists()) setPrices({ ...DEFAULT_PRICES, ...snap.data() }); markReady("prices"); },
      (e) => { console.error("prices:", e); setError(`Bağlantı hatası (fiyatlar): ${e.message}`); markReady("prices"); }
    );
    const unsubColors = onSnapshot(
      doc(db, "shopData", "colors"),
      (snap) => { if (snap.exists()) setColors(snap.data().list || DEFAULT_COLORS); markReady("colors"); },
      (e) => { console.error("colors:", e); setError(`Bağlantı hatası (araç renkleri): ${e.message}`); markReady("colors"); }
    );
    const unsubTaban = onSnapshot(
      doc(db, "shopData", "tabanColors"),
      (snap) => { if (snap.exists()) setTabanColors(snap.data().list || DEFAULT_COLORS); markReady("tabanColors"); },
      (e) => { console.error("tabanColors:", e); setError(`Bağlantı hatası (taban renkleri): ${e.message}`); markReady("tabanColors"); }
    );
    const unsubKenar = onSnapshot(
      doc(db, "shopData", "kenarColors"),
      (snap) => { if (snap.exists()) setKenarColors(snap.data().list || DEFAULT_COLORS); markReady("kenarColors"); },
      (e) => { console.error("kenarColors:", e); setError(`Bağlantı hatası (kenarlık renkleri): ${e.message}`); markReady("kenarColors"); }
    );
    return () => { unsubOrders(); unsubStock(); unsubPrices(); unsubColors(); unsubTaban(); unsubKenar(); };
  }, []);

  const persistOrders = useCallback(async (next) => {
    setOrders(next);
    try { await setDoc(doc(db, "shopData", "orders"), { list: next }); }
    catch (e) { console.error("orders kayıt hatası:", e); setError(`Sipariş kaydedilemedi: ${e.message}`); }
  }, []);

  const persistStock = useCallback(async (next) => {
    setStock(next);
    try { await setDoc(doc(db, "shopData", "stock"), { list: next }); }
    catch (e) { console.error("stock kayıt hatası:", e); setError(`Stok kaydedilemedi: ${e.message}`); }
  }, []);

  const persistPrices = useCallback(async (next) => {
    setPrices(next);
    try { await setDoc(doc(db, "shopData", "prices"), next); }
    catch (e) { console.error("prices kayıt hatası:", e); setError(`Fiyat listesi kaydedilemedi: ${e.message}`); }
  }, []);

  const persistColors = useCallback(async (next) => {
    setColors(next);
    try { await setDoc(doc(db, "shopData", "colors"), { list: next }); }
    catch (e) { console.error("colors kayıt hatası:", e); setError(`Araç renkleri kaydedilemedi: ${e.message}`); }
  }, []);

  const persistTabanColors = useCallback(async (next) => {
    setTabanColors(next);
    try { await setDoc(doc(db, "shopData", "tabanColors"), { list: next }); }
    catch (e) { console.error("tabanColors kayıt hatası:", e); setError(`Taban renkleri kaydedilemedi: ${e.message}`); }
  }, []);

  const persistKenarColors = useCallback(async (next) => {
    setKenarColors(next);
    try { await setDoc(doc(db, "shopData", "kenarColors"), { list: next }); }
    catch (e) { console.error("kenarColors kayıt hatası:", e); setError(`Kenarlık renkleri kaydedilemedi: ${e.message}`); }
  }, []);

  const ready = Object.values(readyMap).every(Boolean);

  return {
    ready, orders, stock, prices, colors, tabanColors, kenarColors, error, setError,
    persistOrders, persistStock, persistPrices, persistColors, persistTabanColors, persistKenarColors,
  };
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

function ColorSwatchPicker({ label, value, onChange, colors }) {
  return (
    <div>
      <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#6B7280" }}>{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => {
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

function MatPreview({ aracLabel, tabanRengi, kenarRengi, carRengi, topuklu, logoAdet, bagaj, tabanColors, kenarColors, carColors }) {
  const tabanHex = colorHex(tabanColors, tabanRengi);
  const kenarHex = colorHex(kenarColors, kenarRengi);
  const carHex = colorHex(carColors, carRengi);

  const Piece = ({ d, shadowD }) => (
    <>
      <path d={shadowD} fill="rgba(20,22,25,0.15)" />
      <path d={d} fill={tabanHex} stroke={kenarHex} strokeWidth="6" strokeLinejoin="round" />
      <path d={d} fill="url(#honeyTexPreview)" />
      <path d={d} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
    </>
  );

  const RectPiece = ({ x, y, w, h, rx = 5 }) => (
    <>
      <rect x={x + 3} y={y + 4} width={w} height={h} rx={rx} fill="rgba(20,22,25,0.15)" />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={tabanHex} stroke={kenarHex} strokeWidth="5" />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="url(#honeyTexPreview)" />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
    </>
  );

  const LogoMark = ({ x, y, w = 7, h = 12 }) => (
    <rect x={x} y={y} width={w} height={h} rx="2" fill="#FFD166" fillOpacity="0.85" stroke="#B8860B" strokeWidth="1" />
  );

  // Logo yerleşim kuralı:
  // 1x -> sol ön (sürücü)
  // 2x -> + sağ ön (yolcu, aynalı)
  // 3x -> + şaft tüneli (parça her zaman ekli, logo sadece burada görünür)
  // 4x+ -> tünel hariç, + arka sol + arka sağ (aynalı)
  const showFLLogo = logoAdet >= 1;
  const showFRLogo = logoAdet >= 2;
  const showTunnelLogo = logoAdet === 3;
  const showRearLogo = logoAdet >= 4;

  return (
    <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid #DCE1E7", position: "sticky", top: 16 }}>
      <div className="text-[11px] font-bold tracking-widest mb-3 flex items-center gap-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#8A93A0" }}>
        <Eye size={13} /> ÖNİZLEME
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: carHex, border: "1.5px solid #FFF", outline: "1px solid #DCE1E7" }} />
        <span className="text-[14px] font-semibold truncate" style={{ color: "#14213D" }}>
          {aracLabel || "Araç bilgisi girin"}
        </span>
      </div>

      <svg viewBox={`0 0 300 ${bagaj ? 310 : 230}`} className="w-full rounded-md" style={{ background: "#F2F3F5" }}>
        <defs>
          <pattern id="honeyTexPreview" width="8" height="7" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="rgba(0,0,0,0.34)" />
            <circle cx="6" cy="5.5" r="1.5" fill="rgba(0,0,0,0.34)" />
          </pattern>
        </defs>

        {/* Sol ön (sürücü) — gerçek ayak boşluğu silueti */}
        <Piece
          d="M27,10 L75,10 L83,24 L82,40 L76,60 L82,74 L90,92 L92,109 L84,118 L22,119 L15,110 L17,92 L23,75 L25,60 L19,41 L19,24 Z"
          shadowD="M30,14 L78,14 L86,28 L85,44 L79,64 L85,78 L93,96 L95,113 L87,122 L25,123 L18,114 L20,96 L26,79 L28,64 L22,45 L22,28 Z"
        />
        {/* Sağ ön (yolcu) — sol önün tam ayna görüntüsü */}
        <Piece
          d="M205,10 L157,10 L149,24 L150,40 L156,60 L150,74 L142,92 L140,109 L148,118 L210,119 L217,110 L215,92 L209,75 L207,60 L213,41 L213,24 Z"
          shadowD="M202,14 L154,14 L146,28 L147,44 L153,64 L147,78 L139,96 L137,113 L145,122 L207,123 L214,114 L212,96 L206,79 L204,64 L210,45 L210,28 Z"
        />
        {/* Şaft tüneli üstü — arka paspasların ortasında, her zaman ekli */}
        <RectPiece x="96" y="140" w="40" h="54" rx="6" />

        {/* Arka sol */}
        <Piece d="M18,140 L93,136 L88,196 L23,196 Z" shadowD="M21,144 L96,140 L91,200 L26,200 Z" />
        {/* Arka sağ — arka solun ayna görüntüsü */}
        <Piece d="M214,140 L139,136 L144,196 L209,196 Z" shadowD="M211,144 L142,140 L147,200 L212,200 Z" />

        {/* Bagaj paspası — büyük tek parça, arka paspasların altında, her zaman aynı genişlikte */}
        {bagaj && <RectPiece x="16" y="212" w="268" h="70" rx="8" />}

        {/* Topuklu — sadece sürücü paspasında */}
        {topuklu && (
          <rect x="39" y="46" width="37" height="18" rx="3" fill="#FFD166" fillOpacity="0.85" stroke="#B8860B" strokeWidth="1" />
        )}

        {showFLLogo && <LogoMark x="28" y="94" />}
        {showFRLogo && <LogoMark x="197" y="94" />}
        {showTunnelLogo && <LogoMark x="109" y="161" w="14" h="12" />}
        {showRearLogo && <LogoMark x="26" y="178" h="13" />}
        {showRearLogo && <LogoMark x="198" y="178" h="13" />}
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
        {bagaj && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "#E7F0F7", color: "#2C5F8A" }}>
            Bagaj
          </span>
        )}
      </div>
      <div className="text-[10px] mt-3" style={{ color: "#B0B6BE" }}>
        * Şekil temsilidir, araca özel kalıp değildir. Şaft tüneli parçası sette her zaman bulunur.
      </div>
    </div>
  );
}


function EditOrderForm({ order, tabanColors, kenarColors, colors, onSave, onCancel }) {
  const [musteri, setMusteri] = useState(order.musteri || "");
  const [telefon, setTelefon] = useState(order.telefon || "");
  const [arac, setArac] = useState(order.arac || "");
  const [carRengi, setCarRengi] = useState(order.carRengi || colors[0]?.name || "");
  const [tabanRengi, setTabanRengi] = useState(order.tabanRengi || tabanColors[0]?.name || "");
  const [kenarRengi, setKenarRengi] = useState(order.kenarRengi || kenarColors[0]?.name || "");
  const [topuklu, setTopuklu] = useState(!!order.topuklu);
  const [logoAdet, setLogoAdet] = useState(order.logoAdet || 0);
  const [bagaj, setBagaj] = useState(!!order.bagaj);
  const [fiyat, setFiyat] = useState(order.fiyat);
  const [notlar, setNotlar] = useState(order.notlar || "");

  const inputClass = "w-full rounded-md px-3 py-2 text-[13px] outline-none";
  const inputStyle = { border: "1px solid #DCE1E7", color: "#14213D", background: "#FFF" };

  const handleSave = () => {
    onSave({
      musteri: musteri.trim() || order.musteri,
      telefon: telefon.trim(),
      arac: arac.trim(),
      carRengi, tabanRengi, kenarRengi, topuklu, logoAdet, bagaj,
      fiyat: Number(fiyat) || 0,
      notlar: notlar.trim(),
    });
  };

  return (
    <div className="mt-4 rounded-lg p-4" style={{ background: "#F7F8F9", border: "1px solid #DCE1E7" }}>
      <div className="grid sm:grid-cols-2 gap-2 mb-2">
        <input value={musteri} onChange={(e) => setMusteri(e.target.value)} placeholder="Müşteri adı" className={inputClass} style={inputStyle} />
        <input value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="Telefon" className={inputClass} style={inputStyle} />
      </div>
      <input value={arac} onChange={(e) => setArac(e.target.value)} placeholder="Araç" className={`${inputClass} mb-3`} style={inputStyle} />

      <div className="grid sm:grid-cols-3 gap-4 mb-3">
        <ColorSwatchPicker label="Taban rengi" value={tabanRengi} onChange={setTabanRengi} colors={tabanColors} />
        <ColorSwatchPicker label="Kenarlık rengi" value={kenarRengi} onChange={setKenarRengi} colors={kenarColors} />
        <ColorSwatchPicker label="Araç rengi" value={carRengi} onChange={setCarRengi} colors={colors} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={() => setTopuklu((v) => !v)}
          className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
          style={{ border: topuklu ? "1.5px solid #E8590C" : "1px solid #DCE1E7", background: topuklu ? "#FDECE1" : "#FFF", color: "#14213D" }}
        >
          Topuklu
        </button>
        <div className="flex items-center rounded-md" style={{ border: "1px solid #DCE1E7" }}>
          <button onClick={() => setLogoAdet((n) => Math.max(0, n - 1))} className="w-7 h-8 flex items-center justify-center" style={{ color: "#6B7280" }}><Minus size={12} /></button>
          <div className="w-14 text-center text-[12px] font-medium" style={{ color: "#14213D" }}>{logoAdet}x Logo</div>
          <button onClick={() => setLogoAdet((n) => n + 1)} className="w-7 h-8 flex items-center justify-center" style={{ color: "#6B7280" }}><Plus size={12} /></button>
        </div>
        <button
          onClick={() => setBagaj((v) => !v)}
          className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
          style={{ border: bagaj ? "1.5px solid #2C5F8A" : "1px solid #DCE1E7", background: bagaj ? "#E7F0F7" : "#FFF", color: "#14213D" }}
        >
          Bagaj
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <label className="text-[12px] font-medium" style={{ color: "#6B7280" }}>Fiyat</label>
        <input type="number" value={fiyat} onChange={(e) => setFiyat(e.target.value)} className="w-28 rounded-md px-2 py-1.5 text-[13px] font-bold" style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
        <span className="text-[12px]" style={{ color: "#9CA3AF" }}>₺</span>
      </div>

      <textarea value={notlar} onChange={(e) => setNotlar(e.target.value)} placeholder="Not" rows={2} className={`${inputClass} mb-3`} style={inputStyle} />

      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="text-[12px] px-3 py-1.5 rounded-md font-medium" style={{ color: "#6B7280" }}>Vazgeç</button>
        <button onClick={handleSave} className="text-[12px] px-4 py-1.5 rounded-md font-semibold text-white" style={{ background: "#14213D" }}>Kaydet</button>
      </div>
    </div>
  );
}

function TicketCard({ order, colors, tabanColors, kenarColors, onAdvance, onCancel, onDelete, onEdit, readOnly, isAdmin }) {
  const [showPreview, setShowPreview] = useState(false);
  const [editing, setEditing] = useState(false);
  const statusIdx = STATUSES.findIndex((s) => s.id === order.durum);
  const next = STATUSES[statusIdx + 1];
  const s = STATUSES[statusIdx];
  const canEdit = order.durum === "alindi";
  const isFinal = order.durum === "teslim" || order.durum === "iade";
  const extrasLabel = [
    order.topuklu ? "Topuklu" : null,
    order.logoAdet > 0 ? `${order.logoAdet}x Logo` : null,
    order.bagaj ? "Bagaj" : null,
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
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colorHex(colors, order.carRengi), border: "1px solid #FFF", outline: "1px solid #DCE1E7" }} title={order.carRengi} />
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

        <div className="mt-3 flex items-center justify-between flex-wrap gap-y-2">
          {readOnly ? <div /> : (
            <div className="font-bold text-[15px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#14213D" }}>
              {order.fiyat.toLocaleString("tr-TR")} ₺
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={() => setShowPreview((v) => !v)} className="text-[12px] px-2 py-1 rounded-md font-medium flex items-center gap-1 hover:bg-gray-100 transition-colors" style={{ color: "#2C5F8A" }}>
              <Eye size={13} /> Önizleme
            </button>
            {canEdit && !editing && !readOnly && (
              <button onClick={() => setEditing(true)} className="text-[12px] px-2 py-1 rounded-md font-medium flex items-center gap-1 hover:bg-gray-100 transition-colors" style={{ color: "#B8860B" }}>
                <Edit3 size={13} /> Düzenle
              </button>
            )}
            {!isFinal && !readOnly && (
              <button onClick={() => onCancel(order.id)} className="text-[12px] px-2 py-1 rounded-md font-medium hover:bg-red-50 transition-colors" style={{ color: "#B91C1C" }}>
                İptal
              </button>
            )}
            {next && (
              <button onClick={() => onAdvance(order.id)} className="text-[12px] px-3 py-1.5 rounded-md font-semibold flex items-center gap-1 text-white hover:opacity-90 transition-opacity" style={{ background: order.durum === "teslim" ? "#78716C" : "#14213D" }}>
                {next.label} <ChevronRight size={13} />
              </button>
            )}
            {isFinal && isAdmin && (
              <button onClick={() => onDelete(order.id)} className="text-[12px] px-2 py-1 rounded-md hover:bg-gray-100 transition-colors" style={{ color: "#9CA3AF" }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {editing && (
          <EditOrderForm
            order={order}
            tabanColors={tabanColors}
            kenarColors={kenarColors}
            colors={colors}
            onSave={(updates) => { onEdit(order.id, updates); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        )}

        {showPreview && !editing && (
          <div className="mt-4">
            <MatPreview
              aracLabel={order.arac}
              tabanRengi={order.tabanRengi}
              kenarRengi={order.kenarRengi}
              carRengi={order.carRengi}
              topuklu={order.topuklu}
              logoAdet={order.logoAdet}
              bagaj={order.bagaj}
              tabanColors={tabanColors}
              kenarColors={kenarColors}
              carColors={colors}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function NewOrderForm({ prices, colors, tabanColors, kenarColors, onCreate }) {
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
  const [bagaj, setBagaj] = useState(false);
  const [override, setOverride] = useState("");
  const [notlar, setNotlar] = useState("");

  const hesaplananFiyat = prices.set + (topuklu ? prices.topuklu : 0) + logoAdet * prices.logo + (bagaj ? prices.bagaj : 0);
  const fiyat = override !== "" ? Number(override) : hesaplananFiyat;

  const handleSubmit = () => {
    if (!musteri.trim() || !marka.trim()) return;
    onCreate({
      musteri: musteri.trim(),
      telefon: telefon.trim(),
      arac: [marka, model, yil].filter(Boolean).join(" "),
      marka: marka.trim(),
      carRengi,
      tabanRengi,
      kenarRengi,
      topuklu,
      logoAdet,
      bagaj,
      fiyat,
      notlar: notlar.trim(),
    });
    setMusteri(""); setTelefon(""); setMarka(""); setModel(""); setYil("");
    setCarRengi("Beyaz"); setTopuklu(false); setLogoAdet(0); setBagaj(false); setOverride(""); setNotlar("");
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
          <ColorSwatchPicker label="Araç rengi" value={carRengi} onChange={setCarRengi} colors={colors} />
        </div>
      </div>

      <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid #DCE1E7" }}>
        <div className="text-[11px] font-bold tracking-widest mb-3 flex items-center gap-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#8A93A0" }}>
          <Palette size={13} /> RENK &amp; SEÇENEKLER
        </div>

        <div className="grid grid-cols-1 gap-4 mb-4">
          <ColorSwatchPicker label="Taban rengi" value={tabanRengi} onChange={setTabanRengi} colors={tabanColors} />
          <ColorSwatchPicker label="Kenarlık (şerit) rengi" value={kenarRengi} onChange={setKenarRengi} colors={kenarColors} />
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

        <button
          onClick={() => setBagaj((v) => !v)}
          className="w-full flex items-center justify-between rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors mb-4"
          style={{
            border: bagaj ? "1.5px solid #2C5F8A" : "1px solid #DCE1E7",
            background: bagaj ? "#E7F0F7" : "#FFF",
            color: "#14213D",
          }}
        >
          <span>Bagaj paspası</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>+{prices.bagaj}₺</span>
        </button>

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
        aracLabel={[marka, model, yil].filter(Boolean).join(" ")}
        tabanRengi={tabanRengi} kenarRengi={kenarRengi} carRengi={carRengi}
        topuklu={topuklu} logoAdet={logoAdet} bagaj={bagaj}
        tabanColors={tabanColors} kenarColors={kenarColors} carColors={colors}
      />
    </div>
  );
}

function StockPanel({ stock, tabanColors, kenarColors, onUpdate, readOnly }) {
  const [tip, setTip] = useState("Taban");
  const isColorTip = tip === "Taban" || tip === "Kenarlık";
  const activeColors = tip === "Taban" ? tabanColors : kenarColors;
  const [renk, setRenk] = useState(activeColors[0]?.name || "");
  const [markaAdi, setMarkaAdi] = useState("");
  const inputStyle = { border: "1px solid #DCE1E7", color: "#14213D" };

  const handleTipChange = (newTip) => {
    setTip(newTip);
    if (newTip === "Taban" || newTip === "Kenarlık") {
      const list = newTip === "Taban" ? tabanColors : kenarColors;
      setRenk(list[0]?.name || "");
    } else if (newTip === "Topuklu") {
      setRenk("Topuklu");
    } else {
      setRenk("");
    }
  };

  const setMiktar = (id, value) => {
    const num = value === "" ? 0 : Math.max(0, Number(value));
    onUpdate(stock.map((s) => (s.id === id ? { ...s, miktar: num } : s)));
  };

  const addStockItem = () => {
    const isim = tip === "Marka Logosu" ? markaAdi.trim() : tip === "Topuklu" ? "Topuklu" : renk;
    if (!isim) return;
    const id = `${tip[0].toLowerCase()}-${isim.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    if (stock.some((s) => s.renk === isim && s.tip === tip)) return;
    onUpdate([...stock, { id, renk: isim, tip, miktar: 10, esik: 5 }]);
    if (tip === "Marka Logosu") setMarkaAdi("");
  };

  const removeItem = (id) => onUpdate(stock.filter((s) => s.id !== id));

  return (
    <div>
      {readOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-md px-3 py-2 text-[12px]" style={{ background: "#F1F2F4", color: "#6B7280" }}>
          <Lock size={13} /> Stok bilgilerini yalnızca admin değiştirebilir.
        </div>
      )}
      {!readOnly && (
        <div className="rounded-lg p-4 mb-4 flex flex-wrap items-end gap-2" style={{ background: "#FFF", border: "1px solid #DCE1E7" }}>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: "#6B7280" }}>Tip</label>
            <select value={tip} onChange={(e) => handleTipChange(e.target.value)} className="rounded-md px-2 py-1.5 text-[13px]" style={inputStyle}>
              {STOCK_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          {isColorTip && (
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "#6B7280" }}>Renk</label>
              <select value={renk} onChange={(e) => setRenk(e.target.value)} className="rounded-md px-2 py-1.5 text-[13px]" style={inputStyle}>
                {activeColors.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}
          {tip === "Marka Logosu" && (
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "#6B7280" }}>Marka adı</label>
              <input value={markaAdi} onChange={(e) => setMarkaAdi(e.target.value)} placeholder="örn. Ford" className="rounded-md px-2 py-1.5 text-[13px] w-32" style={inputStyle} />
            </div>
          )}
          <button onClick={addStockItem} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: "#14213D" }}>
            <Plus size={13} /> Stoğa Ekle
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {stock.map((s) => {
          const low = s.miktar <= s.esik;
          const unit = STOCK_UNIT[s.tip] || "";
          const isColor = s.tip === "Taban" || s.tip === "Kenarlık";
          const swatch = isColor ? colorHex(s.tip === "Taban" ? tabanColors : kenarColors, s.renk) : null;
          return (
            <div key={s.id} className="rounded-lg p-4 flex items-center justify-between" style={{ background: "#FFFFFF", border: `1px solid ${low ? "#F3B99A" : "#DCE1E7"}` }}>
              <div className="flex items-center gap-2.5">
                {isColor ? (
                  <span className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: swatch, border: "1.5px solid #FFF", outline: "1px solid #DCE1E7" }} />
                ) : (
                  <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "#F1F2F4", color: "#6B7280" }}>
                    <Tag size={11} />
                  </span>
                )}
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
              {readOnly ? (
                <div className="font-bold text-[14px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: low ? "#E8590C" : "#14213D" }}>
                  {s.miktar} {unit}
                </div>
              ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={s.miktar}
                  onChange={(e) => setMiktar(s.id, e.target.value)}
                  className="w-16 text-center font-bold text-[13px] rounded-md py-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: low ? "#E8590C" : "#14213D", border: "1px solid #DCE1E7" }}
                />
                <span className="text-[12px]" style={{ color: "#9CA3AF" }}>{unit}</span>
                <button onClick={() => removeItem(s.id)} className="ml-1 w-7 h-7 rounded-md flex items-center justify-center" style={{ color: "#9CA3AF" }}>
                  <Trash2 size={13} />
                </button>
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColorListEditor({ title, colors, onUpdate }) {
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#8B8F94");
  const inputStyle = { border: "1px solid #DCE1E7", color: "#14213D" };

  const addColor = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (colors.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;
    const id = `${trimmed.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    onUpdate([...colors, { id, name: trimmed, hex }]);
    setName("");
    setHex("#8B8F94");
  };

  const removeColor = (id) => onUpdate(colors.filter((c) => c.id !== id));

  return (
    <div className="mb-8">
      <div className="text-[11px] font-bold tracking-widest mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#8A93A0" }}>{title}</div>
      <div className="rounded-lg p-4 mb-3 flex flex-wrap items-end gap-3" style={{ background: "#FFF", border: "1px solid #DCE1E7" }}>
        <div>
          <label className="text-[11px] font-medium block mb-1" style={{ color: "#6B7280" }}>Renk adı</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="örn. Turkuaz" className="rounded-md px-2 py-1.5 text-[13px] w-40" style={inputStyle} />
        </div>
        <div>
          <label className="text-[11px] font-medium block mb-1" style={{ color: "#6B7280" }}>Renk</label>
          <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-9 w-16 rounded-md cursor-pointer" style={{ border: "1px solid #DCE1E7" }} />
        </div>
        <button onClick={addColor} disabled={!name.trim()} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40" style={{ background: "#14213D" }}>
          <Plus size={13} /> Renk Ekle
        </button>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {colors.map((c) => (
          <div key={c.id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: "#FFFFFF", border: "1px solid #DCE1E7" }}>
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: c.hex, border: "1.5px solid #FFF", outline: "1px solid #DCE1E7" }} />
              <span className="text-[13px] font-semibold" style={{ color: "#14213D" }}>{c.name}</span>
            </div>
            <button onClick={() => removeColor(c.id)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-100" style={{ color: "#9CA3AF" }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorsPanel({ tabanColors, kenarColors, carColors, onUpdateTaban, onUpdateKenar, onUpdateCar }) {
  return (
    <div>
      <ColorListEditor title="TABAN RENKLERİ" colors={tabanColors} onUpdate={onUpdateTaban} />
      <ColorListEditor title="ŞERİT (KENARLIK) RENKLERİ" colors={kenarColors} onUpdate={onUpdateKenar} />
      <ColorListEditor title="ARAÇ RENKLERİ" colors={carColors} onUpdate={onUpdateCar} />
      <div className="text-[11px]" style={{ color: "#9CA3AF" }}>
        Buradan silinen bir renk, o rengi kullanan geçmiş siparişlerde metin olarak kalmaya devam eder — sadece yeni seçimlerde artık görünmez.
      </div>
    </div>
  );
}

function SettingsPanel({ prices, onSave, readOnly }) {
  const [set, setSet] = useState(prices.set);
  const [topuklu, setTopuklu] = useState(prices.topuklu);
  const [logo, setLogo] = useState(prices.logo);
  const [bagaj, setBagaj] = useState(prices.bagaj ?? 400);
  const inputStyle = { border: "1px solid #DCE1E7", color: "#14213D" };

  const row = (label, value, setter) => (
    <div className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid #F1F2F4" }}>
      <span className="flex-1 text-[14px] font-medium" style={{ color: "#14213D" }}>{label}</span>
      <input type="number" value={value} disabled={readOnly} onChange={(e) => setter(Number(e.target.value))}
        className="w-24 rounded px-2 py-1.5 text-[14px] font-bold text-right disabled:opacity-50"
        style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }} />
      <span className="text-[12px]" style={{ color: "#9CA3AF" }}>₺</span>
    </div>
  );

  return (
    <div className="max-w-md">
      {readOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-md px-3 py-2 text-[12px]" style={{ background: "#F1F2F4", color: "#6B7280" }}>
          <Lock size={13} /> Fiyatları yalnızca admin değiştirebilir.
        </div>
      )}
      <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid #DCE1E7" }}>
        <div className="text-[11px] font-bold tracking-widest mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#8A93A0" }}>SABİT FİYATLAR</div>
        {row("Set (taban + kenarlık)", set, setSet)}
        {row("Topuklu", topuklu, setTopuklu)}
        {row("Logo (adet başına)", logo, setLogo)}
        {row("Bagaj paspası", bagaj, setBagaj)}
        {!readOnly && (
          <button
            onClick={() => onSave({ set, topuklu, logo, bagaj })}
            className="mt-4 flex items-center gap-2 rounded-md px-4 py-2 font-semibold text-[13px] text-white"
            style={{ background: "#14213D" }}
          >
            <Save size={14} /> Fiyatları Kaydet
          </button>
        )}
      </div>
    </div>
  );
}

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const startOfWeek = (d) => { const x = startOfDay(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

function CiroPanel({ orders }) {
  const delivered = orders.filter((o) => o.durum === "teslim" && o.teslimTarihi);
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const inRange = (start) => delivered.filter((o) => new Date(o.teslimTarihi) >= start);
  const gunluk = inRange(todayStart);
  const haftalik = inRange(weekStart);
  const aylik = inRange(monthStart);
  const sum = (list) => list.reduce((s, o) => s + o.fiyat, 0);

  const recentDelivered = [...delivered]
    .sort((a, b) => new Date(b.teslimTarihi) - new Date(a.teslimTarihi))
    .slice(0, 20);

  const StatCard = ({ label, list }) => (
    <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid #DCE1E7" }}>
      <div className="text-[11px] font-bold tracking-widest mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#8A93A0" }}>{label}</div>
      <div className="text-[26px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#14213D" }}>
        {sum(list).toLocaleString("tr-TR")} ₺
      </div>
      <div className="text-[12px] mt-1" style={{ color: "#9CA3AF" }}>{list.length} sipariş</div>
    </div>
  );

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="BUGÜN" list={gunluk} />
        <StatCard label="BU HAFTA" list={haftalik} />
        <StatCard label="BU AY" list={aylik} />
      </div>

      <div className="text-[11px] font-bold tracking-widest mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#8A93A0" }}>SON TESLİMLER</div>
      {recentDelivered.length === 0 ? (
        <div className="text-center py-16 rounded-lg" style={{ background: "#FFF", border: "1px dashed #DCE1E7", color: "#9CA3AF" }}>
          <TrendingUp size={28} className="mx-auto mb-2" />
          <div className="text-[14px] font-medium">Henüz teslim edilmiş sipariş yok</div>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ background: "#FFF", border: "1px solid #DCE1E7" }}>
          {recentDelivered.map((o, i) => (
            <div key={o.id} className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: i > 0 ? "1px solid #F1F2F4" : "none" }}>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: "#14213D" }}>
                  {o.musteri} <span style={{ color: "#9CA3AF", fontWeight: 500 }}>· {o.arac}</span>
                </div>
                <div className="text-[11px]" style={{ color: "#9CA3AF", fontFamily: "'JetBrains Mono', monospace" }}>
                  {new Date(o.teslimTarihi).toLocaleDateString("tr-TR")} {new Date(o.teslimTarihi).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} · {o.kod}
                </div>
              </div>
              <div className="text-[14px] font-bold flex-shrink-0 ml-3" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#2F7D5C" }}>
                {o.fiyat.toLocaleString("tr-TR")} ₺
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const {
    ready, orders, stock, prices, colors, tabanColors, kenarColors, error, setError,
    persistOrders, persistStock, persistPrices, persistColors, persistTabanColors, persistKenarColors,
  } = useStorage();
  const [tab, setTab] = useState("yeni");
  const [filter, setFilter] = useState("aktif");
  const [q, setQ] = useState("");
  const [role, setRole] = useState(null);

  const isAdmin = role === "admin";
  const isCalisan = role === "calisan";

  const handleLogin = (r) => {
    setRole(r);
    setTab(r === "calisan" ? "siparisler" : "yeni");
  };
  const handleLogout = () => {
    setRole(null);
  };

  const nextCode = () => `KYS-${String(orders.length + 1).padStart(4, "0")}`;

  // Bir siparişin tükettiği stok kalemlerini uygular. sign: -1 = düş, +1 = geri ekle.
  const applyStockForOrder = (order, sign) => {
    let next = [...stock];
    const bump = (matchFn, amount) => {
      const idx = next.findIndex(matchFn);
      if (idx === -1) return;
      next[idx] = { ...next[idx], miktar: Math.max(0, +(next[idx].miktar + sign * amount).toFixed(1)) };
    };
    bump((s) => s.tip === "Kenarlık" && s.renk === order.kenarRengi, 3);
    bump((s) => s.tip === "Taban" && s.renk === order.tabanRengi, 1);
    if (order.topuklu) bump((s) => s.tip === "Topuklu", 1);
    if (order.logoAdet > 0 && order.marka) bump((s) => s.tip === "Marka Logosu" && s.renk === order.marka, order.logoAdet);
    persistStock(next);
  };

  const createOrder = (data) => {
    const order = { id: `${Date.now()}`, kod: nextCode(), tarih: new Date().toISOString(), durum: "alindi", ...data };
    persistOrders([order, ...orders]);
    applyStockForOrder(order, -1);
    setTab("siparisler");
    setFilter("aktif");
  };

  const advanceOrder = (id) => {
    const next = orders.map((o) => {
      if (o.id !== id) return o;
      const idx = STATUSES.findIndex((s) => s.id === o.durum);
      const nextStatus = STATUSES[idx + 1];
      if (!nextStatus) return o;
      const updated = { ...o, durum: nextStatus.id };
      if (nextStatus.id === "teslim") updated.teslimTarihi = new Date().toISOString();
      return updated;
    });
    persistOrders(next);
  };

  const cancelOrder = (id) => {
    const order = orders.find((o) => o.id === id);
    if (order) applyStockForOrder(order, 1);
    persistOrders(orders.filter((o) => o.id !== id));
  };
  const editOrder = (id, updates) => persistOrders(orders.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  const deleteOrder = (id) => persistOrders(orders.filter((o) => o.id !== id));

  const filtered = orders.filter((o) => {
    const matchesQ = !q || o.musteri.toLowerCase().includes(q.toLowerCase()) || o.arac?.toLowerCase().includes(q.toLowerCase()) || o.kod.toLowerCase().includes(q.toLowerCase());
    if (!matchesQ) return false;
    if (filter === "aktif") return !["teslim", "iade"].includes(o.durum);
    if (filter === "hepsi") return true;
    return o.durum === filter;
  });

  const counts = { hazir: orders.filter((o) => o.durum === "hazir").length };

  const allTabs = [
    { id: "yeni", label: "Yeni Sipariş", icon: Plus },
    { id: "siparisler", label: "Siparişler", icon: ClipboardList },
    { id: "ciro", label: "Ciro", icon: TrendingUp },
    { id: "stok", label: "Stok", icon: Package },
    { id: "renkler", label: "Renkler", icon: Palette },
    { id: "ayarlar", label: "Fiyat Listesi", icon: Settings },
  ];
  const tabs = isCalisan ? allTabs.filter((t) => t.id === "siparisler") : allTabs;

  if (!role) {
    return <LoginScreen onLogin={handleLogin} />;
  }

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
              <MatLogo size={22} />
              BARIŞ EVA ATÖLYE
            </div>
            <div className="text-[12px] font-medium" style={{ color: "#8A93A0" }}>{ROLE_LABELS[role]} · Sipariş &amp; Stok Takip · Tüm cihazlarla senkronize</div>
          </div>
          <div className="flex items-center gap-2">
            {counts.hazir > 0 && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: "#FDECE1", color: "#E8590C" }}>
                <AlertTriangle size={13} /> {counts.hazir} sipariş teslime hazır
              </div>
            )}
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium hover:bg-gray-100 transition-colors" style={{ color: "#6B7280" }}>
              <LogOut size={13} /> Çıkış
            </button>
          </div>
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

        {tab === "yeni" && <NewOrderForm prices={prices} colors={colors} tabanColors={tabanColors} kenarColors={kenarColors} onCreate={createOrder} />}

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
                {filtered.map((o) => <TicketCard key={o.id} order={o} colors={colors} tabanColors={tabanColors} kenarColors={kenarColors} onAdvance={advanceOrder} onCancel={cancelOrder} onDelete={deleteOrder} onEdit={editOrder} readOnly={isCalisan} isAdmin={isAdmin} />)}
              </div>
            )}
          </div>
        )}

        {tab === "ciro" && <CiroPanel orders={orders} />}

        {tab === "stok" && <StockPanel stock={stock} tabanColors={tabanColors} kenarColors={kenarColors} onUpdate={persistStock} readOnly={!isAdmin} />}

        {tab === "renkler" && (
          <ColorsPanel
            tabanColors={tabanColors}
            kenarColors={kenarColors}
            carColors={colors}
            onUpdateTaban={persistTabanColors}
            onUpdateKenar={persistKenarColors}
            onUpdateCar={persistColors}
          />
        )}

        {tab === "ayarlar" && <SettingsPanel prices={prices} onSave={persistPrices} readOnly={!isAdmin} />}
      </div>
    </div>
  );
}

// Vercel serverless function. API anahtarı burada, sunucu tarafında kalır —
// tarayıcıya asla gönderilmez. Vercel Dashboard → Settings → Environment
// Variables kısmında GEMINI_API_KEY adıyla eklenmesi gerekir.

const COLOR_EN = {
  Siyah: "black",
  Antrasit: "charcoal gray",
  Gri: "gray",
  Beyaz: "white",
  Krem: "cream",
  Bej: "beige",
  Kahverengi: "brown",
  Lacivert: "navy blue",
  Mavi: "blue",
  Turkuaz: "turquoise",
  Yeşil: "green",
  Haki: "khaki",
  Sarı: "yellow",
  Turuncu: "orange",
  Kırmızı: "red",
  Bordo: "maroon",
  Mor: "purple",
  Pembe: "pink",
};
const toEn = (name) => COLOR_EN[name] || name || "black";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Sadece POST isteği kabul edilir" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY tanımlı değil. Vercel ortam değişkenlerini kontrol et." });
    return;
  }

  const { marka, model, tabanRengi, kenarRengi, carRengi, topuklu, logoAdet } = req.body || {};

  const vehicleDesc =
    marka || model
      ? `a vehicle in the same class and body style as a ${[marka, model].filter(Boolean).join(" ")} (do not render any brand logos, badges, or text)`
      : "a mid-size passenger car";

  const extras = [];
  if (topuklu) extras.push("raised heel-pad texture on the driver-side mat");
  if (logoAdet > 0) extras.push("a small embroidered logo detail on each mat corner");

  const prompt =
    `Photorealistic professional automotive detailing photo, shot from the open driver door ` +
    `looking down into the front footwell of ${vehicleDesc}. The car's exterior/body color is ${toEn(carRengi)}. ` +
    `Inside, a custom-fit rubber floor mat (EVA foam type) is installed: the main mat surface is ${toEn(tabanRengi)} colored, ` +
    `with a contrasting ${toEn(kenarRengi)} colored edge trim border around it` +
    `${extras.length ? ", " + extras.join(" and ") : ""}. ` +
    `Natural daylight, shallow depth of field, sharp focus on the mat texture and color, ` +
    `no visible brand logos, no badges, no text, no license plates, clean professional car interior photography style.`;

  try {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await r.json();

    if (!r.ok) {
      res.status(r.status).json({ error: data?.error?.message || "Gemini API hatası" });
      return;
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData);
    if (!imagePart) {
      res.status(500).json({ error: "Model bir görsel döndürmedi, prompt'u tekrar dene." });
      return;
    }

    res.status(200).json({
      image: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || "image/png",
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Bilinmeyen hata" });
  }
}

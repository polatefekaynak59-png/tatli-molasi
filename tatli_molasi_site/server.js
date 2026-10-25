
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const DATA_FILE = path.join(__dirname, "data", "locations.json");

if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 20) {
  console.error(
    "Güvenlik için ADMIN_TOKEN ortam değişkenini en az 20 karakterlik rastgele bir değerle ayarla."
  );
  process.exit(1);
}

if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]", "utf8");
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "20kb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 60 }));

// Site dosyalarını yayınla.
app.use(express.static(path.join(__dirname, "public")));

// Yönetici panelini /admin adresinden aç.
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

function readLocations() {
  try {
    const rows = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

    // 24 saatten eski konum kayıtlarını temizle.
    const fresh = rows.filter(
      x => Date.now() - new Date(x.createdAt).getTime() < 24 * 60 * 60 * 1000
    );

    if (fresh.length !== rows.length) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(fresh, null, 2));
    }

    return fresh;
  } catch {
    return [];
  }
}

function adminOnly(req, res, next) {
  const token = req.get("x-admin-token") || "";

  if (
    token.length !== ADMIN_TOKEN.length ||
    !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(ADMIN_TOKEN))
  ) {
    return res.status(401).json({
      error: "Yönetici erişimi reddedildi."
    });
  }

  next();
}

// Kullanıcı açıkça izin verirse konumunu kaydet.
app.post("/api/share-location", (req, res) => {
  const { latitude, longitude, consent, label } = req.body || {};

  if (consent !== true) {
    return res.status(400).json({
      error: "Konum paylaşımı için açık onay gerekli."
    });
  }

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return res.status(400).json({
      error: "Geçersiz konum bilgisi."
    });
  }

  const row = {
    id: crypto.randomUUID(),
    latitude,
    longitude,
    label: typeof label === "string" ? label.slice(0, 50) : "Konum paylaşımı",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  const rows = readLocations();
  rows.push(row);

  fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2));

  res.json({
    ok: true,
    message: "Konum paylaşımı yönetici paneline iletildi. Kayıt 24 saat içinde silinecek."
  });
});

// Yönetici yetkisiyle konum kayıtlarını getir.
app.get("/api/admin/locations", adminOnly, (req, res) => {
  res.json(readLocations());
});

// Bir konum kaydını sil.
app.delete("/api/admin/locations/:id", adminOnly, (req, res) => {
  const rows = readLocations().filter(x => x.id !== req.params.id);

  fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2));

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Tatlı Molası çalışıyor: http://localhost:${PORT}`);
});

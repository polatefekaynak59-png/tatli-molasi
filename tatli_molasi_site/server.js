
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "locations.json");

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

function readLocations() {
  try {
    if (!fs.existsSync(dataFile)) return [];
    const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveLocations(locations) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(locations, null, 2));
}

function cleanExpired() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const locations = readLocations().filter(
    item => new Date(item.createdAt).getTime() > cutoff
  );
  saveLocations(locations);
  return locations;
}

function isAdmin(req) {
  const token = req.get("x-admin-token") || "";
  if (!ADMIN_TOKEN || !token) return false;

  const a = Buffer.from(token);
  const b = Buffer.from(ADMIN_TOKEN);

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/share-location", (req, res) => {
  const body = req.body || {};
  const latitude = Number(body.latitude ?? body.lat);
  const longitude = Number(body.longitude ?? body.lng);

  if (body.consent !== true) {
    return res.status(400).json({
      error: "Konum paylaşımı için açık onay gerekiyor."
    });
  }

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    return res.status(400).json({ error: "Konum bilgisi geçersiz." });
  }

  const locations = cleanExpired();

  locations.push({
    id: crypto.randomUUID(),
    latitude,
    longitude,
    createdAt: new Date().toISOString()
  });

  saveLocations(locations);
  res.status(201).json({ ok: true });
});

app.get("/api/admin/locations", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Yönetici anahtarı geçersiz." });
  }

  res.json(cleanExpired());
});

app.delete("/api/admin/locations/:id", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Yönetici anahtarı geçersiz." });
  }

  const locations = cleanExpired();
  const remaining = locations.filter(item => item.id !== req.params.id);

  if (remaining.length === locations.length) {
    return res.status(404).json({ error: "Kayıt bulunamadı." });
  }

  saveLocations(remaining);
  res.json({ ok: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Tatlı Molası sunucusu ${PORT} portunda çalışıyor.`);
});

const statusEl = document.getElementById("status");
const shareBtn = document.getElementById("shareBtn");
const bakeryList = document.getElementById("bakeryList");
const map = L.map("map").setView([39.0, 35.0], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
let markers = L.layerGroup().addTo(map);

function setStatus(msg, error=false) {
  statusEl.textContent = msg;
  statusEl.style.color = error ? "#9c3027" : "";
}
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
async function findBakeries(lat, lon) {
  setStatus("Yakındaki pastaneler aranıyor…");
  const query = `[out:json][timeout:20];(node["shop"="bakery"](around:5000,${lat},${lon});way["shop"="bakery"](around:5000,${lat},${lon});relation["shop"="bakery"](around:5000,${lat},${lon});node["amenity"="cafe"](around:2500,${lat},${lon}););out center tags;`;
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:"data="+encodeURIComponent(query)});
    if (!response.ok) throw new Error("Harita hizmeti şu an yanıt vermiyor.");
    const data = await response.json();
    const items = data.elements.map(e => {
      const tags = e.tags || {};
      return {name:tags.name || (tags.shop==="bakery" ? "İsimsiz pastane" : "Kafe"), lat:e.lat ?? e.center?.lat, lon:e.lon ?? e.center?.lon, address:[tags["addr:street"],tags["addr:housenumber"]].filter(Boolean).join(" ")};
    }).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lon)).slice(0,35);
    markers.clearLayers();
    L.marker([lat,lon]).addTo(markers).bindPopup("Paylaştığın konum").openPopup();
    items.forEach(x => L.marker([x.lat,x.lon]).addTo(markers).bindPopup(esc(x.name)));
    if (items.length) {
      const bounds = L.latLngBounds([[lat,lon],...items.map(x=>[x.lat,x.lon])]);
      map.fitBounds(bounds.pad(.18),{maxZoom:15});
      bakeryList.innerHTML = items.map(x => `<article class="bakery"><h3>${esc(x.name)}</h3><p>${esc(x.address || "Adres bilgisi haritada belirtilmemiş")}</p><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lon}">Yol tarifi al ↗</a></article>`).join("");
      setStatus(`${items.length} yakın işletme bulundu. Listede kafe ve pastaneler birlikte bulunabilir.`);
    } else {
      bakeryList.innerHTML = '<div class="empty">Bu bölgede kayıtlı pastane bulunamadı. Haritayı yakınlaştırıp tekrar deneyebilirsin.</div>';
      setStatus("Bu bölgede kayıtlı işletme bulunamadı.");
    }
  } catch (e) {
    bakeryList.innerHTML = '<div class="empty">Pastaneler şu anda yüklenemedi. Biraz sonra tekrar dene.</div>';
    setStatus("Pastaneler yüklenemedi. Konum paylaşımı yine de kaydedildi. " + e.message, true);
    map.setView([lat,lon],14);
    L.marker([lat,lon]).addTo(markers).bindPopup("Paylaşılan konum");
  }
}
shareBtn.addEventListener("click", () => {
  if (!("geolocation" in navigator)) return setStatus("Bu tarayıcı konum özelliğini desteklemiyor.", true);
  const ok = window.confirm("Konumunu site sahibiyle paylaşmak istiyor musun? Onay verirsen konumun özel yönetici paneline iletilir ve 24 saat içinde silinir.");
  if (!ok) return setStatus("Konum paylaşılmadı.");
  shareBtn.disabled = true;
  setStatus("Telefonunun konum izni bekleniyor…");
  navigator.geolocation.getCurrentPosition(async pos => {
    const latitude = pos.coords.latitude, longitude = pos.coords.longitude;
    try {
      const r = await fetch("/api/share-location", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({latitude,longitude,consent:true,label:"Müşteri konumu"})});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Konum gönderilemedi.");
      setStatus(d.message);
      map.setView([latitude,longitude],14);
      await findBakeries(latitude,longitude);
    } catch (e) { setStatus("Konum gönderilemedi: " + e.message, true); }
    finally { shareBtn.disabled = false; }
  }, err => {
    const messages = {1:"Konum izni verilmedi. Tarayıcı ayarlarından izin verirsen tekrar deneyebilirsin.",2:"Konum belirlenemedi. GPS ve konum hizmetlerini kontrol et.",3:"Konum isteği zaman aşımına uğradı. Tekrar dene."};
    setStatus(messages[err.code] || "Konum alınamadı.", true);
    shareBtn.disabled = false;
  }, {enableHighAccuracy:true,timeout:15000,maximumAge:0});
});

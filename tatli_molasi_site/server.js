
const statusEl = document.getElementById("location-status");
const shareBtn = document.getElementById("location-button");
const mapElement = document.getElementById("map");

function setStatus(message, error = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = error ? "#9c3027" : "";
}

if (!mapElement || !window.L) {
  setStatus("Harita yüklenemedi. Sayfayı yenileyip tekrar dene.", true);
} else {
  const map = L.map(mapElement).setView([37.0662, 37.3833], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const markers = L.layerGroup().addTo(map);

  if (!shareBtn) {
    setStatus("Konum butonu bulunamadı.", true);
  } else {
    shareBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        setStatus("Tarayıcın konum özelliğini desteklemiyor.", true);
        return;
      }

      if (!window.isSecureContext) {
        setStatus("Konum için HTTPS bağlantısı gerekli.", true);
        return;
      }

      if (!confirm(
        "Konumunu yönetici panelinde paylaşmak istiyor musun? Kayıt 24 saat içinde silinir."
      )) {
        setStatus("Konum paylaşılmadı.");
        return;
      }

      shareBtn.disabled = true;
      setStatus("Konum izni bekleniyor…");

      navigator.geolocation.getCurrentPosition(async position => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          const response = await fetch("/api/share-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude,
              longitude,
              consent: true,
              label: "Müşteri konumu"
            })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Konum gönderilemedi.");
          }

          markers.clearLayers();

          L.marker([latitude, longitude])
            .addTo(markers)
            .bindPopup("Konumun")
            .openPopup();

          map.setView([latitude, longitude], 15);
          setStatus("Konumun yönetici paneline iletildi.");
        } catch (error) {
          setStatus("Hata: " + error.message, true);
        } finally {
          shareBtn.disabled = false;
        }
      }, error => {
        const messages = {
          1: "Konum izni reddedildi. Tarayıcı ayarlarından konum iznini aç.",
          2: "Konum bulunamadı. Cihazının konum ayarlarını kontrol et.",
          3: "Konum isteği zaman aşımına uğradı. Tekrar dene."
        };

        setStatus(messages[error.code] || "Konum alınamadı.", true);
        shareBtn.disabled = false;
      }, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      });
    });
  }
}

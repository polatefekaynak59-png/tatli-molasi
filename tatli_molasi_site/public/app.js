
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("location-button");
  const status = document.getElementById("location-status");
  const mapElement = document.getElementById("map");

  if (!button || !status) {
    console.error("Konum düğmesi veya mesaj alanı HTML içinde bulunamadı.");
    return;
  }

  let map = null;
  let marker = null;

  function showStatus(message) {
    status.textContent = message;
  }

  function initializeMap(lat, lng) {
    if (!mapElement || !window.L) return;

    if (!map) {
      map = L.map(mapElement).setView([lat, lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);
    } else {
      map.setView([lat, lng], 15);
    }

    if (marker) marker.setLatLng([lat, lng]);
    else marker = L.marker([lat, lng]).addTo(map);

    marker.bindPopup("İzin verilen konum").openPopup();
  }

  button.addEventListener("click", () => {
    if (!window.isSecureContext || !navigator.geolocation) {
      showStatus("Konum özelliği kullanılamıyor. HTTPS bağlantısını kontrol et.");
      return;
    }

    button.disabled = true;
    showStatus("Konum izni bekleniyor...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        initializeMap(lat, lng);
        showStatus("Konum alındı. Sunucuya gönderiliyor...");

        try {
          const response = await fetch("/api/share-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng })
          });

          const result = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(result.error || `Sunucu hatası: ${response.status}`);
          }

          showStatus("Konum başarıyla kaydedildi.");
        } catch (error) {
          console.error("Konum kaydetme hatası:", error);
          showStatus(
            "Konum alındı ama sunucuya kaydedilemedi. API ve sunucu ayarlarını kontrol et."
          );
        } finally {
          button.disabled = false;
        }
      },
      (error) => {
        const messages = {
          1: "Konum izni reddedildi. Adres çubuğundaki site ayarlarından izin ver.",
          2: "Konum belirlenemedi. Cihazının konum ayarlarını kontrol et.",
          3: "Konum isteği zaman aşımına uğradı. Yeniden dene."
        };

        showStatus(messages[error.code] || "Konum alınamadı. Yeniden dene.");
        console.error("Konum hatası:", error.code, error.message);
        button.disabled = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
});

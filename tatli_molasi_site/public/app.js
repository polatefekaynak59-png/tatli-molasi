
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("location-button");
  const status = document.getElementById("location-status");
  const mapElement = document.getElementById("map");

  if (!button || !status) {
    console.error("Konum butonu HTML içinde bulunamadı.");
    return;
  }

  let map;
  let marker;

  button.addEventListener("click", () => {
    status.textContent = "Buton çalışıyor. Konum izni bekleniyor...";

    if (!navigator.geolocation || !window.isSecureContext) {
      status.textContent =
        "Konum için HTTPS bağlantısı ve tarayıcı konum desteği gerekiyor.";
      return;
    }

    button.disabled = true;

    navigator.geolocation.getCurrentPosition(
      async position => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          if (mapElement && window.L) {
            if (!map) {
              map = L.map(mapElement).setView(
                [latitude, longitude], 15
              );

              L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                  attribution: "&copy; OpenStreetMap contributors"
                }
              ).addTo(map);
            } else {
              map.setView([latitude, longitude], 15);
            }

            if (marker) {
              marker.setLatLng([latitude, longitude]);
            } else {
              marker = L.marker([latitude, longitude]).addTo(map);
            }

            marker.bindPopup("Paylaştığın konum").openPopup();
          }

          status.textContent = "Konum alındı, kaydediliyor...";

          const response = await fetch("/api/share-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude,
              longitude,
              consent: true
            })
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || "Konum kaydedilemedi.");
          }

          status.textContent = "Konum başarıyla kaydedildi.";
        } catch (error) {
          console.error(error);
          status.textContent =
            "Konum alındı ancak kaydedilemedi: " + error.message;
        } finally {
          button.disabled = false;
        }
      },
      error => {
        const messages = {
          1: "Konum izni reddedildi. Tarayıcı ayarlarından izin ver.",
          2: "Konum bulunamadı. Cihazının konum ayarlarını kontrol et.",
          3: "Konum isteği zaman aşımına uğradı. Tekrar dene."
        };

        status.textContent =
          messages[error.code] || "Konum alınamadı.";

        button.disabled = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  });
});

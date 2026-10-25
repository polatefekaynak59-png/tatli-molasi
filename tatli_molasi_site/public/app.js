
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

  // Aynı tarayıcı için kalıcı bir ziyaretçi kimliği oluştur.
  // Bu kimlik gerçek adını veya e-posta adresini içermez.
  function getVisitorId() {
    const storageKey = "tatliMolasiVisitorId";

    try {
      let visitorId = localStorage.getItem(storageKey);

      if (!visitorId) {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
          visitorId = window.crypto.randomUUID();
        } else {
          visitorId =
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2) +
            "-" +
            Math.random().toString(36).slice(2);
        }

        localStorage.setItem(storageKey, visitorId);
      }

      return visitorId;
    } catch (error) {
      console.error("Ziyaretçi kimliği saklanamadı:", error);
      throw new Error(
        "Tarayıcı depolaması kullanılamıyor. Lütfen ayarlarını kontrol et."
      );
    }
  }

  button.addEventListener("click", () => {
    status.textContent = "Konum izni bekleniyor...";

    if (!navigator.geolocation || !window.isSecureContext) {
      status.textContent =
        "Konum için HTTPS bağlantısı ve tarayıcı konum desteği gerekiyor.";
      return;
    }

    button.disabled = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          // Konumu haritada göster.
          if (mapElement && window.L) {
            if (!map) {
              map = L.map(mapElement).setView(
                [latitude, longitude],
                15
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

          // Bu işlem yalnızca ziyaretçi konum butonuna bastığında yapılır.
          const visitorId = getVisitorId();

          const response = await fetch("/api/share-location", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              latitude,
              longitude,
              visitorId,
              consent: true
            })
          });

          const result = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              result.error || "Konum kaydedilemedi."
            );
          }

          status.textContent =
            result.updated === true
              ? "Konumun güncellendi."
              : "Konum başarıyla kaydedildi.";
        } catch (error) {
          console.error("Konum paylaşımı hatası:", error);

          status.textContent =
            "Konum alındı ancak kaydedilemedi: " +
            error.message;
        } finally {
          button.disabled = false;
        }
      },
      (error) => {
        const messages = {
          1: "Konum izni reddedildi. Tarayıcı ayarlarından izin verebilirsin.",
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

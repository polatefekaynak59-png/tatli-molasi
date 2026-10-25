
(() => {
  function baslat() {
    const buton = document.getElementById("location-button");
    const mesaj = document.getElementById("location-status");

    if (!buton || !mesaj) {
      console.error("Konum butonu veya mesaj alanı bulunamadı.");
      return;
    }

    buton.addEventListener("click", () => {
      mesaj.textContent = "Konum özelliği başlatılıyor...";

      if (!window.isSecureContext || !navigator.geolocation) {
        mesaj.textContent =
          "Konum kullanılamıyor. Siteyi HTTPS üzerinden açıp tekrar dene.";
        return;
      }

      buton.disabled = true;
      mesaj.textContent = "Konum izni bekleniyor...";

      navigator.geolocation.getCurrentPosition(
        async (konum) => {
          const lat = konum.coords.latitude;
          const lng = konum.coords.longitude;

          mesaj.textContent = "Konum alındı, kaydediliyor...";

          try {
            const yanit = await fetch("/api/share-location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lat,
                lng,
                latitude: lat,
                longitude: lng,
                consent: true,
                label: "Müşteri konumu"
              })
            });

            const veri = await yanit.json().catch(() => ({}));

            if (!yanit.ok) {
              throw new Error(veri.error || "Sunucu konumu kaydedemedi.");
            }

            mesaj.textContent = "Konum başarıyla kaydedildi.";
          } catch (hata) {
            console.error(hata);
            mesaj.textContent =
              "Konum alındı ama kaydedilemedi. Sunucu ayarları kontrol edilmeli.";
          } finally {
            buton.disabled = false;
          }
        },
        (hata) => {
          const mesajlar = {
            1: "Konum izni reddedildi. Tarayıcı ayarlarından konum izni ver.",
            2: "Konum bulunamadı. Cihazının konum ayarlarını kontrol et.",
            3: "İstek zaman aşımına uğradı. Tekrar dene."
          };

          mesaj.textContent =
            mesajlar[hata.code] || "Konum alınamadı. Tekrar dene.";

          buton.disabled = false;
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", baslat);
  } else {
    baslat();
  }
})();

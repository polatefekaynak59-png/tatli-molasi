
const tokenInput = document.getElementById("token");
const statusEl = document.getElementById("adminStatus");
const locationsEl = document.getElementById("locations");
const countEl = document.getElementById("locationCount");

tokenInput.value = sessionStorage.getItem("tm_admin_token") || "";

const map = L.map("adminMap").setView([39, 35], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const markers = L.layerGroup().addTo(map);
let records = [];
let selectedId = null;

function say(message, error = false) {
  statusEl.textContent = message;
  statusEl.style.color = error ? "#a53f3a" : "#527b5b";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function selectLocation(id) {
  const item = records.find(x => String(x.id) === String(id));
  if (!item) return;

  selectedId = String(id);
  map.flyTo(
    [Number(item.latitude), Number(item.longitude)],
    16,
    { duration: 0.7 }
  );

  if (item.marker) item.marker.openPopup();
  renderLocations();
}

function renderLocations() {
  countEl.textContent = records.length + " kayıt";

  if (!records.length) {
    locationsEl.innerHTML =
      '<div class="empty">Henüz konum paylaşılmamış.</div>';
    return;
  }

  locationsEl.innerHTML = records.map((item, index) => {
    const date = new Date(item.createdAt);
    const dateText = Number.isNaN(date.getTime())
      ? "Zaman bilgisi yok"
      : date.toLocaleString("tr-TR");

    const selected = String(item.id) === selectedId;

    return `
      <div class="location-row ${selected ? "selected" : ""}"
           data-select="${esc(item.id)}"
           role="button" tabindex="0"
           aria-pressed="${selected}">
        <div class="loc-main">
          <div class="loc-title">${selected ? "✓ " : ""}Konum paylaşımı ${index + 1}</div>
          <div class="loc-meta">${esc(dateText)}</div>
          <div class="loc-coords">
            ${Number(item.latitude).toFixed(5)},
            ${Number(item.longitude).toFixed(5)}
          </div>
        </div>
        <div class="loc-actions">
          <button class="secondary" type="button"
                  data-focus="${esc(item.id)}">Seç</button>
          <button class="danger" type="button"
                  data-delete="${esc(item.id)}">Sil</button>
          <a href="https://www.google.com/maps?q=${encodeURIComponent(item.latitude + "," + item.longitude)}"
             target="_blank" rel="noopener noreferrer">Google Maps ↗</a>
        </div>
      </div>`;
  }).join("");

  locationsEl.querySelectorAll("[data-select]").forEach(row => {
    row.addEventListener("click", event => {
      if (event.target.closest("button,a")) return;
      selectLocation(row.dataset.select);
    });

    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        if (event.target.closest("button,a")) return;
        event.preventDefault();
        selectLocation(row.dataset.select);
      }
    });
  });

  locationsEl.querySelectorAll("[data-focus]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      selectLocation(button.dataset.focus);
    });
  });

  locationsEl.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", async event => {
      event.stopPropagation();

      if (!confirm("Bu konum kaydını silmek istiyor musun?")) return;

      button.disabled = true;

      try {
        const response = await fetch(
          "/api/admin/locations/" + encodeURIComponent(button.dataset.delete),
          {
            method: "DELETE",
            headers: {
              "x-admin-token": tokenInput.value.trim()
            }
          }
        );

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || "Kayıt silinemedi.");
        }

        say("Konum kaydı silindi.");
        await loadLocations(true);
      } catch (error) {
        say(error.message || "Kayıt silinemedi.", true);
        button.disabled = false;
      }
    });
  });
}

async function loadLocations(keepSelection = false) {
  const token = tokenInput.value.trim();

  if (!token) {
    say("Önce yönetici anahtarını gir.", true);
    return;
  }

  say("Konumlar yükleniyor…");
  document.getElementById("load").disabled = true;

  try {
    const response = await fetch("/api/admin/locations", {
      headers: { "x-admin-token": token }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Giriş başarısız. Anahtarı kontrol et.");
    }

    if (!Array.isArray(data)) {
      throw new Error("Sunucudan beklenmeyen veri geldi.");
    }

    sessionStorage.setItem("tm_admin_token", token);
    markers.clearLayers();

    records = data.filter(item =>
      Number.isFinite(Number(item.latitude)) &&
      Number.isFinite(Number(item.longitude))
    );

    records.forEach((item, index) => {
      const marker = L.marker([
        Number(item.latitude),
        Number(item.longitude)
      ]).addTo(markers);

      const date = new Date(item.createdAt);
      const dateText = Number.isNaN(date.getTime())
        ? "Zaman bilgisi yok"
        : date.toLocaleString("tr-TR");

      marker.bindPopup(
        "Konum paylaşımı " + (index + 1) + "<br>" + esc(dateText)
      );

      marker.on("click", () => {
        selectedId = String(item.id);
        renderLocations();
      });

      item.marker = marker;
    });

    if (!keepSelection ||
        !records.some(item => String(item.id) === selectedId)) {
      selectedId = records.length ? String(records[0].id) : null;
    }

    renderLocations();

    if (selectedId !== null) {
      const selected = records.find(
        item => String(item.id) === selectedId
      );

      if (selected) {
        map.setView([
          Number(selected.latitude),
          Number(selected.longitude)
        ], 15);

        selected.marker.openPopup();
      }
    } else {
      map.setView([39, 35], 5);
    }

    say(records.length
      ? records.length + " konum yüklendi. Listeden seçim yapabilirsin."
      : "Henüz konum paylaşılmamış.");
  } catch (error) {
    say(error.message || "Konumlar yüklenemedi.", true);
  } finally {
    document.getElementById("load").disabled = false;
  }
}

document.getElementById("load").addEventListener("click", () => {
  loadLocations();
});

document.getElementById("refresh").addEventListener("click", () => {
  loadLocations(true);
});

document.getElementById("clearToken").addEventListener("click", () => {
  tokenInput.value = "";
  sessionStorage.removeItem("tm_admin_token");
  say("Yönetici anahtarı bu oturumdan temizlendi.");
});

tokenInput.addEventListener("keydown", event => {
  if (event.key === "Enter") loadLocations();
});

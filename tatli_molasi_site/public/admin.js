const tokenInput=document.getElementById("token"), statusEl=document.getElementById("adminStatus"), locationsEl=document.getElementById("locations");
tokenInput.value=sessionStorage.getItem("tm_admin_token")||"";
const map=L.map("adminMap").setView([39,35],5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
let markers=L.layerGroup().addTo(map);
function say(s,err=false){statusEl.textContent=s;statusEl.style.color=err?"#9c3027":""}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function loadLocations(){
 const token=tokenInput.value.trim(); if(!token){say("Önce yönetici anahtarını gir.",true);return}
 say("Konumlar yükleniyor…");
 try{
  const r=await fetch("/api/admin/locations",{headers:{"x-admin-token":token}});
  const data=await r.json();if(!r.ok)throw new Error(data.error||"Giriş başarısız.");
  sessionStorage.setItem("tm_admin_token",token);markers.clearLayers();
  if(!data.length){locationsEl.innerHTML='<div class="empty">Henüz konum paylaşılmamış.</div>';say("Kayıtlı konum yok.");return}
  data.forEach((x,i)=>L.marker([x.latitude,x.longitude]).addTo(markers).bindPopup(`Paylaşım ${i+1}<br>${new Date(x.createdAt).toLocaleString("tr-TR")}`));
  map.fitBounds(L.latLngBounds(data.map(x=>[x.latitude,x.longitude])).pad(.2),{maxZoom:14});
  locationsEl.innerHTML=data.map((x,i)=>`<div class="location-row"><div><strong>Konum paylaşımı ${i+1}</strong><small>${new Date(x.createdAt).toLocaleString("tr-TR")} · 24 saat içinde silinir</small><small>${Number(x.latitude).toFixed(5)}, ${Number(x.longitude).toFixed(5)}</small><a href="https://www.google.com/maps?q=${x.latitude},${x.longitude}" target="_blank" rel="noopener noreferrer">Haritada aç ↗</a></div><button class="secondary danger" data-delete="${esc(x.id)}">Sil</button></div>`).join("");
  say(`${data.length} konum paylaşımı gösteriliyor.`);
  locationsEl.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",async()=>{if(!confirm("Bu konum kaydını kalıcı olarak silmek istiyor musun?"))return;const rr=await fetch("/api/admin/locations/"+encodeURIComponent(btn.dataset.delete),{method:"DELETE",headers:{"x-admin-token":token}});if(rr.ok)loadLocations();else say("Kayıt silinemedi.",true)}));
 }catch(e){say(e.message,true)}
}
document.getElementById("load").addEventListener("click",loadLocations);
document.getElementById("refresh").addEventListener("click",loadLocations);
document.getElementById("clearToken").addEventListener("click",()=>{tokenInput.value="";sessionStorage.removeItem("tm_admin_token");say("Anahtar bu oturumdan temizlendi.")});

document.addEventListener("DOMContentLoaded", () => {
  const ciudad = localStorage.getItem("ciudadSeleccionada");
  const geolocalizacionActiva = localStorage.getItem("geolocalizacion") === "true";

  if (!ciudad) return window.location.href = "index.html";

  const map = L.map('map').setView([38.79, 0.16], 13);
  const contador = document.getElementById("contador");
  const modal = document.getElementById("questionModal");
  const title = document.getElementById("pointTitle");
  const desc = document.getElementById("pointDescription");
  const questionText = document.getElementById("questionText");
  const options = document.getElementById("options");
  const feedback = document.getElementById("feedback");

  let currentMarkers = [];
  let total = 0;
  let correct = 0;
  let answered = new Set();
  let posicionUsuario = null;
  let accuracyMetros = null;
  let markerUsuario = null;
  let radioUsuario = null;

  const gpsInfo = document.createElement("div");
  gpsInfo.style.position = "fixed";
  gpsInfo.style.top = "12px";
  gpsInfo.style.right = "10px";
  gpsInfo.style.padding = "6px 10px";
  gpsInfo.style.background = "rgba(255,255,255,0.9)";
  gpsInfo.style.border = "1px solid #ccc";
  gpsInfo.style.borderRadius = "6px";
  gpsInfo.style.fontSize = "13px";
  gpsInfo.style.zIndex = 1000;
  gpsInfo.textContent = "GPS: no disponible";
  document.body.appendChild(gpsInfo);

  if (geolocalizacionActiva && navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (pos) => {
        posicionUsuario = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        accuracyMetros = pos.coords.accuracy;
        gpsInfo.textContent = `GPS: ±${Math.round(accuracyMetros)} m`;

        if (markerUsuario) {
          markerUsuario.setLatLng(posicionUsuario);
        } else {
          markerUsuario = L.circleMarker(posicionUsuario, {
            radius: 6,
            fillColor: '#3388ff',
            color: '#1a4eaa',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(map);
        }

        if (radioUsuario) {
          radioUsuario.setLatLng(posicionUsuario);
        } else {
          radioUsuario = L.circle(posicionUsuario, {
            radius: 50,
            color: '#3388ff',
            weight: 1,
            fillColor: '#3388ff',
            fillOpacity: 0.15
          }).addTo(map);
        }
      },
      (err) => {
        posicionUsuario = null;
        gpsInfo.textContent = "GPS: no disponible";
        console.warn("Error geolocalización:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  } else {
    gpsInfo.style.display = "none";
  }

  document.getElementById("closeQuestion").onclick = () => {
    modal.classList.add("hidden");
  };

  document.getElementById("closeCompletion").onclick = () => {
    localStorage.removeItem("ciudadSeleccionada");
    localStorage.removeItem("geolocalizacion");
    window.location.href = "index.html";
  };

  L.tileLayer('https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  fetch(`https://raw.githubusercontent.com/luklpz/pueblos/main/${ciudad}.json`)
    .then(res => res.json())
    .then(data => {
      map.setView([data.cityCenter.lat, data.cityCenter.lng], 15);
      total = data.points.length;
      correct = 0;
      answered = new Set();
      updateContador();

      data.points.forEach((p, i) => {
        const m = L.marker([p.lat, p.lng]).addTo(map);
        m._customIndex = i;
        currentMarkers.push(m);

        m.on("click", () => {
          if (answered.has(i)) return;

          if (geolocalizacionActiva) {
            if (!posicionUsuario) {
              alert("No se ha podido obtener tu ubicación actual.");
              return;
            }

            const distancia = map.distance(
              L.latLng(posicionUsuario.lat, posicionUsuario.lng),
              L.latLng(p.lat, p.lng)
            );

            if (distancia > 50) {
              alert(`⛔ Debes estar a menos de 50 metros del punto. Estás a ${Math.round(distancia)} metros.`);
              return;
            }
          }

          mostrarPregunta(p, i, m);
        });
      });
    });

  function mostrarPregunta(p, index, marker) {
    modal.classList.remove("hidden");
    title.textContent = p.title;
    desc.textContent = p.description;
    const q = p.questions?.[0];
    questionText.textContent = q?.question || "Sin pregunta";
    options.innerHTML = '';
    feedback.textContent = '';

    if (!q?.options) return;

    q.options.forEach((opt, i) => {
      const b = document.createElement("button");
      b.textContent = opt;
      b.onclick = () => {
        const ok = i === q.answer;
        b.classList.add(ok ? 'correct' : 'incorrect');
        feedback.textContent = ok ? "✅ ¡Correcto!" : "❌ Intenta de nuevo";

        if (!answered.has(index)) {
          if (ok) {
            marker.setIcon(new L.Icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            }));
            answered.add(index);
            correct++;
            updateContador();
            if (correct === total) {
              setTimeout(() => {
                document.getElementById("completionModal").classList.remove("hidden");
              }, 500);
            }
          } else {
            marker.setIcon(new L.Icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            }));
          }
        }

        Array.from(options.children).forEach(btn => btn.disabled = true);
      };
      options.appendChild(b);
    });
  }

  function updateContador() {
    contador.textContent = `${correct}/${total} puntos`;
  }
});

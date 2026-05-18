import React, { useEffect, useRef, useState } from "react";

/**
 * LocationMap — OpenStreetMap viewer via Leaflet (loaded from CDN).
 * Props:
 *   location: string  — e.g. "Azimpur, Dhaka"
 *   height:   string  — CSS height, default "300px"
 */
export default function LocationMap({ location, height = "300px" }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ok | error

  useEffect(() => {
    if (!location) return;

    // Inject Leaflet CSS once
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Inject Leaflet JS once, then init map
    const initMap = (L) => {
      if (!mapRef.current) return;

      // Destroy previous instance on re-render
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Geocode via Nominatim (OSM free API)
      const query = encodeURIComponent(`${location}, Dhaka, Bangladesh`);
      fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      )
        .then((r) => r.json())
        .then((data) => {
          const lat = data[0]?.lat ? parseFloat(data[0].lat) : 23.7272;
          const lng = data[0]?.lon ? parseFloat(data[0].lon) : 90.4093;
          const found = !!data[0];

          const map = L.map(mapRef.current).setView([lat, lng], found ? 15 : 12);
          mapInstanceRef.current = map;

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          }).addTo(map);

          // Custom marker icon (fixes broken default icon in some bundlers)
          const icon = L.divIcon({
            className: "",
            html: `<div style="
              background:#0d1b4b;
              border:3px solid #f5a623;
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              width:28px;height:28px;
              box-shadow:0 2px 8px rgba(0,0,0,0.35);
            "></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28],
          });

          L.marker([lat, lng], { icon })
            .addTo(map)
            .bindPopup(
              `<b style="color:#0d1b4b">${location}</b><br/>${
                found ? "Approximate location" : "Dhaka, Bangladesh (default)"
              }`
            )
            .openPopup();

          setStatus("ok");
        })
        .catch(() => setStatus("error"));
    };

    if (window.L) {
      initMap(window.L);
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initMap(window.L);
      script.onerror = () => setStatus("error");
      document.body.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location]);

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 relative" style={{ height }}>
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
          <div className="w-8 h-8 border-4 border-[#0d1b4b] border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm text-gray-500">Loading map…</p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <p className="text-sm text-gray-500">Could not load map for this location.</p>
        </div>
      )}
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}

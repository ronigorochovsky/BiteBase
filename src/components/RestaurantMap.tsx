"use client";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getConceptEmoji, CONCEPT_FILTER_OPTIONS } from "@/lib/constants";

interface MapRestaurant {
  id: string;
  slug: string;
  name: string;
  concept: string | null;
  address: string | null;
  area: string;
  lat: number;
  lng: number;
}

/** Teardrop/location-pin SVG icon with emoji inside */
function createPinIcon(emoji: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Leaflet = require("leaflet") as typeof L;
  const encoded = encodeURIComponent(emoji);
  const html = `
    <div style="position:relative;width:38px;height:50px">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 50" width="38" height="50">
        <path d="M19 0C8.51 0 0 8.51 0 19C0 32.25 19 50 19 50C19 50 38 32.25 38 19C38 8.51 29.49 0 19 0Z" fill="#059669"/>
        <circle cx="19" cy="18" r="12" fill="white" opacity="0.97"/>
      </svg>
      <div style="position:absolute;top:5px;left:0;width:38px;text-align:center;font-size:15px;line-height:1">${decodeURIComponent(encoded)}</div>
    </div>`;
  return Leaflet.divIcon({
    html,
    className: "",
    iconSize: [38, 50],
    iconAnchor: [19, 50],
    popupAnchor: [0, -52],
  });
}

function matchesConcept(concept: string | null | undefined, filterValue: string): boolean {
  const option = CONCEPT_FILTER_OPTIONS.find((o) => o.value === filterValue);
  if (!option || !concept) return false;
  const c = concept.toLowerCase();
  return option.patterns.some((p) => c.includes(p.toLowerCase()));
}

interface Props {
  restaurants: MapRestaurant[];
}

export function RestaurantMap({ restaurants }: Props) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (value: string) => {
    setActiveFilters((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  };

  const displayed =
    activeFilters.length > 0
      ? restaurants.filter((r) => activeFilters.some((f) => matchesConcept(r.concept, f)))
      : restaurants;

  const center: [number, number] = [31.7, 34.9];

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {/* Concept filter overlay */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          maxWidth: 320,
          justifyContent: "flex-end",
        }}
      >
        {/* "All" pill */}
        <button
          onClick={() => setActiveFilters([])}
          style={{
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            border: "1.5px solid",
            backgroundColor: activeFilters.length === 0 ? "#059669" : "rgba(255,255,255,0.92)",
            color: activeFilters.length === 0 ? "#fff" : "#374151",
            borderColor: activeFilters.length === 0 ? "#059669" : "#d1d5db",
            backdropFilter: "blur(4px)",
          }}
        >
          הכל
        </button>
        {CONCEPT_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggleFilter(opt.value)}
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: "1.5px solid",
              backgroundColor: activeFilters.includes(opt.value) ? "#059669" : "rgba(255,255,255,0.92)",
              color: activeFilters.includes(opt.value) ? "#fff" : "#374151",
              borderColor: activeFilters.includes(opt.value) ? "#059669" : "#d1d5db",
              backdropFilter: "blur(4px)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <MapContainer
        center={center}
        zoom={8}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {displayed.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={createPinIcon(getConceptEmoji(r.concept))}
          >
            <Popup>
              <div style={{ direction: "rtl", minWidth: "150px" }}>
                <p style={{ fontWeight: 700, marginBottom: 2, fontSize: 14 }}>{r.name}</p>
                {r.concept && (
                  <p style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>{r.concept}</p>
                )}
                {r.address && (
                  <p style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>📍 {r.address}</p>
                )}
                <a
                  href={`/restaurants/${r.slug}`}
                  style={{ color: "#059669", fontSize: 12, textDecoration: "underline" }}
                >
                  לעמוד המסעדה ←
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

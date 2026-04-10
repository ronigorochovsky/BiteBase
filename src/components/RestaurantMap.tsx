"use client";
import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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
  branchIndex?: number;
}

/** Teardrop/location-pin SVG icon with emoji inside.
 *  SVG geometry: circle at cx=19 cy=18 r=12 → spans x[7,31] y[6,30], pin tip at (19,50).
 *  iconAnchor [19,50] — map coordinate aligns with the pin tip.
 *  popupAnchor [0,-54] — popup tip appears 4px above the pin top (50+4).
 *  tooltipAnchor [0,-44] — tooltip tip appears at the circle top edge.
 */
function createPinIcon(emoji: string, highlighted = false, isBranch = false) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Leaflet = require("leaflet") as typeof L;
  const encoded = encodeURIComponent(emoji);
  // amber = highlighted, teal = branch of chain, green = regular
  const pinColor = highlighted ? "#f59e0b" : isBranch ? "#0d9488" : "#059669";
  const html = `
    <div style="position:relative;width:38px;height:50px">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 50" width="38" height="50">
        <path d="M19 0C8.51 0 0 8.51 0 19C0 32.25 19 50 19 50C19 50 38 32.25 38 19C38 8.51 29.49 0 19 0Z" fill="${pinColor}"/>
        <circle cx="19" cy="18" r="12" fill="white" opacity="0.97"/>
      </svg>
      <div style="position:absolute;top:6px;left:7px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;pointer-events:none">${decodeURIComponent(encoded)}</div>
    </div>`;
  return Leaflet.divIcon({
    html,
    className: "",
    iconSize: [38, 50],
    iconAnchor: [19, 50],
    popupAnchor: [0, -54],
    tooltipAnchor: [0, -44],
  });
}

function matchesConcept(concept: string | null | undefined, filterValue: string): boolean {
  const option = CONCEPT_FILTER_OPTIONS.find((o) => o.value === filterValue);
  if (!option || !concept) return false;
  const c = concept.toLowerCase();
  return option.patterns.some((p) => c.includes(p.toLowerCase()));
}

/** Flies to the highlighted restaurant and opens its popup after animation. */
function MapController({
  target,
  markerRef,
}: {
  target: MapRestaurant | null;
  markerRef: React.RefObject<L.Marker | null>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], 16, { animate: true, duration: 1.2 });
    const timer = setTimeout(() => {
      markerRef.current?.openPopup();
    }, 1400);
    return () => clearTimeout(timer);
  }, [map, target, markerRef]);
  return null;
}

interface Props {
  restaurants: MapRestaurant[];
  highlighted?: string; // slug of the restaurant to highlight + fly to
}

export function RestaurantMap({ restaurants, highlighted }: Props) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const highlightedMarkerRef = useRef<L.Marker | null>(null);

  const toggleFilter = (value: string) => {
    setActiveFilters((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  };

  const displayed =
    activeFilters.length > 0
      ? restaurants.filter((r) => activeFilters.some((f) => matchesConcept(r.concept, f)))
      : restaurants;

  const highlightedRestaurant = highlighted
    ? restaurants.find((r) => r.slug === highlighted) ?? null
    : null;

  const center: [number, number] = highlightedRestaurant
    ? [highlightedRestaurant.lat, highlightedRestaurant.lng]
    : [31.7, 34.9];
  const zoom = highlightedRestaurant ? 15 : 8;

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {/* Concept filter overlay — single scrollable row beside the zoom controls */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 44,
          right: 10,
          zIndex: 1000,
          display: "flex",
          flexWrap: "nowrap",
          overflowX: "auto",
          gap: 4,
          scrollbarWidth: "none",
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
            flexShrink: 0,
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
              flexShrink: 0,
            }}
          >
            {opt.label}
          </button>
        ))}
        {/* Live count — always in sync with the displayed[] array */}
        <span
          style={{
            marginInlineStart: 4,
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: "rgba(255,255,255,0.92)",
            color: "#6b7280",
            border: "1.5px solid #d1d5db",
            backdropFilter: "blur(4px)",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {displayed.length} מסעדות
        </span>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fly-to controller for highlighted restaurant */}
        {highlightedRestaurant && (
          <MapController target={highlightedRestaurant} markerRef={highlightedMarkerRef} />
        )}

        {displayed.map((r) => {
          const isHighlighted = r.slug === highlighted;
          const isBranch = (r.branchIndex ?? 0) > 0;
          return (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={createPinIcon(getConceptEmoji(r.concept), isHighlighted, isBranch)}
              ref={isHighlighted ? highlightedMarkerRef : null}
              zIndexOffset={isHighlighted ? 1000 : 0}
            >
              <Popup>
                <div style={{ direction: "rtl", minWidth: "150px" }}>
                  <p style={{ fontWeight: 700, marginBottom: 2, fontSize: 14 }}>{r.name}</p>
                  {isBranch && (
                    <p style={{ fontSize: 11, color: "#0d9488", marginBottom: 2, fontWeight: 600 }}>סניף</p>
                  )}
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
          );
        })}
      </MapContainer>
    </div>
  );
}

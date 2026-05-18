import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Vite empacota os ícones; precisamos aplicar manualmente, senão Leaflet
// busca caminhos relativos quebrados (mostra "Marker" como alt em vez do ícone).
// O `delete` é necessário porque o Leaflet tem um _getIconUrl interno que
// ignora o mergeOptions e usa URLs calculadas no startup.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const CENTRO_BR = [-14.235, -51.9253];

function AjustarBounds({ coordsSaida, coordsChegada, geometria }) {
  const map = useMap();
  useMemo(() => {
    if (geometria?.coordinates?.length) {
      const latLngs = geometria.coordinates.map(([lng, lat]) => [lat, lng]);
      map.fitBounds(latLngs, { padding: [20, 20] });
    } else if (coordsSaida && coordsChegada) {
      map.fitBounds(
        [[coordsSaida.lat, coordsSaida.lng], [coordsChegada.lat, coordsChegada.lng]],
        { padding: [40, 40] }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsSaida?.lat, coordsSaida?.lng, coordsChegada?.lat, coordsChegada?.lng, geometria]);
  return null;
}

export function MapaPreview({ coordsSaida, coordsChegada, geometria, altura = 280 }) {
  const temRota = !!(coordsSaida && coordsChegada);

  return (
    <div
      className="rounded-lg overflow-hidden border border-slate-300 bg-slate-100 relative"
      style={{ height: altura, zIndex: 0, isolation: 'isolate' }}
    >
      <MapContainer
        center={temRota ? [coordsSaida.lat, coordsSaida.lng] : CENTRO_BR}
        zoom={temRota ? 6 : 4}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {coordsSaida && <Marker position={[coordsSaida.lat, coordsSaida.lng]} />}
        {coordsChegada && <Marker position={[coordsChegada.lat, coordsChegada.lng]} />}
        {geometria && (
          <GeoJSON
            key={`${coordsSaida?.lat}-${coordsChegada?.lat}`}
            data={geometria}
            style={{ color: '#1e40af', weight: 4, opacity: 0.8 }}
          />
        )}
        <AjustarBounds
          coordsSaida={coordsSaida}
          coordsChegada={coordsChegada}
          geometria={geometria}
        />
      </MapContainer>
    </div>
  );
}

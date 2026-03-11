import React, { memo } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const MoveXMap = ({ 
  pickup, 
  destination, 
  driverLocation, 
  route,
  polygons = [],
  markers = [],
  style 
}) => {
  // DEFENSIVE: Limit large datasets to prevent native bridge crash
  const safePolygons = (polygons || []).slice(0, 100); 
  const safeMarkers = (markers || []).slice(0, 50);

  let mapHtml = '';
  try {
    mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; background: #0f172a; }
        .leaflet-container { background: #0f172a; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        try {
          const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${pickup?.lat || driverLocation?.lat || 28.6139}, ${pickup?.lng || driverLocation?.lng || 77.2090}], 13);
          
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
          }).addTo(map);

          const bounds = [];
          
          // Heatmap Polygons
          const heatmapData = ${JSON.stringify(safePolygons)};
          heatmapData.forEach(poly => {
              L.polygon(poly.coordinates.map(c => [c.latitude, c.longitude]), {
                  fillColor: poly.fillColor || '#2563EB',
                  fillOpacity: 0.5,
                  color: poly.strokeColor || '#fff',
                  weight: poly.strokeWidth || 1
              }).addTo(map);
          });

          // Markers (Orders)
          const customMarkers = ${JSON.stringify(safeMarkers)};
          customMarkers.forEach(m => {
              const icon = L.divIcon({
                  html: '<div style="background:#2563EB;padding:5px;border-radius:10px;border:2px solid white;"><div style="width:10px;height:10px;background:white;border-radius:50%"></div></div>',
                  className: '',
                  iconSize: [20, 20]
              });
              L.marker([m.latitude, m.longitude], { icon }).addTo(map);
              bounds.push([m.latitude, m.longitude]);
          });

          if (${JSON.stringify(pickup || null)}) {
            const p = ${JSON.stringify(pickup)};
            if (p && p.lat) {
                const icon = L.divIcon({
                  html: '<div style="background:#2563EB;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>',
                  iconSize: [12, 12]
                });
                L.marker([p.lat, p.lng], { icon }).addTo(map);
                bounds.push([p.lat, p.lng]);
            }
          }

          if (${JSON.stringify(driverLocation || null)}) {
            const dl = ${JSON.stringify(driverLocation)};
            if (dl && dl.lat) {
                const icon = L.divIcon({
                  html: '<div style="background:#10B981;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px #10B981;"></div>',
                  iconSize: [16, 16]
                });
                L.marker([dl.lat, dl.lng], { icon }).addTo(map);
                bounds.push([dl.lat, dl.lng]);
            }
          }

          const routeData = ${JSON.stringify(route || [])};
          if (routeData && routeData.length > 0) {
            const normalizedRoute = routeData.map(c => {
                if (Array.isArray(c)) return c;
                if (c.latitude !== undefined) return [c.latitude, c.longitude];
                if (c.lat !== undefined) return [c.lat, c.lng];
                return c;
            });
            L.polyline(normalizedRoute, {color: '#2563EB', weight: 4}).addTo(map);
          }

          if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        } catch (e) {
          console.error('JS Map Error:', e);
        }
      </script>
    </body>
    </html>
  `;
  } catch (err) {
    console.error('Map Stringification Error:', err);
    return <View style={[styles.container, style, { backgroundColor: '#0f172a' }]} />;
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.map}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default memo(MoveXMap);

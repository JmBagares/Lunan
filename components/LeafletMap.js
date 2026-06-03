import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { WebView } from 'react-native-webview';

import { colors } from '../theme';

// Static HTML page: loads Leaflet (+ marker clustering) from a CDN, renders
// OpenStreetMap tiles, and exposes window.setData / flyTo / fitAll for the RN
// side. Communication back to RN happens via window.ReactNativeWebView.postMessage.
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${colors.background}; }
    .pin {
      width: 22px; height: 22px;
      background: ${colors.accent};
      border: 2px solid #fff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 5px rgba(0,0,0,0.35);
    }
    .user-dot {
      width: 16px; height: 16px;
      background: ${colors.locationDot};
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(46,125,246,0.25);
    }
    .cluster {
      width: 40px; height: 40px; line-height: 38px;
      text-align: center; color: #fff; font-weight: 700; font-size: 14px;
      background: ${colors.accent};
      border: 2px solid #fff; border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    /* Push Leaflet's top controls (zoom +/-) below the app's category chips. */
    .leaflet-top { top: var(--top-inset, 0px); }
    .leaflet-popup-content { font-family: -apple-system, Roboto, sans-serif; margin: 10px 12px; }
    .popup-img { width: 200px; height: 110px; object-fit: cover; border-radius: 8px; display: block; margin-bottom: 6px; }
    .popup-title { font-weight: 700; font-size: 14px; color: ${colors.text}; }
    .popup-note { font-size: 12px; color: ${colors.subtext}; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map, markerLayer, userMarker, routeLine;
    var userIcon = L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
    function makePin(color) {
      return L.divIcon({
        className: '',
        html: '<div class="pin" style="background:' + (color || '${colors.accent}') + '"></div>',
        iconSize: [22, 22], iconAnchor: [11, 22], popupAnchor: [0, -22]
      });
    }
    function imgFail(el) { el.style.display = 'none'; }

    function post(obj) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    }
    function escapeHtml(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    var baseLayers = {};
    var currentBase;
    function buildBaseLayers() {
      baseLayers.street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap'
      });
      baseLayers.terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17, attribution: '&copy; OpenTopoMap'
      });
      baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, attribution: '&copy; Esri'
      });
    }
    function setBaseLayer(name) {
      var next = baseLayers[name] || baseLayers.street;
      if (next === currentBase) return;
      if (currentBase) map.removeLayer(currentBase);
      currentBase = next;
      currentBase.addTo(map);
    }
    function ensureMap(interactive) {
      if (map) return;
      map = L.map('map', { zoomControl: interactive, attributionControl: true });
      buildBaseLayers();
      currentBase = baseLayers.street;
      currentBase.addTo(map);
      if (interactive) {
        map.on('contextmenu', function (e) {
          post({ type: 'mapLongPress', latitude: e.latlng.lat, longitude: e.latlng.lng });
        });
      }
      markerLayer = L.markerClusterGroup({
        maxClusterRadius: 50,
        showCoverageOnHover: false,
        iconCreateFunction: function (cluster) {
          return L.divIcon({
            html: '<div class="cluster">' + cluster.getChildCount() + '</div>',
            className: '', iconSize: [40, 40]
          });
        }
      }).addTo(map);
      if (!interactive) {
        map.dragging.disable(); map.touchZoom.disable();
        map.doubleClickZoom.disable(); map.scrollWheelZoom.disable();
        map.boxZoom.disable(); map.keyboard.disable();
        if (map.tap) map.tap.disable();
      }
    }
    function setData(data) {
      ensureMap(data.interactive !== false);
      setBaseLayer(data.baseLayer || 'street');
      if (typeof data.topInset === 'number') {
        document.documentElement.style.setProperty('--top-inset', data.topInset + 'px');
      }
      map.setView([data.center.latitude, data.center.longitude], data.zoom || 15);
      markerLayer.clearLayers();

      if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
      if (data.route && data.route.length >= 2) {
        var latlngs = data.route.map(function (p) { return [p.latitude, p.longitude]; });
        routeLine = L.polyline(latlngs, {
          color: '${colors.accent}', weight: 3.5, opacity: 0.85,
          dashArray: '6,10', lineCap: 'round', lineJoin: 'round'
        }).addTo(map);
      }

      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (data.userLocation) {
        userMarker = L.marker([data.userLocation.latitude, data.userLocation.longitude], { icon: userIcon })
          .addTo(map)
          .bindPopup('<span class="popup-title">You are here</span>');
      }

      (data.markers || []).forEach(function (m) {
        var html = '';
        if (m.photo) {
          html += '<img class="popup-img" src="' + m.photo + '" onerror="imgFail(this)"/>';
        }
        html += '<span class="popup-title">' + escapeHtml(m.title) + '</span>';
        if (m.note) html += '<br/><span class="popup-note">' + escapeHtml(m.note) + '</span>';
        var marker = L.marker([m.latitude, m.longitude], { icon: makePin(m.color) });
        marker.bindPopup(html);
        marker.on('click', function () { post({ type: 'markerPress', id: m.id }); });
        markerLayer.addLayer(marker);
      });
      post({ type: 'rendered' });
    }
    window.setData = setData;
    window.flyTo = function (lat, lng, z) { if (map) map.setView([lat, lng], z); };
    window.fitAll = function () {
      if (!map || !markerLayer) return;
      var layers = markerLayer.getLayers();
      if (layers.length === 0) return;
      if (layers.length === 1) {
        map.setView(layers[0].getLatLng(), 15);
      } else {
        try { map.fitBounds(markerLayer.getBounds().pad(0.2)); } catch (e) {}
      }
    };

    // Tell RN we're ready to receive data.
    post({ type: 'ready' });
  </script>
</body>
</html>`;

const LeafletMap = forwardRef(function LeafletMap(
  {
    style,
    center,
    zoom = 15,
    userLocation = null,
    markers = [],
    interactive = true,
    baseLayer = 'street',
    topInset = 0,
    routeCoords = [],
    onMarkerPress,
    onLongPress,
  },
  ref
) {
  const webRef = useRef(null);
  const readyRef = useRef(false);

  const pushData = useCallback(() => {
    if (!webRef.current || !center) return;
    const payload = JSON.stringify({
      center,
      zoom,
      userLocation,
      interactive,
      baseLayer,
      topInset,
      route: routeCoords,
      markers: markers.map((m) => ({
        id: m.id,
        title: m.title,
        note: m.note,
        latitude: m.latitude,
        longitude: m.longitude,
        color: m.color,
        photo: m.photo,
      })),
    });
    webRef.current.injectJavaScript(`window.setData(${payload}); true;`);
  }, [center, zoom, userLocation, interactive, baseLayer, topInset, routeCoords, markers]);

  // Re-send data whenever the inputs change (only after the page is ready).
  useEffect(() => {
    if (readyRef.current) pushData();
  }, [pushData]);

  useImperativeHandle(
    ref,
    () => ({
      recenter: (coords, z) => {
        if (!coords || !webRef.current) return;
        webRef.current.injectJavaScript(
          `window.flyTo(${coords.latitude}, ${coords.longitude}, ${z || zoom}); true;`
        );
      },
      fitAll: () => {
        if (!webRef.current) return;
        webRef.current.injectJavaScript('window.fitAll && window.fitAll(); true;');
      },
    }),
    [zoom]
  );

  const handleMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        readyRef.current = true;
        pushData();
      } else if (msg.type === 'markerPress' && onMarkerPress) {
        onMarkerPress(msg.id);
      } else if (msg.type === 'mapLongPress' && onLongPress) {
        onLongPress({ latitude: msg.latitude, longitude: msg.longitude });
      }
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <WebView
      ref={webRef}
      style={style}
      originWhitelist={['*']}
      source={{ html: MAP_HTML, baseUrl: 'file:///android_asset/' }}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      androidLayerType="hardware"
      setSupportMultipleWindows={false}
      // Allow the popup <img> to load local photo files (file:// URIs).
      allowFileAccess
      allowFileAccessFromFileURLs
      allowUniversalAccessFromFileURLs
    />
  );
});

export default LeafletMap;

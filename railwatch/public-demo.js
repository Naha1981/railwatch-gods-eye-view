// Public demo is browser-only. Production access controls are not changed.
(() => {
  const local = new URLSearchParams(location.search).get('mode') !== 'operations';
  window.RailWatchMode = { local };
  let current = null;
  window.RailWatchDemo = {
    get current() { return current; },
    simulate() {
      const lat = -26.5225, lon = 29.9811;
      current = {
        event_id: `LOCAL-DEMO-${Date.now()}`, corridor: 'TFR-COAL-DEMO',
        segment: 'Ermelo - Richards Bay demonstration sector', km_marker: 142.8,
        location: [lat, lon], elevation_m: 0, alert_type: 'LINE_BREACH', severity: 'CRITICAL',
        sensor_id: 'SYNTHETIC-SENSOR', timestamp: new Date().toISOString(),
        camera_preset: { heading: 35, pitch: -48, range_meters: 1800 },
        incident: {
          location_name: 'Ermelo - Richards Bay synthetic demo sector', asset_type: 'Demo rail infrastructure',
          asset_condition: 'Synthetic interference signal; no real event',
          operational_impact: 'Demonstration only; no railway operations are connected',
          recommended_action: 'Review synthetic evidence and practise the operator workflow',
          data_classification: 'LOCAL SYNTHETIC DEMO - NOT AUTHORITATIVE GIS',
          assets: [
            { asset_id: 'DEMO-SIG', asset_type: 'SIGNALLING', name: 'Synthetic block signal', latitude: lat + .002, longitude: lon - .003, distance_km: .39, status: 'ALERT', condition: 'Synthetic inspection scenario' },
            { asset_id: 'DEMO-TRACK', asset_type: 'TRACK ASSET', name: 'Synthetic track section', latitude: lat - .0014, longitude: lon + .0024, distance_km: .30, status: 'MONITOR', condition: 'Synthetic field-check scenario' },
            { asset_id: 'DEMO-TELECOM', asset_type: 'TELECOMMUNICATIONS', name: 'Synthetic telemetry cabinet', latitude: lat + .0008, longitude: lon + .0037, distance_km: .41, status: 'UNKNOWN', condition: 'Synthetic status not verified' },
          ],
        },
      };
      return current;
    },
  };
})();

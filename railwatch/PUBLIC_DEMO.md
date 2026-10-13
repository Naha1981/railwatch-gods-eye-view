# Public demo and operations

The default public site is a browser-only synthetic demonstration. The status says LOCAL DEMO. Clicking Simulate creates three synthetic assets and a local incident. It does not call the operations API, connect a telemetry socket, pair WhatsApp, send messages or generate paid AI output. Local workflow actions do not certify field evidence.

The existing operational path is explicitly selected with `?mode=operations`. It retains server authentication and production demo restrictions. The frontend change does not change backend configuration or grant operational access. Authenticated production connectivity still needs an authorized operator setup; it is not verified by public-demo tests.

The map uses OpenStreetMap raster tiles and the existing schematic corridors. Cesium does not request its default token-protected imagery layer. External tile availability remains separate from incident-demo readiness.

Regression: `node scripts/railwatch-public-demo-regression.mjs`. Browser verification must also check zero operations-API requests, simulated incident creation, three synthetic assets and mobile bounds.

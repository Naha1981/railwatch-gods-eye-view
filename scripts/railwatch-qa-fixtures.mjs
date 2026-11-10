// Only the unrelated Evidence Desk health read is stubbed. Operational
// telemetry/dispatch still use each test's own HTTP/WebSocket fixture.
export async function isolateEvidenceDeskHealth(page) {
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url() === 'https://railwatch-api.nahalabs.workers.dev/api/health' && request.method() === 'GET') {
      return request.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({status: 'ok', qa_fixture: true}) });
    }
    return request.continue();
  });
}

/**
 * evidenceVideoAdapter.js
 *
 * Interface seam for turning inspection footage into evidence clips /
 * annotated video / investigation video packages. Backed by ffmpeg on the
 * server side (see docs/integrations.md — OpenCut was investigated and
 * rejected: its current repo is mid-rewrite with the editor route showing
 * "Coming soon"). ffmpeg is the highest-value, lowest-risk Phase 1 item —
 * see docs/implementation-plan.md.
 *
 * STATUS: interface only. No backend endpoint exists yet.
 */

/**
 * @typedef {Object} EvidenceClipRequest
 * @property {string} incidentId
 * @property {string} sourceUrl
 * @property {number} startSeconds
 * @property {number} endSeconds
 * @property {{ eventId?: string, gps?: {lat:number, lon:number}, timestamp?: string, contentHash?: string }} [overlay]
 */

/**
 * @typedef {Object} EvidenceClipResult
 * @property {string} clipUrl
 * @property {string} contentHash - SHA-256 of the produced clip
 */

export class EvidenceVideoAdapter {
  /**
   * @param {{ endpoint?: string }} config
   */
  constructor(config = {}) {
    this.endpoint = config.endpoint || null;
  }

  /**
   * @param {EvidenceClipRequest} request
   * @returns {Promise<EvidenceClipResult>}
   */
  async createClip(request) {
    throw new Error(
      'EvidenceVideoAdapter.createClip: not wired yet — Phase 1, ' +
        'see docs/implementation-plan.md. Backend endpoint ' +
        'POST /api/v1/evidence/video-package does not exist yet.'
    );
  }
}

export default EvidenceVideoAdapter;

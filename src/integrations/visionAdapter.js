/**
 * visionAdapter.js
 *
 * Interface seam for AI visual analysis of inspection imagery (defect /
 * anomaly detection). Deliberately provider-agnostic: visualgpt.io, the
 * tool named in the original brief, did not verify as fit for this purpose
 * (consumer image-generation tool, not a detection/analysis API — see
 * docs/integrations.md). No provider is wired up. This file exists so a
 * verified provider can be dropped in later without touching call sites.
 *
 * STATUS: interface only, unimplemented. See docs/implementation-plan.md
 * Phase 3 — provider selection is a pending decision, not a code task.
 */

/**
 * @typedef {Object} VisionAnalysisRequest
 * @property {string} imageUrl
 * @property {string} [incidentId]
 */

/**
 * @typedef {Object} VisionDetection
 * @property {string} label
 * @property {number} confidence
 * @property {[number, number, number, number]} [bbox] - x, y, w, h
 */

/**
 * @typedef {Object} VisionAnalysisResult
 * @property {VisionDetection[]} detections
 * @property {string} provider
 */

export class VisionAdapter {
  /**
   * @param {{ provider?: string, endpoint?: string }} config
   */
  constructor(config = {}) {
    this.provider = config.provider || null; // RAILWATCH_VISION_PROVIDER
    this.endpoint = config.endpoint || null; // RAILWATCH_VISION_ENDPOINT
  }

  /**
   * @param {VisionAnalysisRequest} request
   * @returns {Promise<VisionAnalysisResult>}
   */
  async analyze(request) {
    throw new Error(
      'VisionAdapter.analyze: no verified provider configured. ' +
        'visualgpt.io was investigated and rejected — see docs/integrations.md. ' +
        'Select a provider before wiring this adapter (Phase 3).'
    );
  }
}

export default VisionAdapter;

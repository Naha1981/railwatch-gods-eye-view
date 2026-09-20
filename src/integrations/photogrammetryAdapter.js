/**
 * photogrammetryAdapter.js
 *
 * Interface seam for turning an inspection image set into 3D evidence
 * (point cloud / mesh / orthomosaic). Kept provider-agnostic so the backing
 * service (OpenDroneMap/NodeODM by default — see docs/integrations.md) can
 * be swapped without touching call sites in railwatch/*.js.
 *
 * STATUS: interface only. No backend endpoint exists yet — see
 * docs/implementation-plan.md Phase 2. Calling submitJob() today will throw.
 */

/**
 * @typedef {Object} PhotogrammetryJobRequest
 * @property {string} incidentId
 * @property {string[]} imageUrls - source imagery already stored by RailWatch
 * @property {{lat:number, lon:number}} [approxLocation]
 */

/**
 * @typedef {Object} PhotogrammetryJobStatus
 * @property {string} jobId
 * @property {'queued'|'processing'|'complete'|'failed'} status
 * @property {string} [resultUrl] - point cloud / mesh artifact, once complete
 * @property {string} [error]
 */

export class PhotogrammetryAdapter {
  /**
   * @param {{ endpoint?: string }} config
   */
  constructor(config = {}) {
    this.endpoint = config.endpoint || null; // RAILWATCH_ODM_ENDPOINT
  }

  /**
   * @param {PhotogrammetryJobRequest} request
   * @returns {Promise<{ jobId: string }>}
   */
  async submitJob(request) {
    throw new Error(
      'PhotogrammetryAdapter.submitJob: not wired yet — Phase 2, ' +
        'see docs/implementation-plan.md. No job was submitted.'
    );
  }

  /**
   * @param {string} jobId
   * @returns {Promise<PhotogrammetryJobStatus>}
   */
  async getStatus(jobId) {
    throw new Error(
      'PhotogrammetryAdapter.getStatus: not wired yet — Phase 2, ' +
        'see docs/implementation-plan.md.'
    );
  }
}

export default PhotogrammetryAdapter;

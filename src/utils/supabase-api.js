import { apiFetch } from './api';

/**
 * Supabase-based API functions for recruitment
 * Replaces Google Apps Script for better performance
 */

/**
 * Fetch candidates from Supabase
 * @param {Object} options - Filter options
 * @param {string} options.branch - Filter by branch
 * @param {string} options.status - Filter by status
 * @param {number} options.limit - Limit results
 * @param {number} options.offset - Pagination offset
 * @returns {Promise<Array>} List of candidates
 */
export async function fetchCandidates(options = {}) {
  const { branch, status, limit = 50, offset = 0 } = options;
  
  const params = new URLSearchParams();
  if (branch) params.append('branch', branch);
  if (status) params.append('status', status);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  
  const response = await apiFetch(`/api/recruitment/candidates?${params.toString()}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch candidates');
  }
  
  return data.data || [];
}

export async function fetchBranches() {
  const response = await apiFetch('/api/recruitment/branches');
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch branches');
  }

  return data.data || [];
}

/**
 * Fetch candidate details by ID or row_index
 * @param {Object} options - Identifier options
 * @param {number} options.id - Candidate ID
 * @param {number} options.row_index - Google Sheet row index
 * @returns {Promise<Object>} Candidate details
 */
export async function fetchCandidateDetails(options) {
  const { id, row_index } = options;
  
  const params = new URLSearchParams();
  if (id) params.append('id', id.toString());
  if (row_index) params.append('row_index', row_index.toString());
  
  const response = await apiFetch(`/api/recruitment/candidate?${params.toString()}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch candidate details');
  }
  
  return data.data;
}

/**
 * Save interview results
 * @param {Object} interviewData - Interview data
 * @returns {Promise<Object>} Saved interview
 */
export async function saveInterview(interviewData) {
  const response = await apiFetch('/api/recruitment/interview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(interviewData)
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to save interview');
  }
  
  return data.data;
}

/**
 * Create access token for branch to view candidate
 * @param {Object} tokenData - Token data
 * @returns {Promise<Object>} Created token
 */
export async function createAccessToken(tokenData) {
  const response = await apiFetch('/api/recruitment/access-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tokenData)
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to create access token');
  }
  
  return data.data;
}

/**
 * Validate access token
 * @param {string} token - Access token
 * @returns {Promise<Object>} Token validation result
 */
export async function validateAccessToken(token) {
  const response = await apiFetch(`/api/recruitment/validate-token?token=${encodeURIComponent(token)}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Invalid or expired token');
  }
  
  return data.data;
}

/**
 * Manual sync from Google Sheet to Supabase
 * @returns {Promise<Object>} Sync result
 */
export async function triggerSync() {
  const response = await apiFetch('/api/recruitment/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to trigger sync');
  }
  
  return data;
}

/**
 * Update candidate status
 * @param {number} candidateId - Candidate ID
 * @param {string} status - New status
 * @param {Object} updates - Additional updates
 * @returns {Promise<Object>} Update result
 */
export async function updateCandidateStatus(candidateId, status, updates = {}) {
  const response = await apiFetch('/api/recruitment/candidate/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidate_id: candidateId,
      status,
      ...updates
    })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to update candidate status');
  }
  
  return data.data;
}

/**
 * Get candidate statistics
 * @returns {Promise<Object>} Statistics
 */
export async function getCandidateStats() {
  const response = await apiFetch('/api/recruitment/stats');
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch statistics');
  }
  
  return data.data;
}

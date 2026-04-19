import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration for recruitment API');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Recruitment API handler
 * Replaces Google Apps Script with Supabase for better performance
 */
export async function handleRecruitmentApi(req, res, route, method, body, query) {
  const action = route.replace(/^recruitment\//, ''); // recruitment/[...action]
  
  switch (action) {
    case 'branches':
      return handleBranches(req, res, method, body, query);
    case 'candidates':
      return handleCandidates(req, res, method, body, query);
    case 'candidate':
      return handleCandidate(req, res, method, body, query);
    case 'interview':
      return handleInterview(req, res, method, body, query);
    case 'sync':
      return handleSync(req, res, method, body, query);
    case 'access-token':
      return _handleAccessToken(req, res, method, body, query);
    case 'validate-token':
      return _handleValidateToken(req, res, method, body, query);
    case 'candidate/status':
      return handleCandidateStatus(req, res, method, body, query);
    default:
      return json(res, 404, { error: 'Route not found' });
  }
}

/**
 * GET /api/recruitment/branches
 * Get branches list
 */
async function handleBranches(req, res, method, _body, _query) {
  if (method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('branches')
      .select('id,name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching branches:', error);
      return json(res, 500, { error: 'Failed to fetch branches' });
    }

    return json(res, 200, { success: true, data: data || [] });
  } catch (error) {
    console.error('Error in handleBranches:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}

/**
 * GET /api/recruitment/candidates
 * Get candidates by branch or status
 */
async function handleCandidates(req, res, method, body, query) {
  if (method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }
  
  try {
    const { branch, status, limit = 50, offset = 0 } = query;
    
    let queryBuilder = supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    
    // Filter by branch if provided
    if (branch) {
      queryBuilder = queryBuilder.eq('branch_assigned', branch);
    }
    
    // Filter by status if provided
    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) {
      console.error('Error fetching candidates:', error);
      return json(res, 500, { error: 'Failed to fetch candidates' });
    }
    
    return json(res, 200, {
      success: true,
      data: data || []
    });
    
  } catch (error) {
    console.error('Error in handleCandidates:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}

/**
 * GET /api/recruitment/candidate/:id
 * Get candidate details by ID or row_index
 */
async function handleCandidate(req, res, method, body, query) {
  if (method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }
  
  try {
    const { id, row_index } = query;
    
    if (!id && !row_index) {
      return json(res, 400, { error: 'Missing candidate identifier' });
    }
    
    let queryBuilder = supabase.from('candidates').select('*');
    
    if (id) {
      queryBuilder = queryBuilder.eq('id', parseInt(id));
    } else if (row_index) {
      queryBuilder = queryBuilder.eq('row_index', parseInt(row_index));
    }
    
    const { data, error } = await queryBuilder.single();
    
    if (error) {
      console.error('Error fetching candidate:', error);
      return json(res, 404, { error: 'Candidate not found' });
    }
    
    return json(res, 200, {
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error in handleCandidate:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}

/**
 * POST /api/recruitment/interview
 * Save interview results
 */
async function handleInterview(req, res, method, body, _query) {
  if (method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }
  
  try {
    const {
      candidate_id,
      interviewer_email,
      interview_date,
      technical_score,
      communication_score,
      attitude_score,
      overall_score,
      decision,
      notes
    } = body;
    
    // Validate required fields
    if (!candidate_id || !interviewer_email || !interview_date || !decision) {
      return json(res, 400, { error: 'Missing required fields' });
    }
    
    // Start transaction
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .insert({
        candidate_id: parseInt(candidate_id),
        interviewer_email,
        interview_date: new Date(interview_date).toISOString(),
        technical_score: technical_score ? parseInt(technical_score) : null,
        communication_score: communication_score ? parseInt(communication_score) : null,
        attitude_score: attitude_score ? parseInt(attitude_score) : null,
        overall_score: overall_score ? parseInt(overall_score) : null,
        decision,
        notes
      })
      .select()
      .single();
    
    if (interviewError) {
      console.error('Error saving interview:', interviewError);
      return json(res, 500, { error: 'Failed to save interview' });
    }
    
    // Update candidate status
    const { error: candidateError } = await supabase
      .from('candidates')
      .update({
        status: decision === 'PASS' ? 'INTERVIEWED_PASS' : 'INTERVIEWED_FAIL',
        interview_date: new Date(interview_date).toISOString(),
        interview_result: {
          technical_score,
          communication_score,
          attitude_score,
          overall_score,
          decision,
          notes,
          interviewer_email,
          interview_date: new Date(interview_date).toISOString()
        }
      })
      .eq('id', parseInt(candidate_id));
    
    if (candidateError) {
      console.error('Error updating candidate:', candidateError);
      // Don't fail the whole request, interview was saved
    }
    
    return json(res, 200, {
      success: true,
      data: {
        interview,
        message: 'Interview results saved successfully'
      }
    });
    
  } catch (error) {
    console.error('Error in handleInterview:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}

/**
 * POST /api/recruitment/sync
 * Manual sync from Google Sheet to Supabase
 */
async function handleSync(req, res, method, _body, _query) {
  if (method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }
  
  try {
    // This would trigger the sync script
    // For now, return success
    return json(res, 200, {
      success: true,
      message: 'Sync triggered (manual sync not yet implemented)'
    });
    
  } catch (error) {
    console.error('Error in handleSync:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}

/**
 * Create access token for branch to view candidate
 * POST /api/recruitment/access-token
 */
async function _handleAccessToken(req, res, method, body, _query) {
  if (method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }
  
  try {
    const { candidate_id, branch_id, interviewer_email, expires_hours = 24 } = body;
    
    if (!candidate_id || !branch_id || !interviewer_email) {
      return json(res, 400, { error: 'Missing required fields' });
    }
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + parseInt(expires_hours));
    
    const { data: token, error } = await supabase
      .from('candidate_access_tokens')
      .insert({
        candidate_id: parseInt(candidate_id),
        branch_id,
        interviewer_email,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating access token:', error);
      return json(res, 500, { error: 'Failed to create access token' });
    }
    
    return json(res, 200, {
      success: true,
      data: {
        token: token.token,
        expires_at: token.expires_at,
        candidate_id: token.candidate_id
      }
    });
    
  } catch (error) {
    console.error('Error in handleAccessToken:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}

/**
 * Validate access token
 * GET /api/recruitment/validate-token/:token
 */
async function _handleValidateToken(req, res, method, _body, query) {
  if (method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }
  
  try {
    const { token } = query;
    
    if (!token) {
      return json(res, 400, { error: 'Missing token' });
    }
    
    const { data: tokenData, error } = await supabase
      .from('candidate_access_tokens')
      .select('*, candidates(*)')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !tokenData) {
      return json(res, 404, { error: 'Invalid or expired token' });
    }
    
    // Mark token as used
    await supabase
      .from('candidate_access_tokens')
      .update({ used: true })
      .eq('token', token);
    
    return json(res, 200, {
      success: true,
      data: {
        candidate: tokenData.candidates,
        interviewer_email: tokenData.interviewer_email,
        branch_id: tokenData.branch_id
      }
    });
    
  } catch (error) {
    console.error('Error in handleValidateToken:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}

/**
 * Update candidate status
 * POST /api/recruitment/candidate/status
 */
async function handleCandidateStatus(req, res, method, body, _query) {
  if (method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }
  
  try {
    const {
      candidate_id,
      status,
      branch_assigned,
      assigned_at,
      branch_access_token,
      interview_scheduled_date,
      interview_notes,
      interviewer,
      workflow_status,
      assigned_by,
      final_decision,
      final_decision_by,
      final_decision_at,
      audit_actions,
      actor_id,
      actor
    } = body;
    
    if (!candidate_id || !status) {
      return json(res, 400, { error: 'Missing required fields' });
    }
    
    const candidateId = parseInt(candidate_id);
    const { data: existing, error: existingError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();
    
    if (existingError) {
      console.error('Error fetching existing candidate:', existingError);
      return json(res, 404, { error: 'Candidate not found' });
    }

    const updates = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (branch_assigned !== undefined) {
      updates.branch_assigned = branch_assigned;
    }
    
    if (assigned_at !== undefined) {
      updates.assigned_at = assigned_at;
    }

    if (branch_access_token !== undefined) {
      updates.branch_access_token = branch_access_token;
    }

    if (interview_scheduled_date !== undefined) {
      const d = new Date(interview_scheduled_date);
      updates.interview_scheduled_date = Number.isNaN(d.getTime()) ? interview_scheduled_date : d.toISOString();
    }

    if (interview_notes !== undefined) {
      updates.interview_notes = interview_notes;
    }

    if (interviewer !== undefined) {
      updates.interviewer = interviewer;
    }
    
    if (workflow_status !== undefined) {
      updates.workflow_status = workflow_status;
    }
    
    if (assigned_by !== undefined) {
      updates.assigned_by = assigned_by;
    }

    if (final_decision !== undefined) {
      updates.final_decision = final_decision;
    }

    if (final_decision_by !== undefined) {
      updates.final_decision_by = final_decision_by;
    }

    if (final_decision_at !== undefined) {
      const d = new Date(final_decision_at);
      updates.final_decision_at = Number.isNaN(d.getTime()) ? final_decision_at : d.toISOString();
    }
    
    const { data, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', candidateId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating candidate status:', error);
      return json(res, 500, { error: 'Failed to update candidate status' });
    }

    if (Array.isArray(audit_actions) && audit_actions.length > 0) {
      const ipAddress = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
      const auditRows = audit_actions.map((action) => ({
        table_name: 'candidates',
        record_id: candidateId,
        action,
        old_values: existing,
        new_values: data,
        user_id: actor_id ?? null,
        username: actor ?? null,
        ip_address: ipAddress || null
      }));

      const { error: auditError } = await supabase.from('audit_logs').insert(auditRows);
      if (auditError) {
        console.error('Error inserting audit logs:', auditError);
        return json(res, 500, { error: 'Failed to write audit logs' });
      }
    }
    
    return json(res, 200, {
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error in handleCandidateStatus:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}

// Helper function to send JSON response
function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
  return;
}

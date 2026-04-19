const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const apiHandlers = require('./apiHandlers');
const routes = require('./routes');

// Initialize Firebase Admin
apiHandlers.initFirebase(admin);

// Route mapping
const routeHandlers = {
  'login': { method: 'POST', handler: routes.handleLogin },
  'interviews': { method: 'POST', handler: routes.handleInterviews },
  'sync': { handler: routes.handleSync }, // GET and POST
  'contract': { method: 'POST', handler: routes.handleContract },
  'candidates-sheet/upsert': { method: 'POST', handler: routes.handleCandidatesSheetUpsert },
  'candidates-sheet/list': { method: 'GET', handler: routes.handleCandidatesSheetList },
  'movements/my': { method: 'GET', handler: routes.handleMovementsMy },
  'movements/pending': { method: 'GET', handler: routes.handleMovementsPending },
  'movements/list': { method: 'GET', handler: routes.handleMovementsList },
  'movements/create': { method: 'POST', handler: routes.handleMovementsCreate },
  'movements/decide': { method: 'POST', handler: routes.handleMovementsDecide },
  'tasks/list': { method: 'GET', handler: routes.handleTasksList },
  'tasks/upsert': { method: 'POST', handler: routes.handleTasksUpsert },
  'tasks/delete': { method: 'POST', handler: routes.handleTasksDelete },
  'tasks/complete': { method: 'POST', handler: routes.handleTasksComplete },
  'tasks/done-review': { method: 'POST', handler: routes.handleTasksDoneReview },
  'notifications/poll': { method: 'GET', handler: routes.handleNotificationsPoll },
  'notifications/ack': { method: 'POST', handler: routes.handleNotificationsAck },
  'contracts/issue-log': { method: 'POST', handler: routes.handleContractsIssueLog },
  'employees/import': { method: 'POST', handler: routes.handleEmployeesImport },
  'employees/import-request': { method: 'POST', handler: routes.handleEmployeesImportRequest },
  'employees/import-requests/list': { method: 'GET', handler: routes.handleEmployeesImportRequestsList },
  'employees/import-requests/decide': { method: 'POST', handler: routes.handleEmployeesImportRequestsDecide }
};

// Main API handler
exports.api = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const path = req.path;
    // Remove leading '/api' if present
    let route = path.startsWith('/api/') ? path.slice(5) : path.startsWith('/') ? path.slice(1) : path;
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).end();
      return;
    }

    console.log(`API request: ${req.method} ${route}`);

    // Find matching route
    const routeConfig = routeHandlers[route];
    if (!routeConfig) {
      return apiHandlers.json(res, 404, { ok: false, message: 'Endpoint not found' });
    }

    // Check method if specified
    if (routeConfig.method && req.method !== routeConfig.method) {
      return apiHandlers.json(res, 405, { ok: false, message: 'Method Not Allowed' });
    }

    // Execute handler if available
    if (routeConfig.handler) {
      try {
        await routeConfig.handler(req, res);
      } catch (error) {
        console.error(`Handler error for ${route}:`, error);
        apiHandlers.json(res, 500, { ok: false, message: 'Internal server error', error: error.message });
      }
    } else {
      apiHandlers.json(res, 501, { ok: false, message: 'Endpoint not yet implemented' });
    }
  });
});

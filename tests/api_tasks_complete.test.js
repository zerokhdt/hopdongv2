import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../api/firebase-admin.js', () => {
  return {
    db: {
      collection: vi.fn()
    },
    auth: {
      verifyIdToken: vi.fn()
    }
  }
})

import { db } from '../api/firebase-admin.js'
import handler from '../api/[...path].js'

function makeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(k, v) { this.headers[k] = v },
    end(s) { this.body = String(s || '') },
  }
  return res
}

function makeReq({ token, body } = {}) {
  return {
    method: 'POST',
    headers: { authorization: token ? `Bearer ${token}` : '' },
    query: { path: ['tasks', 'complete'] },
    body: body ? JSON.stringify(body) : '',
  }
}

function ok(data) {
  return Promise.resolve({ data, error: null })
}

function err(message) {
  return Promise.resolve({ data: null, error: { message } })
}

describe('/api/tasks/complete (router)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    globalThis.process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ project_id: 'test' })
  })

  it('completes task, moves to done group, logs, and notifies creator when admin', async () => {
    const sessionRow = { username: 'hr', role: 'admin', branch: 'HQ', expires_at: new Date(Date.now() + 60000).toISOString() }
    const curTaskRow = {
      id: 't1',
      group: 'TRUNG MỸ TÂY',
      status: 'IN_PROGRESS',
      title: 'Test',
      created_by: 'hr',
      data: { id: 't1', group: 'TRUNG MỸ TÂY', status: 'IN_PROGRESS', title: 'Test', requestMeta: { originUsername: 'hr', originRole: 'admin', originBranch: 'HQ' } },
    }

    const mockDoc = (data) => ({
      exists: !!data,
      data: () => data,
      get: vi.fn(() => Promise.resolve({ exists: !!data, data: () => data }))
    })

    const appSessionsColl = {
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve(mockDoc(sessionRow)))
      }))
    }

    const tasksColl = {
      doc: vi.fn((id) => ({
        get: vi.fn(() => Promise.resolve(mockDoc(curTaskRow))),
        update: vi.fn(() => Promise.resolve())
      }))
    }

    const transitionLogColl = { add: vi.fn(() => Promise.resolve()) }
    const notificationsColl = { add: vi.fn(() => Promise.resolve()) }

    db.collection.mockImplementation((name) => {
      if (name === 'app_sessions') return appSessionsColl
      if (name === 'tasks') return tasksColl
      if (name === 'task_transition_log') return transitionLogColl
      if (name === 'app_notifications') return notificationsColl
      throw new Error(`unexpected collection ${name}`)
    })

    const req = makeReq({ token: 'tok', body: { id: 't1' } })
    const res = makeRes()
    await handler(req, res)

    const payload = JSON.parse(res.body)
    expect(res.statusCode).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.task.group).toBe('TRUNG MỸ TÂY__DONE')
    expect(payload.task.status).toBe('DONE')
    expect(notificationsColl.add).toHaveBeenCalledTimes(1)
  })

  it('rolls back task update if notify insert fails when admin', async () => {
    const sessionRow = { username: 'hr', role: 'admin', branch: 'HQ', expires_at: new Date(Date.now() + 60000).toISOString() }
    const curTaskRow = {
      id: 't1',
      group: 'TRUNG MỸ TÂY',
      status: 'IN_PROGRESS',
      title: 'Test',
      created_by: 'hr',
      data: { id: 't1', group: 'TRUNG MỸ TÂY', status: 'IN_PROGRESS', title: 'Test', requestMeta: { originUsername: 'hr', originRole: 'admin', originBranch: 'HQ' } },
    }

    const mockDoc = (data) => ({
      exists: !!data,
      data: () => data,
      get: vi.fn(() => Promise.resolve({ exists: !!data, data: () => data }))
    })

    const appSessionsColl = {
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve(mockDoc(sessionRow)))
      }))
    }

    const updateSpy = vi.fn(() => Promise.resolve())
    const tasksColl = {
      doc: vi.fn((id) => ({
        get: vi.fn(() => Promise.resolve(mockDoc(curTaskRow))),
        update: updateSpy
      }))
    }

    const transitionLogColl = { add: vi.fn(() => Promise.resolve()) }
    const notificationsColl = { add: vi.fn(() => Promise.reject(new Error('notify_failed'))) }

    db.collection.mockImplementation((name) => {
      if (name === 'app_sessions') return appSessionsColl
      if (name === 'tasks') return tasksColl
      if (name === 'task_transition_log') return transitionLogColl
      if (name === 'app_notifications') return notificationsColl
      throw new Error(`unexpected collection ${name}`)
    })

    const req = makeReq({ token: 'tok', body: { id: 't1' } })
    const res = makeRes()
    await handler(req, res)

    const payload = JSON.parse(res.body)
    expect(res.statusCode).toBe(500)
    expect(payload.ok).toBe(false)
    // First update was to DONE, second update (rollback) is to previous status
    expect(updateSpy).toHaveBeenCalledTimes(2)
  })
})

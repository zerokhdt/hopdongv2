import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../api/firebase-admin.js', () => {
  return {
    db: {
      collection: vi.fn()
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
    query: { path: ['tasks', 'upsert'] },
    body: body ? JSON.stringify(body) : '',
  }
}

describe('/api/tasks/upsert (branch correction)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    globalThis.process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ project_id: 'test' })
  })

  it('allows branch to revert DONE task (doneApproval PENDING) back to TODO and moves group back', async () => {
    const sessionRow = { username: 'trungmytay', role: 'user', branch: 'TRUNG MỸ TÂY', expires_at: new Date(Date.now() + 60000).toISOString() }
    const curTaskRow = {
      id: 't1',
      group: 'TRUNG MỸ TÂY__DONE',
      created_by: 'hr',
      data: {
        id: 't1',
        group: 'TRUNG MỸ TÂY__DONE',
        status: 'DONE',
        title: 'Test',
        doneApproval: { status: 'PENDING', requestedBy: 'trungmytay', requestedAt: new Date().toISOString(), fromStatus: 'IN_PROGRESS', fromGroup: 'TRUNG MỸ TÂY' },
      },
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

    const setSpy = vi.fn(() => Promise.resolve())
    const tasksColl = {
      doc: vi.fn((id) => ({
        get: vi.fn(() => Promise.resolve(mockDoc(curTaskRow))),
        set: setSpy
      }))
    }

    const transitionLogColl = { add: vi.fn(() => Promise.resolve()) }

    db.collection.mockImplementation((name) => {
      if (name === 'app_sessions') return appSessionsColl
      if (name === 'tasks') return tasksColl
      if (name === 'task_transition_log') return transitionLogColl
      throw new Error(`unexpected collection ${name}`)
    })

    const req = makeReq({ token: 'tok', body: { task: { id: 't1', status: 'TODO' } } })
    const res = makeRes()
    await handler(req, res)

    const payload = JSON.parse(res.body)
    expect(res.statusCode).toBe(200)
    expect(payload.ok).toBe(true)
    expect(setSpy).toHaveBeenCalledTimes(1)

    const upsertArg = setSpy.mock.calls[0][0]
    expect(upsertArg.group).toBe('TRUNG MỸ TÂY')
    expect(upsertArg.status).toBe('TODO')
    expect(upsertArg.data.group).toBe('TRUNG MỸ TÂY')
    expect(upsertArg.data.doneApproval.status).toBe('CANCELLED_BY_BRANCH')
    expect(transitionLogColl.add).toHaveBeenCalledTimes(1)
  })
})


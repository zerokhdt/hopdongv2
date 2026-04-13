import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Upload, Download, Printer, X, CheckCircle2 } from 'lucide-react'

const STORAGE_KEY = 'ace_monthly_eval_v1'

function normalizeHeader(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
}

function normalizeNameKey(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '{}'
    const obj = JSON.parse(raw)
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}

function saveStore(obj) {
  const safe = obj && typeof obj === 'object' ? obj : {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
}

function parseCsv(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim() !== '')
  if (lines.length === 0) return { ok: false, rows: [], headers: [], error: 'CSV rỗng' }
  const split = (line) => {
    const out = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (c === ',' && !inQuotes) {
        out.push(cur)
        cur = ''
      } else {
        cur += c
      }
    }
    out.push(cur)
    return out
  }
  const headers = split(lines[0]).map(h => h.replace(/^"|"$/g, '').trim())
  const rows = lines.slice(1).map(line => split(line).map(v => v.replace(/^"|"$/g, '').trim()))
  return { ok: true, headers, rows }
}

function mapCsvRows(headers, rows) {
  const idx = {}
  headers.forEach((h, i) => { idx[normalizeHeader(h)] = i })
  const scoreHeaders = headers
    .map((h, i) => ({ h: normalizeHeader(h), i, raw: h }))
    .filter(x => /^t\d+$/.test(x.h) || /^(diem|score)$/.test(x.h))
  const defaultScoreKey = scoreHeaders.length > 0 ? scoreHeaders[0].h : null
  const mapped = rows.map(cells => {
    const byKey = (k) => {
      const i = idx[k]
      return i === undefined ? '' : cells[i] || ''
    }
    return {
      employeeCode: byKey('ma nv') || byKey('manv') || byKey('ma so') || byKey('ma so nv') || byKey('id'),
      name: byKey('ho va ten') || byKey('ho ten') || byKey('ten'),
      position: byKey('chuc vu') || byKey('chuc danh'),
      scores: Object.fromEntries(scoreHeaders.map(x => [x.h, cells[x.i] || ''])),
      raw: Object.fromEntries(headers.map((h, i) => [h, cells[i] || ''])),
      scoreKey: defaultScoreKey,
    }
  })
  return { items: mapped, scoreHeaders: scoreHeaders.map(s => s.h) }
}

export default function MonthlyEvaluationView({ userRole = 'user', branches = [], employees = [] }) {
  const isAdmin = userRole === 'admin'
  const [branch, setBranch] = useState(() => localStorage.getItem('user_branch') || (branches[0] || ''))
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [items, setItems] = useState([])
  const [scoreKey, setScoreKey] = useState('')
  const [scoreKeys, setScoreKeys] = useState([])
  const fileRef = useRef(null)

  useMemo(() => loadStore(), [])

  const employeeIndex = useMemo(() => {
    const pool = isAdmin ? employees : employees.filter(e => e.department === branch)
    const byName = new Map()
    const byId = new Map()
    pool.forEach(e => {
      const id = String(e.id || '').trim()
      if (id) byId.set(id.toLowerCase(), e)
      const nk = normalizeNameKey(e.name)
      if (nk && !byName.has(nk)) byName.set(nk, e)
    })
    return { byName, byId }
  }, [employees, branch, isAdmin])

  const applyEmployeeMatching = useCallback((list) => {
    return (Array.isArray(list) ? list : []).map(it => {
      const codeKey = String(it.employeeCode || '').trim().toLowerCase()
      const byCode = codeKey ? employeeIndex.byId.get(codeKey) : null
      const byName = employeeIndex.byName.get(normalizeNameKey(it.name))
      const emp = byCode || byName || null
      return { ...it, employeeId: emp ? emp.id : null }
    })
  }, [employeeIndex.byId, employeeIndex.byName])

  useEffect(() => {
    const saved = loadStore()
    const list = saved?.[branch]?.[month] || []
    if (Array.isArray(list) && list.length > 0) {
      setItems(applyEmployeeMatching(list))
      const keys = Object.keys(list[0]?.scores || {})
      setScoreKeys(keys)
      setScoreKey(list[0]?.scoreKey || keys[0] || '')
    } else {
      setItems([])
    }
  }, [applyEmployeeMatching, branch, month])

  const withStatus = useMemo(() => {
    return items.map((it, idx) => {
      const known = Boolean(it.employeeId)
      const score = (it.scores?.[it.scoreKey || scoreKey]) || ''
      return { ...it, index: idx + 1, known, scoreDisplay: score }
    })
  }, [items, scoreKey])

  const handlePickFile = () => fileRef.current && fileRef.current.click()

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setBusy(true)
    setFileName(file.name)
    try {
      const text = await file.text()
      const parsed = parseCsv(text)
      if (!parsed.ok) {
        setError(parsed.error || 'CSV lỗi')
        return
      }
      const { items: mapped, scoreHeaders } = mapCsvRows(parsed.headers, parsed.rows)
      setItems(applyEmployeeMatching(mapped))
      setScoreKeys(scoreHeaders)
      setScoreKey(scoreHeaders[0] || 'diem')
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  const handleSave = () => {
    if (!branch || !month) {
      setError('Thiếu chi nhánh hoặc tháng')
      return
    }
    const next = loadStore()
    if (!next[branch]) next[branch] = {}
    next[branch][month] = items.map(it => ({ ...it, scoreKey: it.scoreKey || scoreKey }))
    saveStore(next)
  }

  const handleChangeScoreKey = (key) => {
    setScoreKey(key)
    setItems(prev => prev.map(it => ({ ...it, scoreKey: key })))
  }

  const avgScore = useMemo(() => {
    let sum = 0
    let cnt = 0
    withStatus.forEach(it => {
      const s = String(it.scoreDisplay || '')
      const m = s.match(/(\d+(\.\d+)?)/)
      if (m) {
        const n = parseFloat(m[1])
        if (Number.isFinite(n)) {
          sum += n
          cnt += 1
        }
      }
    })
    return cnt > 0 ? (sum / cnt).toFixed(1) : '—'
  }, [withStatus])

  const exportCsv = () => {
    const headers = ['Họ và Tên', 'Chức vụ', 'Điểm']
    const lines = [headers.join(',')]
    withStatus.forEach(it => {
      const row = [it.name, it.position, it.scoreDisplay]
      lines.push(row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `Danh_gia_${branch}_${month}.csv`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(a.href)
    a.remove()
  }

  const handlePrint = () => window.print()

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7] p-6 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 print:hidden">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Đánh giá nhân sự theo tháng</h2>
            <p className="text-slate-500 text-sm">Nhập CSV từ chi nhánh và lưu theo từng tháng</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl flex items-center gap-2 transition-all font-black text-xs tracking-widest shadow-lg shadow-blue-200">
              <Printer size={18} /> In
            </button>
            <button onClick={exportCsv} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-black text-xs tracking-widest shadow-sm hover:bg-slate-50">
              <Download size={18} /> Xuất CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chi nhánh</label>
            <select
              value={branch}
              onChange={e => setBranch(e.target.value)}
              disabled={!isAdmin}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-70"
            >
              {isAdmin ? (
                branches.map(b => <option key={b} value={b}>{b}</option>)
              ) : (
                <option value={branch}>{branch}</option>
              )}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tháng</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cột điểm</label>
            <select
              value={scoreKey}
              onChange={e => handleChangeScoreKey(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {scoreKeys.length === 0 && <option value="diem">diem</option>}
              {scoreKeys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={handlePickFile}
              disabled={busy}
              className="w-full bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-xs tracking-widest shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <Upload size={18} /> {busy ? 'ĐANG TẢI...' : (fileName ? 'Chọn CSV khác' : 'Chọn CSV')}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 px-4 py-3 rounded-xl text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button onClick={handleSave} disabled={busy || items.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl flex items-center gap-2 transition-all font-black text-xs tracking-widest disabled:opacity-60">
            <CheckCircle2 size={18} /> Lưu đánh giá
          </button>
          {items.length > 0 && (
            <div className="text-xs font-bold text-slate-500">Tổng {items.length} dòng · Trung bình: {avgScore}</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-yellow-400 text-slate-900 border-b-2 border-slate-800">
              <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider border border-slate-800 w-10">STT</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider border border-slate-800">Họ và Tên</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider border border-slate-800">Chức vụ</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider border border-slate-800">Điểm</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider border border-slate-800 w-28">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {withStatus.map(it => (
              <tr key={it.index} className="border-b border-slate-100">
                <td className="px-3 py-2 text-xs font-bold text-slate-500 border border-slate-200 text-center">{it.index}</td>
                <td className="px-4 py-2 text-sm font-black text-slate-800 border border-slate-200">{it.name}</td>
                <td className="px-4 py-2 text-sm font-bold text-slate-700 border border-slate-200">{it.position}</td>
                <td className="px-4 py-2 text-sm font-bold text-slate-700 border border-slate-200">{it.scoreDisplay || '—'}</td>
                <td className={`px-4 py-2 text-[10px] font-black border border-slate-200 ${it.known ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                  {it.known ? 'Khớp nhân sự' : 'Chưa có trong DS'}
                </td>
              </tr>
            ))}
            {withStatus.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-400">Chưa có dữ liệu CSV</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

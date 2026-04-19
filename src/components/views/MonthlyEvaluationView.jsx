import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Upload, Download, Printer, X, CheckCircle2, ListFilter } from 'lucide-react'
import { formatName, formatPosition } from '../../utils/formatters.js'

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
    <div className="h-full flex flex-col bg-[#F2F4F7] p-4 lg:p-6 overflow-hidden font-sans">
      
      {/* View Header */}
      <div className="flex items-start justify-between gap-6 mb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Đánh giá định kỳ</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="px-4 py-2 bg-[#f7f6f3] hover:bg-[#efedf0] text-[#37352f] rounded-lg border border-[#37352f]/10 flex items-center gap-2 transition-all font-semibold text-sm">
            <Printer size={16} /> In báo cáo
          </button>
          <button onClick={exportCsv} className="px-4 py-2 bg-[#f7f6f3] hover:bg-[#efedf0] text-[#37352f] rounded-lg border border-[#37352f]/10 flex items-center gap-2 transition-all font-semibold text-sm">
            <Download size={16} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* Control Panel (Notion style) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 p-6 bg-[#f7f6f3]/50 rounded-xl border border-[#37352f]/5 print:hidden">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-[#37352f]/40 uppercase tracking-widest ml-1">Chi nhánh</label>
          <select
            value={branch}
            onChange={e => setBranch(e.target.value)}
            disabled={!isAdmin}
            className="w-full bg-white border border-[#37352f]/15 rounded-lg px-3 py-2.5 text-[15px] font-medium text-[#37352f] focus:ring-2 focus:ring-[#37352f]/5 transition-all outline-none disabled:opacity-50"
          >
            {isAdmin ? (
              branches.map(b => <option key={b} value={b}>{b}</option>)
            ) : (
              <option value={branch}>{branch}</option>
            )}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-[#37352f]/40 uppercase tracking-widest ml-1">Kỳ đánh giá</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="w-full bg-white border border-[#37352f]/15 rounded-lg px-3 py-2.5 text-[15px] font-medium text-[#37352f] focus:ring-2 focus:ring-[#37352f]/5 transition-all outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-[#37352f]/40 uppercase tracking-widest ml-1">Cột tính điểm</label>
          <select
            value={scoreKey}
            onChange={e => handleChangeScoreKey(e.target.value)}
            className="w-full bg-white border border-[#37352f]/15 rounded-lg px-3 py-2.5 text-[15px] font-medium text-[#37352f] focus:ring-2 focus:ring-[#37352f]/5 transition-all outline-none"
          >
            {scoreKeys.length === 0 && <option value="diem">Điểm</option>}
            {scoreKeys.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="flex flex-col justify-end">
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
            className="w-full h-[46px] bg-white border border-[#37352f]/15 text-[#37352f]/80 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold text-sm hover:bg-white hover:shadow-sm disabled:opacity-50"
          >
            <Upload size={16} /> {busy ? 'Đang tải...' : (fileName ? 'Đổi file CSV' : 'Chọn file CSV')}
          </button>
        </div>

        {error && (
          <div className="col-span-full mt-2 bg-red-50 text-red-600 text-sm font-medium py-3 px-4 rounded-lg border border-red-100 italic">
            {error}
          </div>
        )}

        <div className="col-span-full pt-4 border-t border-[#37352f]/5 flex items-center justify-between">
          <button 
             onClick={handleSave} 
             disabled={busy || items.length === 0} 
             className="px-6 py-2.5 bg-[#37352f] hover:bg-[#37352f]/90 text-white rounded-lg text-sm font-bold transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed group"
          >
            <span className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                Lưu dữ liệu Đánh giá
            </span>
          </button>
          
          {items.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-[#37352f]/60 font-medium">
              <span>Tổng số: <b className="text-[#37352f] font-bold">{items.length}</b> dòng</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#37352f]/10" />
              <span>Điểm TB: <b className="text-[#37352f] font-bold">{avgScore}</b></span>
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-auto rounded-xl border border-[#37352f]/10 bg-white shadow-sm">
        <table className="w-full text-left border-collapse table-auto">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[#f7f6f3] border-b border-[#37352f]/10">
              <th className="px-4 py-3.5 text-sm font-semibold tracking-wider text-[#37352f]/80 w-16 text-center">STT</th>
              <th className="px-6 py-3.5 text-sm font-semibold tracking-wider text-[#37352f]/80">Họ và Tên</th>
              <th className="px-6 py-3.5 text-sm font-semibold tracking-wider text-[#37352f]/80">Chức vụ</th>
              <th className="px-6 py-3.5 text-sm font-semibold tracking-wider text-[#37352f]/80 w-32">Điểm số</th>
              <th className="px-6 py-3.5 text-sm font-semibold tracking-wider text-[#37352f]/80 w-44">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#37352f]/5">
            {withStatus.map(it => (
              <tr key={it.index} className="hover:bg-[#f7f6f3]/30 transition-colors group">
                <td className="px-4 py-4 text-sm text-[#37352f]/60 text-center font-medium">{it.index}</td>
                <td className="px-6 py-4 text-[15px] font-semibold text-[#37352f]">{formatName(it.name)}</td>
                <td className="px-6 py-4 text-[15px] text-[#37352f]/70 font-medium">{formatPosition(it.position)}</td>
                <td className="px-6 py-4 text-[15px] font-bold text-[#37352f]">{it.scoreDisplay || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-sm font-semibold inline-flex items-center gap-1 ${it.known ? 'text-[#1c3829] bg-[#dbeddb]' : 'text-[#5c4a14] bg-[#fff0b3]'}`}>
                    {it.known ? 'Đã khớp' : 'Chưa khớp'}
                  </span>
                </td>
              </tr>
            ))}
            {withStatus.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-16 text-center">
                   <div className="flex flex-col items-center gap-2 opacity-30">
                      <ListFilter size={48} className="text-[#37352f]" />
                      <p className="text-[15px] font-medium text-[#37352f]">Không có dữ liệu. Vui lòng tải lên file CSV.</p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

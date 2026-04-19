import React, { useState, useRef, useEffect } from 'react';
import { Calendar, MoreHorizontal, CheckCircle2, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: '#ffbdad', text: '#5c1a14' },
  high:     { label: 'High',     color: '#ffd5b8', text: '#5c3114' },
  medium:   { label: 'Medium',   color: '#fff0b3', text: '#5c4a14' },
  low:      { label: 'Low',      color: '#dbeddb', text: '#1c3829' },
};

function ContextMenu({ task, onStatusChange, onDelete, onClose, isAdmin }) {
  const ref = useRef(null);
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-8 z-50 bg-white border border-[#37352f]/10 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] py-1.5 w-48 text-[14px]" onClick={e => e.stopPropagation()}>
      <div className="px-3 py-1.5 text-[11px] font-bold text-[#37352f]/30 uppercase tracking-widest">Status</div>
      {[
        { id: 'TODO', label: 'To-do', icon: '⬜' },
        { id: 'IN_PROGRESS', label: 'In progress', icon: '🔵' },
        { id: 'DONE', label: 'Done', icon: '✅' },
        { id: 'CANCELLED', label: 'Cancelled', icon: '❌' }
      ].map(s => (
        <button key={s.id} onClick={() => { onStatusChange(s.id); onClose(); }}
          className={`w-full text-left px-3 py-1.5 hover:bg-[#37352f]/5 flex items-center gap-2 ${task.status === s.id ? 'bg-[#37352f]/5 font-semibold text-[#37352f]' : 'text-[#37352f]/70'}`}>
          <span>{s.icon}</span>
          <span>{s.label}</span>
        </button>
      ))}
      {isAdmin && (
        <>
          <div className="my-1.5 border-t border-[#37352f]/10" />
          <button onClick={() => { onDelete(); onClose(); }}
            className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 font-medium flex items-center gap-2">
            <span>🗑</span>
            <span>Delete task</span>
          </button>
        </>
      )}
    </div>
  );
}

export default function TaskCard({ task, isDragging, onClick, colorConfig: _colorConfig, onStatusChange, onDelete, userRole, onPrintContract }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isAdmin = userRole === 'admin';

  const now = new Date();
  const isOverdue = task.endDate && isBefore(new Date(task.endDate), now) && task.status !== 'DONE' && task.status !== 'CANCELLED';

  const completedSubs = (task.subtasks || []).filter(s => s.isCompleted).length;
  const totalSubs = (task.subtasks || []).length;
  const visibleTags = (task.tags || []).slice(0, 3);

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-xl border border-gray-200 ${isDragging ? 'shadow-xl rotate-1 scale-105 z-50' : 'shadow-sm hover:shadow-md hover:border-blue-200'} transition-all duration-300 cursor-pointer relative overflow-hidden`}
    >
      <div className="p-3">
        {/* Top Metadata */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold" style={{ backgroundColor: priority.color, color: priority.text }}>
              {priority.label}
            </span>
            {task.group && (
              <span className="text-[11px] font-medium text-[#37352f]/40 bg-[#37352f]/5 px-1.5 py-0.5 rounded">
                {task.group}
              </span>
            )}
          </div>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-1 rounded hover:bg-[#37352f]/10 text-[#37352f]/30 transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <ContextMenu
                task={task}
                isAdmin={isAdmin}
                onStatusChange={(s) => onStatusChange && onStatusChange(task.id, s)}
                onDelete={() => onDelete && onDelete(task.id)}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Title */}
        <h4 className="text-[15px] font-semibold text-[#37352f] mb-1.5 leading-snug line-clamp-2">
          {task.title}
        </h4>

        {/* Notes */}
        {task.notes && (
          <p className="text-sm text-[#37352f]/80 line-clamp-1 mb-2 leading-relaxed">
            {task.notes}
          </p>
        )}

        {/* Tags */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {visibleTags.map(tag => (
              <span key={tag} className="text-sm text-[#37352f]/80 font-medium px-1.5 py-0.5 bg-[#37352f]/5 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Button (Notion style) */}
        {onPrintContract && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrintContract(task); }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 mb-3 bg-[#f7f6f3] hover:bg-[#efedf0] border border-[#37352f]/5 rounded text-sm font-semibold text-[#37352f]/70 transition-colors group/btn"
          >
            <div className="flex items-center gap-2">
              <FileText size={13} />
              <span>Print Contract</span>
            </div>
            <ChevronRight size={12} className="opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-[#37352f]/5 mt-1">
          <div className={`flex items-center gap-1.5 text-sm font-medium ${isOverdue ? 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded' : 'text-[#37352f]/40'}`}>
            <Calendar size={12} />
            <span>{task.endDate ? format(parseISO(task.endDate), 'MMM d') : 'No date'}</span>
          </div>

          <div className="flex items-center gap-3">
            {totalSubs > 0 && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${completedSubs === totalSubs ? 'text-green-600' : 'text-[#37352f]/40'}`}>
                <CheckCircle2 size={12} />
                <span>{completedSubs}/{totalSubs}</span>
              </div>
            )}
            {task.assignee && (
              <div className="w-5 h-5 rounded-full bg-[#efedf0] flex items-center justify-center text-sm font-bold text-[#37352f] border border-white" title={task.assignee}>
                {task.assignee.substring(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mini Progress Bar */}
      {task.progress > 0 && task.progress < 100 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#37352f]/5">
          <div 
            className="h-full bg-[#37352f]/30 transition-all duration-300"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

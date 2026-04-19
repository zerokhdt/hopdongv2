import React from 'react';
import { CheckCircle2, Circle, Calendar, MoreHorizontal, XCircle, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const PRIORITY_DOTS = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-green-500'
};

export default function ListView({ tasks, onTaskClick, colorConfig: _colorConfig, onStatusChange: _onStatusChange, onDelete: _onDelete, userRole: _userRole, onPrintContract }) {
    
    const groupedTasks = {
        TODO: tasks.filter(t => t.status === 'TODO'),
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
        DONE: tasks.filter(t => t.status === 'DONE'),
        CANCELLED: tasks.filter(t => t.status === 'CANCELLED'),
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'TODO': return { title: 'To-do', color: '#e3e2e0' };
            case 'IN_PROGRESS': return { title: 'In progress', color: '#d3e5ef' };
            case 'DONE': return { title: 'Done', color: '#dbeddb' };
            case 'CANCELLED': return { title: 'Cancelled', color: '#ffe2dd' };
            default: return { title: 'Other', color: '#f1f1ef' };
        }
    };

    return (
        <div className="max-w-screen-2xl mx-auto pb-12 overflow-y-auto h-full scrollbar-hide">
            {['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'].map(status => {
                const statusTasks = groupedTasks[status];
                if (statusTasks.length === 0) return null;

                const config = getStatusConfig(status);

                return (
                    <div key={status} className="mb-10 animate-in fade-in duration-300">
                        {/* Status Header */}
                        <div className="flex items-center gap-2 px-2 py-1.5 mb-2 sticky top-0 bg-white z-10 border-b border-[#37352f]/5">
                            <span className="px-1.5 py-0.5 rounded text-sm font-semibold text-[#37352f]" style={{ backgroundColor: config.color }}>
                                {config.title}
                            </span>
                            <span className="text-sm text-[#37352f]/40 font-medium">{statusTasks.length}</span>
                        </div>

                        {/* Task Table Container */}
                        <div className="table-container mx-2">
                            <div className="divide-y divide-gray-100">
                                {statusTasks.map(task => {
                                    const isOverdue = task.endDate && new Date(task.endDate) < new Date() && task.status !== 'DONE' && task.status !== 'CANCELLED';

                                    return (
                                        <div 
                                            key={task.id} 
                                            onClick={() => onTaskClick(task)} 
                                            className="flex items-center gap-4 py-3 px-4 hover:bg-blue-50/30 transition-all group cursor-pointer"
                                        >
                                            <div className="flex-1 flex items-center gap-3 min-w-0">
                                                 {/* Status Dot/Icon */}
                                                <div className="flex-shrink-0">
                                                    {status === 'DONE' ? (
                                                        <CheckCircle2 size={16} className="text-[#37352f]/25" />
                                                    ) : (
                                                        <Circle size={16} className="text-[#37352f]/25" />
                                                    )}
                                                </div>

                                                {/* Priority Dot */}
                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOTS[task.priority] || 'text-[#37352f]/20'} bg-current`} title={`Priority: ${task.priority}`} />

                                                {/* Title & Info */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <h4 className="text-[15px] font-semibold text-[#37352f] truncate">
                                                        {task.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {task.group && (
                                                            <span className="text-sm font-medium text-[#37352f]/40 bg-[#37352f]/5 px-1.5 py-0.5 rounded">
                                                                {task.group}
                                                            </span>
                                                        )}
                                                        {(task.tags || []).slice(0, 2).map(tag => (
                                                            <span key={tag} className="text-sm text-[#37352f]/30 hover:text-[#37352f]/60 transition-colors">#{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Meta Actions */}
                                            <div className="flex items-center gap-8 flex-shrink-0 pr-2">
                                                {/* Date */}
                                                <div className={`flex items-center gap-2 text-sm min-w-[80px] justify-end ${isOverdue ? 'text-red-500 font-semibold' : 'text-[#37352f]/40'}`}>
                                                    <Calendar size={13} />
                                                    <span>{task.endDate ? format(parseISO(task.endDate), 'MMM d') : '—'}</span>
                                                </div>

                                                {/* Assignee */}
                                                <div className="w-24 flex justify-end">
                                                    {task.assignee ? (
                                                        <div className="flex items-center gap-2 px-2 py-1 rounded-md">
                                                            <div className="w-5 h-5 rounded-full bg-[#efedf0] flex items-center justify-center text-sm font-bold text-[#37352f] border border-white">
                                                                {task.assignee.substring(0, 1).toUpperCase()}
                                                            </div>
                                                            <span className="text-sm font-medium text-[#37352f]/60 truncate max-w-[60px]">
                                                                {task.assignee}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-[#37352f]/25 italic">Unassigned</span>
                                                    )}
                                                </div>
                                                
                                                {/* Action Button */}
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                      onClick={(e) => { e.stopPropagation(); onPrintContract && onPrintContract(task); }}
                                                      className="hover:bg-[#37352f]/5 text-[#37352f]/50 p-2 rounded-md transition-colors flex items-center gap-2 text-sm"
                                                      title="Generate Document"
                                                    >
                                                      <FileText size={14} />
                                                    </button>
                                                </div>

                                                <button className="text-[#37352f]/20 hover:text-[#37352f]/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

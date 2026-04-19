import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { Plus, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

const COLUMNS = [
    { id: 'TODO', title: 'Cần làm', color: '#e3e2e0', borderColor: '#d1d1cf' },
    { id: 'IN_PROGRESS', title: 'Đang làm', color: '#d3e5ef', borderColor: '#aac6d8' },
    { id: 'DONE', title: 'Hoàn thành', color: '#dbeddb', borderColor: '#b8ccb8' },
    { id: 'CANCELLED', title: 'Đã hủy', color: '#ffe2dd', borderColor: '#ecbdb4' }
];

export default function KanbanBoard({ tasks, setTasks: _setTasks, onTaskClick, colorConfig, onStatusChange, onDelete, userRole, onPrintContract, isAllCollapsed }) {
    const isAdmin = userRole === 'admin';
    const [collapsedColumns, setCollapsedColumns] = useState({});

    // Sync with isAllCollapsed prop
    useEffect(() => {
        const newState = {};
        if (isAllCollapsed) {
            COLUMNS.forEach(col => newState[col.id] = true);
        }
        setCollapsedColumns(newState);
    }, [isAllCollapsed]);

    const toggleCollapse = (columnId) => {
        setCollapsedColumns(prev => ({
            ...prev,
            [columnId]: !prev[columnId]
        }));
    };

    const onDragEnd = (result) => {
        if (!isAdmin) return; 
        if (!result.destination) return;
        const { source, destination, draggableId } = result;
        if (source.droppableId !== destination.droppableId) {
            onStatusChange(draggableId, destination.droppableId);
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full items-start overflow-x-auto pb-8 scrollbar-hide">
                {COLUMNS.map(col => {
                    const colTasks = tasks.filter(t => t.status === col.id);
                    const isCollapsed = collapsedColumns[col.id];

                    return (
                        <div 
                            key={col.id} 
                            className={`flex-1 min-w-[280px] flex flex-col transition-all duration-200 ${isCollapsed ? 'flex-none !w-12 !min-w-[48px]' : ''} h-full`}
                        >
                            {/* Column Header */}
                            <div className={`flex items-center justify-between px-2 mb-2 group ${isCollapsed ? 'flex-col gap-4' : ''}`}>
                                <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
                                    <button 
                                        onClick={() => toggleCollapse(col.id)}
                                        className="text-[#37352f]/30 hover:bg-[#37352f]/5 rounded p-0.5 transition-colors"
                                    >
                                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                                    </button>
                                    {!isCollapsed && (
                                        <div className="flex items-center gap-2">
                                            <span className="px-1.5 py-0.5 rounded text-sm font-semibold text-[#37352f]" style={{ backgroundColor: col.color }}>
                                                {col.title}
                                            </span>
                                            <span className="text-sm text-[#37352f]/40 font-medium">{colTasks.length}</span>
                                        </div>
                                    )}
                                </div>
                                {!isCollapsed && (
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-[#37352f]/30 hover:bg-[#37352f]/5 rounded p-1">
                                            <MoreHorizontal size={14} />
                                        </button>
                                        {isAdmin && (
                                            <button className="text-[#37352f]/30 hover:bg-[#37352f]/5 rounded p-1">
                                                <Plus size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {!isCollapsed ? (
                                <Droppable droppableId={col.id} isDropDisabled={!isAdmin}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`flex-1 overflow-y-auto px-1 pb-4 pt-1 transition-all border-2 bg-slate-50/30 rounded-2xl shadow-sm scrollbar-hide mb-4 ${snapshot.isDraggingOver ? 'bg-blue-50/50 border-blue-400 border-[3px] scale-[1.01]' : ''}`}
                                            style={{ borderColor: col.borderColor }}
                                        >
                                            <div className="space-y-2 pt-1">
                                                {colTasks.map((task, index) => (
                                                    <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!isAdmin}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                style={{ ...provided.draggableProps.style }}
                                                                className="outline-none"
                                                            >
                                                                <TaskCard
                                                                    task={task}
                                                                    colorConfig={colorConfig}
                                                                    isDragging={snapshot.isDragging}
                                                                    onClick={() => onTaskClick(task)}
                                                                    onStatusChange={isAdmin ? onStatusChange : undefined}
                                                                    onDelete={isAdmin ? onDelete : undefined}
                                                                    userRole={userRole}
                                                                    onPrintContract={onPrintContract}
                                                                />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                                {isAdmin && (
                                                    <button 
                                                        onClick={() => onTaskClick({ id: '', status: col.id })}
                                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-bold text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm border border-dashed border-slate-300 transition-all mt-2"
                                                    >
                                                        <Plus size={14} />
                                                        <span>Thêm mới</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            ) : (
                                <div className="flex-1 flex flex-col items-center pt-4 overflow-hidden">
                                     <div className="w-px h-full bg-[#37352f]/5 absolute left-1/2"></div>
                                     <div className="rotate-90 whitespace-nowrap text-[#37352f]/30 font-bold text-[11px] tracking-widest uppercase mt-4">
                                        {col.title}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </DragDropContext>
    );
}

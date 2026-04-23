import React, { useState, useCallback } from 'react';
import { NegocioCRM, BlocoKanban, ColunaKanban } from '../../types';
import { KANBAN_CONFIG, COLUNA_TO_BLOCO } from '../../lib/kanbanConfig';
import { LeadCardCRM } from './LeadCardCRM';

interface KanbanBoardCRMProps {
    negocios: NegocioCRM[];
    onCardClick: (negocio: NegocioCRM, tab?: 'details' | 'whatsapp' | 'history' | 'followup') => void;
    onMoverCard: (negocioId: string, coluna: ColunaKanban, bloco: BlocoKanban) => void;
}

type TabId = BlocoKanban | 'todos';

interface DropTarget {
    coluna: ColunaKanban;
    bloco: BlocoKanban;
}

const TAB_LABELS: Record<BlocoKanban, string> = {
    captacao: 'Captação',
    qualificacao: 'Qualificação',
    conversao: 'Conversão',
    pos_venda: 'Pós-Venda',
    perda: 'Perdas',
};

export const KanbanBoardCRM: React.FC<KanbanBoardCRMProps> = ({
    negocios,
    onCardClick,
    onMoverCard,
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('todos');
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

    const getNegociosPorColuna = useCallback(
        (coluna: ColunaKanban) => negocios.filter(n => n.coluna === coluna),
        [negocios]
    );

    const handleDragStart = (e: React.DragEvent, negocio: NegocioCRM) => {
        e.dataTransfer.setData('negocioId', negocio.id);
        e.dataTransfer.effectAllowed = 'move';
        setDraggingId(negocio.id);
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        setDropTarget(null);
    };

    const handleDragOver = (e: React.DragEvent, coluna: ColunaKanban) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget({ coluna, bloco: COLUNA_TO_BLOCO[coluna] as BlocoKanban });
    };

    const handleDrop = (e: React.DragEvent, coluna: ColunaKanban, bloco: BlocoKanban) => {
        e.preventDefault();
        const negocioId = e.dataTransfer.getData('negocioId');
        if (negocioId) onMoverCard(negocioId, coluna, bloco);
        setDraggingId(null);
        setDropTarget(null);
    };

    const blocosFiltrados = activeTab === 'todos'
        ? KANBAN_CONFIG.filter(b => b.id !== 'perda')
        : KANBAN_CONFIG.filter(b => b.id === activeTab);

    const totalPorBloco = (blocoId: BlocoKanban) =>
        KANBAN_CONFIG.find(b => b.id === blocoId)?.colunas.reduce(
            (sum, col) => sum + getNegociosPorColuna(col.id).length, 0
        ) ?? 0;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">

            {/* ── Tab Bar ── */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1E1E1E] flex-shrink-0">
                {/* Todos os Blocos */}
                <button
                    onClick={() => setActiveTab('todos')}
                    className={[
                        'relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap',
                        activeTab === 'todos'
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                    ].join(' ')}
                >
                    Todos os Blocos
                    {activeTab === 'todos' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9a4c5f] rounded-t" />
                    )}
                </button>

                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

                {/* Individual block tabs */}
                {KANBAN_CONFIG.map(bloco => {
                    const count = totalPorBloco(bloco.id);
                    const isActive = activeTab === bloco.id;
                    return (
                        <button
                            key={bloco.id}
                            onClick={() => setActiveTab(bloco.id)}
                            className={[
                                'relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                                isActive
                                    ? 'text-gray-900 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                            ].join(' ')}
                        >
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: bloco.cor }}
                            />
                            {TAB_LABELS[bloco.id]}
                            {count > 0 && (
                                <span
                                    className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${bloco.cor}20`, color: bloco.cor }}
                                >
                                    {count}
                                </span>
                            )}
                            {isActive && (
                                <span
                                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                                    style={{ backgroundColor: bloco.cor }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Kanban Content ── */}
            <div className="flex-1 overflow-y-auto overflow-x-auto kanban-crm-scroll p-4">
                <div className="flex flex-col gap-6 min-w-max">
                    {blocosFiltrados.map(bloco => (
                        <div key={bloco.id} className="flex items-stretch gap-0">

                            {/* Vertical Block Label (only in "Todos" view) */}
                            {activeTab === 'todos' && (
                                <div
                                    className="flex items-center justify-center w-7 flex-shrink-0 mr-3"
                                    style={{ borderLeft: `2px solid ${bloco.cor}` }}
                                >
                                    <span
                                        className="text-[9px] font-black uppercase tracking-[0.25em] select-none"
                                        style={{
                                            color: bloco.cor,
                                            writingMode: 'vertical-rl',
                                            transform: 'rotate(180deg)',
                                        }}
                                    >
                                        {TAB_LABELS[bloco.id]}
                                    </span>
                                </div>
                            )}

                            {/* Columns */}
                            <div className="flex gap-3">
                                {bloco.colunas.map(coluna => {
                                    const cards = getNegociosPorColuna(coluna.id);
                                    const isDragTarget = dropTarget?.coluna === coluna.id;

                                    return (
                                        <div
                                            key={coluna.id}
                                            className="flex flex-col w-[210px] flex-shrink-0"
                                            onDragOver={e => handleDragOver(e, coluna.id)}
                                            onDragLeave={() => setDropTarget(null)}
                                            onDrop={e => handleDrop(e, coluna.id, bloco.id as BlocoKanban)}
                                        >
                                            {/* Column Header */}
                                            <div
                                                className={[
                                                    'flex items-center gap-2 px-2 py-2 mb-2 border-b transition-colors',
                                                    isDragTarget
                                                        ? 'bg-blue-50 dark:bg-blue-900/20'
                                                        : 'bg-transparent',
                                                ].join(' ')}
                                                style={{ borderBottomColor: `${bloco.cor}50` }}
                                            >
                                                {coluna.slaMinutos != null && (
                                                    <span
                                                        className="material-symbols-outlined text-[12px]"
                                                        style={{ color: bloco.cor }}
                                                    >
                                                        timer
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 flex-1 truncate uppercase tracking-wide">
                                                    {coluna.label}
                                                </span>
                                                <span
                                                    className="text-[11px] font-black min-w-[18px] text-center"
                                                    style={{ color: cards.length > 0 ? bloco.cor : '#9ca3af' }}
                                                >
                                                    {cards.length}
                                                </span>
                                            </div>

                                            {/* Cards */}
                                            <div
                                                className={[
                                                    'flex flex-col gap-2 min-h-[80px] rounded-lg transition-all duration-150 px-0.5',
                                                    isDragTarget
                                                        ? 'bg-blue-50/50 dark:bg-blue-900/10 ring-1 ring-blue-200 dark:ring-blue-800'
                                                        : '',
                                                ].join(' ')}
                                            >
                                                {cards.map(negocio => (
                                                    <LeadCardCRM
                                                        key={negocio.id}
                                                        negocio={negocio}
                                                        corBloco={bloco.cor}
                                                        onClick={(tab) => onCardClick(negocio, tab)}
                                                        onDragStart={handleDragStart}
                                                        onDragEnd={handleDragEnd}
                                                    />
                                                ))}

                                                {isDragTarget && draggingId && (
                                                    <div
                                                        className="border border-dashed rounded-lg p-3 text-center text-[10px] font-bold opacity-60 mt-1"
                                                        style={{ borderColor: bloco.cor, color: bloco.cor }}
                                                    >
                                                        Soltar aqui
                                                    </div>
                                                )}

                                                {cards.length === 0 && !isDragTarget && (
                                                    <div className="flex items-center justify-center py-5">
                                                        <div className="w-8 h-px bg-gray-200 dark:bg-gray-700" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        .kanban-crm-scroll::-webkit-scrollbar { height: 5px; width: 5px; }
        .kanban-crm-scroll::-webkit-scrollbar-track { background: transparent; }
        .kanban-crm-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .kanban-crm-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
        </div>
    );
};

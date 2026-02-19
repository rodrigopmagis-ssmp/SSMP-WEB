import React, { useState } from 'react';
import { Procedure, ProcedureCategory } from '../types';
import Button from './ui/Button';
import CategoryManager from './CategoryManager';

interface SidebarProps {
  onViewChange: (view: any) => void;
  procedures: Procedure[];
  categories: ProcedureCategory[];
  onUpdateCategories: () => void;
  onNewProcedure: () => void;
  selectedProcedureId?: string | null;
  onSelectProcedure?: (id: string) => void;
  onUpdateProcedure?: (procedure: Procedure) => void;
  onDeleteProcedure?: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onViewChange,
  procedures,
  categories,
  onUpdateCategories,
  onNewProcedure,
  selectedProcedureId,
  onSelectProcedure,
  onUpdateProcedure,
  onDeleteProcedure,
}) => {
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  // State for expanded categories (initially all expanded or all collapsed? Let's say expanded)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Initialize expanded state for all categories (default to collapsed)
  const isExpanded = (catId: string) => !!expandedCategories[catId];

  // Filter procedures based on showInactive toggle and search term
  const filteredProcedures = procedures
    .filter(p => {
      // Filter by active/inactive status
      if (showInactive) {
        return p.is_active === false; // Show ONLY inactive when checked
      } else {
        return p.is_active !== false; // Show only active when unchecked
      }
    })
    .filter(p => {
      // Filter by search term
      if (!searchTerm) return true;
      return p.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

  return (
    <>
      {/* Mobile Toggle Button (Floating) - Only visible on specific screens if needed, 
          but usually the Sidebar is part of a layout. For now, adding a toggle if hidden. */}
      <button
        className="lg:hidden fixed bottom-6 right-6 z-40 bg-primary text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        onClick={() => setIsMobileOpen(true)}
      >
        <span className="material-symbols-outlined">menu_open</span>
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          flex flex-col justify-between p-4 bg-white dark:bg-background-dark border-r border-[#f3e7ea] dark:border-[#3a2228]
          fixed inset-y-0 left-0 z-50 w-80 shadow-2xl lg:shadow-none transform transition-transform duration-300 ease-in-out
          lg:relative lg:transform-none lg:flex lg:z-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
`}
      >
        {/* Close Button (Mobile Only) */}
        <div className="lg:hidden flex justify-end mb-2">
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col px-2">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-[#1b0d11] dark:text-white text-lg font-bold">Procedimentos</h1>
                <p className="text-[#9a4c5f] text-sm font-normal">Gerenciar protocolos</p>
              </div>
              <button
                onClick={() => setIsCategoryManagerOpen(true)}
                className="text-[#9a4c5f] hover:text-primary dark:text-gray-400 dark:hover:text-white p-1 rounded"
                title="Gerenciar Categorias"
              >
                <span className="material-symbols-outlined">category</span>
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="px-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a4c5f] text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar procedimento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-[#e7cfd5] dark:border-[#4d3239] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-[#2d181e] text-[#1b0d11] dark:text-white placeholder:text-[#9a4c5f]/50"
              />
            </div>
          </div>

          {/* Toggle "Mostrar Inativos" */}
          <div className="px-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-[#9a4c5f] dark:text-gray-400 group-hover:text-primary transition-colors">
                Mostrar Inativos
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-1 pb-4">
            {filteredProcedures.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-[#9a4c5f]">
                {searchTerm ? 'Nenhum procedimento encontrado' : (showInactive ? 'Nenhum procedimento inativo' : 'Nenhum procedimento')}
              </div>
            ) : (
              <>
                {/* Group by Categories */}
                {categories.map(cat => {
                  const catProcedures = filteredProcedures.filter(p => p.category_id === cat.id);
                  if (catProcedures.length === 0) return null;

                  return (
                    <div key={cat.id} className="mb-2">
                      <div
                        className="flex items-center gap-2 px-2 py-1 cursor-pointer text-[#9a4c5f] dark:text-gray-400 hover:text-primary transition-colors"
                        onClick={() => toggleCategory(cat.id)}
                      >
                        <span className={`material-symbols-outlined text-sm transition-transform ${isExpanded(cat.id) ? 'rotate-90' : ''} `}>
                          chevron_right
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider">{cat.name}</span>
                      </div>

                      {isExpanded(cat.id) && (
                        <div className="ml-2 flex flex-col gap-1">
                          {catProcedures.map(proc => renderProcedureItem(proc, selectedProcedureId, onSelectProcedure, onViewChange, setIsMobileOpen))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Uncategorized */}
                {(() => {
                  const uncategorizedProcedures = filteredProcedures.filter(p => !p.category_id);
                  if (uncategorizedProcedures.length === 0) return null;

                  return (
                    <div className="mb-2">
                      <div
                        className="flex items-center gap-2 px-2 py-1 cursor-pointer text-[#9a4c5f] dark:text-gray-400 hover:text-primary transition-colors"
                        onClick={() => toggleCategory('uncategorized')}
                      >
                        <span className={`material-symbols-outlined text-sm transition-transform ${isExpanded('uncategorized') ? 'rotate-90' : ''} `}>
                          chevron_right
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider">Sem Categoria</span>
                      </div>

                      {isExpanded('uncategorized') && (
                        <div className="ml-2 flex flex-col gap-1">
                          {uncategorizedProcedures.map(proc => renderProcedureItem(proc, selectedProcedureId, onSelectProcedure, onViewChange, setIsMobileOpen))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        <CategoryManager
          isOpen={isCategoryManagerOpen}
          onClose={() => setIsCategoryManagerOpen(false)}
          categories={categories}
          onUpdateCategories={onUpdateCategories}
        />

        <Button
          variant="primary"
          className="mt-4 w-full flex-shrink-0"
          onClick={() => {
            onNewProcedure();
            setIsMobileOpen(false);
          }}
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span className="truncate">Novo Procedimento</span>
        </Button>
      </aside>
    </>
  );
};

// Helper function to render a single procedure item
const renderProcedureItem = (
  proc: Procedure,
  selectedProcedureId: string | undefined,
  onSelectProcedure: ((id: string) => void) | undefined,
  onViewChange: (view: any) => void,
  setIsMobileOpen: (isOpen: boolean) => void
) => {
  const isSelected = selectedProcedureId === proc.id;
  const isInactive = proc.is_active === false;
  const stageCount = proc.scripts?.length || 0;

  return (
    <div
      key={proc.id}
      onClick={() => {
        if (onSelectProcedure) {
          onSelectProcedure(proc.id);
        }
        onViewChange('procedures');
        setIsMobileOpen(false);
      }}
      className={`flex items-center justify-between gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${isSelected
        ? 'bg-primary/10 border border-primary/20'
        : 'hover:bg-[#fcf8f9] dark:hover:bg-white/5'
        } ${isInactive ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined ${isSelected ? 'text-primary' : 'text-[#9a4c5f]'}`}>
          {proc.icon}
        </span>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className={`${isSelected ? 'text-primary font-bold' : 'text-[#1b0d11] dark:text-white font-medium'} text-sm leading-normal`}>
              {proc.name}
            </p>
            {stageCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f3e7ea] dark:bg-[#3d242a] text-[#9a4c5f] dark:text-gray-400 font-bold">
                {stageCount}
              </span>
            )}
          </div>
          {isInactive && (
            <span className="text-[10px] text-orange-600 dark:text-orange-500 font-bold uppercase leading-none">
              Inativo
            </span>
          )}
        </div>
      </div>
      {isSelected && <span className="material-symbols-outlined text-primary text-sm">chevron_right</span>}
    </div>
  );
};

export default Sidebar;

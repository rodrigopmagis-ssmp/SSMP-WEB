import React, { useState } from 'react';
import { Procedure } from '../types';
import Button from './ui/Button';

interface SidebarProps {
  setView: (view: any) => void;
  procedures: Procedure[];
  onNewProcedure: () => void;
  selectedProcedureId?: string;
  onSelectProcedure?: (procedureId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  setView,
  procedures,
  onNewProcedure,
  selectedProcedureId,
  onSelectProcedure
}) => {
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    <aside className="w-80 flex-shrink-0 border-r border-[#f3e7ea] dark:border-[#3a2228] bg-white dark:bg-background-dark p-4 flex flex-col justify-between hidden lg:flex">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col px-2">
          <h1 className="text-[#1b0d11] dark:text-white text-lg font-bold">Procedimentos</h1>
          <p className="text-[#9a4c5f] text-sm font-normal">Gerenciar protocolos</p>
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

        <div className="flex flex-col gap-1">
          {filteredProcedures.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[#9a4c5f]">
              {searchTerm ? 'Nenhum procedimento encontrado' : (showInactive ? 'Nenhum procedimento inativo' : 'Nenhum procedimento')}
            </div>
          ) : (
            filteredProcedures.map((proc) => {
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
                    setView('procedures');
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
            })
          )}
        </div>
      </div>

      <Button
        variant="primary"
        className="mt-auto w-full"
        onClick={onNewProcedure}
      >
        <span className="material-symbols-outlined text-lg">add</span>
        <span className="truncate">Novo Procedimento</span>
      </Button>
    </aside>
  );
};

export default Sidebar;

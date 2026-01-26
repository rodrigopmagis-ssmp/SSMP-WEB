import React from 'react';
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
  return (
    <aside className="w-80 flex-shrink-0 border-r border-[#f3e7ea] dark:border-[#3a2228] bg-white dark:bg-background-dark p-4 flex flex-col justify-between hidden lg:flex">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col px-2">
          <h1 className="text-[#1b0d11] dark:text-white text-lg font-bold">Procedimentos</h1>
          <p className="text-[#9a4c5f] text-sm font-normal">Gerenciar protocolos</p>
        </div>
        <div className="flex flex-col gap-1">
          {procedures.map((proc) => {
            const isSelected = selectedProcedureId === proc.id;
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
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${isSelected ? 'text-primary' : 'text-[#9a4c5f]'}`}>
                    {proc.icon}
                  </span>
                  <p className={`${isSelected ? 'text-primary font-bold' : 'text-[#1b0d11] dark:text-white font-medium'} text-sm leading-normal`}>
                    {proc.name}
                  </p>
                </div>
                {isSelected && <span className="material-symbols-outlined text-primary text-sm">chevron_right</span>}
              </div>
            );
          })}
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

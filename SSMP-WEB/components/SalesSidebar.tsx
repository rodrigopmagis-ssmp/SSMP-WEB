import React, { useState } from 'react';
import { FiltrosNegocio, Campaign } from '../types';

interface SalesSidebarProps {
  onViewChange: (view: 'kanban' | 'list') => void;
  currentView: 'kanban' | 'list';
  filters: FiltrosNegocio;
  onFiltersChange: (filters: FiltrosNegocio) => void;
  onNewDeal: () => void;
  // Campaign Props
  campaigns?: Campaign[];
  selectedCampaign?: Campaign | null;
  onSelectCampaign?: (campaign: Campaign) => void;
  onOpenSettings?: () => void;
  showSettings?: boolean;
}

export function SalesSidebar({
  onViewChange,
  currentView,
  filters,
  onFiltersChange,
  onNewDeal,
  campaigns = [],
  selectedCampaign,
  onSelectCampaign,
  onOpenSettings,
  showSettings = false
}: SalesSidebarProps) {
  const [localFilters, setLocalFilters] = useState<FiltrosNegocio>(filters);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleFilterChange = (key: keyof FiltrosNegocio, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  return (
    <aside
      className={`sales-sidebar flex flex-col h-full bg-white dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-gray-800 shrink-0 overflow-y-auto custom-scrollbar transition-all duration-300 relative ${isCollapsed ? 'w-[70px]' : 'w-[220px]'}`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-white dark:bg-[#2d181e] border border-gray-200 dark:border-gray-700 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10 text-gray-500 dark:text-gray-400"
      >
        <span className="material-symbols-outlined text-sm">
          {isCollapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

      {/* Header Pipeline Simplified */}
      <div className={`p-4 border-b border-gray-100 dark:border-gray-800 ${isCollapsed ? 'px-2' : ''}`}>
        <div className={`mb-4 ${isCollapsed ? 'hidden' : 'block'}`}>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">Filtros</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Refine sua busca</p>
        </div>
      </div>

      <div className="sidebar-content flex-1 p-3 space-y-6">
        {/* Visualização e Filtros Rápidos foram movidos para o Header Principal */}


        {/* Filtros Avançados - Hiding when collapsed cause it requires inputs */}
        <div className={`menu-section ${isCollapsed ? 'hidden' : 'block'}`}>
          <h3 className="section-title">FILTROS AVANÇADOS</h3>

          {/* Vendedor */}
          <div className="filter-group">
            <label className="filter-label">
              <span className="material-symbols-outlined">person</span>
              Vendedor
            </label>
            <select
              className="filter-select"
              value={localFilters.assignedTo || ''}
              onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
              aria-label="Filtrar por vendedor"
            >
              <option value="">Todos</option>
              <option value="user1">Vendedor 1</option>
              <option value="user2">Vendedor 2</option>
            </select>
          </div>

          {/* Origem */}
          <div className="filter-group">
            <label className="filter-label">
              <span className="material-symbols-outlined">place</span>
              Origem
            </label>
            <select className="filter-select">
              <option value="">Todas</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="website">Website</option>
              <option value="indicacao">Indicação</option>
            </select>
          </div>

          {/* Período */}
          <div className="filter-group">
            <label className="filter-label">
              <span className="material-symbols-outlined">calendar_month</span>
              Período
            </label>
            <div className="date-range">
              <input type="date" className="filter-input" placeholder="De" />
              <input type="date" className="filter-input" placeholder="Até" />
            </div>
          </div>

          {/* Botão Aplicar Filtros */}
          <button className="apply-filters-btn">
            <span className="material-symbols-outlined">filter_alt</span>
            Aplicar Filtros
          </button>
        </div>
      </div>

      <style jsx>{`
        /* Minimal custom styles, mostly removed in favor of Tailwind classes */
        .section-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: #6B7280;
          letter-spacing: 0.05em;
          margin: 0 0 0.75rem 0.5rem;
          text-transform: uppercase;
        }

        /* Filter Controls */
        .filter-group {
          margin-bottom: 1rem;
        }

        .filter-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6B7280;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .filter-label .material-symbols-outlined {
          font-size: 1rem;
          color: #6B7280;
        }

        .filter-select,
        .filter-input {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #E5E7EB;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: #1b0d11;
          background: white;
          transition: all 0.2s;
          outline: none;
        }

        .filter-select:focus,
        .filter-input:focus {
          border-color: #9CA3AF;
          box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.1);
        }

        .filter-select:hover,
        .filter-input:hover {
          border-color: #9CA3AF;
        }

        .date-range {
          display: flex;
          gap: 0.5rem;
        }

        .date-range .filter-input {
          flex: 1;
        }

        .apply-filters-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #9CA3AF;
          border: none;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 1rem;
        }

        .apply-filters-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(156, 163, 175, 0.3);
        }

        .apply-filters-btn .material-symbols-outlined {
          font-size: 1.25rem;
        }

        /* Scrollbar Personalizada */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #E2E8F0;
          border-radius: 20px;
        }

        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #CBD5E1;
        }

        /* Dark mode overrides would be handled by global CSS usually, but here is a simple fallback */
        @media (prefers-color-scheme: dark) {
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #374151;
          }
           .custom-scrollbar:hover::-webkit-scrollbar-thumb {
            background-color: #4B5563;
          }
        }
      `}</style>
    </aside>
  );
}

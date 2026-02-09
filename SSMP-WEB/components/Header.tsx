
import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';

import TagManager from './TagManager';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: any) => void;
  onNewRegistration: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, onNewRegistration }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();

        // Self-healing removed for production security

        setUserProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <header className="flex items-center justify-between border-b border-solid border-[#f3e7ea] dark:border-[#3d242a] bg-white dark:bg-[#2d181e] px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4 text-primary cursor-pointer" onClick={() => onViewChange('dashboard')}>
          <div className="size-8 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">360</span>
          </div>
          <h2 className="text-[#1b0d11] dark:text-[#fcf8f9] text-xl font-extrabold leading-tight tracking-[-0.015em]">
            Jornada 360 <span className="font-light text-primary">Acompanhamento</span>
          </h2>
        </div>

        <div className="flex flex-1 justify-end gap-8 items-center">
          <nav className="flex items-center gap-9">
            <button
              className={`${currentView === 'dashboard' ? 'text-primary border-b-2 border-primary' : 'text-[#1b0d11] dark:text-[#fcf8f9] font-medium'} text-sm leading-normal pb-1 transition-all`}
              onClick={() => onViewChange('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`${currentView === 'patients' || currentView === 'details' ? 'text-primary border-b-2 border-primary' : 'text-[#1b0d11] dark:text-[#fcf8f9] font-medium'} text-sm leading-normal pb-1 transition-all`}
              onClick={() => onViewChange('patients')}
            >
              Pacientes
            </button>
            <button
              className={`${currentView === 'procedures' ? 'text-primary border-b-2 border-primary' : 'text-[#1b0d11] dark:text-[#fcf8f9] font-medium'} text-sm leading-normal pb-1 transition-all`}
              onClick={() => onViewChange('procedures')}
            >
              Protocolos
            </button>
            <button
              className={`${currentView === 'crm_kanban' ? 'text-primary border-b-2 border-primary' : 'text-[#1b0d11] dark:text-[#fcf8f9] font-medium'} text-sm leading-normal pb-1 transition-all`}
              onClick={() => onViewChange('crm_kanban')}
            >
              CRM / Leads
            </button>
            <button
              className={`${currentView === 'sales_pipeline' ? 'text-primary border-b-2 border-primary' : 'text-[#1b0d11] dark:text-[#fcf8f9] font-medium'} text-sm leading-normal pb-1 transition-all`}
              onClick={() => onViewChange('sales_pipeline')}
            >
              Negócios
            </button>
            <button
              className={`${currentView === 'ombudsman' ? 'text-primary border-b-2 border-primary' : 'text-[#1b0d11] dark:text-[#fcf8f9] font-medium'} text-sm leading-normal pb-1 transition-all`}
              onClick={() => onViewChange('ombudsman')}
            >
              Ouvidoria
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <Button
              variant="primary"
              onClick={onNewRegistration}
              className="hidden md:flex shadow-md"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Novo Paciente
            </Button>
            <Button variant="secondary" className="rounded-full !p-2">
              <span className="material-symbols-outlined">notifications</span>
            </Button>
            <div className="relative">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/20 cursor-pointer hover:border-primary transition-colors flex items-center justify-center text-primary font-bold bg-primary/10"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                {userProfile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>

              {isProfileOpen && (
                <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 mb-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{userProfile?.full_name || 'Usuário'}</p>
                    <p className="text-xs text-gray-500 capitalize">{userProfile?.role || 'Visitante'}</p>
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-[10px] text-gray-400 font-mono break-all">
                      ID: {userProfile?.id || '...'}<br />
                      Email: {userProfile?.email || '...'}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onViewChange('settings');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">settings</span>
                    Configurações da Clínica
                  </button>

                  <button
                    onClick={() => {
                      setIsTagManagerOpen(true);
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">label</span>
                    Gerenciar Etiquetas
                  </button>

                  {(userProfile?.role === 'master' || userProfile?.role === 'admin') && (
                    <button
                      onClick={() => {
                        onViewChange('users');
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">group</span>
                      Gerenciar Usuários
                    </button>
                  )}

                  <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors font-bold"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Sair do Sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <TagManager isOpen={isTagManagerOpen} onClose={() => setIsTagManagerOpen(false)} />
    </>
  );
};

export default Header;

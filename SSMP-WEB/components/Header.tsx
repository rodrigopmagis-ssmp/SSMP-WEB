
import React, { useState } from 'react';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  currentView: string;
  setView: (view: any) => void;
  onNewRegistration: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView, onNewRegistration }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleNavClick = (view: any) => {
    setView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="flex items-center justify-between border-b border-solid border-[#f3e7ea] dark:border-[#3d242a] bg-white dark:bg-[#2d181e] px-4 md:px-10 py-3 sticky top-0 z-50">
      <div className="flex items-center gap-2 md:gap-4 text-primary cursor-pointer" onClick={() => handleNavClick('dashboard')}>
        <div className="size-8 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">medical_services</span>
        </div>
        <h2 className="text-[#1b0d11] dark:text-[#fcf8f9] text-lg md:text-xl font-extrabold leading-tight tracking-[-0.015em]">
          <span className="hidden xs:inline">AestheticClinic</span>
          <span className="font-light text-primary hidden md:inline"> Acompanhamento</span>
        </h2>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
        <nav className="flex items-center gap-9">
          <button
            className={`${currentView === 'dashboard' ? 'text-primary border-b-2 border-primary' : 'text-[#1b0d11] dark:text-[#fcf8f9] font-medium'} text-sm leading-normal pb-1 transition-all`}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`${currentView === 'patients' || currentView === 'details' ? 'text-primary border-b-2 border-primary' : 'text-[#1b0d11] dark:text-[#fcf8f9] font-medium'} text-sm leading-normal pb-1 transition-all`}
            onClick={() => setView('patients')}
          >
            Pacientes
          </button>
          <button
            className={`${currentView === 'procedures' ? 'text-primary border-b-2 border-primary' : 'text-[#1b0d11] dark:text-[#fcf8f9] font-medium'} text-sm leading-normal pb-1 transition-all`}
            onClick={() => setView('procedures')}
          >
            Protocolos
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
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/20 cursor-pointer hover:border-primary transition-colors"
              style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100&h=100")' }}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            ></div>

            {isProfileOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 mb-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Dra. Ana Silva</p>
                  <p className="text-xs text-gray-500">ana.silva@clinic.com</p>
                </div>

                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors opacity-50 cursor-not-allowed"
                  disabled
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  Minha Conta
                </button>

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

      {/* Mobile Actions */}
      <div className="flex md:hidden items-center gap-3">
        <Button variant="secondary" className="rounded-full !p-2">
          <span className="material-symbols-outlined">notifications</span>
        </Button>
        <button
          className="p-2 text-gray-600 dark:text-gray-200"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="material-symbols-outlined text-2xl">
            {isMobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#2d181e] border-b border-gray-100 dark:border-[#3d242a] shadow-lg md:hidden flex flex-col p-4 gap-4 animate-in slide-in-from-top-5 duration-200">
           <nav className="flex flex-col gap-2">
            <button
              className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 ${currentView === 'dashboard' ? 'bg-primary/10 text-primary font-bold' : 'text-gray-700 dark:text-gray-200 font-medium'}`}
              onClick={() => handleNavClick('dashboard')}
            >
              <span className="material-symbols-outlined">dashboard</span>
              Dashboard
            </button>
            <button
              className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 ${currentView === 'patients' || currentView === 'details' ? 'bg-primary/10 text-primary font-bold' : 'text-gray-700 dark:text-gray-200 font-medium'}`}
              onClick={() => handleNavClick('patients')}
            >
              <span className="material-symbols-outlined">groups</span>
              Pacientes
            </button>
            <button
              className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 ${currentView === 'procedures' ? 'bg-primary/10 text-primary font-bold' : 'text-gray-700 dark:text-gray-200 font-medium'}`}
              onClick={() => handleNavClick('procedures')}
            >
              <span className="material-symbols-outlined">fact_check</span>
              Protocolos
            </button>
          </nav>
          
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
          
          <Button
            variant="primary"
            onClick={() => {
              onNewRegistration();
              setIsMobileMenuOpen(false);
            }}
            className="w-full justify-center py-3"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Novo Paciente
          </Button>
          
           <div className="flex items-center gap-3 mt-2 px-2 py-2 rounded-lg bg-gray-50 dark:bg-black/20">
             <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-gray-200"
              style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100&h=100")' }}
            ></div>
            <div className="flex-1 min-w-0">
               <p className="text-sm font-bold text-gray-900 dark:text-white truncate">Dra. Ana Silva</p>
               <p className="text-xs text-gray-500 truncate">ana.silva@clinic.com</p>
            </div>
            <button
               onClick={handleLogout}
               className="p-2 text-red-500 hover:bg-red-50 rounded-full"
            >
               <span className="material-symbols-outlined">logout</span>
            </button>
           </div>
        </div>
      )}
    </header>
  );
};

export default Header;

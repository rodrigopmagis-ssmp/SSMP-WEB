
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Session } from '@supabase/supabase-js';
import { Patient, Procedure, PatientTreatment, Lead, ProcedureCategory } from './types';
import { supabaseService } from './src/services/supabaseService';
import { fetchPatients, createPatient, updatePatient } from './lib/patients';
import Dashboard from './components/Dashboard';
import PatientsList from './components/PatientsList';
import PatientDetails from './components/PatientDetails';
import ProceduresAdmin from './components/ProceduresAdmin';
import ProcedureRegistration from './components/ProcedureRegistration';
import PatientRegistration from './components/PatientRegistration';
import ProtocolRegistration from './components/ProtocolRegistration';
import PatientProfile from './components/PatientProfile';
import LeadQuiz from './components/LeadQuiz';
import CRMKanban from './components/CRMKanban';
import CRMContainer from './components/CRMContainer';
import LeadDetails from './components/LeadDetails';
import { SalesPipeline } from './components/SalesPipeline';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ClinicSettings from './components/ClinicSettings';
import UserManagement from './components/UserManagement';
import OmbudsmanDashboard from './components/ombudsman/OmbudsmanDashboard';
import { TasksDashboard } from './components/tasks/TasksDashboard';
import { BudgetsPage } from './src/pages/Budgets';
import Agenda from './src/pages/Agenda';
import { ThemeProvider } from './lib/theme';
import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Data State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [categories, setCategories] = useState<ProcedureCategory[]>([]);
  const [activeTreatments, setActiveTreatments] = useState<PatientTreatment[]>([]);

  // View State
  const [currentView, setCurrentView] = useState<'dashboard' | 'patients' | 'financial' | 'reports' | 'settings' | 'users' | 'quiz' | 'crm_kanban' | 'lead_details' | 'sales_pipeline' | 'ombudsman' | 'tasks' | 'budgets' | 'agenda' | 'profile' | 'details' | 'register' | 'procedures' | 'procedure_register' | 'protocol_register'>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | undefined>(undefined);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [ombudsmanAction, setOmbudsmanAction] = useState<{ type: 'create', patientId: string } | null>(null);

  const [buildingAccess, setBuildingAccess] = useState<'checking' | 'allowed' | 'pending' | 'rejected'>('checking');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);



  useEffect(() => {
    const initAuth = async () => {
      // Create a timeout promise to prevent infinite loading
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000));

      try {
        // Race between auth check and timeout
        await Promise.race([
          supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
          }),
          timeout
        ]);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Check URL URLSearchParams for view=quiz OR pathname /quiz
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'quiz' || window.location.pathname === '/quiz') {
      setCurrentView('quiz');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('DEBUG: Auth Event:', event);
      setSession(session);
      if (event === 'SIGNED_OUT') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') !== 'quiz' && window.location.pathname !== '/quiz') {
          setBuildingAccess('checking'); // Reset state on logout
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check Profile Status on Session Change
  useEffect(() => {
    const checkProfile = async () => {
      if (!session?.user) return;

      console.log('DEBUG: Checking profile for user:', session.user.id);

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('status, role')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('DEBUG: Error fetching profile:', error);
          // If error (e.g. no connection), defaulting to pending to be safe
          setBuildingAccess('pending');
          return;
        }

        if (profile) {
          console.log('DEBUG: Profile found:', profile);
          if (profile.status === 'pending') {
            setBuildingAccess('pending');
          } else if (profile.status === 'rejected') {
            setBuildingAccess('rejected');
          } else {
            console.log('DEBUG: Access Allowed');
            setBuildingAccess('allowed');
          }
        } else {
          console.log('DEBUG: No profile found, falling back to pending');
          setBuildingAccess('pending');
        }
      } catch (err) {
        console.error('DEBUG: Exception checking profile:', err);
        setBuildingAccess('pending');
      }
    };

    if (session) {
      checkProfile();
    }
  }, [session]);



  // Load Initial Data (Patients & Procedures)
  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, currentView]);

  const loadData = async () => {
    try {
      // 1. Load Patients
      const loadedPatients = await fetchPatients();
      setPatients(loadedPatients);

      // 2. Load Procedures (and seed if empty)
      const loadedProcedures = await supabaseService.getProcedures();

      if (loadedProcedures.length === 0) {
        // Auto-seed if empty
        console.log('Seeding initial procedures...');
        await supabaseService.seedProcedures();
        const reloadedProcedures = await supabaseService.getProcedures();
        setProcedures(reloadedProcedures);
      } else {
        setProcedures(loadedProcedures);
      }

      // 2.1 Load Categories
      const loadedCategories = await supabaseService.getProcedureCategories();
      setCategories(loadedCategories);

      // 3. Load Active Treatments
      const loadedTreatments = await supabaseService.getAllActiveTreatments();
      setActiveTreatments(loadedTreatments);

    } catch (error) {
      console.error('Error loading data:', error);
    }
  };





  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>;
  }

  if (!session && currentView !== 'quiz') {
    // Determine if we should be in quiz view based on URL even if not yet set in state (avoid flicker)
    if (window.location.pathname === '/quiz') {
      return (
        <ThemeProvider>
          <LeadQuiz />
        </ThemeProvider>
      );
    }
    return <Auth />;
  }



  // Blocking UI for Pending/Rejected Users
  if ((buildingAccess === 'pending' || buildingAccess === 'rejected') && currentView !== 'quiz') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 text-center p-8">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${buildingAccess === 'pending' ? 'bg-orange-100 text-orange-500' : 'bg-red-100 text-red-500'}`}>
            <span className="material-symbols-outlined text-3xl">
              {buildingAccess === 'pending' ? 'hourglass_empty' : 'block'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {buildingAccess === 'pending' ? 'Aprovação Pendente' : 'Acesso Negado'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {buildingAccess === 'pending'
              ? 'Seu cadastro foi realizado com sucesso e está aguardando aprovação de um administrador. Por favor, aguarde.'
              : 'Seu acesso ao sistema foi suspenso ou recusado pelo administrador.'}
          </p>



          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">logout</span>
            Sair Agora
          </button>
        </div>
      </div>
    );
  }

  // Wait for profile check before showing dashboard (prevents flash of content)
  if (buildingAccess === 'checking' && currentView !== 'quiz') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><span className="material-symbols-outlined animate-spin text-primary text-4xl">verified_user</span></div>;
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  const navigateToProfile = (id: string) => {
    setSelectedPatientId(id);
    setCurrentView('profile');
  };

  const navigateToDetails = (id: string, treatmentId?: string) => {
    setSelectedPatientId(id);
    setSelectedTreatmentId(treatmentId);
    setCurrentView('details');
  };

  const handleNavigateView = (view: any, action?: any) => {
    setCurrentView(view);
    if (view === 'ombudsman' && action) {
      setOmbudsmanAction(action);
    } else {
      setOmbudsmanAction(null);
    }
  };

  const handleSavePatient = async (patient: Patient) => {
    try {
      if (editingPatient) {
        // Update existing patient
        const updated = await updatePatient(patient.id, patient);
        setPatients(patients.map(p => p.id === updated.id ? updated : p));
        setEditingPatient(null);
        setSelectedPatientId(updated.id);
      } else {
        // Create new patient
        const { id, ...patientData } = patient;
        const newPatient = await createPatient(patientData);
        setPatients([newPatient, ...patients]);
        setSelectedPatientId(newPatient.id);
      }
      setCurrentView('profile'); // Go to profile after save
    } catch (error: any) {
      console.error('Error saving patient:', error);
      alert(`Erro ao salvar paciente: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleSaveProtocol = async (updatedPatient: Patient, newTreatmentId?: string) => {
    try {
      setPatients(patients.map(p => p.id === updatedPatient.id ? updatedPatient : p));
      setEditingPatient(null);
      setSelectedPatientId(updatedPatient.id);
      setSelectedTreatmentId(newTreatmentId); // Set the newly created treatment ID
      setCurrentView('details'); // Go to timeline after creating protocol
    } catch (error) {
      console.error('Error saving protocol:', error);
      alert('Erro ao salvar protocolo.');
    }
  };

  const handleEditPatient = () => {
    setEditingPatient(selectedPatient);
    setCurrentView('register');
  };

  const handleAddProcedure = async (newProcedure: Procedure) => {
    try {
      // Persist to Supabase
      const savedProcedure = await supabaseService.createProcedure(newProcedure);
      setProcedures([...procedures, savedProcedure]);
      setCurrentView('procedures');
    } catch (error: any) {
      console.error('Error saving procedure:', error);
      // Show specific error message if available, otherwise generic
      alert(error.message || 'Erro ao salvar procedimento.');
    }
  };

  const navigateToLead = async (leadId: string) => {
    // Optionally fetch specific lead details if not fully loaded, 
    // but for now relying on getting it fresh or passed.
    // Ideally we fetch to ensure latest data including AI analysis updates.
    try {
      const lead = await supabaseService.getLeadById(leadId);
      setSelectedLead(lead);
      setCurrentView('lead_details');
    } catch (e) {
      console.error("Error fetching lead", e);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard
          patients={patients}
          procedures={procedures}
          activeTreatments={activeTreatments}
          onPatientSelect={navigateToDetails}
          onNewRegistration={() => setCurrentView('register')}
        />;
      case 'patients':
        return <PatientsList patients={patients} onPatientSelect={navigateToProfile} onNewRegistration={() => setCurrentView('register')} />;
      case 'profile':
        return <PatientProfile
          patient={selectedPatient}
          onBack={() => setCurrentView('patients')}
          onEdit={handleEditPatient}
          onOpenProtocol={(treatmentId) => {
            setSelectedTreatmentId(treatmentId);
            setCurrentView('details');
          }}
          onNewProtocol={() => {
            setEditingPatient(selectedPatient);
            setCurrentView('protocol_register');
          }}
        />;
      case 'details':
        return <PatientDetails
          patient={selectedPatient}
          procedures={procedures}
          selectedTreatmentId={selectedTreatmentId}
          onBack={() => {
            setSelectedTreatmentId(undefined); // Clear selection when going back
            setCurrentView('profile');
          }}
          onEdit={handleEditPatient}
          onNewProtocol={() => {
            setEditingPatient(selectedPatient);
            setCurrentView('protocol_register');
          }}
          onUpdate={loadData}
          onViewChange={handleNavigateView}
        />;
      case 'procedures':
        return (
          <ProceduresAdmin
            selectedProcedureId={selectedProcedureId}
            onSelectProcedure={setSelectedProcedureId}
            procedures={procedures}
            categories={categories}
            onUpdateProcedure={async (updated) => {
              console.log('App.tsx: onUpdateProcedure called', updated);
              try {
                // Update in Supabase
                // Note: supabaseService.updateProcedure needs to be implemented/exported
                const saved = await supabaseService.updateProcedure(updated);
                setProcedures(procedures.map(p => p.id === saved.id ? saved : p));
              } catch (error) {
                console.error('Error updating procedure:', error);
                alert('Erro ao atualizar procedimento no banco de dados.');
              }
            }}
            onDeleteProcedure={(id) => {
              const updatedProcedures = procedures.filter(p => p.id !== id);
              setProcedures(updatedProcedures);

              // If deleted procedure was selected, select first remaining
              if (selectedProcedureId === id && updatedProcedures.length > 0) {
                setSelectedProcedureId(updatedProcedures[0].id);
              } else if (updatedProcedures.length === 0) {
                setSelectedProcedureId(null);
              }
            }}
          />
        );
      case 'procedure_register':
        return <ProcedureRegistration onSave={handleAddProcedure} onCancel={() => setCurrentView('procedures')} />;
      case 'protocol_register':
        return editingPatient ? (
          <ProtocolRegistration
            patient={editingPatient}
            onSave={handleSaveProtocol}
            onCancel={() => setCurrentView('profile')}
          />
        ) : null;
      case 'register':
        return <PatientRegistration
          onSave={handleSavePatient}
          onCancel={() => {
            setEditingPatient(null);
            setCurrentView(selectedPatientId ? 'profile' : 'dashboard');
          }}
          initialData={editingPatient || undefined}
        />;
      case 'settings':
        return <ClinicSettings onBack={() => setCurrentView('dashboard')} />;
      case 'users':
        return <UserManagement onBack={() => setCurrentView('dashboard')} />;
      case 'quiz':
        return <LeadQuiz />;
      case 'crm_kanban':
        return <CRMContainer onNavigateToLead={navigateToLead} />;
      case 'lead_details':
        return selectedLead ? (
          <LeadDetails
            lead={selectedLead}
            onBack={() => setCurrentView('crm_kanban')}
            onReanalyze={async () => {
              // Placeholder for re-analyze
              console.log('Reanálise solicitada para:', selectedLead.id);
              // await supabaseService.reanalyzeLead(selectedLead.id);
              alert("Reanálise solicitada (Simulação)");
            }}
          />
        ) : <CRMKanban onSelectLead={navigateToLead} />;
      case 'sales_pipeline':
        return <SalesPipeline />;
      case 'ombudsman':
        return <OmbudsmanDashboard
          patients={patients}
          initialAction={ombudsmanAction}
          onClearAction={() => setOmbudsmanAction(null)}
        />;
      case 'tasks':
        return <TasksDashboard />;
      case 'budgets':
        return <BudgetsPage />;
      case 'agenda':
        return <Agenda patients={patients} procedures={procedures} />;
      // return <UserManagement onBack={() => setCurrentView('dashboard')} />;
      default:
        return <Dashboard patients={patients} procedures={procedures} onPatientSelect={navigateToProfile} onNewRegistration={() => { setEditingPatient(null); setCurrentView('register'); }} />;
    }
  };

  // Special render for Quiz (Full Screen, no Sidebar/Header)
  if (currentView === 'quiz') {
    return (
      <ThemeProvider>
        <Toaster position="top-right" />
        {renderView()}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Toaster position="top-right" />
      <div className="flex flex-col min-h-screen">
        <Header currentView={currentView} onViewChange={setCurrentView} onNewRegistration={() => { setEditingPatient(null); setCurrentView('register'); }} />
        <div className="flex flex-1 overflow-hidden">
          {currentView === 'procedures' && (
            <Sidebar
              onViewChange={setCurrentView}
              procedures={procedures}
              categories={categories}
              onUpdateCategories={async () => {
                const cats = await supabaseService.getProcedureCategories();
                setCategories(cats);
              }}
              onNewProcedure={() => setCurrentView('procedure_register')}
              selectedProcedureId={selectedProcedureId}
              onSelectProcedure={(id) => setSelectedProcedureId(id)}
            />
          )}
          <main className={`flex-1 bg-background-light dark:bg-background-dark ${(currentView === 'crm_kanban' || currentView === 'sales_pipeline' || currentView === 'agenda') ? 'overflow-hidden flex flex-col' : 'overflow-y-auto custom-scrollbar'}`}>
            {(currentView === 'crm_kanban' || currentView === 'sales_pipeline' || currentView === 'agenda') ? (
              renderView()
            ) : (
              <div className="max-w-7xl mx-auto w-full px-4 md:px-10 py-8">
                {renderView()}
              </div>
            )}
          </main>
        </div>
        <footer className="px-10 py-6 border-t border-[#DBDBDB] dark:border-[#262626] text-center bg-white dark:bg-background-dark">
          <p className="text-xs text-[#8E8E8E] dark:text-[#A8A8A8]">© 2023 AestheticClinic Patient Follow-up System. Professional recovery tracking made simple.</p>
        </footer>
      </div>
    </ThemeProvider>
  );
};

export default App;

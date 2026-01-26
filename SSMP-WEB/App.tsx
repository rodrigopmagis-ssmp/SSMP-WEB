
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Session } from '@supabase/supabase-js';
import { Patient, Procedure, PatientTreatment } from './types';
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
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Data State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [activeTreatments, setActiveTreatments] = useState<PatientTreatment[]>([]);

  // View State
  const [view, setView] = useState<'dashboard' | 'patients' | 'profile' | 'details' | 'procedures' | 'register' | 'procedure_register' | 'protocol_register'>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | undefined>(undefined);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Initial Data (Patients & Procedures)
  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

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

  if (!session) {
    return <Auth />;
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  const navigateToProfile = (id: string) => {
    setSelectedPatientId(id);
    setView('profile');
  };

  const navigateToDetails = (id: string) => {
    setSelectedPatientId(id);
    setView('details');
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
      setView('profile'); // Go to profile after save
    } catch (error) {
      console.error('Error saving patient:', error);
      alert('Erro ao salvar paciente. Por favor, tente novamente.');
    }
  };

  const handleSaveProtocol = async (updatedPatient: Patient) => {
    try {
      setPatients(patients.map(p => p.id === updatedPatient.id ? updatedPatient : p));
      setEditingPatient(null);
      setSelectedPatientId(updatedPatient.id);
      setView('details'); // Go to timeline after creating protocol
    } catch (error) {
      console.error('Error saving protocol:', error);
      alert('Erro ao salvar protocolo.');
    }
  };

  const handleEditPatient = () => {
    setEditingPatient(selectedPatient);
    setView('register');
  };

  const handleAddProcedure = async (newProcedure: Procedure) => {
    try {
      // Persist to Supabase
      const savedProcedure = await supabaseService.createProcedure(newProcedure);
      setProcedures([...procedures, savedProcedure]);
      setView('procedures');
    } catch (error: any) {
      console.error('Error saving procedure:', error);
      // Show specific error message if available, otherwise generic
      alert(error.message || 'Erro ao salvar procedimento.');
    }
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard
          patients={patients}
          procedures={procedures}
          activeTreatments={activeTreatments}
          onPatientSelect={navigateToDetails}
          onNewRegistration={() => setView('register')}
        />;
      case 'patients':
        return <PatientsList patients={patients} onPatientSelect={navigateToProfile} onNewRegistration={() => setView('register')} />;
      case 'profile':
        return <PatientProfile
          patient={selectedPatient}
          onBack={() => setView('patients')}
          onEdit={handleEditPatient}
          onOpenProtocol={(treatmentId) => {
            setSelectedTreatmentId(treatmentId);
            setView('details');
          }}
          onNewProtocol={() => {
            setEditingPatient(selectedPatient);
            setView('protocol_register');
          }}
        />;
      case 'details':
        return <PatientDetails
          patient={selectedPatient}
          procedures={procedures}
          selectedTreatmentId={selectedTreatmentId}
          onBack={() => {
            setSelectedTreatmentId(undefined); // Clear selection when going back
            setView('profile');
          }}
          onEdit={handleEditPatient}
          onNewProtocol={() => {
            setEditingPatient(selectedPatient);
            setView('protocol_register');
          }}
          onUpdate={loadData}
        />;
      case 'procedures':
        return (
          <ProceduresAdmin
            selectedProcedureId={selectedProcedureId}
            onSelectProcedure={setSelectedProcedureId}
            procedures={procedures}
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
        return <ProcedureRegistration onSave={handleAddProcedure} onCancel={() => setView('procedures')} />;
      case 'protocol_register':
        return editingPatient ? (
          <ProtocolRegistration
            patient={editingPatient}
            onSave={handleSaveProtocol}
            onCancel={() => setView('profile')}
          />
        ) : null;
      case 'register':
        return <PatientRegistration
          onSave={handleSavePatient}
          onCancel={() => {
            setEditingPatient(null);
            setView(selectedPatientId ? 'profile' : 'dashboard');
          }}
          initialData={editingPatient || undefined}
        />;
      default:
        return <Dashboard patients={patients} onPatientSelect={navigateToProfile} onNewRegistration={() => { setEditingPatient(null); setView('register'); }} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header currentView={view} setView={setView} onNewRegistration={() => { setEditingPatient(null); setView('register'); }} />
      <div className="flex flex-1 overflow-hidden">
        {(view === 'procedures' || view === 'procedure_register') && (
          <Sidebar
            setView={setView}
            procedures={procedures}
            onNewProcedure={() => setView('procedure_register')}
            selectedProcedureId={selectedProcedureId}
            onSelectProcedure={(id) => setSelectedProcedureId(id)}
          />
        )}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-background-light dark:bg-background-dark">
          <div className="max-w-7xl mx-auto w-full px-4 md:px-10 py-8">
            {renderView()}
          </div>
        </main>
      </div>
      <footer className="px-10 py-6 border-t border-[#DBDBDB] dark:border-[#262626] text-center bg-white dark:bg-background-dark">
        <p className="text-xs text-[#8E8E8E] dark:text-[#A8A8A8]">© 2023 AestheticClinic Patient Follow-up System. Professional recovery tracking made simple.</p>
      </footer>
    </div>
  );
};

export default App;

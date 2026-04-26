import React, { useState, useEffect } from 'react';
import { DocumentService } from '../../src/services/DocumentService';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import { Patient, DocumentTemplate, PatientDocument } from '../../types';
import SignatureModal from './SignatureModal';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPatient, setSearchPatient] = useState('');
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [signingMethod, setSigningMethod] = useState<'local' | 'whatsapp' | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [createdDocument, setCreatedDocument] = useState<PatientDocument | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setStep(1);
      setSelectedPatient(null);
      setSelectedTemplate(null);
      setDocTitle('');
      setSigningMethod(null);
      setIsSuccess(false);
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const data = await DocumentService.getTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSearchPatient = async (term: string) => {
    setSearchPatient(term);
    if (term.length < 3) return;

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .ilike('name', `%${term}%`)
        .limit(5);
      
      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

  const handleCreateDocument = async () => {
    if (!selectedPatient || !selectedTemplate || !signingMethod) return;

    setLoading(true);
    try {
      const calculateAge = (birthDate?: string) => {
        if (!birthDate) return '-';
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age.toString();
      };

      let content = '';
      let fileUrl = '';

      const variables: Record<string, string> = {
        nome_paciente: selectedPatient.name,
        cpf_paciente: selectedPatient.cpf || '-',
        rg_paciente: (selectedPatient as any).rg || '-',
        idade_paciente: calculateAge((selectedPatient as any).birth_date || (selectedPatient as any).dob),
        telefone_paciente: selectedPatient.phone || '-',
        endereco_paciente: (selectedPatient as any).address || '-',
        data_hoje: new Date().toLocaleDateString('pt-BR'),
        data_procedimento: new Date().toLocaleDateString('pt-BR')
      };

      if (selectedTemplate.type === 'pdf') {
        if (!selectedTemplate.file_url) {
          throw new Error('Este modelo não possui um arquivo PDF carregado.');
        }
        fileUrl = selectedTemplate.file_url;
        content = 'Documento em PDF';
      } else {
        content = selectedTemplate.content || '';
        Object.entries(variables).forEach(([key, val]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          content = content.replace(regex, val);
        });
      }

      const doc = await DocumentService.createDocument({
        patient_id: selectedPatient.id!,
        template_id: selectedTemplate.id!,
        title: selectedTemplate.title,
        content: content,
        patient_name: selectedPatient.name,
        patient_cpf: selectedPatient.cpf || '-',
        file_url: fileUrl,
        signature_link: `${window.location.origin}/sign/temp_id`,
        status: 'pending'
      });

      if (signingMethod === 'whatsapp') {
        setIsSuccess(true);
      } else {
        setCreatedDocument(doc);
        setShowSignatureModal(true);
      }
    } catch (error: any) {
      console.error('Error creating document:', error);
      alert(`Erro ao criar documento: ${error.message || 'Ocorreu um erro inesperado.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md overflow-hidden shadow-2xl rounded-3xl p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl">check_circle</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Enviado com Sucesso!</h2>
          <p className="text-gray-500 mb-8">
            O documento para <strong>{selectedPatient?.name}</strong> foi gerado e o link de assinatura enviado via WhatsApp.
          </p>
          <Button variant="primary" className="w-full py-4 rounded-xl" onClick={() => {
            onSuccess();
            onClose();
          }}>
            Entendido
          </Button>
        </div>
      </div>
    );
  }

  if (showSignatureModal && createdDocument) {
    return (
      <SignatureModal
        document={createdDocument}
        templateMapping={selectedTemplate?.variable_mapping}
        onClose={() => {
          setShowSignatureModal(false);
          onClose();
        }}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh] rounded-3xl">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gerar Novo Documento</h2>
            <p className="text-xs text-gray-500">Passo {step} de 4</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Progress Steps */}
          <div className="flex justify-between relative mb-8 px-10">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-800 -translate-y-1/2 -z-10" />
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step >= s 
                  ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' 
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                }`}
              >
                {s}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Localizar Paciente</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">person_search</span>
                  <input
                    type="text"
                    value={searchPatient}
                    onChange={(e) => handleSearchPatient(e.target.value)}
                    placeholder="Busque pelo nome do paciente..."
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                {patients.length > 0 && !selectedPatient && (
                  <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top-2 duration-200">
                    {patients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setSearchPatient(p.name);
                          setPatients([]);
                        }}
                        className="w-full px-4 py-4 text-left hover:bg-primary/5 border-b border-gray-50 dark:border-gray-700 last:border-none group"
                      >
                        <div className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.cpf || 'Sem CPF'} • {p.phone || 'Sem telefone'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPatient && (
                <div className="p-5 bg-primary/5 rounded-2xl border-2 border-primary/20 flex justify-between items-center animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <div>
                      <div className="font-bold text-primary text-base">{selectedPatient.name}</div>
                      <div className="text-sm text-primary/60">{selectedPatient.phone || 'Telefone não cadastrado'}</div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedPatient(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Documento Selecionado</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedTemplate?.title || 'Escolha um modelo na lista abaixo'}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Modelos Disponíveis</label>
                <div className="grid grid-cols-1 gap-3">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTemplate(t);
                        setDocTitle(t.title);
                      }}
                      className={`p-5 text-left rounded-2xl border-2 transition-all duration-200 ${
                        selectedTemplate?.id === t.id 
                        ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-bold text-gray-900 dark:text-white">{t.title}</div>
                        {selectedTemplate?.id === t.id && (
                          <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{t.content}</div>
                    </button>
                  ))}
                  {templates.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                      <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">description</span>
                      <p className="text-gray-500">Nenhum modelo cadastrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Forma de Assinatura</h3>
                <p className="text-sm text-gray-500">Como o paciente <strong>{selectedPatient?.name}</strong> irá assinar?</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSigningMethod('local')}
                  className={`p-8 rounded-[2.5rem] border-2 text-center transition-all duration-300 flex flex-col items-center gap-5 ${
                    signingMethod === 'local'
                    ? 'border-primary bg-primary/5 ring-4 ring-primary/10 scale-105'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                    signingMethod === 'local' ? 'bg-primary text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                  }`}>
                    <span className="material-symbols-outlined text-4xl">draw</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-lg">Assinar Agora</div>
                    <div className="text-xs text-gray-500 mt-1">Neste dispositivo</div>
                  </div>
                </button>

                <button
                  onClick={() => setSigningMethod('whatsapp')}
                  className={`p-8 rounded-[2.5rem] border-2 text-center transition-all duration-300 flex flex-col items-center gap-5 ${
                    signingMethod === 'whatsapp'
                    ? 'border-primary bg-primary/5 ring-4 ring-primary/10 scale-105'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                    signingMethod === 'whatsapp' ? 'bg-primary text-white' : 'bg-green-50 dark:bg-green-900/20 text-green-600'
                  }`}>
                    <span className="material-symbols-outlined text-4xl">chat</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-lg">Enviar WhatsApp</div>
                    <div className="text-xs text-gray-500 mt-1">Link remoto</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                  <span className="material-symbols-outlined text-4xl">task_alt</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirme os Dados</h3>
                <p className="text-sm text-gray-500">Revise as informações antes de finalizar o envio</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 space-y-6">
                <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-5">
                  <div>
                    <p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">Paciente</p>
                    <p className="font-bold text-gray-900 dark:text-white text-lg">{selectedPatient?.name}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{selectedPatient?.cpf || 'CPF não cadastrado'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">Contato</p>
                    <p className="font-bold text-green-600 text-base">{selectedPatient?.phone || 'Sem telefone'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">Documento</p>
                    <p className="font-bold text-gray-800 dark:text-gray-200">{selectedTemplate?.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">Método</p>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-tighter">
                      {signingMethod === 'whatsapp' ? 'Link WhatsApp' : 'Presencial'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex gap-3">
                <span className="material-symbols-outlined text-amber-600">info</span>
                <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed font-medium">
                  Certifique-se de que o número de telefone está correto. O link será enviado imediatamente após a confirmação.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-between gap-3 bg-gray-50/30 dark:bg-gray-800/30">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)} className="rounded-xl px-6">
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <Button 
              variant="primary" 
              onClick={() => setStep(step + 1)}
              disabled={ 
                (step === 1 && !selectedPatient) || 
                (step === 2 && !selectedTemplate) ||
                (step === 3 && !signingMethod)
              }
              className="rounded-xl px-10 shadow-lg shadow-primary/20"
            >
              {step === 3 ? 'Gerar Documento' : 'Próximo'}
            </Button>
          ) : (
            <Button 
              variant="primary" 
              onClick={handleCreateDocument}
              isLoading={loading}
              className="rounded-xl px-10 shadow-lg shadow-primary/20"
            >
              Confirmar e {signingMethod === 'whatsapp' ? 'Enviar' : 'Assinar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentModal;

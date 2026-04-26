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

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setStep(1);
      setSelectedPatient(null);
      setSelectedTemplate(null);
      setDocTitle('');
      setSigningMethod(null);
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
        
        // Use o arquivo do modelo como base diretamente
        // Não fazemos mais mapeamento de variáveis conforme solicitado para remover a função
        fileUrl = selectedTemplate.file_url;
        content = 'Documento em PDF';
      } else {
        // Handle Text Template
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
        file_url: fileUrl,
        signature_link: `${window.location.origin}/sign/temp_id`, // O banco atualizará se necessário, mas passamos a estrutura
        status: 'pending'
      });

      if (signingMethod === 'whatsapp') {
        alert('Documento gerado com sucesso! O envio via WhatsApp está sendo processado em segundo plano.');
        onSuccess();
        onClose();
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
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gerar Novo Documento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Progress Steps */}
          <div className="flex justify-between relative mb-8 px-10">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-800 -translate-y-1/2 -z-10" />
            {[1, 2, 3].map(s => (
              <div 
                key={s} 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
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
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">person_search</span>
                  <input
                    type="text"
                    value={searchPatient}
                    onChange={(e) => handleSearchPatient(e.target.value)}
                    placeholder="Nome do paciente..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {patients.length > 0 && !selectedPatient && (
                  <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg">
                    {patients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setSearchPatient(p.name);
                          setPatients([]);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-primary/5 border-b border-gray-50 dark:border-gray-700 last:border-none"
                      >
                        <div className="font-bold text-gray-900 dark:text-white">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.cpf || 'Sem CPF'} • {p.phone || 'Sem telefone'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPatient && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-primary">{selectedPatient.name}</div>
                    <div className="text-sm text-primary/60">{selectedPatient.phone}</div>
                  </div>
                  <button onClick={() => setSelectedPatient(null)} className="text-primary hover:bg-primary/10 p-1 rounded">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Removido input de título manual conforme solicitado */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Título do Documento</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedTemplate?.title || 'Selecione um modelo abaixo'}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Selecionar Modelo</label>
                <div className="grid grid-cols-1 gap-3">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTemplate(t);
                        setDocTitle(t.title);
                      }}
                      className={`p-4 text-left rounded-xl border-2 transition-all ${
                        selectedTemplate?.id === t.id 
                        ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                      }`}
                    >
                      <div className="font-bold text-gray-900 dark:text-white">{t.title}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{t.content}</div>
                    </button>
                  ))}
                  {templates.length === 0 && (
                    <div className="text-center py-8 text-gray-500">Nenhum modelo cadastrado</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Como deseja coletar a assinatura?</h3>
                <p className="text-sm text-gray-500">O documento será gerado para {selectedPatient?.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSigningMethod('local')}
                  className={`p-6 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-4 ${
                    signingMethod === 'local'
                    ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <span className="material-symbols-outlined text-3xl">draw</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Assinar agora</div>
                    <div className="text-xs text-gray-500 mt-1">Neste dispositivo</div>
                  </div>
                </button>

                <button
                  onClick={() => setSigningMethod('whatsapp')}
                  className={`p-6 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-4 ${
                    signingMethod === 'whatsapp'
                    ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                    <span className="material-symbols-outlined text-3xl">chat</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Enviar WhatsApp</div>
                    <div className="text-xs text-gray-500 mt-1">Link para o paciente</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-between gap-3">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button 
              variant="primary" 
              onClick={() => setStep(step + 1)}
              disabled={ (step === 1 && !selectedPatient) || (step === 2 && !selectedTemplate) }
            >
              Próximo
            </Button>
          ) : (
            <Button 
              variant="primary" 
              onClick={handleCreateDocument}
              isLoading={loading}
              disabled={!signingMethod}
            >
              Gerar e {signingMethod === 'whatsapp' ? 'Enviar' : 'Assinar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentModal;

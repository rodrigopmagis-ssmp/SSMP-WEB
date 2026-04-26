import React, { useState, useEffect } from 'react';
import { DocumentService } from '../../src/services/DocumentService';
import { PatientDocument } from '../../types';
import Button from '../ui/Button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DocumentViewerModal from './DocumentViewerModal';
import SignatureModal from './SignatureModal';
import PatientDocumentSearchModal from './PatientDocumentSearchModal';

interface PatientDocumentsSectionProps {
  patientId: string;
}

const PatientDocumentsSection: React.FC<PatientDocumentsSectionProps> = ({ patientId }) => {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<PatientDocument | null>(null);
  const [docToSign, setDocToSign] = useState<PatientDocument | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await DocumentService.getDocumentsByPatient(patientId);
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching patient documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const pendingDocs = documents.filter(doc => doc.status === 'pending' || doc.status === 'draft').slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
        <h3 className="text-gray-900 dark:text-white font-bold text-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">description</span>
          Documentos
        </h3>
        <button 
          onClick={() => setIsSearchModalOpen(true)}
          className="text-primary hover:text-primary/80 transition-colors"
          title="Ver Histórico / Pesquisar"
        >
          <span className="material-symbols-outlined text-2xl">manage_search</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Carregando documentos...</div>
        ) : pendingDocs.length === 0 ? (
          <div className="py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-200 dark:text-gray-700 mb-2">task_alt</span>
            <p className="text-gray-400 text-sm font-medium">Nenhum documento pendente</p>
            <button 
              onClick={() => setIsSearchModalOpen(true)}
              className="mt-4 text-primary text-xs font-bold hover:underline"
            >
              Ver histórico completo
            </button>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Pendentes de Assinatura</p>
            {pendingDocs.map((doc) => (
              <div 
                key={doc.id}
                className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                      {doc.title}
                    </h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Criado em {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    Pendente
                  </span>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="flex-1 py-1.5 text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-all flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    Ver
                  </button>
                  <button
                    onClick={() => setDocToSign(doc)}
                    className="flex-1 py-1.5 text-[10px] font-bold text-white bg-primary hover:bg-primary/90 rounded-md shadow-sm transition-all flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    Assinar
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20">
        <Button 
          variant="outline" 
          fullWidth 
          className="h-9 text-[11px] font-bold gap-2"
          onClick={() => setIsSearchModalOpen(true)}
        >
          <span className="material-symbols-outlined text-lg">history</span>
          Histórico Completo
        </Button>
      </div>

      {/* Modals */}
      {selectedDoc && (
        <DocumentViewerModal 
          document={selectedDoc} 
          onClose={() => setSelectedDoc(null)} 
        />
      )}

      {docToSign && (
        <SignatureModal 
          document={docToSign} 
          onClose={() => setDocToSign(null)} 
          onSuccess={() => {
            setDocToSign(null);
            fetchDocuments();
          }} 
        />
      )}

      {isSearchModalOpen && (
        <PatientDocumentSearchModal 
          patientId={patientId}
          onClose={() => setIsSearchModalOpen(false)}
          onUpdate={() => fetchDocuments()}
        />
      )}
    </div>
  );
};

export default PatientDocumentsSection;

import React, { useState, useEffect } from 'react';
import { DocumentService } from '../../src/services/DocumentService';
import { PatientDocument } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DocumentViewerModal from './DocumentViewerModal';
import SignatureModal from './SignatureModal';

interface PatientDocumentSearchModalProps {
  patientId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const PatientDocumentSearchModal: React.FC<PatientDocumentSearchModalProps> = ({ patientId, onClose, onUpdate }) => {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<PatientDocument | null>(null);
  const [docToSign, setDocToSign] = useState<PatientDocument | null>(null);

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

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">folder_shared</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Histórico de Documentos</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pesquise e visualize todos os documentos do paciente</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-6 border-b border-gray-50 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
            <input 
              type="text"
              placeholder="Buscar por título do documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'signed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                  statusFilter === status 
                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' 
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : 'Assinados'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-800/20 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
              <p className="text-gray-500 font-medium">Carregando histórico...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-200 dark:text-gray-700 mb-4">search_off</span>
              <h3 className="text-lg font-bold text-gray-400">Nenhum documento encontrado</h3>
              <p className="text-gray-400 max-w-xs mt-2">Tente ajustar seus termos de busca ou filtros para encontrar o que procura.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((doc) => (
                <div 
                  key={doc.id}
                  className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group flex items-center gap-4"
                >
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0 flex items-center justify-center">
                    <span className="material-symbols-outlined">description</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-0.5 group-hover:text-primary transition-colors truncate">
                      {doc.title}
                    </h4>
                    <div className="flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {format(new Date(doc.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </span>
                      <span className={`font-black uppercase px-2 py-0.5 rounded-full border ${
                        doc.status === 'signed' 
                          ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' 
                          : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'
                      }`}>
                        {doc.status === 'signed' ? 'Assinado' : 'Pendente'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                      <span className="hidden sm:inline">Visualizar</span>
                    </button>
                    {doc.status !== 'signed' && (
                      <button
                        onClick={() => setDocToSign(doc)}
                        className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">edit_note</span>
                        <span className="hidden sm:inline">Assinar</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selection Modals */}
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
              onUpdate();
            }} 
          />
        )}
      </div>
    </div>
  );
};

export default PatientDocumentSearchModal;

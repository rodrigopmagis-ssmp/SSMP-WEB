import React, { useState, useEffect } from 'react';
import { DocumentService } from '../../src/services/DocumentService';
import { PatientDocument } from '../../types';
import Button from '../ui/Button';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DocumentModal from './DocumentModal';
import SignatureModal from './SignatureModal';
import DocumentViewerModal from './DocumentViewerModal';

interface SignatureListProps {
  onViewChange?: (view: any) => void;
}

const SignatureList: React.FC<SignatureListProps> = ({ onViewChange }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PatientDocument | null>(null);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setDocuments([]);
    setHasLoadedOnce(false);
  };
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<PatientDocument | null>(null);
  const [sendingWhatsapp, setSendingWhatsapp] = useState<string | null>(null);

  // Removed auto-load on mount as requested
  /* 
  useEffect(() => {
    loadDocuments();
  }, []);
  */

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await DocumentService.getPatientDocuments();
      setDocuments(data || []);
      setHasLoadedOnce(true);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoc = async () => {
    if (!docToDelete) return;
    try {
      setLoading(true);
      await DocumentService.deleteDocument(docToDelete.id);
      setIsDeleteModalOpen(false);
      setDocToDelete(null);
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erro ao excluir documento');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'signed': return 'Assinado';
      case 'pending': return 'Aguardando assinatura';
      case 'cancelled': return 'Cancelado';
      case 'draft': return 'Rascunho';
      default: return status;
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = (doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.patients?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    
    // Date filtering (using string comparison for robustness)
    const docDateStr = doc.created_at.split('T')[0];
    const matchesDate = docDateStr >= startDate && docDateStr <= endDate;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleSendToWhatsApp = async (doc: PatientDocument) => {
    const phone = (doc as any).patients?.phone;
    if (!phone) {
      alert('Paciente não possui telefone cadastrado.');
      return;
    }

    setSendingWhatsapp(doc.id);
    try {
      await DocumentService.sendToWhatsApp(doc.id, (doc as any).patients?.name, phone);
      alert('Link de assinatura enviado com sucesso para o WhatsApp!');
      loadDocuments(); // Refresh to update status and sent_at
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      alert('Erro ao enviar mensagem para o WhatsApp. Verifique a configuração do n8n.');
    } finally {
      setSendingWhatsapp(null);
    }
  };

  const stats = {
    all: documents.length,
    pending: documents.filter(d => d.status === 'pending').length,
    signed: documents.filter(d => d.status === 'signed').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Documentos e assinaturas
            <span className="text-sm font-normal text-gray-500">{stats.all} registros</span>
          </h1>
        </div>
        <div className="flex gap-3">
          {onViewChange && (
            <Button variant="secondary" className="flex items-center gap-2" onClick={() => onViewChange('document_templates')}>
              <span className="material-symbols-outlined text-lg">description</span>
              Modelos
            </Button>
          )}
          <Button variant="secondary" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar
          </Button>
          <Button variant="primary" className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            <span className="material-symbols-outlined text-lg">add</span>
            Novo documento
          </Button>
        </div>
      </div>

      {/* Tabs removed to unify filtering flow */}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-48">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Status</label>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full h-10 px-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Aguardando assinatura</option>
            <option value="signed">Assinado</option>
          </select>
        </div>

        <div className="w-full sm:w-40">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Data Inicial</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-10 px-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm"
          />
        </div>

        <div className="w-full sm:w-40">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Data Final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full h-10 px-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm"
          />
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Paciente ou Documento</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder="Digite para buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadDocuments()}
              className="w-full h-10 pl-10 pr-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={clearFilters}
            className="h-10 px-4 flex items-center gap-2 text-sm font-bold"
          >
            <span className="material-symbols-outlined text-lg">filter_alt_off</span>
            Limpar
          </Button>
          <Button 
            variant="primary" 
            onClick={loadDocuments}
            disabled={loading}
            className="h-10 px-6 flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">search</span>
                Filtrar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Nome + Signatários</th>
              <th className="px-6 py-4 text-center">Criado em</th>
              <th className="px-6 py-4 text-center">Assinado em</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 w-10 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                </td>
              </tr>
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  {!hasLoadedOnce ? (
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
                      <p>Utilize os filtros acima para visualizar os documentos</p>
                    </div>
                  ) : (
                    "Nenhum documento encontrado"
                  )}
                </td>
              </tr>
            ) : (
              filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1">{doc.title}</span>
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                        {doc.patients?.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">
                    {format(new Date(doc.created_at), "dd/MM/yyyy 'às' H:mm", { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">
                    {doc.signed_at ? format(new Date(doc.signed_at), "dd/MM/yyyy 'às' H:mm", { locale: ptBR }) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(doc.status)}`}>
                      {getStatusLabel(doc.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {doc.status === 'signed' && (
                        <button 
                          onClick={() => {
                            setSelectedDoc(doc);
                            setShowViewerModal(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          Visualizar
                        </button>
                      )}
                      {doc.status !== 'signed' && doc.status !== 'cancelled' && (
                        <button 
                          onClick={() => handleSendToWhatsApp(doc)}
                          disabled={sendingWhatsapp === doc.id}
                          className={`flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors ${sendingWhatsapp === doc.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Enviar link para WhatsApp"
                        >
                          {sendingWhatsapp === doc.id ? (
                            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined text-sm">chat</span>
                          )}
                          WhatsApp
                        </button>
                      )}
                      {doc.status === 'pending' && (
                        <button 
                          onClick={() => {
                            setSelectedDoc(doc);
                            setShowSignatureModal(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">draw</span>
                          Assinar
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setDocToDelete(doc);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                        title="Excluir documento"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DocumentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadDocuments}
      />

      {showSignatureModal && selectedDoc && (
        <SignatureModal
          document={selectedDoc}
          templateMapping={(selectedDoc as any).document_templates?.variable_mapping}
          onClose={() => {
            setShowSignatureModal(false);
            setSelectedDoc(null);
          }}
          onSuccess={() => {
            loadDocuments();
            setShowSignatureModal(false);
            setSelectedDoc(null);
          }}
        />
      )}

      {showViewerModal && selectedDoc && (
        <DocumentViewerModal
          document={selectedDoc}
          onClose={() => {
            setShowViewerModal(false);
            setSelectedDoc(null);
          }}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {isDeleteModalOpen && docToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mx-auto">
                <span className="material-symbols-outlined text-3xl">delete_forever</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Excluir documento?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Tem certeza que deseja excluir o documento <span className="font-bold text-gray-700 dark:text-gray-200">"{docToDelete.title}"</span>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDocToDelete(null);
                }}
                className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteDoc}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureList;

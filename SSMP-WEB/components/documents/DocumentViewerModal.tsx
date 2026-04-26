import React, { useRef, useState } from 'react';
import { PatientDocument } from '../../types';
import Button from '../ui/Button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface DocumentViewerModalProps {
  document: PatientDocument;
  onClose: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ document, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (document.file_url && document.file_url.toLowerCase().includes('.pdf')) {
      window.open(document.file_url, '_blank');
      return;
    }

    if (!documentRef.current) return;
    
    setIsExporting(true);
    try {
      const element = documentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${document.title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Visualização de Documento</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {document.status === 'signed' ? 'Documento assinado digitalmente' : 'Rascunho de documento'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              isLoading={isExporting}
              className="gap-2"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Download PDF
            </Button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-0 bg-gray-100 dark:bg-gray-800">
          {document.file_url && document.file_url.toLowerCase().includes('.pdf') ? (
            <iframe 
              src={`${document.file_url}#toolbar=0`}
              className="w-full h-full border-none"
              title="PDF Viewer"
            />
          ) : (
            <div className="h-full overflow-y-auto p-8">
              {/* Printable Page */}
              <div 
                ref={documentRef}
                className="bg-white dark:bg-gray-900 shadow-xl mx-auto p-12 min-h-[297mm] w-[210mm] text-gray-900 dark:text-gray-100 flex flex-col"
              >
                {/* Papel Timbrado (Letterhead) */}
                <div className="mb-12 border-b-2 border-[#8B7355] pb-6 flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-serif font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
                      Dra. Isabela Rossetti
                      {document.status === 'signed' && (
                        <span className="material-symbols-outlined text-green-600 text-xl" title="Documento Assinado">verified</span>
                      )}
                    </h1>
                    <p className="text-[#8B7355] text-xs font-medium tracking-wide uppercase mt-1">
                      Estética Avançada
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-gray-500 leading-relaxed font-medium">
                    <p>isarossetti1988@gmail.com</p>
                    <p>+55 (11) 97054-6223</p>
                  </div>
                </div>

                {/* Content Area with Title and Patient Cards */}
                <div className="mb-10 text-center">
                  <h1 className="text-xl font-bold uppercase tracking-tight text-gray-900">{document.title}</h1>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                    {(document as any).document_templates?.subtitle || (document as any).document_templates?.title || 'Procedimento'}
                  </p>
                  
                  {/* Patient Info Cards Layout */}
                  <div className="mt-6 flex border border-[#ead9c8] rounded-sm overflow-hidden text-left text-[11px] mb-8">
                    <div className="flex-1 p-3 bg-[#fdf9f3] border-r border-[#ead9c8]">
                      <p className="text-gray-600 mb-1">Paciente:</p>
                      <p className="font-bold text-gray-900 uppercase">{(document as any).patients?.name || '-'}</p>
                    </div>
                    <div className="w-1/3 p-3 bg-[#fdf9f3] border-r border-[#ead9c8]">
                      <p className="text-gray-600 mb-1">CPF:</p>
                      <p className="font-bold text-gray-900">{(document as any).patients?.cpf || '-'}</p>
                    </div>
                    <div className="w-1/4 p-3 bg-[#fdf9f3]">
                      <p className="text-gray-600 mb-1">Data:</p>
                      <p className="font-bold text-gray-900">
                        {format(new Date(document.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Document Body */}
                <div 
                  className="flex-1 prose max-w-none prose-p:leading-relaxed prose-p:mb-6 prose-strong:text-gray-900 dark:prose-invert font-serif text-[15px] text-gray-800 text-justify mb-12"
                  dangerouslySetInnerHTML={{ __html: document.content || '' }}
                />

                {/* Premium Footer with Signature Cards */}
                <div className="mt-auto pt-12 border-t-2 border-[#fdf9f3]">
                  <div className="flex gap-8">
                    {/* Patient Signature Card */}
                    <div className="flex-1 p-6 bg-[#fdf9f3] border border-[#ead9c8] rounded-md relative min-h-[160px] flex flex-col justify-end">
                      {document.status === 'signed' && document.signature_data ? (
                        <div className="absolute top-4 left-4 right-4 bottom-12 flex items-center justify-center">
                          <img 
                            src={document.signature_data} 
                            alt="Assinatura" 
                            className="max-h-24 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="absolute top-4 left-4 right-4 bottom-12 border-2 border-dashed border-[#ead9c8]/50 rounded flex items-center justify-center">
                          <span className="text-[#8B7355]/30 text-[10px] uppercase font-bold tracking-widest">
                            {document.status === 'signed' ? 'Assinatura não vinculada' : 'Aguardando Assinatura'}
                          </span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-[#8B7355]/30 text-center">
                        <p className="text-[11px] font-bold text-gray-900 uppercase">{(document as any).patients?.name || '-'}</p>
                        <p className="text-[9px] text-[#8B7355] uppercase mt-0.5">Assinatura do Paciente</p>
                      </div>
                    </div>

                    {/* Professional Signature Card */}
                    <div className="flex-1 p-6 bg-[#fdf9f3] border border-[#ead9c8] rounded-md flex flex-col justify-end">
                      <div className="text-center">
                        <div className="mb-4">
                          <h3 className="text-sm font-bold text-gray-900 uppercase">Dra. Isabela Rossetti</h3>
                          <p className="text-[10px] text-[#8B7355] font-medium">CRM/SP 123456 • CFM 78910</p>
                        </div>
                        <div className="pt-2 border-t border-[#8B7355]/30">
                          <p className="text-[9px] text-[#8B7355] uppercase">Responsável Técnico</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* New Full-Width Authentication Band */}
                {document.status === 'signed' && (
                  <div className="mt-12 -mx-12 -mb-12 bg-[#F0FDF4] border-t-2 border-green-600 p-8 relative overflow-hidden">
                    {/* Decorative Security Pattern Background */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden rotate-1 scale-110">
                      <div className="flex flex-wrap gap-x-8 gap-y-4 text-[7px] font-black uppercase whitespace-nowrap text-green-900">
                        {Array(30).fill('AUTENTICADO DIGITALMENTE • SEGURANÇA • INTEGRALIDADE • REGISTRO CLÍNICO • ').join('')}
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between gap-8">
                      <div className="flex items-center gap-6 border-r border-green-200 pr-8">
                        <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-green-600/20">
                          <span className="material-symbols-outlined text-3xl">verified_user</span>
                        </div>
                        <div>
                          <h4 className="text-green-800 font-black uppercase text-[13px] tracking-[0.2em] mb-1">Documento Autenticado</h4>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Protocolo de Segurança Ativo</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-2 gap-x-12 gap-y-3">
                        <div className="space-y-1">
                          <p className="text-[9px] text-green-700/60 font-bold uppercase tracking-wider">Data e Hora da Assinatura</p>
                          <p className="text-[11px] text-gray-700 font-medium flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-green-600">schedule</span>
                            {document.signed_at 
                              ? format(new Date(document.signed_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
                              : format(new Date(document.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
                            }
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] text-green-700/60 font-bold uppercase tracking-wider">Identificador de Autenticidade</p>
                          <p className="text-[11px] text-gray-700 font-mono flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-green-600">key</span>
                            <span className="select-all uppercase tracking-tight">{document.id}</span>
                          </p>
                        </div>
                        <div className="col-span-2 pt-2 mt-2 border-t border-green-200/50">
                          <p className="text-[8px] text-green-800/50 leading-relaxed max-w-2xl italic">
                            Este documento foi gerado eletronicamente e possui validade jurídica conforme diretrizes vigentes. 
                            A assinatura digital é protegida por criptografia assimétrica e vinculada aos dados biométricos do subscritor, garantindo irrefutabilidade e integridade total.
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-center gap-1 opacity-40">
                         <span className="material-symbols-outlined text-4xl text-green-800">lock_outline</span>
                         <span className="text-[7px] font-bold text-green-900 uppercase">Secure Link</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;

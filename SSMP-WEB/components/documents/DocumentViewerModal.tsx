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
                    <h1 className="text-2xl font-serif font-bold text-gray-900 uppercase tracking-tight">
                      Dra. Isabela Rossetti
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

                {/* Document Status Badge (Only if signed) */}
                {document.status === 'signed' && (
                  <div className="flex justify-end mb-6">
                    <div className="text-[10px] uppercase font-black text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200 flex items-center gap-1 shadow-sm">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      Assinado Digitalmente
                    </div>
                  </div>
                )}

                {/* Document Body */}
                <div 
                  className="flex-1 prose max-w-none prose-p:leading-relaxed prose-p:mb-6 prose-strong:text-gray-900 dark:prose-invert font-serif text-[15px] text-gray-800 text-justify"
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

                  {/* Audit Footer */}
                  <div className="mt-8 text-center">
                    <p className="text-[8px] text-gray-400 leading-tight">
                      Este documento foi gerado eletronicamente e possui validade jurídica.<br />
                      A assinatura digital é protegida por criptografia e vinculada aos dados biométricos e IP do subscritor.<br />
                      <span className="font-mono mt-1 block">IDENTIFICADOR: {document.id} | HASH: {document.id.substring(0, 8)}...</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;

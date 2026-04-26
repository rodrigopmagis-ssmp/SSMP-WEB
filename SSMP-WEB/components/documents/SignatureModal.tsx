import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PatientDocument } from '../../types';
import { DocumentService } from '../../src/services/DocumentService';
import Button from '../ui/Button';
import { PDFDocument } from 'pdf-lib';

interface SignatureModalProps {
  document: PatientDocument;
  onClose: () => void;
  onSuccess: () => void;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ document, onClose, onSuccess }) => {
  console.log('SignatureModal Init - Document:', document.id);

  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = async () => {
    if (sigCanvas.current?.isEmpty()) {
      setError('Por favor, faça a assinatura antes de salvar.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const signatureData = sigCanvas.current?.getCanvas().toDataURL('image/png');
      
      if (!signatureData) throw new Error('Falha ao capturar assinatura');

      if (document.file_url && document.file_url.toLowerCase().includes('.pdf')) {
        // Handle PDF signing - merge signature into PDF
        const existingPdfBytes = await fetch(document.file_url).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const signatureImage = await pdfDoc.embedPng(signatureData);
        
        const pages = pdfDoc.getPages();

        // Adicionar assinatura no rodapé da última página
        const lastPage = pages[pages.length - 1];
        const { width, height } = lastPage.getSize();
        
        const sigWidth = 150;
        const sigHeight = 75;

        lastPage.drawImage(signatureImage, {
          x: 50,
          y: 50,
          width: sigWidth,
          height: sigHeight,
        });

        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const pdfFile = new File([pdfBlob], `signed_${document.id}.pdf`, { type: 'application/pdf' });
        
        // Upload the signed PDF
        const newFileUrl = await DocumentService.uploadTemplateFile(pdfFile);
        
        // Update document with new file_url and signature
        await DocumentService.updateDocument(document.id, {
          file_url: newFileUrl,
          status: 'signed',
          signature_data: signatureData,
          signed_at: new Date().toISOString()
        });
      } else {
        // Handle Text signing
        await DocumentService.signDocument(document.id, signatureData);
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error signing document:', err);
      setError(err.message || 'Erro ao salvar assinatura. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assinatura de Documento</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{document.title}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-0 bg-gray-100 dark:bg-gray-800">
          {document.file_url && document.file_url.toLowerCase().includes('.pdf') ? (
            <iframe 
              src={`${document.file_url}#toolbar=0`}
              className="w-full h-full border-none"
              title="PDF Viewer"
            />
          ) : (
            <div className="h-full overflow-y-auto p-12 bg-white dark:bg-gray-900">
              <div className="max-w-[210mm] mx-auto min-h-[297mm] flex flex-col">
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
                        {new Date(document.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Document Body */}
                <div 
                  className="flex-1 prose max-w-none prose-p:leading-relaxed prose-p:mb-6 prose-strong:text-gray-900 dark:prose-invert font-serif text-[15px] text-gray-800 text-justify mb-12"
                  dangerouslySetInnerHTML={{ __html: document.content.replace(/\n/g, '<br/>') }}
                />

                {/* Premium Footer with Signature Cards (Preview) */}
                <div className="mt-auto pt-12 border-t-2 border-[#fdf9f3]">
                  <div className="flex gap-8">
                    {/* Patient Signature Card */}
                    <div className="flex-1 p-6 bg-[#fdf9f3] border border-[#ead9c8] rounded-md relative min-h-[160px] flex flex-col justify-end">
                      <div className="absolute top-4 left-4 right-4 bottom-12 border-2 border-dashed border-[#ead9c8]/50 rounded flex items-center justify-center">
                        <span className="text-[#8B7355]/30 text-[10px] uppercase font-bold tracking-widest text-center px-4">
                          Sua assinatura aparecerá aqui após confirmar abaixo
                        </span>
                      </div>
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
                  <div className="mt-8 text-center pb-8">
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

        {/* Signature Area */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="max-w-md mx-auto space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Assine no campo abaixo:</span>
              <button 
                onClick={clear}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Limpar Assinatura
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 overflow-hidden shadow-inner">
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                canvasProps={{
                  className: "w-full h-48 cursor-crosshair"
                }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/30">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 py-3"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 py-3 gap-2"
                onClick={handleSave}
                isLoading={isSaving}
              >
                <span className="material-symbols-outlined text-sm">check</span>
                Assinar e Finalizar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;


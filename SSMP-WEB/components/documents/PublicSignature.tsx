import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import SignatureCanvas from 'react-signature-canvas';
import Button from '../ui/Button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PDFDocument } from 'pdf-lib';
import { DocumentService } from '../../src/services/DocumentService';


const PublicSignature: React.FC = () => {
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const getDocId = () => {
    const params = new URLSearchParams(window.location.search);
    const idFromQuery = params.get('signature_id');
    if (idFromQuery) return idFromQuery;
    
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  };

  useEffect(() => {
    loadDocument();
  }, []);

  const loadDocument = async () => {
    const id = getDocId();
    if (!id) {
      setError('Documento não encontrado');
      setLoading(false);
      return;
    }

    try {
      const { data, error: err } = await supabase
        .from('patient_documents')
        .select(`
          *,
          patients (name, cpf),
          template:document_templates (variable_mapping)
        `)
        .eq('id', id)
        .single();

      if (err || !data) throw new Error('Documento não encontrado');
      
      if (data.status === 'signed') {
        setIsSigned(true);
      }
      
      setDoc(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert('Por favor, assine antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      const signatureData = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
      if (!signatureData) throw new Error('Falha ao capturar assinatura');

      let finalFileUrl = doc.file_url;

      if (doc.file_url && doc.file_url.toLowerCase().includes('.pdf')) {
        // Mesclar assinatura no PDF
        const existingPdfBytes = await fetch(doc.file_url).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const signatureImage = await pdfDoc.embedPng(signatureData);
        
        const pages = pdfDoc.getPages();
        const mapping = (doc as any).template?.variable_mapping || {};
        const sigPos = mapping['assinatura_paciente'];

        if (sigPos) {
          const pageIndex = (sigPos.page || 1) - 1;
          const page = pages[pageIndex] || pages[0];
          const { width, height } = page.getSize();

          // Converter % para pontos PDF
          const x = (sigPos.x / 100) * width;
          const y = (1 - (sigPos.y / 100)) * height;

          // Ajustar para centralizar a imagem no ponto (opcional, aqui estamos usando o ponto como base)
          // Reduzi o tamanho para ficar mais elegante no documento
          const sigWidth = 120;
          const sigHeight = 60;

          page.drawImage(signatureImage, {
            x: x - (sigWidth / 2),
            y: y - (sigHeight / 2),
            width: sigWidth,
            height: sigHeight,
          });
        } else {
          // Fallback: Adicionar assinatura no rodapé da última página
          const lastPage = pages[pages.length - 1];
          const { width, height } = lastPage.getSize();
          lastPage.drawImage(signatureImage, {
            x: 50,
            y: 50,
            width: 150,
            height: 75,
          });
        }

        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const pdfFile = new File([pdfBlob], `signed_${doc.id}.pdf`, { type: 'application/pdf' });
        
        // Upload do PDF assinado
        // Nota: Requer política de STORAGE (INSERT) para o papel 'anon' no bucket 'documents'
        const fileExt = 'pdf';
        const fileName = `signed_${doc.id}_${Date.now()}.${fileExt}`;
        const filePath = `signed/${fileName}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(filePath, pdfFile);

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        
        finalFileUrl = publicUrl;
      }

      // 1. Create signature record
      const { data: sigData, error: sigErr } = await supabase
        .from('signatures')
        .insert({
          document_id: doc.id,
          signature_data: signatureData,
          ip_address: '0.0.0.0',
          user_agent: navigator.userAgent,
          signed_at: new Date().toISOString(),
          clinic_id: doc.clinic_id
        })
        .select()
        .single();

      if (sigErr) throw sigErr;

      // 2. Update document status and file_url
      const { error: docErr } = await supabase
        .from('patient_documents')
        .update({ 
          status: 'signed',
          signed_at: new Date().toISOString(),
          file_url: finalFileUrl,
          signature_data: signatureData
        })
        .eq('id', doc.id);

      if (docErr) throw docErr;

      setIsSigned(true);
      alert('Documento assinado com sucesso!');
    } catch (err: any) {
      console.error('Error saving signature:', err);
      alert('Erro ao salvar assinatura: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ops!</h1>
        <p className="text-gray-500 mt-2">{error || 'Ocorreu um erro ao carregar o documento.'}</p>
        <Button variant="primary" className="mt-6" onClick={() => window.location.reload()}>Tentar novamente</Button>
      </div>
    );
  }

  if (isSigned) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-green-50 dark:bg-green-950/20">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mb-6">
          <span className="material-symbols-outlined text-5xl">check_circle</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documento Assinado!</h1>
        <p className="text-gray-500 mt-2 max-w-md">
          Obrigado, {doc.patients?.name}. Sua assinatura foi coletada com sucesso e o documento está agora em processo de finalização.
        </p>
        <div className="mt-8 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-sm text-left w-full max-w-sm">
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Documento:</span>
            <span className="font-medium">{doc.title}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Data:</span>
            <span className="font-medium">{format(new Date(), "dd/MM/yyyy 'às' H:mm", { locale: ptBR })}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 sticky top-0 z-10 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">description</span>
        </div>
        <div>
          <h1 className="font-bold text-gray-900 dark:text-white line-clamp-1">{doc.title}</h1>
          <p className="text-xs text-gray-500">Para: {doc.patients?.name}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6 mt-4">
        {/* Document Content */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 min-h-[400px] overflow-hidden">
          {doc.file_url && doc.file_url.toLowerCase().includes('.pdf') ? (
            <iframe 
              src={`${doc.file_url}#toolbar=0`}
              className="w-full h-[600px] border-none"
              title="PDF Preview"
            />
          ) : (
            <div className="p-12 bg-white dark:bg-gray-900">
              <div className="max-w-[210mm] mx-auto min-h-[297mm] flex flex-col">
                {/* Papel Timbrado (Letterhead) */}
                <div className="mb-12 border-b-2 border-[#8B7355] pb-6 flex justify-between items-start">
                  <div className="text-left">
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

                {/* Document Body */}
                <div 
                  className="flex-1 prose max-w-none prose-p:leading-relaxed prose-p:mb-6 prose-strong:text-gray-900 dark:prose-invert font-serif text-[15px] text-gray-800 text-justify"
                  dangerouslySetInnerHTML={{ __html: doc.content || '' }}
                />
              </div>
            </div>
          )}
        </div>


        {/* Signature Area */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Sua Assinatura</h3>
              <p className="text-xs text-gray-500">Assine no campo abaixo</p>
            </div>
            <button onClick={handleClear} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">refresh</span>
              Limpar
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 overflow-hidden">
            <SignatureCanvas 
              ref={sigCanvas}
              penColor="#000"
              canvasProps={{
                className: "w-full h-48 signature-canvas",
                style: { width: '100%', height: '192px' }
              }}
            />
          </div>

          <div className="text-[10px] text-gray-400 text-center leading-tight">
            Ao clicar em "Finalizar e Assinar", você concorda que esta assinatura eletrônica é juridicamente vinculativa e equivalente à sua assinatura manuscrita.
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 flex gap-4 max-w-3xl mx-auto rounded-t-3xl shadow-lg">
        <Button 
          variant="primary" 
          className="flex-1 py-4 text-lg" 
          onClick={handleSave}
          isLoading={loading}
        >
          Finalizar e Assinar
        </Button>
      </div>
    </div>
  );
};

export default PublicSignature;

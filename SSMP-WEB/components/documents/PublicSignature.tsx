import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import SignatureCanvas from 'react-signature-canvas';
import Button from '../ui/Button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PDFDocument } from 'pdf-lib';
import { DocumentService } from '../../src/services/DocumentService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


const PublicSignature: React.FC = () => {
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const documentRef = useRef<HTMLDivElement>(null);

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
          patients(name, cpf),
          template:document_templates(variable_mapping)
        `)
        .eq('id', id)
        .single();

      if (err || !data) throw new Error('Documento não encontrado');
      
      // Fallback robusto para nome do paciente e CPF
      if (data.content) {
        if (!data.patients?.name && !data.patient_name) {
          // Tenta encontrar "Paciente:" seguido de qualquer coisa até o próximo < ou quebra de linha
          const nameRegexes = [
            /Paciente:\s*(?:<strong>)?([^<|\n]+)/i,
            /Nome:\s*(?:<strong>)?([^<|\n]+)/i,
            /<strong>([^<]+)<\/strong>\s*\(Paciente\)/i
          ];
          
          for (const regex of nameRegexes) {
            const match = data.content.match(regex);
            if (match && match[1] && match[1].trim().length > 3) {
              data.patient_name = match[1].trim().replace(/&nbsp;/g, ' ');
              break;
            }
          }
        }

        if (!data.patients?.cpf && !data.patient_cpf) {
          const cpfRegexes = [
            /CPF:\s*(?:<strong>)?(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i,
            /CPF:\s*(?:<strong>)?([^<|\n]+)/i
          ];

          for (const regex of cpfRegexes) {
            const match = data.content.match(regex);
            if (match && match[1]) {
              data.patient_cpf = match[1].trim().replace(/&nbsp;/g, ' ');
              break;
            }
          }
        }
      }
      
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

      // 3. Update local state to show success screen immediately
      setDoc(prev => ({
        ...prev,
        status: 'signed',
        signed_at: new Date().toISOString(),
        file_url: finalFileUrl,
        signature_data: signatureData
      }));
      
      setIsSigned(true);
    } catch (err: any) {
      console.error('Error saving signature:', err);
      alert('Erro ao salvar assinatura: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };


  const handleDownloadPDF = async () => {
    if (doc.file_url && doc.file_url.toLowerCase().includes('.pdf')) {
      window.open(doc.file_url, '_blank');
      return;
    }

    if (!documentRef.current) return;
    
    setIsExporting(true);
    try {
      const element = documentRef.current;
      
      // Garantir que estamos no topo para a captura
      const originalScrollTop = window.scrollY;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(element, {
        scale: 3, // Aumentar escala para melhor qualidade
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('pdf-capture-container');
          if (el) {
            // Injetar estilos CSS para forçar layout de impressão e evitar quebras
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              #pdf-capture-container { 
                padding: 0 !important;
                margin: 0 !important;
                width: 210mm !important;
              }
              .prose { 
                max-width: none !important;
                width: 100% !important;
              }
              .prose p, .prose h1, .prose h2, .prose h3, .grid, .flex {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              p { margin-bottom: 1rem !important; line-height: 1.6 !important; }
            `;
            clonedDoc.head.appendChild(style);

            el.style.opacity = '1';
            el.style.height = 'auto';
            el.style.position = 'static';
            el.style.display = 'block';
            el.style.visibility = 'visible';
          }
        }
      });
      
      window.scrollTo(0, originalScrollTop);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Adicionar primeira página
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Adicionar páginas extras se necessário
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${doc.title.replace(/\s+/g, '_')}_Assinado.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isSigned) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mb-4 animate-bounce">
              <span className="material-symbols-outlined text-5xl">check_circle</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documento Assinado!</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Obrigado, <span className="font-bold text-gray-700 dark:text-gray-300">{doc.patients?.name || doc.patient_name || 'Paciente'}</span>.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-sm text-left overflow-hidden shadow-xl shadow-gray-200/50 dark:shadow-none">
            <div className="h-1.5 w-full bg-green-600" />
            <div className="p-5 space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Documento</span>
                <p className="font-semibold text-gray-900 dark:text-white line-clamp-1">{doc.title}</p>
              </div>
              
              <div className="flex justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Data</span>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    {format(new Date(doc.signed_at || new Date()), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Status</span>
                  <p className="text-green-600 font-bold flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                    Autenticado
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-50 dark:border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">ID de Autenticidade</span>
                <p className="font-mono text-[10px] text-gray-400 break-all select-all">{doc.id}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button 
              variant="primary" 
              onClick={handleDownloadPDF} 
              isLoading={isExporting}
              className="w-full gap-2 py-6 rounded-2xl text-lg shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined">download</span>
              Baixar Cópia em PDF
            </Button>
            
            <p className="text-xs text-gray-400">
              Você pode fechar esta aba agora.
            </p>
          </div>
        </div>

        <div 
          id="pdf-capture-container"
          className="absolute top-0 left-0 -z-[100] opacity-0 pointer-events-none overflow-visible" 
          style={{ width: '210mm' }}
        >
          <div 
            ref={documentRef}
            className="bg-white p-12 w-[210mm] text-gray-900 flex flex-col"
            style={{ minHeight: '297mm' }}
          >
            {/* Papel Timbrado */}
            <div className="mb-12 border-b-2 border-[#8B7355] pb-6 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-serif font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  Dra. Isabela Rossetti
                  <span className="material-symbols-outlined text-green-600 text-xl">verified</span>
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

            <div className="mb-10 text-center">
              <h1 className="text-xl font-bold uppercase tracking-tight text-gray-900">{doc.title}</h1>
              <div className="mt-6 flex border border-[#ead9c8] rounded-sm overflow-hidden text-left text-[11px] mb-8">
                <div className="flex-1 p-3 bg-[#fdf9f3] border-r border-[#ead9c8]">
                  <p className="text-gray-600 mb-1">Paciente:</p>
                  <p className="font-bold text-gray-900 uppercase">{doc.patients?.name || doc.patient_name || '-'}</p>
                </div>
                <div className="w-1/3 p-3 bg-[#fdf9f3] border-r border-[#ead9c8]">
                  <p className="text-gray-600 mb-1">CPF:</p>
                  <p className="font-bold text-gray-900">{doc.patients?.cpf || doc.patient_cpf || '-'}</p>
                </div>
                <div className="w-1/4 p-3 bg-[#fdf9f3]">
                  <p className="text-gray-600 mb-1">Data:</p>
                  <p className="font-bold text-gray-900">
                    {format(new Date(doc.signed_at || new Date()), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="flex-1 prose max-w-none font-serif text-[15px] text-gray-800 text-justify mb-12"
              dangerouslySetInnerHTML={{ __html: doc.content || '' }}
            />

            <div className="mt-auto pt-12 border-t-2 border-[#fdf9f3]">
              <div className="flex gap-8">
                <div className="flex-1 p-6 bg-[#fdf9f3] border border-[#ead9c8] rounded-md relative min-h-[160px] flex flex-col justify-end">
                  {doc.signature_data && (
                    <div className="absolute top-4 left-4 right-4 bottom-12 flex items-center justify-center">
                      <img 
                        src={doc.signature_data} 
                        alt="Assinatura" 
                        className="max-h-24 object-contain"
                      />
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#8B7355]/30 text-center">
                    <p className="text-[11px] font-bold text-gray-900 uppercase">{doc.patients?.name || doc.patient_name || '-'}</p>
                    <p className="text-[9px] text-[#8B7355] uppercase mt-0.5">Assinatura do Paciente</p>
                  </div>
                </div>
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

            {/* Authentication Band */}
            <div className="mt-12 bg-[#F0FDF4] border-t-2 border-green-600 p-8">
              <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-6 border-r border-green-200 pr-8">
                  <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-3xl">verified_user</span>
                  </div>
                  <div>
                    <h4 className="text-green-800 font-black uppercase text-[13px] tracking-[0.2em] mb-1">Documento Autenticado</h4>
                    <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Protocolo de Segurança Ativo</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-x-12 gap-y-3">
                  <div className="space-y-1">
                    <p className="text-[9px] text-green-700/60 font-bold uppercase tracking-wider">Data e Hora</p>
                    <p className="text-[11px] text-gray-700 font-medium">
                      {doc.signed_at 
                        ? format(new Date(doc.signed_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
                        : format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
                      }
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-green-700/60 font-bold uppercase tracking-wider">ID de Autenticidade</p>
                    <p className="text-[11px] text-gray-700 font-mono uppercase tracking-tight">{doc.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 sticky top-0 z-10 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">description</span>
        </div>
        <div>
          <h1 className="font-bold text-gray-900 dark:text-white line-clamp-1">{doc.title}</h1>
          <p className="text-xs text-gray-500">Para: {doc.patients?.name || doc.patient_name || 'Paciente'}</p>
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

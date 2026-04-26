import React, { useState, useEffect, useRef } from 'react';
import { DocumentService } from '../../src/services/DocumentService';
import Button from '../ui/Button';
import { DocumentTemplate } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';


// Custom Toolbar for React Quill - Defined outside to prevent unnecessary re-renders
const quillModules = {
  toolbar: {
    container: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ]
  },
  clipboard: {
    matchVisual: false,
  },
  history: {
    delay: 1000,
    maxStack: 100,
    userOnly: true
  }
};

const quillFormats = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet', 'indent',
  'link', 'image', 'color', 'background', 'align'
];

interface TemplateManagerProps {
  onBack?: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ onBack }) => {
  const quillRef = useRef<any>(null);

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [templateType, setTemplateType] = useState<'text' | 'pdf'>('text');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const editorContainerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await DocumentService.getTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template?: DocumentTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTitle(template.title);
      setSubtitle(template.subtitle || '');
      setContent(template.content);
      setTemplateType(template.type || 'text');
      setPdfUrl(template.file_url || '');
    } else {
      setEditingTemplate(null);
      setTitle('');
      setSubtitle('');
      setContent('<p><br></p>');
      setTemplateType('text');
      setPdfFile(null);
      setPdfUrl('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalFileUrl = pdfUrl;

      if (templateType === 'pdf' && pdfFile) {
        finalFileUrl = await DocumentService.uploadTemplateFile(pdfFile);
      }

      if (editingTemplate) {
        await DocumentService.updateTemplate(editingTemplate.id, {
          title,
          subtitle,
          content: templateType === 'text' ? content : '',
          type: templateType,
          file_url: finalFileUrl
        });
      } else {
        await DocumentService.createTemplate({
          title,
          subtitle,
          content: templateType === 'text' ? content : '',
          type: templateType,
          file_url: finalFileUrl,
          clinic_id: '' // Handled by service
        });
      }
      loadTemplates();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert(error.message || 'Erro ao salvar modelo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;
    try {
      await DocumentService.deleteTemplate(id);
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Erro ao excluir modelo');
    }
  };




  // Initialize Quill manually for React 19 compatibility
  useEffect(() => {
    if (isModalOpen && templateType === 'text') {
      const timer = setTimeout(() => {
        if (editorContainerRef.current && !quillRef.current) {
          const quill = new Quill(editorContainerRef.current, {
            theme: 'snow',
            modules: quillModules,
            formats: quillFormats,
            placeholder: 'Digite o texto do documento aqui...'
          });

          quill.root.innerHTML = content || '<p><br></p>';
          
          if (!content || content === '<p><br></p>') {
            setContent(quill.root.innerHTML);
          }

          quill.on('text-change', () => {
            setContent(quill.root.innerHTML);
          });

          quillRef.current = quill;
        }
      }, 100);
      return () => {
        clearTimeout(timer);
        quillRef.current = null;
      };
    }
  }, [isModalOpen, templateType]);

  // Helper to check if content is effectively empty (ignoring empty HTML tags)
  const isContentEmpty = (html: string) => {
    if (!html || html === '<p><br></p>') return true;
    // Remove tags and common empty characters
    const stripped = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').replace(/\s/g, '').trim();
    return stripped.length === 0;
  };

  const insertVariable = (variable: string) => {
    const quill = quillRef.current;
    if (quill) {
      const range = quill.getSelection(true);
      quill.insertText(range.index, `{{${variable}}}`);
      quill.setSelection(range.index + variable.length + 4);
    } else {
      setContent(prev => prev + ` {{${variable}}}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modelos de Documentos</h1>
            <p className="text-gray-500">Gerencie os termos e documentos para assinatura</p>
          </div>
        </div>        <div className="flex items-center gap-6">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl shadow-inner">
            <button 
              onClick={() => setViewMode('card')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 ${
                viewMode === 'card' 
                ? 'bg-white dark:bg-gray-700 text-primary shadow-md scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="material-symbols-outlined text-xl">grid_view</span>
              <span className="text-xs font-bold uppercase tracking-wider">Cards</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 ${
                viewMode === 'list' 
                ? 'bg-white dark:bg-gray-700 text-primary shadow-md scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="material-symbols-outlined text-xl">view_list</span>
              <span className="text-xs font-bold uppercase tracking-wider">Lista</span>
            </button>
          </div>

          <Button 
            variant="primary" 
            onClick={() => handleOpenModal()}
            className="gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Novo Modelo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          <p className="text-gray-500 font-medium">Carregando modelos...</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div 
              key={template.id}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-primary/20 transition-all group flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  template.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'
                }`}>
                  <span className="material-symbols-outlined text-2xl">
                    {template.type === 'pdf' ? 'picture_as_pdf' : 'description'}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

                  <button 
                    onClick={() => handleOpenModal(template)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-blue-500 transition-colors"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(template.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                    title="Excluir"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                    {template.title}
                  </h3>
                  {template.type === 'pdf' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-bold">PDF</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                  {template.type === 'pdf' ? 'Modelo baseado em arquivo PDF configurado para preenchimento de variáveis.' : template.content}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  Atualizado em {format(new Date(template.updated_at || template.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Título do Modelo</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Última Atualização</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {templates.map(template => (
                <tr key={template.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      template.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'
                    }`}>
                      <span className="material-symbols-outlined text-lg">
                        {template.type === 'pdf' ? 'picture_as_pdf' : 'description'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                      {template.title}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 max-w-xs truncate">
                      {template.type === 'pdf' ? 'Arquivo PDF mapeado' : template.content.substring(0, 60) + '...'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(template.updated_at || template.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">

                      <button 
                        onClick={() => handleOpenModal(template)}
                        className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-blue-500 transition-all shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(template.id)}
                        className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-red-500 transition-all shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                        title="Excluir"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-gray-50 dark:bg-gray-800/20 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            <span className="material-symbols-outlined text-4xl">folder_off</span>
          </div>
          <div className="text-center">
            <h3 className="font-bold text-gray-900 dark:text-white">Nenhum modelo encontrado</h3>
            <p className="text-sm text-gray-500 mt-1">Comece criando seu primeiro modelo de documento.</p>
          </div>
          <Button variant="primary" onClick={() => handleOpenModal()} className="mt-2">
            Criar Primeiro Modelo
          </Button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingTemplate ? 'Editar Modelo' : 'Novo Modelo'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Título do Modelo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Termo de Consentimento - Botox"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Procedimento / Subtítulo
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Ex: Aplicação de Toxina Botulínica"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Tipo de Modelo</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setTemplateType('text')}
                    className={`flex-1 p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                      templateType === 'text' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-gray-100 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    <span className="material-symbols-outlined">subject</span>
                    <div className="text-left">
                      <div className="font-bold">Texto / Editor</div>
                      <div className="text-[10px] opacity-60">Criar do zero no sistema</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setTemplateType('pdf')}
                    className={`flex-1 p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                      templateType === 'pdf' 
                      ? 'border-red-500 bg-red-50 text-red-600' 
                      : 'border-gray-100 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                    <div className="text-left">
                      <div className="font-bold">Upload de PDF</div>
                      <div className="text-[10px] opacity-60">Usar arquivo existente</div>
                    </div>
                  </button>
                </div>
              </div>

              {templateType === 'text' ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Conteúdo do Documento</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => insertVariable('nome_paciente')}
                        className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded text-gray-600"
                      >
                        + Nome Paciente
                      </button>
                      <button 
                        onClick={() => insertVariable('cpf_paciente')}
                        className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded text-gray-600"
                      >
                        + CPF Paciente
                      </button>
                      <button 
                        onClick={() => insertVariable('data_hoje')}
                        className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded text-gray-600"
                      >
                        + Data Atual
                      </button>
                      <button 
                        onClick={() => insertVariable('data_procedimento')}
                        className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded text-gray-600"
                      >
                        + Data Procedimento
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-950 p-8 rounded-xl border border-gray-200 dark:border-gray-800 overflow-y-auto max-h-[600px]">
                    <div className="max-w-[210mm] mx-auto bg-white dark:bg-gray-900 shadow-xl min-h-[297mm] p-12 flex flex-col">
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
                      <div className="mb-10 text-center w-full">
                        <h1 className="text-xl font-bold uppercase tracking-[0.15em] text-gray-900 mb-2">
                          {title || 'Título do Documento'}
                        </h1>
                        <p className="text-[10px] text-[#8B7355] font-bold uppercase tracking-[0.2em] mb-8">
                          {subtitle || 'Procedimento / Subtítulo'}
                        </p>
                        
                        {/* Patient Info Cards Layout - Fixed Structure */}
                        <div className="flex w-full border border-[#ead9c8] rounded-sm overflow-hidden text-left text-[11px]">
                          <div className="flex-[2] p-3 bg-[#fdf9f3] border-r border-[#ead9c8]">
                            <p className="text-gray-400 text-[9px] uppercase font-bold tracking-wider mb-1">Paciente:</p>
                            <p className="font-bold text-gray-900 uppercase">{"{{NOME_PACIENTE}}"}</p>
                          </div>
                          <div className="flex-1 p-3 bg-[#fdf9f3] border-r border-[#ead9c8]">
                            <p className="text-gray-400 text-[9px] uppercase font-bold tracking-wider mb-1">CPF:</p>
                            <p className="font-bold text-gray-900">{"{{CPF_PACIENTE}}"}</p>
                          </div>
                          <div className="flex-1 p-3 bg-[#fdf9f3]">
                            <p className="text-gray-400 text-[9px] uppercase font-bold tracking-wider mb-1">Data:</p>
                            <p className="font-bold text-gray-900">{"{{DATA_PROCEDIMENTO}}"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 mb-12 min-h-[600px] quill-premium">
                        <style>{`
                          .quill-premium .ql-container {
                            border: none !important;
                            font-family: serif !important;
                            font-size: 15px !important;
                            height: auto !important;
                            min-height: 500px !important;
                          }
                          .quill-premium .ql-editor {
                            padding: 0 !important;
                            min-height: 500px;
                            color: #1f2937;
                            line-height: 1.6;
                          }
                          .quill-premium .ql-toolbar {
                            border: 1px solid #e5e7eb !important;
                            border-radius: 8px !important;
                            margin-bottom: 20px !important;
                            background: white !important;
                            position: sticky;
                            top: 0;
                            z-index: 10;
                          }
                          .dark .quill-premium .ql-toolbar {
                            background: #1f2937 !important;
                            border-color: #374151 !important;
                          }
                          .dark .quill-premium .ql-editor {
                            color: #f3f4f6;
                          }
                        `}</style>
                        <div 
                          ref={editorContainerRef} 
                          className="h-full min-h-[500px]"
                        ></div>
                      </div>

                      {/* Premium Footer with Signature Cards */}
                      <div className="mt-auto pt-12">
                        <div className="grid grid-cols-2 gap-8 w-full">
                          {/* Patient Signature Card */}
                          <div className="bg-[#fdf9f3] border border-[#ead9c8] p-6 rounded-sm text-center flex flex-col h-full">
                            <div className="flex-1 flex flex-col items-center justify-center min-h-[160px] border border-dashed border-[#ead9c8]/50 rounded mb-4 bg-white/40">
                              <span className="text-[#8B7355]/30 text-[9px] uppercase font-bold tracking-[0.2em] px-4 text-center">
                                Espaço para Assinatura do Paciente
                              </span>
                            </div>
                            <div className="pt-3 border-t border-[#ead9c8]">
                              <p className="text-[12px] font-bold text-gray-900 uppercase mb-1">{"{{NOME_PACIENTE}}"}</p>
                              <p className="text-[9px] text-[#8B7355] uppercase font-bold tracking-widest">Assinatura do Paciente</p>
                            </div>
                          </div>

                          {/* Professional Signature Card */}
                          <div className="bg-[#fdf9f3] border border-[#ead9c8] p-6 rounded-sm text-center flex flex-col h-full justify-between">
                            <div className="flex-1 flex flex-col items-center justify-center py-6">
                              <p className="text-[14px] font-bold text-gray-900 uppercase tracking-widest mb-1">Dra. Isabela Rossetti</p>
                              <p className="text-[10px] text-[#8B7355] font-bold mb-4 tracking-tight">CRM/SP 123456 • CFM 78910</p>
                              <div className="w-12 h-[1px] bg-[#ead9c8] mb-4"></div>
                              <p className="text-[9px] text-gray-500 uppercase font-bold tracking-[0.15em] leading-loose">
                                Responsável Técnico
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-8 pt-4 border-t border-gray-100 text-center">
                          <p className="text-[9px] text-gray-400 uppercase tracking-widest">
                            Este documento foi gerado eletronicamente e possui validade jurídica
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Arquivo PDF</label>
                  {pdfUrl && !pdfFile ? (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">Arquivo carregado</span>
                      </div>
                      <button 
                        onClick={() => { setPdfUrl(''); setPdfFile(null); }}
                        className="text-xs text-red-500 font-bold"
                      >
                        Substituir
                      </button>
                    </div>
                  ) : (
                    <div className="relative group">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="p-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center gap-4 group-hover:border-primary/50 group-hover:bg-primary/5 transition-all">
                        <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-primary group-hover:bg-white dark:group-hover:bg-gray-700 transition-all">
                          <span className="material-symbols-outlined text-4xl">upload_file</span>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {pdfFile ? pdfFile.name : 'Clique para subir o PDF'}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Apenas arquivos PDF são aceitos</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-3">
                    <span className="material-symbols-outlined text-blue-600">info</span>
                    <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                      Ao subir um PDF, o sistema adicionará automaticamente um cabeçalho com os dados do paciente (Nome, CPF e Data) no topo da primeira página antes de solicitar a assinatura.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSave} 
                isLoading={isSaving}
                disabled={
                  !title.trim() || 
                  (templateType === 'text' && isContentEmpty(content)) || 
                  (templateType === 'pdf' && !pdfUrl && !pdfFile)
                }
              >
                Salvar Modelo
              </Button>
            </div>
          </div>
        </div>
      )}


    </div>

  );
};

export default TemplateManager;

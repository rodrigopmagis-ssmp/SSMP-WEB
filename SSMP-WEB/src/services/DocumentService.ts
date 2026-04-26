import { supabase } from '../../lib/supabase';
import { DocumentTemplate, PatientDocument, Signature } from '../../types';

export const DocumentService = {
  async _getUserContext() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('DocumentService: No authenticated user found');
      return { clinicId: null, role: null };
    }
    const { data: profile, error } = await supabase.from('profiles').select('clinic_id, role').eq('id', user.id).single();
    if (error) {
      console.error('DocumentService: Error fetching profile:', error);
      return { clinicId: null, role: null };
    }
    return { clinicId: profile?.clinic_id, role: profile?.role };
  },

  async _getClinicId() {
    const { clinicId } = await this._getUserContext();
    return clinicId;
  },

  async getTemplates() {
    const { clinicId, role } = await this._getUserContext();
    const query = supabase.from('document_templates').select('*');
    
    // Se não for master, filtra pela clínica. Se for master, vê tudo.
    if (clinicId && role !== 'master') {
      query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query.order('title');
    if (error) throw error;
    return data as DocumentTemplate[];
  },

  async createTemplate(template: Omit<DocumentTemplate, 'id' | 'created_at' | 'updated_at'>) {
    const resolvedClinicId = template.clinic_id || await this._getClinicId();
    
    if (!resolvedClinicId) {
      const errorMsg = 'Não foi possível identificar a clínica do usuário. Verifique seu perfil.';
      console.error('DocumentService:', errorMsg);
      throw new Error(errorMsg);
    }

    const { data, error } = await supabase
      .from('document_templates')
      .insert({ 
        title: template.title,
        subtitle: template.subtitle,
        content: template.content,
        type: template.type || 'text',
        file_url: template.file_url,
        variable_mapping: template.variable_mapping,
        clinic_id: resolvedClinicId 
      })
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error in createTemplate:', error);
      throw error;
    }
    return data as DocumentTemplate;
  },

  async updateTemplate(id: string, template: Partial<Omit<DocumentTemplate, 'id' | 'created_at' | 'updated_at'>>) {
    const { data, error } = await supabase
      .from('document_templates')
      .update(template)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Supabase error in updateTemplate:', error);
      throw error;
    }
    return data as DocumentTemplate;
  },

  async uploadTemplateFile(file: File) {
    const clinicId = await this._getClinicId();
    if (!clinicId) throw new Error('Clinic ID not found');

    const fileExt = file.name.split('.').pop();
    const fileName = `${clinicId}/${Date.now()}.${fileExt}`;
    const filePath = `templates/${fileName}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async deleteTemplate(id: string) {
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getPatientDocuments() {
    const clinicId = await this._getClinicId();
    const query = supabase.from('patient_documents').select('*, patients(name, phone, cpf), document_templates(title, subtitle, variable_mapping)');
    
    if (clinicId) {
      query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase error in getPatientDocuments:', error);
      throw error;
    }
    return data;
  },

  async getDocumentsByPatient(patientId: string) {
    const { data, error } = await supabase
      .from('patient_documents')
      .select('*, patients(name, phone, cpf), document_templates(title, subtitle)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error in getDocumentsByPatient:', error);
      throw error;
    }
    return data;
  },

  async createDocument(doc: Omit<PatientDocument, 'id' | 'created_at'>) {
    const clinic_id = doc.clinic_id || await this._getClinicId();
    const { data, error } = await supabase
      .from('patient_documents')
      .insert({ 
        ...doc, 
        clinic_id: clinic_id || undefined,
        patient_name: (doc as any).patient_name,
        patient_cpf: (doc as any).patient_cpf
      })
      .select('*, patients(name, phone)')
      .single();
    if (error) {
      console.error('Supabase error in createDocument:', error);
      throw error;
    }
    return data as PatientDocument;
  },

  async updateDocumentStatus(id: string, status: PatientDocument['status']) {
    const { error } = await supabase
      .from('patient_documents')
      .update({ status, signed_at: status === 'signed' ? new Date().toISOString() : null })
      .eq('id', id);
    if (error) {
      console.error('Supabase error in updateDocumentStatus:', error);
      throw error;
    }
  },

  async updateDocument(id: string, updates: Partial<PatientDocument>) {
    const { data, error } = await supabase
      .from('patient_documents')
      .update(updates)
      .eq('id', id)
      .select('*, patients(name, phone)')
      .single();
    if (error) {
      console.error('Supabase error in updateDocument:', error);
      throw error;
    }
    return data as PatientDocument;
  },

  async deleteDocument(id: string) {
    const { error } = await supabase
      .from('patient_documents')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async signDocument(documentId: string, signatureData: string) {
    const now = new Date().toISOString();
    
    // 1. Get document to get clinic_id
    const { data: docData } = await supabase
      .from('patient_documents')
      .select('clinic_id')
      .eq('id', documentId)
      .single();

    const clinicId = docData?.clinic_id;

    // 2. Update document status and signature data
    const { error: docError } = await supabase
      .from('patient_documents')
      .update({ 
        status: 'signed', 
        signed_at: now,
        signature_data: signatureData 
      })
      .eq('id', documentId);

    if (docError) {
      console.error('Error updating document status:', docError);
      throw docError;
    }

    // 3. Insert signature audit record
    const { error: sigError } = await supabase
      .from('signatures')
      .insert({
        document_id: documentId,
        clinic_id: clinicId,
        signature_data: signatureData,
        signed_at: now,
        ip_address: 'local-auth',
        user_agent: window.navigator.userAgent
      });

    if (sigError) {
      console.error('Error creating signature record:', sigError);
      // We don't throw here to avoid failing the whole process if the audit log fails
    }
  },

  async saveSignature(signature: Omit<Signature, 'id' | 'signed_at'>) {
    // 1. Save signature
    const { data, error: sigError } = await supabase
      .from('signatures')
      .insert(signature)
      .select()
      .single();
    if (sigError) throw sigError;

    // 2. Update document status
    await this.updateDocumentStatus(signature.document_id, 'signed');

    return data as Signature;
  },

  async sendToWhatsApp(documentId: string, patientName: string, phoneNumber: string) {
    try {
      // Já que temos um Trigger no Supabase, não precisamos chamar o Webhook pelo Frontend (evita erro de CORS)
      // Apenas atualizamos o campo 'sent_at' e o status, o que disparará o envio pelo Banco de Dados.
      
      const { error: updateError } = await supabase
        .from('patient_documents')
        .update({ 
          sent_at: new Date().toISOString(),
          status: 'pending'
        })
        .eq('id', documentId);

      if (updateError) throw updateError;
    } catch (error: any) {
      console.error('Error in sendToWhatsApp:', error);
      throw error;
    }
  }
};

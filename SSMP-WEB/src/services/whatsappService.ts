import axios from 'axios';
import { supabase } from '../lib/supabase';

const N8N_WH_OUTBOUND = 'https://prehistoricseahorse-n8n.cloudfy.live/webhook-test/TesteAngravity';
const STORAGE_BUCKET = 'whatsapp-media';

export interface WhatsAppMessage {
    negocioId: string;
    to: string;
    text?: string;
    fileContent?: string; // base64 fallback
    fileName?: string;
    mediaUrl?: string;    // URL pública do arquivo no Supabase Storage
    mediaMimetype?: string; // MIME type real do arquivo
    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'file';
    clinicId?: string;
    senderId?: string;
    leadId?: string;
    caption?: string;
}

export const whatsappService = {
    /**
     * Faz upload de um arquivo para o Supabase Storage e retorna a URL pública.
     * Usa o bucket 'whatsapp-media' (deve existir e ser público).
     */
    async uploadToStorage(file: File, clinicId?: string): Promise<string | null> {
        try {
            const ext = file.name.split('.').pop() || 'bin';
            const path = `${clinicId || 'shared'}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

            const { error } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(path, file, { upsert: false });

            if (error) {
                console.warn('Supabase Storage upload failed, falling back to base64:', error.message);
                return null;
            }

            const { data } = supabase.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(path);

            return data?.publicUrl || null;
        } catch (e) {
            console.warn('Upload to storage failed:', e);
            return null;
        }
    },

    async sendMessage(message: WhatsAppMessage, customWebhookUrl?: string) {
        const url = customWebhookUrl || N8N_WH_OUTBOUND;
        const response = await axios.post(url, {
            ...message,
            timestamp: new Date().toISOString()
        });

        // O n8n pode retornar HTTP 200 mas com success=false no corpo
        const data = response.data;
        if (data && data.success === false) {
            const msg = data.error || 'Não foi possível enviar a mensagem via WhatsApp.';
            throw new Error(msg);
        }

        return data;
    },

    async sendFile(params: {
        negocioId: string;
        to: string;
        file: File;
        clinicId?: string;
        senderId?: string;
        leadId?: string;
        caption?: string;
    }, customWebhookUrl?: string): Promise<{ mediaUrl: string | null }> {
        const { negocioId, to, file, clinicId, senderId, leadId } = params;

        const type: WhatsAppMessage['type'] =
            file.type.startsWith('image/') ? 'image' :
                file.type.startsWith('audio/') || file.name.endsWith('.webm') ? 'audio' :
                    file.type.startsWith('video/') ? 'video' : 'document';

        // 1. Upload to Supabase Storage (URL pública permanente)
        const mediaUrl = await this.uploadToStorage(file, clinicId);

        // 2. Base64 APENAS como fallback quando upload falhou
        //    (arquivo de áudio em base64 é muito grande para webhook do n8n)
        let base64Content: string | undefined = undefined;
        if (!mediaUrl) {
            base64Content = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const result = reader.result?.toString();
                    if (!result) return reject(new Error('Falha ao processar o arquivo.'));
                    resolve(result.split(',')[1]);
                };
                reader.onerror = reject;
            });
        }

        // 3. Enviar ao n8n: prioriza URL, base64 só como fallback
        await this.sendMessage({
            negocioId,
            to,
            fileName: file.name,
            fileContent: base64Content,          // undefined se tiver URL
            mediaUrl: mediaUrl || undefined,
            mediaMimetype: file.type || undefined,
            type,
            clinicId,
            senderId,
            leadId,
            caption: params.caption
        }, customWebhookUrl);

        return { mediaUrl };
    }
};

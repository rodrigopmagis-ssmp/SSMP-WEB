import axios from 'axios';

const N8N_WH_OUTBOUND = 'https://prehistoricseahorse-n8n.cloudfy.live/webhook-test/TesteAngravity';

export interface WhatsAppMessage {
    negocioId: string;
    to: string; // WhatsApp number
    text?: string;
    fileContent?: string; // base64 if sending attachment
    fileName?: string;
    type: 'text' | 'file';
}

export const whatsappService = {
    async sendMessage(message: WhatsAppMessage) {
        try {
            const response = await axios.post(N8N_WH_OUTBOUND, {
                ...message,
                timestamp: new Date().toISOString()
            });
            return response.data;
        } catch (error) {
            console.error('Error sending WhatsApp message via n8n:', error);
            throw error;
        }
    },

    async sendFile(negocioId: string, to: string, file: File) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Content = reader.result?.toString().split(',')[1];
                try {
                    const result = await this.sendMessage({
                        negocioId,
                        to,
                        fileName: file.name,
                        fileContent: base64Content,
                        type: 'file'
                    });
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (error) => reject(error);
        });
    }
};

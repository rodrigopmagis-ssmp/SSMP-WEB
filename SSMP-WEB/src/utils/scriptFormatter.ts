
export const cleanAndFormatScript = (template: string, patientName: string) => {
    if (!template) return '';

    let text = template;

    // Replace placeholders - Support both formats
    text = text.replace(/#NomePaciente/g, patientName)
        .replace(/\[Nome\]/g, patientName)
        .replace(/#NomeClinica/g, 'Aesthetic Clinic')
        .replace(/\[NomeClinica\]/g, 'Aesthetic Clinic');

    // Fix formatting for WhatsApp 
    // Markdown uses **bold**, WhatsApp uses *bold*
    text = text.replace(/\*\*/g, '*');

    // Remove specific garbage characters (Replacement Character)
    // eslint-disable-next-line
    text = text.replace(new RegExp(String.fromCharCode(65533), 'g'), '');

    // Fallback for direct unicode usage if needed, but regex above handles \uFFFD
    text = text.replace(/\uFFFD/g, '');

    return text.trim();
};

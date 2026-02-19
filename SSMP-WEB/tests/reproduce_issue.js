
const scheduleBlocks = [
    {
        id: 'block_1',
        clinic_id: 'clinic_1',
        professional_id: 'amanda_dias_id',
        date: '2026-02-25',
        start_time: '09:00:00',
        end_time: '18:00:00',
        is_clinic_wide: false,
        is_full_day: true,
        reason: 'Folga',
        created_by: 'user_1',
        created_at: '2026-02-18T00:00:00Z',
        updated_at: '2026-02-18T00:00:00Z'
    }
];

const formData = {
    patient_id: 'patient_1',
    professional_id: 'amanda_dias_id',
    title: 'Consulta',
    start_time: '2026-02-25T12:30',
    end_time: '2026-02-25T13:00',
    description: '',
    type: 'Consulta'
};

function validateAppointment() {
    const warnings = [];
    const dateStr = formData.start_time.split('T')[0];
    const startTimeStr = formData.start_time.split('T')[1];
    const endTimeStr = formData.end_time.split('T')[1];

    console.log('Validating Appointment:', {
        dateStr,
        startTimeStr,
        endTimeStr,
        professional_id: formData.professional_id
    });

    console.log('Loaded Schedule Blocks:', scheduleBlocks.length);

    const conflictingBlock = scheduleBlocks.find(block => {
        console.log(`Checking block ${block.id}:`, {
            blockDate: block.date,
            blockProfId: block.professional_id,
            isClinicWide: block.is_clinic_wide,
            isFullDay: block.is_full_day,
            blockStart: block.start_time,
            blockEnd: block.end_time
        });

        if (block.date !== dateStr) {
            console.log('Date mismatch');
            return false;
        }

        const isClinicWide = block.is_clinic_wide;
        const isTargetProfessional = block.professional_id === formData.professional_id;

        console.log(`isClinicWide: ${isClinicWide}, isTargetProfessional: ${isTargetProfessional}`);

        if (!isClinicWide && !isTargetProfessional && block.professional_id) {
            console.log('Professional mismatch (skipping)');
            return false;
        }

        if (block.is_full_day) {
            console.log('Full day block -> CONFLICT');
            return true;
        }

        if (block.start_time && block.end_time) {
            const blockStart = block.start_time.substring(0, 5);
            const blockEnd = block.end_time.substring(0, 5);

            console.log(`Comparing time: ${startTimeStr} < ${blockEnd} && ${endTimeStr} > ${blockStart}`);

            const isOverlap = (startTimeStr < blockEnd && endTimeStr > blockStart);
            if (isOverlap) console.log('Time overlap -> CONFLICT');
            return isOverlap;
        }
        return false;
    });

    if (conflictingBlock) {
        warnings.push(`Bloqueio de agenda: ${conflictingBlock.reason || 'Sem motivo'}`);
    }

    return warnings;
}

const result = validateAppointment();
console.log('Validation Result:', result);

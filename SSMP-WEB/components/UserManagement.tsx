import React, { useState, useEffect } from 'react';
import { supabaseService } from '../src/services/supabaseService';
import { UserProfile } from '../types';

interface UserManagementProps {
    onBack: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
    const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [profilesData, clinicsData] = await Promise.all([
                supabaseService.getAllProfiles(),
                supabaseService.getAllClinics()
            ]);

            if (profilesData) setProfiles(profilesData as UserProfile[]);
            if (clinicsData) setClinics(clinicsData);
        } catch (error) {
            console.error("Error loading data", error);
            alert("Erro ao carregar dados. Verifique se você é administrador.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (userId: string, status: 'approved' | 'rejected', role: string = 'doctor', clinicId?: string) => {
        try {
            await supabaseService.updateProfileStatus(userId, status, role, clinicId);

            setProfiles(prev => prev.map(p =>
                p.id === userId ? { ...p, status, role: role as any, clinic_id: clinicId } : p
            ));
        } catch (error) {
            console.error("Error updating status", error);
            alert("Erro ao atualizar status.");
        }
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        try {
            await supabaseService.updateUserProfile(editingUser.id, {
                full_name: editingUser.full_name,
                role: editingUser.role,
                clinic_id: editingUser.clinic_id
            });

            setProfiles(prev => prev.map(p =>
                p.id === editingUser.id ? editingUser : p
            ));
            setEditingUser(null);
        } catch (error) {
            console.error("Error updating user", error);
            alert("Erro ao salvar alterações do usuário.");
        }
    };

    const filteredProfiles = Array.isArray(profiles) ? profiles.filter(p => p.status === tab) : [];

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (e) {
            return 'Data inválida';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciamento de Usuários</h1>
                    <p className="text-gray-500 dark:text-gray-400">Aprovar cadastros e definir permissões.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-1">
                {['pending', 'approved', 'rejected'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t as any)}
                        className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${tab === t ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        {t === 'pending' ? 'Pendentes' : t === 'approved' ? 'Ativos' : 'Rejeitados'}
                        <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                            {profiles.filter(p => p.status === t).length}
                        </span>
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Carregando usuários e clínicas...</div>
                ) : filteredProfiles.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">group_off</span>
                        <p>Nenhum usuário {tab === 'pending' ? 'pendente' : tab === 'approved' ? 'ativo' : 'rejeitado'}.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4">Email / Nome</th>
                                <th className="p-4">Função</th>
                                <th className="p-4">Clínica</th>
                                <th className="p-4">Data Cadastro</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredProfiles.map(profile => (
                                <tr key={profile.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-gray-900 dark:text-white">{profile.full_name || 'Sem nome'}</div>
                                        <div className="text-sm text-gray-500">{profile.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${profile.role === 'master' ? 'bg-purple-100 text-purple-700' :
                                            profile.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                                profile.role === 'doctor' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {profile.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {clinics.find(c => c.id === profile.clinic_id)?.name || '-'}
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {formatDate(profile.created_at)}
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        {profile.status === 'pending' && (
                                            <>
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex flex-col gap-2">
                                                        <select
                                                            className="px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 w-full"
                                                            defaultValue="doctor"
                                                            id={`role-select-${profile.id}`}
                                                        >
                                                            <option value="doctor">Doutor</option>
                                                            <option value="receptionist">Recepcionista</option>
                                                            <option value="admin">Administrador</option>
                                                        </select>

                                                        <select
                                                            className="px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 w-full"
                                                            defaultValue=""
                                                            id={`clinic-select-${profile.id}`}
                                                        >
                                                            <option value="" disabled>Selecione Clínica</option>
                                                            {clinics.map(clinic => (
                                                                <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                                                            ))}
                                                        </select>

                                                        <button
                                                            onClick={() => {
                                                                const roleSelect = document.getElementById(`role-select-${profile.id}`) as HTMLSelectElement;
                                                                const clinicSelect = document.getElementById(`clinic-select-${profile.id}`) as HTMLSelectElement;
                                                                handleUpdateStatus(profile.id, 'approved', roleSelect.value, clinicSelect.value || undefined);
                                                            }}
                                                            className="inline-flex items-center justify-center px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-sm mr-1">check</span>
                                                            Aprovar
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUpdateStatus(profile.id, 'rejected')}
                                                        className="inline-flex items-center justify-center px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-sm mr-1">close</span>
                                                        Recusar
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                        {profile.status === 'approved' && (
                                            <>
                                                <button
                                                    onClick={() => setEditingUser(profile)}
                                                    className="text-primary hover:text-primary-dark text-sm font-medium mr-2"
                                                >
                                                    <span className="material-symbols-outlined align-middle">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(profile.id, 'rejected')}
                                                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                                                >
                                                    Bloquear
                                                </button>
                                            </>
                                        )}
                                        {profile.status === 'rejected' && (
                                            <button
                                                onClick={() => handleUpdateStatus(profile.id, 'approved')}
                                                className="text-green-500 hover:text-green-700 text-sm font-medium"
                                            >
                                                Reativar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Editar Usuário</h3>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    value={editingUser.full_name || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (não editável)</label>
                                <input
                                    type="text"
                                    value={editingUser.email || ''}
                                    disabled
                                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Função / Cargo</label>
                                <select
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                >
                                    <option value="doctor">Doutor</option>
                                    <option value="receptionist">Recepcionista</option>
                                    <option value="admin">Administrador</option>
                                    <option value="master">Master</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Clínica Vinculada</label>
                                <select
                                    value={editingUser.clinic_id || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, clinic_id: e.target.value || undefined })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                >
                                    <option value="">Sem Clínica Vinculada</option>
                                    {clinics.map(clinic => (
                                        <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Selecione "Sem Clínica" para usuários Master.</p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveUser}
                                className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors shadow-md shadow-primary/20"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;

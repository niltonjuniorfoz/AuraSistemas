import React, { useState } from 'react';
import { Modal } from './Modal';
import { apiFetch } from '../lib/api';

export function QuickGroupModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: (id: string) => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      if (res.ok) {
        // Assume API returns { data: newGroupId, ... } or { id, ... } depending on implementation
        // After success, we tell the parent to re-fetch and set the ID
        const result = await res.json();
        // Look for result.id or result.data?.id
        const newId = result.id || (result.data ? result.data.id : undefined);
        onSuccess(newId);
        handleClose();
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Erro ao criar grupo');
      }
    } catch (e: any) {
      setError('Erro de rede ao criar grupo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Novo Grupo">
      <div className="space-y-4">
        {error && <p className="text-red-400 text-sm overflow-hidden text-ellipsis">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Nome do Grupo *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" autoFocus />
        </div>
        <div className="flex justify-end pt-4 gap-2">
          <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={loading || !name.trim()} className="px-4 py-2 bg-brand-gold text-brand-navydark font-bold rounded-lg hover:bg-brand-goldhover disabled:opacity-50 transition">Salvar</button>
        </div>
      </div>
    </Modal>
  );
}

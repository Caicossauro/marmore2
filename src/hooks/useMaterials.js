import { useState, useEffect, useCallback } from 'react';
import { getMateriais, saveMaterial, deleteMaterial } from '../utils/database';

export const materialVazio = () => ({
  nome: '', tipo: '', acabamento: '', origem: '',
  dimensoes: [{ largura: '', altura: '', espessura: '' }],
  url: '',
});

export const useMaterials = () => {
  const [materiais, setMateriais]   = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      try {
        const dados = await getMateriais();
        if (Array.isArray(dados) && dados.length > 0) setMateriais(dados);
      } catch (e) {
        console.error('Erro ao carregar materiais:', e);
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  const adicionarMaterial = useCallback(async (material) => {
    const salvo = await saveMaterial(material);
    if (salvo) {
      setMateriais(prev => [...prev, salvo]);
      return salvo;
    }
    const novoId = Date.now();
    const local = { id: novoId, ...material };
    setMateriais(prev => [...prev, local]);
    return local;
  }, []);

  const atualizarMaterial = useCallback(async (id, dados) => {
    const atualizado = { id, ...dados };
    await saveMaterial(atualizado);
    setMateriais(prev => prev.map(m => m.id === id ? { ...m, ...dados } : m));
  }, []);

  // mantém compatibilidade com código antigo
  const atualizarMaterialSimples = atualizarMaterial;

  const excluirMaterial = useCallback(async (id) => {
    await deleteMaterial(id);
    setMateriais(prev => prev.filter(m => m.id !== id));
  }, []);

  const buscarMaterialPorId = useCallback((id) =>
    materiais.find(m => m.id === id), [materiais]);

  return {
    materiais, carregando,
    adicionarMaterial, atualizarMaterial, atualizarMaterialSimples,
    excluirMaterial, buscarMaterialPorId,
    setMateriais,
  };
};

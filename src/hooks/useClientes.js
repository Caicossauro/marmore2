import { useState, useEffect, useCallback } from 'react';
import { getClientes, saveCliente, deleteCliente } from '../utils/database';

export const useClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      try {
        const dados = await getClientes();
        if (Array.isArray(dados)) setClientes(dados);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  const salvarCliente = useCallback(async (cliente) => {
    const salvo = await saveCliente(cliente);
    if (!salvo) return null;

    setClientes(prev => {
      const idx = prev.findIndex(c => c.id === salvo.id);
      return idx >= 0
        ? prev.map(c => c.id === salvo.id ? salvo : c)
        : [...prev, salvo];
    });
    return salvo;
  }, []);

  const excluirCliente = useCallback(async (clienteId) => {
    await deleteCliente(clienteId);
    setClientes(prev => prev.filter(c => c.id !== clienteId));
  }, []);

  const buscarClientePorId = useCallback(
    (clienteId) => clientes.find(c => String(c.id) === String(clienteId)),
    [clientes]
  );

  return {
    clientes,
    carregando,
    salvarCliente,
    excluirCliente,
    buscarClientePorId,
  };
};

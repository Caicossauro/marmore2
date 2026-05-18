import { useState, useEffect, useRef } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useClientes } from './useClientes';
import {
  mascaraTelefone,
  mascaraCpfCnpj,
  mascaraRg,
  validarCpfCnpj,
  validarRg,
} from '../utils/validacoes';

const clienteVazio = () => ({
  nome: '',
  telefone: '',
  email: '',
  cpfCnpj: '',
  rg: '',
  endereco: { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
  observacoes: '',
});

export function useClienteForm({ id, isEdicao }) {
  const navigate = useNavigate();
  const { salvarCliente, buscarClientePorId, excluirCliente, carregando } = useClientes();

  const [form, setForm] = useState(clienteVazio());
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepErro, setCepErro] = useState('');

  const [formInicial, setFormInicial] = useState(null);
  const salvouRef = useRef(false);

  const temAlteracoes = formInicial !== null &&
    JSON.stringify(form) !== JSON.stringify(formInicial);

  const temAlteracoesRef = useRef(false);
  temAlteracoesRef.current = temAlteracoes;

  const blocker = useBlocker(() => temAlteracoesRef.current && !salvouRef.current);

  useEffect(() => {
    if (!temAlteracoes) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [temAlteracoes]);

  useEffect(() => {
    if (!isEdicao || carregando) return;
    const cliente = buscarClientePorId(id);
    if (cliente) {
      const dados = {
        nome:        cliente.nome        ?? '',
        telefone:    cliente.telefone    ?? '',
        email:       cliente.email       ?? '',
        cpfCnpj:     cliente.cpfCnpj     ?? '',
        rg:          cliente.rg          ?? '',
        endereco: {
          cep:         cliente.endereco?.cep         ?? '',
          rua:         cliente.endereco?.rua         ?? '',
          numero:      cliente.endereco?.numero      ?? '',
          complemento: cliente.endereco?.complemento ?? '',
          bairro:      cliente.endereco?.bairro      ?? '',
          cidade:      cliente.endereco?.cidade      ?? '',
          uf:          cliente.endereco?.uf          ?? '',
        },
        observacoes: cliente.observacoes ?? '',
      };
      setForm(dados);
      setFormInicial(JSON.parse(JSON.stringify(dados)));
    }
  }, [isEdicao, carregando, id, buscarClientePorId]);

  useEffect(() => {
    if (!isEdicao) setFormInicial(JSON.parse(JSON.stringify(clienteVazio())));
  }, [isEdicao]);

  const set = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
    if (erros[campo]) setErros(prev => ({ ...prev, [campo]: '' }));
  };

  const setEnd = (campo, valor) => {
    setForm(prev => ({ ...prev, endereco: { ...prev.endereco, [campo]: valor } }));
  };

  const handleTelefone = (e) => {
    set('telefone', mascaraTelefone(e.target.value));
  };

  const handleCpfCnpj = (e) => {
    set('cpfCnpj', mascaraCpfCnpj(e.target.value));
  };

  const handleRg = (e) => {
    set('rg', mascaraRg(e.target.value));
  };

  const handleCep = async (e) => {
    const cepLimpo = e.target.value.replace(/\D/g, '').slice(0, 8);
    const formatado = cepLimpo.replace(/(\d{5})(\d)/, '$1-$2');
    setEnd('cep', formatado);
    setCepErro('');

    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepErro('CEP não encontrado.');
      } else {
        setForm(prev => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            cep:    formatado,
            rua:    data.logradouro ?? '',
            bairro: data.bairro     ?? '',
            cidade: data.localidade ?? '',
            uf:     data.uf         ?? '',
          },
        }));
      }
    } catch {
      setCepErro('Erro ao consultar o CEP. Verifique a conexão.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const validar = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'E-mail inválido.';
    }
    if (form.cpfCnpj && !validarCpfCnpj(form.cpfCnpj)) {
      e.cpfCnpj = 'CPF/CNPJ inválido.';
    }
    if (form.rg && !validarRg(form.rg)) {
      e.rg = 'RG inválido.';
    }
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    const payload = {
      ...(isEdicao ? { id } : {}),
      ...form,
    };
    const salvo = await salvarCliente(payload);
    setSalvando(false);

    if (salvo) {
      salvouRef.current = true;
      navigate('/clientes');
    }
  };

  const excluir = async () => {
    salvouRef.current = true;
    await excluirCliente(id);
    navigate('/clientes');
  };

  return {
    form,
    set,
    setEnd,
    erros,
    salvando,
    buscandoCep,
    cepErro,
    handleTelefone,
    handleCpfCnpj,
    handleRg,
    handleCep,
    handleSubmit,
    temAlteracoes,
    blocker,
    excluir,
    carregando,
  };
}

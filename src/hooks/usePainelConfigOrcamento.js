import { useState, useEffect } from 'react';

export function usePainelConfigOrcamento(orcamentoAtual, tela) {
  const [mostrarPainelPrecos, setMostrarPainelPrecos] = useState(false);
  const [precosTemp, setPrecosTemp] = useState({});
  const [precosSalvosOrcamento, setPrecosSalvosOrcamento] = useState(false);

  const [mostrarPainelMateriais, setMostrarPainelMateriais] = useState(false);
  const [materiaisTemp, setMateriaisTemp] = useState({});
  const [materiaisSalvosOrcamento, setMateriaisSalvosOrcamento] = useState(false);

  // Pré-preenche os preços ao entrar na tela 'precos' com os valores ATUAIS do orçamento
  useEffect(() => {
    if (tela === 'precos' && orcamentoAtual) {
      setPrecosTemp({ ...orcamentoAtual.precos });
      setPrecosSalvosOrcamento(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tela, orcamentoAtual?.id]);

  // Pré-preenche as configurações de materiais ao entrar na tela 'materiais'
  useEffect(() => {
    if (tela === 'materiais' && orcamentoAtual) {
      setMateriaisTemp({ ...orcamentoAtual.materiais });
      setMateriaisSalvosOrcamento(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tela, orcamentoAtual?.id]);

  return {
    mostrarPainelPrecos,
    setMostrarPainelPrecos,
    precosTemp,
    setPrecosTemp,
    precosSalvosOrcamento,
    setPrecosSalvosOrcamento,
    mostrarPainelMateriais,
    setMostrarPainelMateriais,
    materiaisTemp,
    setMateriaisTemp,
    materiaisSalvosOrcamento,
    setMateriaisSalvosOrcamento,
  };
}

import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
} from 'firebase/firestore';
import { PRECOS_PADRAO, STORAGE_KEYS, TIPOS_MATERIAL_PADRAO, ACABAMENTOS_MATERIAL_PADRAO } from '../constants/config';

// Campos persistidos para um cliente (evita salvar campos undefined no Firestore)
const clientePayload = (cliente) => ({
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
  observacoes:  cliente.observacoes  ?? '',
  criadoEm:     cliente.criadoEm    ?? new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
});

/**
 * Camada de acesso ao banco de dados (Firebase Firestore).
 * Se o Firebase não estiver configurado (.env ausente), cai no fallback localStorage.
 *
 * Convenção de IDs: usamos IDs numéricos (Date.now()) como ID do documento Firestore.
 * Isso mantém compatibilidade com o código que compara ids com números (===).
 */

const ORCAMENTO_PADRAO_BASE = {
  ambientes: [],
  chapas: [],
  precos: {},
  materiaisConfig: {},
  deslocamento: null,
};

// ============ MATERIAIS ============

export async function getMateriais() {
  if (!isFirebaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS, []);
  }
  try {
    const snap = await getDocs(collection(db, 'materiais'));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return data.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS, []);
  }
}

const materialPayload = (m) => {
  const dimensoes = (m.dimensoes ?? [])
    .map(d => ({
      largura:   d.largura   != null ? Number(d.largura)   : null,
      altura:    d.altura    != null ? Number(d.altura)    : null,
      espessura: d.espessura != null ? Number(d.espessura) : null,
    }))
    .filter(d => d.largura != null || d.altura != null || d.espessura != null);

  // Primeira dimensão como campos planos — compatibilidade com plano de corte
  const p = dimensoes[0] ?? {};
  return {
    nome:       m.nome        ?? '',
    tipo:       m.tipo        ?? '',
    acabamento: m.acabamento  ?? '',
    origem:     m.origem      ?? '',
    largura:    p.largura    ?? (m.largura    != null ? Number(m.largura)    : null),
    altura:     p.altura     ?? (m.altura     != null ? Number(m.altura)     : null),
    espessura:  p.espessura  ?? (m.espessura  != null ? Number(m.espessura)  : null),
    dimensoes,
    url:        m.url         ?? '',
  };
};

export async function saveMaterial(material) {
  if (!isFirebaseConfigured) {
    return saveToLocalStorageArray(STORAGE_KEYS.MATERIAIS, material);
  }
  try {
    if (material.id) {
      // Atualizar existente
      const payload = materialPayload(material);
      await setDoc(doc(db, 'materiais', material.id), payload, { merge: true });
      return { id: material.id, ...payload };
    } else {
      // Novo material
      const payload = materialPayload(material);
      const docRef = await addDoc(collection(db, 'materiais'), payload);
      return { id: docRef.id, ...payload };
    }
  } catch (error) {
    console.error('Erro ao salvar material:', error);
    return null;
  }
}

export async function deleteMaterial(materialId) {
  if (!isFirebaseConfigured) {
    return deleteFromLocalStorageArray(STORAGE_KEYS.MATERIAIS, materialId);
  }
  try {
    await deleteDoc(doc(db, 'materiais', materialId));
    return true;
  } catch (error) {
    console.error('Erro ao excluir material:', error);
    return false;
  }
}

// ============ CLIENTES ============

export async function getClientes() {
  if (!isFirebaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.CLIENTES, []);
  }
  try {
    const snap = await getDocs(collection(db, 'clientes'));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return data.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return getFromLocalStorage(STORAGE_KEYS.CLIENTES, []);
  }
}

export async function saveCliente(cliente) {
  if (!isFirebaseConfigured) {
    return saveToLocalStorageArray(STORAGE_KEYS.CLIENTES, cliente);
  }
  try {
    if (cliente.id) {
      // Atualizar existente
      const payload = clientePayload(cliente);
      await setDoc(doc(db, 'clientes', cliente.id), payload, { merge: true });
      return { id: cliente.id, ...payload };
    } else {
      // Novo cliente
      const payload = clientePayload(cliente);
      const docRef = await addDoc(collection(db, 'clientes'), payload);
      return { id: docRef.id, ...payload };
    }
  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
    return null;
  }
}

export async function deleteCliente(clienteId) {
  if (!isFirebaseConfigured) {
    return deleteFromLocalStorageArray(STORAGE_KEYS.CLIENTES, clienteId);
  }
  try {
    await deleteDoc(doc(db, 'clientes', clienteId));
    return true;
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    return false;
  }
}

// ============ ORÇAMENTOS ============

export async function getOrcamentos() {
  if (!isFirebaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.ORCAMENTOS, []);
  }
  try {
    const snap = await getDocs(collection(db, 'orcamentos'));
    const data = snap.docs.map((d) => {
      const raw = d.data();
      return {
        id: d.id,
        nome: raw.nome,
        dataCriacao: raw.dataCriacao,
        clienteId: raw.clienteId ?? null,
        ambientes: raw.ambientes || [],
        chapas: raw.chapas || [],
        precos: raw.precos || { ...PRECOS_PADRAO },
        materiais: raw.materiaisConfig || {},
        deslocamento: raw.deslocamento || null,
      };
    });
    return data.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error);
    return getFromLocalStorage(STORAGE_KEYS.ORCAMENTOS, []);
  }
}

export async function saveOrcamento(orcamento) {
  if (!isFirebaseConfigured) {
    return saveToLocalStorageArray(STORAGE_KEYS.ORCAMENTOS, orcamento);
  }
  // PROPAGA erro: chamadores precisam saber se falhou pra não mostrar "salvo"
  // incorretamente (e pra dar retry no useAutoSave). Antes engolíamos o catch
  // e retornávamos null — usuário perdia dados sem perceber.
  if (orcamento.id) {
    const payload = {
      ...ORCAMENTO_PADRAO_BASE,
      nome: orcamento.nome,
      dataCriacao: orcamento.dataCriacao || new Date().toISOString(),
      clienteId: orcamento.clienteId ?? null,
      ambientes: orcamento.ambientes || [],
      chapas: orcamento.chapas || [],
      precos: orcamento.precos || {},
      materiaisConfig: orcamento.materiais || {},
      deslocamento: orcamento.deslocamento ?? null,
    };
    await setDoc(doc(db, 'orcamentos', orcamento.id), payload);
    return {
      id: orcamento.id,
      nome: payload.nome,
      dataCriacao: payload.dataCriacao,
      clienteId: payload.clienteId,
      ambientes: payload.ambientes,
      chapas: payload.chapas,
      precos: payload.precos,
      materiais: payload.materiaisConfig,
      deslocamento: payload.deslocamento,
    };
  } else {
    const payload = {
      ...ORCAMENTO_PADRAO_BASE,
      nome: orcamento.nome,
      dataCriacao: orcamento.dataCriacao || new Date().toISOString(),
      clienteId: orcamento.clienteId ?? null,
      ambientes: orcamento.ambientes || [],
      chapas: orcamento.chapas || [],
      precos: orcamento.precos || {},
      materiaisConfig: orcamento.materiais || {},
      deslocamento: orcamento.deslocamento ?? null,
    };
    const docRef = await addDoc(collection(db, 'orcamentos'), payload);
    return {
      id: docRef.id,
      nome: payload.nome,
      dataCriacao: payload.dataCriacao,
      clienteId: payload.clienteId,
      ambientes: payload.ambientes,
      chapas: payload.chapas,
      precos: payload.precos,
      materiais: payload.materiaisConfig,
      deslocamento: payload.deslocamento,
    };
  }
}

export async function deleteOrcamento(orcamentoId) {
  if (!isFirebaseConfigured) {
    return deleteFromLocalStorageArray(STORAGE_KEYS.ORCAMENTOS, orcamentoId);
  }
  try {
    await deleteDoc(doc(db, 'orcamentos', orcamentoId));
    return true;
  } catch (error) {
    console.error('Erro ao excluir orçamento:', error);
    return false;
  }
}

// ============ PREÇOS PADRÃO ============

export async function getPrecos() {
  if (!isFirebaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.PRECOS, PRECOS_PADRAO);
  }
  try {
    const snap = await getDoc(doc(db, 'config', 'precos_padrao'));
    return snap.exists() ? snap.data().config || PRECOS_PADRAO : PRECOS_PADRAO;
  } catch (error) {
    console.error('Erro ao buscar preços:', error);
    return PRECOS_PADRAO;
  }
}

export async function savePrecos(precos) {
  if (!isFirebaseConfigured) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRECOS, JSON.stringify(precos));
      return true;
    } catch {
      return false;
    }
  }
  try {
    await setDoc(doc(db, 'config', 'precos_padrao'), {
      config: precos,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Erro ao salvar preços:', error);
    return false;
  }
}

export async function getClientesColWidths() {
  if (!isFirebaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.CLIENTES_COL_WIDTHS, null);
  }
  try {
    const snap = await getDoc(doc(db, 'config', 'clientes_col_widths'));
    if (snap.exists()) {
      return snap.data().config || null;
    }
    return getFromLocalStorage(STORAGE_KEYS.CLIENTES_COL_WIDTHS, null);
  } catch (error) {
    console.error('Erro ao buscar larguras de coluna de clientes:', error);
    return getFromLocalStorage(STORAGE_KEYS.CLIENTES_COL_WIDTHS, null);
  }
}

export async function saveClientesColWidths(widths) {
  if (!isFirebaseConfigured) {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENTES_COL_WIDTHS, JSON.stringify(widths));
      return true;
    } catch {
      return false;
    }
  }
  try {
    await setDoc(doc(db, 'config', 'clientes_col_widths'), {
      config: widths,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.CLIENTES_COL_WIDTHS, JSON.stringify(widths));
    return true;
  } catch (error) {
    console.error('Erro ao salvar larguras de coluna de clientes:', error);
    return false;
  }
}

export async function getTiposMaterial() {
  if (!isFirebaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS_TIPOS, TIPOS_MATERIAL_PADRAO);
  }
  try {
    const snap = await getDoc(doc(db, 'config', 'materiais_tipos'));
    if (snap.exists()) return snap.data().tipos || TIPOS_MATERIAL_PADRAO;
    return TIPOS_MATERIAL_PADRAO;
  } catch (error) {
    console.error('Erro ao buscar tipos de material:', error);
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS_TIPOS, TIPOS_MATERIAL_PADRAO);
  }
}

export async function saveTiposMaterial(tipos) {
  if (!isFirebaseConfigured) {
    try {
      localStorage.setItem(STORAGE_KEYS.MATERIAIS_TIPOS, JSON.stringify(tipos));
      return true;
    } catch { return false; }
  }
  try {
    await setDoc(doc(db, 'config', 'materiais_tipos'), {
      tipos,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.MATERIAIS_TIPOS, JSON.stringify(tipos));
    return true;
  } catch (error) {
    console.error('Erro ao salvar tipos de material:', error);
    return false;
  }
}

export async function getAcabamentosMaterial() {
  if (!isFirebaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS_ACABAMENTOS, ACABAMENTOS_MATERIAL_PADRAO);
  }
  try {
    const snap = await getDoc(doc(db, 'config', 'materiais_acabamentos'));
    if (snap.exists()) return snap.data().acabamentos || ACABAMENTOS_MATERIAL_PADRAO;
    return ACABAMENTOS_MATERIAL_PADRAO;
  } catch (error) {
    console.error('Erro ao buscar acabamentos de material:', error);
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS_ACABAMENTOS, ACABAMENTOS_MATERIAL_PADRAO);
  }
}

export async function saveAcabamentosMaterial(acabamentos) {
  if (!isFirebaseConfigured) {
    try {
      localStorage.setItem(STORAGE_KEYS.MATERIAIS_ACABAMENTOS, JSON.stringify(acabamentos));
      return true;
    } catch { return false; }
  }
  try {
    await setDoc(doc(db, 'config', 'materiais_acabamentos'), {
      acabamentos,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.MATERIAIS_ACABAMENTOS, JSON.stringify(acabamentos));
    return true;
  } catch (error) {
    console.error('Erro ao salvar acabamentos de material:', error);
    return false;
  }
}

export async function getMateriaColumWidths() {
  if (!isFirebaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS_COL_WIDTHS, null);
  }
  try {
    const snap = await getDoc(doc(db, 'config', 'materiais_col_widths'));
    if (snap.exists()) {
      return snap.data().config || null;
    }
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS_COL_WIDTHS, null);
  } catch (error) {
    console.error('Erro ao buscar larguras de coluna de materiais:', error);
    return getFromLocalStorage(STORAGE_KEYS.MATERIAIS_COL_WIDTHS, null);
  }
}

export async function saveMateriaColumWidths(widths) {
  if (!isFirebaseConfigured) {
    try {
      localStorage.setItem(STORAGE_KEYS.MATERIAIS_COL_WIDTHS, JSON.stringify(widths));
      return true;
    } catch {
      return false;
    }
  }
  try {
    await setDoc(doc(db, 'config', 'materiais_col_widths'), {
      config: widths,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.MATERIAIS_COL_WIDTHS, JSON.stringify(widths));
    return true;
  } catch (error) {
    console.error('Erro ao salvar larguras de coluna de materiais:', error);
    return false;
  }
}

export async function getOrcamentosColWidths() {
  if (!isFirebaseConfigured) {
    return getFromLocalStorage(STORAGE_KEYS.ORCAMENTOS_COL_WIDTHS, null);
  }
  try {
    const snap = await getDoc(doc(db, 'config', 'orcamentos_col_widths'));
    if (snap.exists()) {
      return snap.data().config || null;
    }
    return getFromLocalStorage(STORAGE_KEYS.ORCAMENTOS_COL_WIDTHS, null);
  } catch (error) {
    console.error('Erro ao buscar larguras de coluna de orçamentos:', error);
    return getFromLocalStorage(STORAGE_KEYS.ORCAMENTOS_COL_WIDTHS, null);
  }
}

export async function saveOrcamentosColWidths(widths) {
  if (!isFirebaseConfigured) {
    try {
      localStorage.setItem(STORAGE_KEYS.ORCAMENTOS_COL_WIDTHS, JSON.stringify(widths));
      return true;
    } catch {
      return false;
    }
  }
  try {
    await setDoc(doc(db, 'config', 'orcamentos_col_widths'), {
      config: widths,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.ORCAMENTOS_COL_WIDTHS, JSON.stringify(widths));
    return true;
  } catch (error) {
    console.error('Erro ao salvar larguras de coluna de orçamentos:', error);
    return false;
  }
}

// ============ MIGRAÇÃO localStorage → Firebase ============

export async function migrarLocalStorageParaFirebase() {
  if (!isFirebaseConfigured) return;
  if (localStorage.getItem('pietra_migrado_firebase') === 'true') return;

  try {
    const materiaisLocal = getFromLocalStorage(STORAGE_KEYS.MATERIAIS, []);
    if (materiaisLocal.length > 0) {
      const snap = await getDocs(collection(db, 'materiais'));
      if (snap.empty) {
        for (const mat of materiaisLocal) {
          await saveMaterial(mat);
        }
      }
    }

    const orcamentosLocal = getFromLocalStorage(STORAGE_KEYS.ORCAMENTOS, []);
    if (orcamentosLocal.length > 0) {
      const snap = await getDocs(collection(db, 'orcamentos'));
      if (snap.empty) {
        for (const orc of orcamentosLocal) {
          await saveOrcamento(orc);
        }
      }
    }

    const precosLocal = getFromLocalStorage(STORAGE_KEYS.PRECOS, null);
    if (precosLocal) {
      await savePrecos(precosLocal);
    }

    localStorage.setItem('pietra_migrado_firebase', 'true');
  } catch (error) {
    console.error('Erro durante migração:', error);
  }
}

// Alias de compatibilidade — nome antigo (Supabase) ainda é importado em useBudgets.js
export const migrarLocalStorageParaSupabase = migrarLocalStorageParaFirebase;

// ============ HELPERS localStorage (fallback) ============

function getFromLocalStorage(key, defaultValue) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToLocalStorageArray(key, item) {
  try {
    const items = getFromLocalStorage(key, []);
    const index = items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      const novoId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
      item.id = novoId;
      items.push(item);
    }
    localStorage.setItem(key, JSON.stringify(items));
    return item;
  } catch {
    return null;
  }
}

function deleteFromLocalStorageArray(key, itemId) {
  try {
    const items = getFromLocalStorage(key, []);
    const filtered = items.filter((i) => i.id !== itemId);
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

// Chaves do localStorage
export const STORAGE_KEYS = {
  MATERIAIS: 'pietra_materiais',
  ORCAMENTOS: 'pietra_orcamentos',
  PRECOS: 'pietra_precos',
  CLIENTES: 'pietra_clientes',
  CLIENTES_COL_WIDTHS: 'pietra_clientes_col_widths',
  MATERIAIS_COL_WIDTHS: 'pietra_materiais_col_widths',
  ORCAMENTOS_COL_WIDTHS: 'pietra_orcamentos_col_widths',
  MATERIAIS_TIPOS: 'pietra_materiais_tipos',
  MATERIAIS_ACABAMENTOS: 'pietra_materiais_acabamentos',
  PREVIEW_HEIGHT: 'pietra_preview_height',
  BLOCO_AMBIENTE_HEIGHT: 'pietra_bloco_ambiente_height',
  PREVIEW_EXPANDIDO: 'pietra_preview_expandido',
};

export const TIPOS_MATERIAL_PADRAO = ['Mármore', 'Granito', 'Quartzito', 'Porcelanato', 'Pedra Natural', 'Outro'];
export const ACABAMENTOS_MATERIAL_PADRAO = ['Escovado', 'Flameado', 'Jateado', 'Levigado', 'Natural', 'Outro', 'Polido'];

// Configuração padrão de preços
export const PRECOS_PADRAO = {
  // Acabamentos (por metro linear)
  polimento: 22,
  esquadria: 35,
  boleado: 35,
  canal: 20,
  // Recortes (por unidade)
  pia: 100,
  cubaEsculpida: 630,
  cooktop: 150,
  recorte: 60,
  pes: 200,
  // Deslocamento (entrega + medição)
  valorPorKm: 2.5,                  // R$ por km rodado
  hotelPorPessoaDia: 150,           // R$ por pessoa por noite de hospedagem
  alimentacaoPorPessoaDia: 100,     // R$ por pessoa por dia de alimentação
  valorEstacionamentoPorDia: 85,    // R$ por diária do estacionamento (dia ou noite)
  // Mão de obra
  maoDeObraFixacaoPorMetro: 150,    // R$ por metro linear de largura (fixação na parede)
  maoDeObraValorGrapa: 40,          // R$ por grapa (1 a cada 60cm)
  maoDeObraValorPU: 50,             // R$ por p.u. (1 a cada 2 grapas, arredondado p/ cima)
  maoDeObraMontagemPorM2: 250,      // R$ por m² do ambiente (montagem de ilha/nicho)
};

// Espaçamento entre peças nas chapas (mm) — espessura do disco de corte
export const ESPACAMENTO_CHAPAS = 4;

// Margem das bordas da chapa até a primeira peça (mm)
export const MARGEM_CHAPAS = 25;

// Configuração padrão de dimensões e preços de chapas
export const CONFIG_CHAPA_PADRAO = {
  comprimento: 3000,  // mm
  altura: 2000,       // mm
  custo: 300,         // R$ por m²
  venda: 900          // R$ por m²
};

// Endereço de saída padrão (sede da marmoraria) — usuário pode alterar por orçamento
export const ENDERECO_SAIDA_PADRAO = {
  texto: 'Avenida Pedro Baso, Porto Ferreira, São Paulo, Região Sudeste, 13660-051, Brasil',
  coords: { lat: -21.8632332, lng: -47.4954607 },
};

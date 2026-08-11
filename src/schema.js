// Array declarativo de seções. Cada campo tem um "id" estável — é ele que
// nomeia o input no formulário e a chave lida de volta, nunca a posição no
// array. Adicionar/reordenar campos aqui não exige tocar em render.js.
export const SECOES = [
  {
    id: 'clientes',
    titulo: 'Clientes',
    campos: [
      { id: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true },
      { id: 'fazenda', label: 'Fazenda', tipo: 'text' },
      { id: 'contato', label: 'Contato (telefone/whatsapp)', tipo: 'text' },
      {
        id: 'status',
        label: 'Status',
        tipo: 'select',
        padrao: 'prospeccao',
        opcoes: [
          { valor: 'prospeccao', rotulo: 'Prospecção' },
          { valor: 'ativo', rotulo: 'Ativo' },
          { valor: 'manutencao', rotulo: 'Manutenção' },
        ],
      },
    ],
  },
  {
    id: 'visitas',
    titulo: 'Visitas',
    campos: [
      { id: 'cliente_id', label: 'Cliente', tipo: 'select-cliente', obrigatorio: true },
      { id: 'data', label: 'Data', tipo: 'date', obrigatorio: true, padrao: 'hoje' },
      { id: 'hora', label: 'Hora', tipo: 'time', padrao: 'agora' },
      {
        id: 'tipo',
        label: 'Tipo',
        tipo: 'select',
        opcoes: [
          { valor: 'abertura', rotulo: 'Abertura' },
          { valor: 'tecnica', rotulo: 'Técnica' },
          { valor: 'manutencao', rotulo: 'Manutenção' },
        ],
      },
      { id: 'resumo', label: 'Resumo da visita', tipo: 'textarea' },
      { id: 'observacoes', label: 'Observações', tipo: 'textarea' },
    ],
  },
  {
    id: 'lembretes',
    titulo: 'Lembretes',
    campos: [
      { id: 'cliente_id', label: 'Cliente', tipo: 'select-cliente' },
      { id: 'data_hora', label: 'Data/hora', tipo: 'datetime', obrigatorio: true },
      { id: 'texto', label: 'Texto do lembrete', tipo: 'text', obrigatorio: true },
    ],
  },
];

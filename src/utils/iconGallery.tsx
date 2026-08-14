import React from 'react';
import {
  AppWindow,
  Truck,
  ShoppingCart,
  DollarSign,
  Users,
  Factory,
  Package,
  Boxes,
  Layers,
  Archive,
  BarChart3,
  TrendingUp,
  PieChart,
  LineChart,
  Receipt,
  CreditCard,
  Wallet,
  Landmark,
  Calculator,
  Briefcase,
  UserCheck,
  UserPlus,
  Clock,
  Calendar,
  Building2,
  Warehouse,
  Store,
  Headphones,
  LifeBuoy,
  MessageSquare,
  Mail,
  PhoneCall,
  Shield,
  ShieldCheck,
  KeyRound,
  Lock,
  FileText,
  Files,
  ClipboardList,
  CheckSquare,
  FolderKanban,
  Database,
  Server,
  Cpu,
  HardDrive,
  Network,
  Wrench,
  Cog,
  Sliders,
  Terminal,
  Activity,
  HeartPulse,
  Stethoscope,
  GraduationCap,
  BookOpen,
  MapPin,
  Navigation,
  Globe,
  Truck as LucideTruck,
  Forklift,
  QrCode,
  Barcode,
  Printer,
  Sparkles,
} from 'lucide-react';

export interface IconDefinition {
  name: string;
  label: string;
  category: string;
  keywords: string[];
  icon: React.ElementType;
}

export const AVAILABLE_ICONS: IconDefinition[] = [
  // Logística & Operações
  { name: 'Truck', label: 'Caminhão / Logística', category: 'Logística & Transporte', keywords: ['caminhao', 'transporte', 'frota', 'entrega', 'frete', 'expedicao'], icon: Truck },
  { name: 'Boxes', label: 'Estoque / Caixas', category: 'Logística & Transporte', keywords: ['estoque', 'caixas', 'armazem', 'produtos', 'almoxarifado'], icon: Boxes },
  { name: 'Package', label: 'Pacote / Encomenda', category: 'Logística & Transporte', keywords: ['pacote', 'caixa', 'encomenda', 'despacho', 'correios'], icon: Package },
  { name: 'Warehouse', label: 'Galpão / Armazém', category: 'Logística & Transporte', keywords: ['galpao', 'deposito', 'armazem', 'centro de distribuicao', 'cd'], icon: Warehouse },
  { name: 'Forklift', label: 'Empilhadeira / CD', category: 'Logística & Transporte', keywords: ['empilhadeira', 'carga', 'operacao', 'cd', 'movimentacao'], icon: Forklift },
  { name: 'Navigation', label: 'Roteirização / GPS', category: 'Logística & Transporte', keywords: ['gps', 'mapa', 'rota', 'viagem', 'trajeto'], icon: Navigation },
  { name: 'Barcode', label: 'Código de Barras', category: 'Logística & Transporte', keywords: ['barcode', 'leitor', 'etiqueta', 'sku', 'conferencia'], icon: Barcode },
  { name: 'QrCode', label: 'QR Code / Rastreio', category: 'Logística & Transporte', keywords: ['qrcode', 'leitura', 'rastreio', 'conferencia'], icon: QrCode },

  // Vendas & Comercial
  { name: 'ShoppingCart', label: 'Carrinho de Compras', category: 'Vendas & Comercial', keywords: ['vendas', 'pedidos', 'carrinho', 'compras', 'comercial', 'pdv'], icon: ShoppingCart },
  { name: 'Store', label: 'Loja / PDV', category: 'Vendas & Comercial', keywords: ['loja', 'filial', 'balcao', 'pdv', 'varejo', 'unidade'], icon: Store },
  { name: 'Receipt', label: 'Cupom / Nota Fiscal', category: 'Vendas & Comercial', keywords: ['nota fiscal', 'nfe', 'danfe', 'cupom', 'recibo', 'faturamento'], icon: Receipt },
  { name: 'TrendingUp', label: 'Metas & Crescimento', category: 'Vendas & Comercial', keywords: ['vendas', 'metas', 'crescimento', 'desempenho', 'comissao'], icon: TrendingUp },
  { name: 'BarChart3', label: 'Gráficos de Vendas', category: 'Vendas & Comercial', keywords: ['bi', 'relatorios', 'indicadores', 'grafico', 'painel', 'kpi'], icon: BarChart3 },

  // Financeiro & Fiscal
  { name: 'DollarSign', label: 'Financeiro / Cifrão', category: 'Financeiro & Controladoria', keywords: ['financeiro', 'dinheiro', 'contas', 'pagar', 'receber', 'tesouraria'], icon: DollarSign },
  { name: 'CreditCard', label: 'Cartões / Pagamentos', category: 'Financeiro & Controladoria', keywords: ['cartao', 'credito', 'debito', 'gateway', 'cobranca'], icon: CreditCard },
  { name: 'Wallet', label: 'Carteira / Caixa', category: 'Financeiro & Controladoria', keywords: ['carteira', 'caixa', 'saldo', 'fluxo de caixa', 'banco'], icon: Wallet },
  { name: 'Landmark', label: 'Bancos / Instituições', category: 'Financeiro & Controladoria', keywords: ['banco', 'extrato', 'remessa', 'retorno', 'conciliacao'], icon: Landmark },
  { name: 'Calculator', label: 'Calculadora / Contábil', category: 'Financeiro & Controladoria', keywords: ['calculadora', 'impostos', 'contabilidade', 'fiscal', 'tributos'], icon: Calculator },
  { name: 'PieChart', label: 'DRE / Orçamento', category: 'Financeiro & Controladoria', keywords: ['dre', 'orcamento', 'custos', 'despesas', 'analise'], icon: PieChart },

  // RH & Pessoal
  { name: 'Users', label: 'Equipe / Pessoas', category: 'Recursos Humanos & DP', keywords: ['rh', 'colaboradores', 'funcionarios', 'equipe', 'dp', 'pessoas'], icon: Users },
  { name: 'UserCheck', label: 'Admissão / Aprovação', category: 'Recursos Humanos & DP', keywords: ['admissao', 'aprovacao', 'avaliacao', 'perfil', 'recrutamento'], icon: UserCheck },
  { name: 'UserPlus', label: 'Recrutamento & Vagas', category: 'Recursos Humanos & DP', keywords: ['vagas', 'contratacao', 'curriculo', 'candidatos'], icon: UserPlus },
  { name: 'Clock', label: 'Ponto / Jornada', category: 'Recursos Humanos & DP', keywords: ['ponto', 'horas', 'jornada', 'banco de horas', 'escala'], icon: Clock },
  { name: 'Calendar', label: 'Férias & Agenda', category: 'Recursos Humanos & DP', keywords: ['ferias', 'agenda', 'cronograma', 'escala', 'eventos'], icon: Calendar },
  { name: 'GraduationCap', label: 'Treinamentos / Academy', category: 'Recursos Humanos & DP', keywords: ['treinamento', 'cursos', 'capacitacao', 'onboarding'], icon: GraduationCap },

  // Indústria & Produção
  { name: 'Factory', label: 'Fábrica / Produção', category: 'Indústria & Engenharia', keywords: ['fabrica', 'producao', 'manufatura', 'pcp', 'industria', 'chao de fabrica'], icon: Factory },
  { name: 'Wrench', label: 'Manutenção / O.S.', category: 'Indústria & Engenharia', keywords: ['manutencao', 'conserto', 'maquinas', 'oficina', 'preventiva', 'os'], icon: Wrench },
  { name: 'Cog', label: 'Engrenagem / Processos', category: 'Indústria & Engenharia', keywords: ['processo', 'configuracao', 'maquinario', 'parametros'], icon: Cog },
  { name: 'Printer', label: 'Etiquetagem / Impressão', category: 'Indústria & Engenharia', keywords: ['impressao', 'etiquetas', 'zebra', 'romaneio'], icon: Printer },

  // Suporte & Atendimento
  { name: 'Headphones', label: 'SAC / Atendimento', category: 'Atendimento & Chamados', keywords: ['sac', 'suporte', 'atendimento', 'chamados', 'helpdesk', 'ouvidoria'], icon: Headphones },
  { name: 'LifeBuoy', label: 'Help Desk / Suporte', category: 'Atendimento & Chamados', keywords: ['helpdesk', 'chamado', 'ticket', 'ajuda', 'suporte tecnico'], icon: LifeBuoy },
  { name: 'MessageSquare', label: 'Chat / Mensagens', category: 'Atendimento & Chamados', keywords: ['chat', 'mensagens', 'whatsapp', 'comunicacao'], icon: MessageSquare },
  { name: 'Mail', label: 'E-mail / Notificações', category: 'Atendimento & Chamados', keywords: ['email', 'comunicados', 'notificacoes', 'marketing'], icon: Mail },
  { name: 'PhoneCall', label: 'Telefonia / Discador', category: 'Atendimento & Chamados', keywords: ['telefonia', 'ligacoes', 'discador', 'callcenter'], icon: PhoneCall },

  // TI, Segurança & Dados
  { name: 'Database', label: 'Banco de Dados / SQL', category: 'Tecnologia & Dados', keywords: ['banco de dados', 'database', 'sql', 'armazenamento', 'dados'], icon: Database },
  { name: 'Server', label: 'Servidores & Infra', category: 'Tecnologia & Dados', keywords: ['servidor', 'infraestrutura', 'cloud', 'hospedagem', 'ti'], icon: Server },
  { name: 'ShieldCheck', label: 'Segurança & Compliance', category: 'Tecnologia & Dados', keywords: ['seguranca', 'auditoria', 'compliance', 'lgpd', 'antivirus'], icon: ShieldCheck },
  { name: 'KeyRound', label: 'Controle de Acessos', category: 'Tecnologia & Dados', keywords: ['senha', 'chaves', 'autenticacao', 'permissoes', 'sso'], icon: KeyRound },
  { name: 'Terminal', label: 'Console & Dev', category: 'Tecnologia & Dados', keywords: ['terminal', 'api', 'desenvolvimento', 'integracao', 'logs'], icon: Terminal },
  { name: 'Activity', label: 'Monitoramento & Uptime', category: 'Tecnologia & Dados', keywords: ['monitoramento', 'status', 'uptime', 'saude', 'desempenho'], icon: Activity },

  // Documentos & Gestão Geral
  { name: 'FileText', label: 'Documentos / Relatórios', category: 'Gestão & Documentos', keywords: ['documentos', 'relatorio', 'arquivos', 'pdf', 'cadastros'], icon: FileText },
  { name: 'ClipboardList', label: 'Checklist / Vistorias', category: 'Gestão & Documentos', keywords: ['checklist', 'auditoria', 'inspecao', 'tarefas', 'inventario'], icon: ClipboardList },
  { name: 'FolderKanban', label: 'Projetos / Kanban', category: 'Gestão & Documentos', keywords: ['projetos', 'kanban', 'tarefas', 'gestao', 'planejamento'], icon: FolderKanban },
  { name: 'Building2', label: 'Empresa / Matriz', category: 'Gestão & Documentos', keywords: ['empresa', 'matriz', 'corporativo', 'organizacao'], icon: Building2 },
  { name: 'HeartPulse', label: 'Medicina do Trabalho', category: 'Gestão & Documentos', keywords: ['saude', 'medicina', 'seguranca do trabalho', 'aso', 'clinica'], icon: HeartPulse },
  { name: 'AppWindow', label: 'Aplicação Padrão', category: 'Gestão & Documentos', keywords: ['janela', 'sistema', 'software', 'modulo', 'portal'], icon: AppWindow },
];

const ICONS_MAP: Record<string, React.ElementType> = AVAILABLE_ICONS.reduce((acc, curr) => {
  acc[curr.name.toLowerCase()] = curr.icon;
  return acc;
}, {} as Record<string, React.ElementType>);

/**
 * Renderiza qualquer ícone suportado por nome (case-insensitive)
 */
export const renderDynamicAppIcon = (
  iconName: string,
  className: string = 'w-6 h-6 text-orange-500'
) => {
  const cleanName = (iconName || 'AppWindow').toLowerCase().trim();
  const IconComponent = ICONS_MAP[cleanName] || AppWindow;
  return <IconComponent className={className} />;
};

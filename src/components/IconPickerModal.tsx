import React, { useState, useMemo } from 'react';
import { Search, X, Check } from 'lucide-react';
import { AVAILABLE_ICONS, IconDefinition, renderDynamicAppIcon } from '../utils/iconGallery';

interface IconPickerModalProps {
  currentIcon: string;
  onSelectIcon: (iconName: string) => void;
  onClose: () => void;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  currentIcon,
  onSelectIcon,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(AVAILABLE_ICONS.map((i) => i.category)))];
  }, []);

  const filteredIcons = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return AVAILABLE_ICONS.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCategory) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.label.toLowerCase().includes(term) ||
        item.keywords.some((k) => k.toLowerCase().includes(term))
      );
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Galeria de Ícones do Sistema</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha um ícone temático para identificar a aplicação no portal SSO.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou atividade (ex: caminhão, vendas, fiscal, rh, pcp, nota fiscal)..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'all' ? 'Todos os Ícones' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Icons Grid */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-2">
          {filteredIcons.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Nenhum ícone encontrado para a busca "{searchTerm}".
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filteredIcons.map((item: IconDefinition) => {
                const IconComponent = item.icon;
                const isSelected = currentIcon.toLowerCase() === item.name.toLowerCase();

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      onSelectIcon(item.name);
                      onClose();
                    }}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 ring-2 ring-orange-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold truncate">{item.label}</div>
                      <div className="text-[9px] text-slate-400 font-mono truncate">{item.name}</div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>{filteredIcons.length} ícones disponíveis</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

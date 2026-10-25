import React from 'react';
import {
  Briefcase,
  Dumbbell,
  GraduationCap,
  Heart,
  TrendingUp,
  BookOpen,
  Sparkles,
  User,
  Layers,
  Calendar,
  Clock,
  Target,
  Coffee,
  Code,
  Music,
  Globe,
  CheckCircle2,
  Circle,
  type LucideProps,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityCategory, CategoryVisualStyle } from '@/types';

export const AVAILABLE_CATEGORY_ICONS: Array<{ name: string; label: string }> = [
  { name: 'Briefcase', label: 'Trabalho' },
  { name: 'Dumbbell', label: 'Academia / Treino' },
  { name: 'GraduationCap', label: 'Estudos' },
  { name: 'Heart', label: 'Família / Saúde' },
  { name: 'TrendingUp', label: 'Renda Extra / Finanças' },
  { name: 'BookOpen', label: 'Leitura' },
  { name: 'Sparkles', label: 'Espiritualidade' },
  { name: 'User', label: 'Pessoal' },
  { name: 'Layers', label: 'Geral / Outros' },
  { name: 'Target', label: 'Foco / Meta' },
  { name: 'Code', label: 'Tecnologia / Projetos' },
  { name: 'Coffee', label: 'Pausa / Hábito' },
  { name: 'Music', label: 'Arte / Música' },
  { name: 'Globe', label: 'Idiomas / Viagem' },
  { name: 'Calendar', label: 'Rotina' },
  { name: 'Clock', label: 'Tempo' },
];

const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  Briefcase,
  Dumbbell,
  GraduationCap,
  Heart,
  TrendingUp,
  BookOpen,
  Sparkles,
  User,
  Layers,
  Calendar,
  Clock,
  Target,
  Coffee,
  Code,
  Music,
  Globe,
  CheckCircle2,
  Circle,
};

export const CategoryIcon: React.FC<{ name?: string; className?: string }> = ({
  name = 'Circle',
  className = 'w-4 h-4',
}) => {
  const IconComponent = ICON_MAP[name] || Circle;
  return <IconComponent className={className} aria-hidden="true" />;
};

export function getCategoryVisualClasses(style: CategoryVisualStyle = 'outline'): string {
  switch (style) {
    case 'solid':
      return 'bg-text-primary text-bg-primary border border-text-primary font-medium';
    case 'subtle':
      return 'bg-bg-secondary text-text-primary border border-border-subtle';
    case 'striped':
      return 'pattern-striped bg-bg-secondary text-text-primary border border-border-strong';
    case 'outline':
    default:
      return 'bg-transparent text-text-primary border border-border-strong';
  }
}

export const CategoryBadge: React.FC<{
  category?: ActivityCategory | null;
  size?: 'sm' | 'md';
}> = ({ category, size = 'sm' }) => {
  const name = category?.name || 'Sem categoria';
  const icon = category?.icon || 'Layers';
  const style = category?.visual_style || 'outline';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        getCategoryVisualClasses(style)
      )}
    >
      <CategoryIcon name={icon} className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate max-w-[140px]">{name}</span>
    </span>
  );
};

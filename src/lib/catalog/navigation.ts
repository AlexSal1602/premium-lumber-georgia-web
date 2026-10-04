import type { Locale } from '../site';
import type { Filters } from './types';
import { defaultFilters, serializeFilters } from './logic';

export type FilterGroup = 'category' | 'species' | 'grade' | 'moisture';
export function toggleFilter(filters: Filters, key: FilterGroup, value: string): Partial<Filters> {
  return { [key]: filters[key].includes(value) ? filters[key].filter(item => item !== value) : [...filters[key], value] };
}
export function clearFilters(filters: Filters): Filters {
  return { ...defaultFilters, sort: filters.sort };
}
export function catalogHref(locale: Locale, key?: FilterGroup, value?: string) {
  const query = key && value ? serializeFilters({ ...defaultFilters, [key]: [value] }) : '';
  return `/${locale}/catalog${query ? `?${query}` : ''}`;
}

export const catalogNavigationText = {
  ka: { materials: 'ხის მასალები', categories: 'პროდუქტის კატეგორიები', all: 'ყველა პროდუქცია', quick: 'სწრაფი არჩევანი', selected: 'არჩეული ფილტრები', clear: 'ფილტრების გასუფთავება', remove: 'მოხსნა' },
  en: { materials: 'Wood species', categories: 'Product categories', all: 'All products', quick: 'Quick selection', selected: 'Selected filters', clear: 'Clear filters', remove: 'Remove' },
  ru: { materials: 'Породы древесины', categories: 'Категории товаров', all: 'Все товары', quick: 'Быстрый выбор', selected: 'Выбранные фильтры', clear: 'Очистить фильтры', remove: 'Удалить' },
  uk: { materials: 'Породи деревини', categories: 'Категорії товарів', all: 'Усі товари', quick: 'Швидкий вибір', selected: 'Вибрані фільтри', clear: 'Очистити фільтри', remove: 'Видалити' },
  he: { materials: 'סוגי עץ', categories: 'קטגוריות מוצרים', all: 'כל המוצרים', quick: 'בחירה מהירה', selected: 'מסננים שנבחרו', clear: 'ניקוי מסננים', remove: 'הסרה' },
  ar: { materials: 'أنواع الخشب', categories: 'فئات المنتجات', all: 'جميع المنتجات', quick: 'اختيار سريع', selected: 'الفلاتر المحددة', clear: 'مسح الفلاتر', remove: 'إزالة' },
};

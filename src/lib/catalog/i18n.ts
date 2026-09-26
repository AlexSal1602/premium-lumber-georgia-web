import { newCatalogText, newLabels } from '../translations/catalog';
import type { Locale } from '../site';
import type { Category, Species, Moisture, Unit } from './types';

const categoryBase = {
  board: { ka: 'ფიცარი (დაფა)', en: 'Sawn boards', ru: 'Обрезная доска' },
  beam: { ka: 'კოჭი / ბრუსი', en: 'Timber beams', ru: 'Брус' },
  lining: { ka: 'ვაგონკა', en: 'Wall lining', ru: 'Вагонка' },
  'block-house': { ka: 'ბლოკ-ჰაუსი', en: 'Block house cladding', ru: 'Блок-хаус' },
  imitation: { ka: 'იმიტაცია ბრუსისა', en: 'Timber-effect cladding', ru: 'Имитация бруса' },
  decking: { ka: 'ტერასის დაფა', en: 'Decking', ru: 'Террасная доска' },
  flooring: { ka: 'იატაკის დაფა', en: 'Floorboards', ru: 'Половая доска' },
  batten: { ka: 'რეიკა', en: 'Battens', ru: 'Рейка' },
  pallet: { ka: 'პალეტები', en: 'Pallets', ru: 'Поддоны' },
  other: { ka: 'სხვა', en: 'Other timber', ru: 'Прочее' },
};
export const categoryLabels = Object.fromEntries(Object.entries(categoryBase).map(([key, value]) => { const [uk, he, ar] = newLabels.category[key as keyof typeof newLabels.category]; return [key, { ...value, uk, he, ar }]; })) as Record<Category, Record<Locale, string>>;
const speciesBase = {
  pine: { ka: 'ფიჭვი', en: 'Pine', ru: 'Сосна' }, spruce: { ka: 'ნაძვი', en: 'Spruce', ru: 'Ель' }, larch: { ka: 'ლარიქსი', en: 'Larch', ru: 'Лиственница' },
};
export const speciesLabels = Object.fromEntries(Object.entries(speciesBase).map(([key, value]) => { const [uk, he, ar] = newLabels.species[key as keyof typeof newLabels.species]; return [key, { ...value, uk, he, ar }]; })) as Record<Species, Record<Locale, string>>;
const moistureBase = {
  green: { ka: 'სველი', en: 'Green', ru: 'Естественная влажность' },
  'air-dried': { ka: 'გამომშრალი', en: 'Air dried', ru: 'Сухая' },
  'kiln-dried': { ka: 'კამერული', en: 'Kiln dried', ru: 'Камерная сушка' },
};
export const moistureLabels = Object.fromEntries(Object.entries(moistureBase).map(([key, value]) => { const [uk, he, ar] = newLabels.moisture[key as keyof typeof newLabels.moisture]; return [key, { ...value, uk, he, ar }]; })) as Record<Moisture, Record<Locale, string>>;
const unitBase = {
  m3: { ka: 'მ³', en: 'm³', ru: 'м³' }, m2: { ka: 'მ²', en: 'm²', ru: 'м²' },
  lm: { ka: 'გრძივი მ', en: 'linear m', ru: 'пог. м' }, piece: { ka: 'ცალი', en: 'piece', ru: 'шт.' },
};
export const unitLabels = Object.fromEntries(Object.entries(unitBase).map(([key, value]) => { const [uk, he, ar] = newLabels.unit[key as keyof typeof newLabels.unit]; return [key, { ...value, uk, he, ar }]; })) as Record<Unit, Record<Locale, string>>;
export const catalogBase = {
  ka: {
    catalog: 'პროდუქციის კატალოგი', home: 'მთავარი', subtitle: 'ხის მასალა თქვენი პროექტის ყველა ეტაპისთვის.', demo: 'სადემონსტრაციო კატალოგი — ფასები, მარაგი და ფოტოები საილუსტრაციოა.',
    search: 'მოძებნეთ პროდუქტი ან კოდი', filters: 'ფილტრები', reset: 'გასუფთავება', category: 'კატეგორია', species: 'ჯიში', grade: 'სორტი', moisture: 'ტენიანობა', dimensions: 'ზომები', thickness: 'სისქე', width: 'სიგანე', length: 'სიგრძე', mm: 'მმ', any: 'ყველა', sort: 'დალაგება', nameAsc: 'სახელი: ა–ჰ', nameDesc: 'სახელი: ჰ–ა', priceAsc: 'ფასი: ზრდადობით', priceDesc: 'ფასი: კლებადობით', priceBasis: 'ფასით დალაგება: არჩეული ზომის ერთი ცალის ეკვივალენტი.', results: 'პროდუქტი', empty: 'ამ ფილტრებით პროდუქტი ვერ მოიძებნა.', emptyHelp: 'შეცვალეთ საძიებო სიტყვა ან გაასუფთავეთ ფილტრები.', available: 'ხელმისაწვდომია', onOrder: 'შეკვეთით', more: 'დეტალურად', add: 'კალათაში დამატება', added: 'დამატებულია კალათაში', variant: 'აირჩიეთ ზომა', unit: 'ერთეული', quantity: 'რაოდენობა', total: 'ჯამი', specifications: 'მახასიათებლები', description: 'აღწერა', gallery: 'პროდუქტის გალერეა', photo: 'ფოტო', coverage: 'სასარგებლო სიგანე', price: 'ფასი', status: 'სტატუსი', cart: 'კალათა', close: 'დახურვა', remove: 'წაშლა', emptyCart: 'კალათა ცარიელია.', continue: 'კატალოგში დაბრუნება', cartNote: 'ეს არის სავარაუდო ღირებულება. შეკვეთა და გადახდა ჯერ არ იგზავნება.', conversion: 'გადათვლა ეფუძნება არჩეულ ზომებს: მ² — სასარგებლო სიგანეს, მ³ — ნომინალურ კვეთას. საბოლოო მიწოდება შეთანხმდება სრულ ცალებზე.', invalidQuantity: 'შეიყვანეთ დადებითი რაოდენობა, მაქსიმუმ 10 000. ცალები უნდა იყოს მთელი რიცხვი; სხვა ერთეულები — არაუმეტეს 3 ათწილადი ნიშნით.', storageError: 'ბრაუზერში შენახვა მიუწვდომელია. კალათა მხოლოდ ამ სესიაში დარჩება.', limit: 'რაოდენობის ლიმიტი გადაჭარბებულია.', perPiece: 'ერთი ცალის ეკვივალენტი', back: 'უკან კატალოგში',
  },
  en: {
    catalog: 'Timber catalog', home: 'Home', subtitle: 'Natural timber for every stage of your project.', demo: 'Demo catalog — prices, availability, and photography are illustrative.',
    search: 'Search products or product code', filters: 'Filters', reset: 'Clear filters', category: 'Category', species: 'Wood species', grade: 'Grade', moisture: 'Moisture', dimensions: 'Dimensions', thickness: 'Thickness', width: 'Width', length: 'Length', mm: 'mm', any: 'All', sort: 'Sort by', nameAsc: 'Name: A–Z', nameDesc: 'Name: Z–A', priceAsc: 'Price: low to high', priceDesc: 'Price: high to low', priceBasis: 'Price sorting uses the single-piece equivalent of the selected size.', results: 'products', empty: 'No products match these filters.', emptyHelp: 'Try another search or clear your filters.', available: 'Available', onOrder: 'Made to order', more: 'View details', add: 'Add to cart', added: 'Added to cart', variant: 'Choose dimensions', unit: 'Unit', quantity: 'Quantity', total: 'Total', specifications: 'Specifications', description: 'Description', gallery: 'Product gallery', photo: 'Photo', coverage: 'Effective width', price: 'Price', status: 'Availability', cart: 'Your cart', close: 'Close', remove: 'Remove', emptyCart: 'Your cart is empty.', continue: 'Back to catalog', cartNote: 'Estimated cost only. No order or payment is submitted yet.', conversion: 'Conversion uses the selected dimensions: effective width for m² and nominal cross-section for m³. Final delivery is agreed in whole pieces.', invalidQuantity: 'Enter a positive quantity up to 10,000. Pieces must be whole numbers; other units allow up to 3 decimal places.', storageError: 'Browser storage is unavailable. Your cart will only last for this session.', limit: 'Quantity limit exceeded.', perPiece: 'Single-piece equivalent', back: 'Back to catalog',
  },
  ru: {
    catalog: 'Каталог пиломатериалов', home: 'Главная', subtitle: 'Натуральная древесина для каждого этапа вашего проекта.', demo: 'Демонстрационный каталог — цены, наличие и фотографии приведены для примера.',
    search: 'Поиск по названию или коду', filters: 'Фильтры', reset: 'Сбросить', category: 'Категория', species: 'Порода', grade: 'Сорт', moisture: 'Влажность', dimensions: 'Размеры', thickness: 'Толщина', width: 'Ширина', length: 'Длина', mm: 'мм', any: 'Все', sort: 'Сортировка', nameAsc: 'Название: А–Я', nameDesc: 'Название: Я–А', priceAsc: 'Цена: по возрастанию', priceDesc: 'Цена: по убыванию', priceBasis: 'Сортировка по цене использует эквивалент одной штуки выбранного размера.', results: 'товаров', empty: 'По этим фильтрам товары не найдены.', emptyHelp: 'Измените запрос или сбросьте фильтры.', available: 'В наличии', onOrder: 'Под заказ', more: 'Подробнее', add: 'В корзину', added: 'Добавлено в корзину', variant: 'Выберите размер', unit: 'Единица', quantity: 'Количество', total: 'Итого', specifications: 'Характеристики', description: 'Описание', gallery: 'Галерея товара', photo: 'Фото', coverage: 'Рабочая ширина', price: 'Цена', status: 'Наличие', cart: 'Корзина', close: 'Закрыть', remove: 'Удалить', emptyCart: 'Корзина пуста.', continue: 'Вернуться в каталог', cartNote: 'Предварительная стоимость. Заказ и оплата пока не отправляются.', conversion: 'Пересчёт по выбранным размерам: м² — по рабочей ширине, м³ — по номинальному сечению. Поставка согласовывается в целых штуках.', invalidQuantity: 'Введите количество от 0 до 10 000, не включая 0. Штуки — целые числа; другие единицы — до 3 знаков после запятой.', storageError: 'Хранилище браузера недоступно. Корзина сохранится только в этой сессии.', limit: 'Превышен лимит количества.', perPiece: 'Эквивалент одной штуки', back: 'Назад в каталог',
  },
};
const moneySeparators: Record<Locale, { decimal: string; group: string }> = {
  ka: { decimal: ',', group: '\u00a0' },
  en: { decimal: '.', group: ',' },
  ru: { decimal: ',', group: '\u00a0' },
  uk: { decimal: ',', group: '\u00a0' },
  he: { decimal: '.', group: ',' },
  ar: { decimal: '٫', group: '٬' },
};
const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

// Keep prices byte-for-byte identical during server rendering and hydration.
// Currency formatting in Node and Chromium can use different CLDR data.
export function money(amount: number, locale: Locale) {
  const { decimal, group } = moneySeparators[locale];
  const [integer, fraction] = amount.toFixed(2).split('.');
  const sign = integer.startsWith('-') ? '-' : '';
  const grouped = integer.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, group);
  const value = `${sign}${grouped}${decimal}${fraction}`;
  const localized = locale === 'ar' ? value.replace(/\d/g, digit => arabicDigits[Number(digit)]) : value;
  return `${localized}\u00a0₾`;
}

export const catalogText = { ...catalogBase, ...newCatalogText };

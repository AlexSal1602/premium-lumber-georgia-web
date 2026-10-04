import type { Product, Localized, Category, Species, Grade, Moisture, Unit } from './types';
import { photos } from '../site';
import { productTranslations, descriptionSuffix, illustrativePhoto } from '../translations/products';

const tr = (ka: string, en: string, ru: string) => ({ ka, en, ru });
type OriginalText = ReturnType<typeof tr>;
type Seed = { id: string; category: Category; name: OriginalText; short: OriginalText; species: Species; grade: Grade; moisture: Moisture; price: number; unit: Unit; sizes: [number, number, number][]; coverage?: number; order?: boolean };
const seeds: Seed[] = [
  { id: 'pine-board-ab', category: 'board', name: tr('ფიჭვის დახერხილი ფიცარი AB', 'Pine sawn board AB', 'Обрезная доска из сосны AB'), short: tr('უნივერსალური ფიცარი კარკასისა და ზოგადი სადურგლო სამუშაოებისთვის.', 'Versatile sawn boards for framing and general joinery.', 'Универсальная доска для каркасных и столярных работ.'), species: 'pine', grade: 'AB', moisture: 'air-dried', price: 780, unit: 'm3', sizes: [[25,100,3000],[25,150,6000],[40,150,6000]] },
  { id: 'spruce-board-b', category: 'board', name: tr('ნაძვის ფიცარი B', 'Spruce board B', 'Обрезная доска из ели B'), short: tr('სველი ფიცარი დამხმარე სამშენებლო სამუშაოებისთვის.', 'Green boards for temporary construction work.', 'Доска естественной влажности для вспомогательных работ.'), species: 'spruce', grade: 'B', moisture: 'green', price: 590, unit: 'm3', sizes: [[25,100,3000],[40,150,6000]] },
  { id: 'pine-beam-a', category: 'beam', name: tr('ფიჭვის კოჭი A', 'Pine timber beam A', 'Брус из сосны A'), short: tr('კამერულად გამშრალი კოჭი ხის კონსტრუქციებისთვის.', 'Kiln-dried timber for wooden structures.', 'Брус камерной сушки для деревянных конструкций.'), species: 'pine', grade: 'A', moisture: 'kiln-dried', price: 1050, unit: 'm3', sizes: [[100,100,3000],[100,150,6000],[150,150,6000]] },
  { id: 'spruce-lining-extra', category: 'lining', name: tr('ნაძვის ევროვაგონკა Extra', 'Spruce tongue-and-groove lining Extra', 'Евровагонка из ели Extra'), short: tr('გლუვი პროფილი შიდა კედლებისა და ჭერის მოსაპირკეთებლად.', 'Smooth-profile boards for interior walls and ceilings.', 'Гладкий профиль для отделки внутренних стен и потолков.'), species: 'spruce', grade: 'premium', moisture: 'kiln-dried', price: 38, unit: 'm2', sizes: [[12.5,96,3000],[12.5,96,4000]], coverage: 88 },
  { id: 'pine-block-house-ab', category: 'block-house', name: tr('ფიჭვის ბლოკ-ჰაუსი AB', 'Pine block house cladding AB', 'Блок-хаус из сосны AB'), short: tr('მომრგვალებული პროფილი მორის ვიზუალური ეფექტისთვის.', 'Rounded cladding with the appearance of natural logs.', 'Закруглённый профиль с эффектом натурального бревна.'), species: 'pine', grade: 'AB', moisture: 'kiln-dried', price: 48, unit: 'm2', sizes: [[28,140,3000],[28,140,6000]], coverage: 130 },
  { id: 'pine-imitation-a', category: 'imitation', name: tr('ბრუსის იმიტაცია — ფიჭვი A', 'Pine timber-effect cladding A', 'Имитация бруса из сосны A'), short: tr('ფართო პროფილი ხის ფასადებისა და ინტერიერისთვის.', 'Wide-profile boards for timber facades and interiors.', 'Широкий профиль для деревянных фасадов и интерьеров.'), species: 'pine', grade: 'A', moisture: 'kiln-dried', price: 44, unit: 'm2', sizes: [[20,145,3000],[20,145,6000]], coverage: 135 },
  { id: 'larch-decking-ab', category: 'decking', name: tr('ლარიქსის ტერასის დაფა AB', 'Larch decking board AB', 'Террасная доска из лиственницы AB'), short: tr('ღარებიანი ზედაპირი ტერასებისა და ბაღის ბილიკებისთვის.', 'Grooved decking for terraces and garden walkways.', 'Рифлёная доска для террас и садовых дорожек.'), species: 'larch', grade: 'AB', moisture: 'kiln-dried', price: 92, unit: 'm2', sizes: [[28,140,3000],[28,140,4000]] },
  { id: 'larch-decking-extra', category: 'decking', name: tr('ლარიქსის გლუვი ტერასის დაფა Extra', 'Smooth larch decking Extra', 'Гладкая террасная доска Extra'), short: tr('შერჩეული გლუვი დაფა გარე სივრცის მოსაწყობად.', 'Selected smooth boards for outdoor spaces.', 'Отборная гладкая доска для открытых пространств.'), species: 'larch', grade: 'premium', moisture: 'kiln-dried', price: 135, unit: 'm2', sizes: [[28,140,3000],[28,140,4000]], order: true },
  { id: 'pine-flooring-a', category: 'flooring', name: tr('ფიჭვის იატაკის დაფა A', 'Pine tongue-and-groove floorboard A', 'Шпунтованная половая доска из сосны A'), short: tr('შპუნტიანი შეერთება ხის იატაკის მოსაწყობად.', 'Tongue-and-groove boards for natural wood floors.', 'Шпунтованная доска для натурального деревянного пола.'), species: 'pine', grade: 'A', moisture: 'kiln-dried', price: 59, unit: 'm2', sizes: [[28,135,3000],[28,135,6000]], coverage: 125 },
  { id: 'pine-batten-ab', category: 'batten', name: tr('ფიჭვის რეიკა AB', 'Pine batten AB', 'Рейка из сосны AB'), short: tr('რეიკა ლარტყებისა და დეკორატიული დეტალებისთვის.', 'Battens for lathing and decorative details.', 'Рейка для обрешётки и декоративных деталей.'), species: 'pine', grade: 'AB', moisture: 'air-dried', price: 2.8, unit: 'lm', sizes: [[20,40,3000],[20,40,4000]] },
  { id: 'pine-pallet-b', category: 'pallet', name: tr('ხის პალეტი 1200 × 800', 'Wooden pallet 1200 × 800', 'Деревянный поддон 1200 × 800'), short: tr('მრავალჯერადი გამოყენების ხის პალეტი. სერტიფიცირებული EUR პალეტი არ არის.', 'Reusable wooden pallet. Not a certified EUR pallet.', 'Многоразовый деревянный поддон. Не сертифицированный EUR-поддон.'), species: 'pine', grade: 'B', moisture: 'air-dried', price: 42, unit: 'piece', sizes: [[144,800,1200]], order: true },
  { id: 'spruce-panel-a', category: 'other', name: tr('ნაძვის წებოვანი ფარი A', 'Spruce laminated panel A', 'Мебельный щит из ели A'), short: tr('წებოვანი ფარი ავეჯისა და ინტერიერის დეტალებისთვის.', 'Laminated panel for furniture and interior joinery.', 'Клеёный щит для мебели и интерьерных деталей.'), species: 'spruce', grade: 'A', moisture: 'kiln-dried', price: 85, unit: 'm2', sizes: [[18,600,2000],[28,600,2000]] },
];

const originalProducts = seeds.map(seed => ({
  id: seed.id, category: seed.category, name: seed.name, shortDescription: seed.short,
  description: tr(
    `${seed.short.ka} ბუნებრივი ხის ტექსტურა და ტონალობა პარტიებს შორის შეიძლება განსხვავდებოდეს. ზომები მითითებულია მილიმეტრებში. გამოყენებამდე გაითვალისწინეთ სივრცის ტენიანობა და შესაბამისი დამცავი დამუშავება. მზიდ კონსტრუქციებში გამოყენება საჭიროებს ინჟინრის შეფასებას.`,
    `${seed.short.en} Natural grain and colour may vary between batches. Dimensions are in millimetres. Consider the installation environment and appropriate protective treatment. Structural use requires an engineer's assessment.`,
    `${seed.short.ru} Текстура и оттенок натурального дерева могут различаться между партиями. Размеры указаны в миллиметрах. Учитывайте влажность помещения и защитную обработку. Применение в несущих конструкциях требует оценки инженера.`,
  ),
  images: [photos.wood, photos.logs].map((src, i) => ({ src, alt: tr(`${seed.name.ka} — საილუსტრაციო ფოტო ${i + 1}`, `${seed.name.en} — illustrative photo ${i + 1}`, `${seed.name.ru} — иллюстративное фото ${i + 1}`) })),
  species: seed.species, grade: seed.grade, moisture: seed.moisture,
  units: seed.category === 'pallet' ? ['piece'] : ['m3', 'm2', 'piece', 'lm'],
  variants: seed.sizes.map(([thickness, width, length], i) => ({
    id: `${seed.id}-${i + 1}`, dimensions: { thickness, width, length }, coverageWidth: seed.coverage,
    price: { amount: seed.category === 'other' && i === 1 ? 119 : seed.price, currency: 'GEL', unit: seed.unit },
    status: seed.order || (seed.category === 'beam' && i === 2) ? 'on-order' : 'available',
  })),
}));
export const products: Product[] = originalProducts.map(product => {
 const translations = productTranslations[product.id];
 const name = { ...product.name, uk: translations.uk[0], he: translations.he[0], ar: translations.ar[0] };
 const shortDescription = { ...product.shortDescription, uk: translations.uk[1], he: translations.he[1], ar: translations.ar[1] };
 return { ...product, name, shortDescription,
   description: { ...product.description, uk: shortDescription.uk + ' ' + descriptionSuffix.uk, he: shortDescription.he + ' ' + descriptionSuffix.he, ar: shortDescription.ar + ' ' + descriptionSuffix.ar },
   images: product.images.map((image, i) => ({ ...image, alt: { ...image.alt, uk: name.uk + ' — ' + illustrativePhoto.uk + ' ' + (i + 1), he: name.he + ' — ' + illustrativePhoto.he + ' ' + (i + 1), ar: name.ar + ' — ' + illustrativePhoto.ar + ' ' + (i + 1) } })),
   units: product.units as Unit[], variants: product.variants as Product['variants'],
 };
});
export const getProduct = (id: string) => products.find(p => p.id === id);

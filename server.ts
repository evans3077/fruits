import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Order, OrderItemReceipt, Product, ProductReview } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = '0.0.0.0';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const FREE_SHIPPING_THRESHOLD = 40;
const STANDARD_SHIPPING_FEE = 5.9;
const EXPRESS_SHIPPING_FEE = 9.9;

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
}

const usersByEmail = new Map<string, StoredUser>();
const usersById = new Map<string, StoredUser>();
const ordersStore: Order[] = [];
const newsletterEmails = new Set<string>();
let orderSequence = 1042;

const roundMoney = (n: number) => Math.round(n * 100) / 100;

const initialProducts: Product[] = [
  {
    id: 'wild-berry-blast',
    slug: 'wild-berry-blast',
    name: 'Wild Berry Blast',
    category: 'Single Bottles',
    flavour: 'Berry',
    tagline: 'Crushed blackberries, wild raspberries, and plump blueberries.',
    description:
      'Cold-pressed within hours of harvest with whole forest berries and a splash of crisp apple puree. Velvety, tart-sweet, and packed with natural antioxidants.',
    price: 4.8,
    stock: 48,
    rating: 4.9,
    reviewCount: 3,
    tag: 'Best Seller',
    visualType: 'sprite',
    flavourIds: ['berry'],
    bgTint: '#EDE7F6',
    variants: [
      { id: 'single', label: 'Single (330ml)', price: 4.8, sku: 'BL-BRY-01' },
      { id: 'pack-6', label: '6-Pack', price: 25.9, compareAtPrice: 28.8, sku: 'BL-BRY-06' },
      { id: 'pack-12', label: '12-Pack', price: 48.0, compareAtPrice: 57.6, sku: 'BL-BRY-12' },
    ],
    ingredients: ['Organic Raspberries (34%)', 'Wild Blueberries (28%)', 'Blackberries (20%)', 'Pressed Apple Puree (18%)'],
    nutrition: {
      calories: '138 kcal',
      sugarAdded: '0g added',
      fruitContent: '100% whole fruit',
      vitaminC: '120% DV',
      volume: '330ml glass',
    },
    featuredRank: 1,
  },
  {
    id: 'sunburst-kiwi-zing',
    slug: 'sunburst-kiwi-zing',
    name: 'Sunburst Kiwi Zing',
    category: 'Single Bottles',
    flavour: 'Kiwi',
    tagline: 'Bright green Hayward kiwi layered with white grape and lime zest.',
    description:
      'Clean, vibrant, and refreshingly tart. Pressed from sun-ripened green kiwi halves with cold-filtered pear and a crisp citrus finish.',
    price: 4.8,
    stock: 36,
    rating: 4.8,
    reviewCount: 2,
    tag: 'Fresh Batch',
    visualType: 'sprite',
    flavourIds: ['kiwi'],
    bgTint: '#EAF3DF',
    variants: [
      { id: 'single', label: 'Single (330ml)', price: 4.8, sku: 'BL-KIW-01' },
      { id: 'pack-6', label: '6-Pack', price: 25.9, compareAtPrice: 28.8, sku: 'BL-KIW-06' },
      { id: 'pack-12', label: '12-Pack', price: 48.0, compareAtPrice: 57.6, sku: 'BL-KIW-12' },
    ],
    ingredients: ['Green Hayward Kiwi (52%)', 'Pressed Pear (28%)', 'White Grape Juice (16%)', 'Fresh Lime (4%)'],
    nutrition: {
      calories: '126 kcal',
      sugarAdded: '0g added',
      fruitContent: '100% whole fruit',
      vitaminC: '185% DV',
      volume: '330ml glass',
    },
    featuredRank: 2,
  },
  {
    id: 'golden-banana-velvet',
    slug: 'golden-banana-velvet',
    name: 'Golden Banana Velvet',
    category: 'Single Bottles',
    flavour: 'Banana',
    tagline: 'Ripe Cavendish banana whipped silky with oat milk and vanilla bean.',
    description:
      'Naturally creamy morning fuel. Slow-ripened bananas blended cold with toasted oat cream and a whisper of Madagascar vanilla—zero dairy, zero gums.',
    price: 4.5,
    stock: 42,
    rating: 4.8,
    reviewCount: 2,
    visualType: 'sprite',
    flavourIds: ['banana'],
    bgTint: '#FCF4D6',
    variants: [
      { id: 'single', label: 'Single (330ml)', price: 4.5, sku: 'BL-BAN-01' },
      { id: 'pack-6', label: '6-Pack', price: 24.5, compareAtPrice: 27.0, sku: 'BL-BAN-06' },
      { id: 'pack-12', label: '12-Pack', price: 45.0, compareAtPrice: 54.0, sku: 'BL-BAN-12' },
    ],
    ingredients: ['Ripe Banana Puree (62%)', 'Cold-Pressed Oat Base (35%)', 'Lemon Juice (2%)', 'Vanilla Bean Extract (1%)'],
    nutrition: {
      calories: '164 kcal',
      sugarAdded: '0g added',
      fruitContent: '64% whole fruit',
      vitaminC: '35% DV',
      volume: '330ml glass',
    },
    featuredRank: 3,
  },
  {
    id: 'garden-strawberry-silk',
    slug: 'garden-strawberry-silk',
    name: 'Garden Strawberry Silk',
    category: 'Single Bottles',
    flavour: 'Strawberry',
    tagline: 'Sweet field strawberries blended smooth with peach and coconut water.',
    description:
      'Summer in a chilled bottle. Hand-hulled Albion strawberries balanced with white peach nectar and light coconut water for an ultra-clean finish.',
    price: 4.8,
    stock: 30,
    rating: 4.9,
    reviewCount: 2,
    tag: 'Fan Favorite',
    visualType: 'sprite',
    flavourIds: ['strawberry'],
    bgTint: '#FCE8EE',
    variants: [
      { id: 'single', label: 'Single (330ml)', price: 4.8, sku: 'BL-STR-01' },
      { id: 'pack-6', label: '6-Pack', price: 25.9, compareAtPrice: 28.8, sku: 'BL-STR-06' },
      { id: 'pack-12', label: '12-Pack', price: 48.0, compareAtPrice: 57.6, sku: 'BL-STR-12' },
    ],
    ingredients: ['Albion Strawberries (58%)', 'White Peach Puree (24%)', 'Coconut Water (16%)', 'Lemon Juice (2%)'],
    nutrition: {
      calories: '122 kcal',
      sugarAdded: '0g added',
      fruitContent: '84% whole fruit',
      vitaminC: '150% DV',
      volume: '330ml glass',
    },
    featuredRank: 4,
  },
  {
    id: 'signature-4-pack',
    slug: 'signature-4-pack',
    name: 'The Signature 4-Pack',
    category: 'Multi-Packs',
    flavour: 'Mixed',
    tagline: 'One bottle of every Blendy hero flavour in our kraft carrier.',
    description:
      'Can’t pick a favourite? Try Berry, Kiwi, Banana, and Strawberry side by side in a recyclable kraft four-bottle carrier—ideal for your first taste test.',
    price: 17.5,
    compareAtPrice: 18.9,
    stock: 25,
    rating: 4.9,
    reviewCount: 2,
    tag: 'Save 8%',
    visualType: 'photo',
    flavourIds: ['berry', 'kiwi', 'banana', 'strawberry'],
    imageKey: 'variety-pack',
    bgTint: '#F4F1EC',
    variants: [
      { id: 'carrier-4', label: '4-Bottle Carrier', price: 17.5, compareAtPrice: 18.9, sku: 'BL-MIX-04' },
      { id: 'carrier-8', label: '2× Carriers (8 Bottles)', price: 33.0, compareAtPrice: 37.8, sku: 'BL-MIX-08' },
    ],
    ingredients: ['1× Wild Berry Blast', '1× Sunburst Kiwi Zing', '1× Golden Banana Velvet', '1× Garden Strawberry Silk'],
    nutrition: {
      calories: '122–164 kcal / bottle',
      sugarAdded: '0g added',
      fruitContent: 'Whole pressed fruit',
      vitaminC: 'Up to 185% DV',
      volume: '4 × 330ml',
    },
    featuredRank: 5,
  },
  {
    id: 'tasting-crate-12',
    slug: 'tasting-crate-12',
    name: '12-Bottle Tasting Crate',
    category: 'Boxes & Bundles',
    flavour: 'Mixed',
    tagline: 'Twelve chilled glass bottles packed in an insulated tasting box.',
    description:
      'Stock your fridge for the week or send a bright fruit-filled gift box. Includes three bottles of each signature blend, chilled with compostable ice packs.',
    price: 48.0,
    compareAtPrice: 57.6,
    stock: 18,
    rating: 5.0,
    reviewCount: 2,
    tag: 'Free Delivery',
    visualType: 'photo',
    flavourIds: ['berry', 'kiwi', 'banana', 'strawberry'],
    imageKey: 'tasting-crate',
    bgTint: '#F4F1EC',
    variants: [
      { id: 'classic-12', label: 'Classic Assortment (12)', price: 48.0, compareAtPrice: 57.6, sku: 'BL-CRT-12' },
      { id: 'berry-heavy-12', label: 'Berry & Strawberry Mix (12)', price: 49.5, compareAtPrice: 57.6, sku: 'BL-CRT-12B' },
    ],
    ingredients: ['3× Wild Berry Blast', '3× Sunburst Kiwi Zing', '3× Golden Banana Velvet', '3× Garden Strawberry Silk'],
    nutrition: {
      calories: '122–164 kcal / bottle',
      sugarAdded: '0g added',
      fruitContent: '100% cold-pressed',
      vitaminC: 'Up to 185% DV',
      volume: '12 × 330ml',
    },
    featuredRank: 6,
  },
  {
    id: 'berry-strawberry-duo',
    slug: 'berry-strawberry-duo',
    name: 'Berry & Strawberry Duo Case',
    category: 'Multi-Packs',
    flavour: 'Berry',
    tagline: 'Half Wild Berry Blast, half Garden Strawberry Silk.',
    description:
      'Built for berry purists. A balanced split case pairing deep blackberries and raspberries with sweet summer strawberries.',
    price: 26.5,
    compareAtPrice: 28.8,
    stock: 22,
    rating: 4.8,
    reviewCount: 1,
    visualType: 'duo-sprite',
    flavourIds: ['berry', 'strawberry'],
    bgTint: '#F6EBF4',
    variants: [
      { id: 'case-6', label: '6-Pack (3+3)', price: 26.5, compareAtPrice: 28.8, sku: 'BL-DUO-BS6' },
      { id: 'case-12', label: '12-Pack (6+6)', price: 49.0, compareAtPrice: 57.6, sku: 'BL-DUO-BS12' },
    ],
    ingredients: ['50% Wild Berry Blast', '50% Garden Strawberry Silk'],
    nutrition: {
      calories: '122–138 kcal / bottle',
      sugarAdded: '0g added',
      fruitContent: 'Whole pressed berries',
      vitaminC: '120–150% DV',
      volume: '6 × 330ml',
    },
    featuredRank: 7,
  },
  {
    id: 'green-gold-morning-case',
    slug: 'green-gold-morning-case',
    name: 'Kiwi & Banana Morning Case',
    category: 'Multi-Packs',
    flavour: 'Kiwi',
    tagline: 'Zesty Sunburst Kiwi meets creamy Golden Banana Velvet.',
    description:
      'Your weekday breakfast rotation: bright vitamin-C-rich kiwi for crisp energy and velvety banana oat for steady morning fullness.',
    price: 25.5,
    compareAtPrice: 27.9,
    stock: 20,
    rating: 4.7,
    reviewCount: 1,
    visualType: 'duo-sprite',
    flavourIds: ['kiwi', 'banana'],
    bgTint: '#F2F5E4',
    variants: [
      { id: 'case-6', label: '6-Pack (3+3)', price: 25.5, compareAtPrice: 27.9, sku: 'BL-DUO-KB6' },
      { id: 'case-12', label: '12-Pack (6+6)', price: 47.5, compareAtPrice: 55.8, sku: 'BL-DUO-KB12' },
    ],
    ingredients: ['50% Sunburst Kiwi Zing', '50% Golden Banana Velvet'],
    nutrition: {
      calories: '126–164 kcal / bottle',
      sugarAdded: '0g added',
      fruitContent: 'Whole fruit + oat base',
      vitaminC: 'Up to 185% DV',
      volume: '6 × 330ml',
    },
    featuredRank: 8,
  },
  {
    id: 'craft-trio-tumbler-kit',
    slug: 'craft-trio-tumbler-kit',
    name: 'Cold-Pressed Trio & Tumbler Kit',
    category: 'Boxes & Bundles',
    flavour: 'Mixed',
    tagline: 'Three signature bottles paired with a reusable glass & steel straw.',
    description:
      'Designed for desk mornings and studio tables. Includes Wild Berry, Strawberry Silk, and Kiwi Zing alongside our heavy-base fluted tumbler and brushed steel straw.',
    price: 22.0,
    stock: 14,
    rating: 4.9,
    reviewCount: 1,
    tag: 'Limited Kit',
    visualType: 'photo',
    flavourIds: ['berry', 'strawberry', 'kiwi'],
    imageKey: 'craft-press',
    bgTint: '#F4F1EC',
    variants: [
      { id: 'kit-3', label: '3 Bottles + Tumbler', price: 22.0, sku: 'BL-KIT-03' },
      { id: 'kit-6', label: '6 Bottles + Tumbler', price: 34.0, compareAtPrice: 38.0, sku: 'BL-KIT-06' },
    ],
    ingredients: ['1× Wild Berry Blast', '1× Garden Strawberry Silk', '1× Sunburst Kiwi Zing', '1× Reusable Glass & Steel Straw'],
    nutrition: {
      calories: '122–138 kcal / bottle',
      sugarAdded: '0g added',
      fruitContent: '100% cold-pressed',
      vitaminC: '120–185% DV',
      volume: '3 × 330ml + Glassware',
    },
    featuredRank: 9,
  },
  {
    id: 'insulated-canvas-tote',
    slug: 'insulated-canvas-tote',
    name: 'Insulated Canvas Bottle Tote',
    category: 'Merch & Gear',
    flavour: 'Mixed',
    tagline: '16oz organic cotton canvas cooler bag with foil-lined bottle sleeves.',
    description:
      'Built to carry four Blendy glass bottles upright and chilled for up to five hours. Features interior bottle dividers, brass D-rings, and washable thermal lining.',
    price: 28.0,
    stock: 16,
    rating: 4.8,
    reviewCount: 1,
    visualType: 'photo',
    flavourIds: ['strawberry', 'banana'],
    imageKey: 'cooler-tote',
    bgTint: '#F4F1EC',
    variants: [
      { id: 'tote-only', label: 'Natural Sand Tote', price: 28.0, sku: 'BL-TOT-01' },
      { id: 'tote-plus-2', label: 'Tote + 2 Chilled Bottles', price: 36.0, compareAtPrice: 37.6, sku: 'BL-TOT-02' },
    ],
    ingredients: ['100% Unbleached Organic Canvas', 'BPA-Free Thermal Foil Lining', 'Solid Brass Hardware'],
    nutrition: {
      calories: 'N/A',
      sugarAdded: 'N/A',
      fruitContent: 'Holds 4 × 330ml bottles',
      vitaminC: 'Chills 5+ hrs',
      volume: '26 × 22 × 14 cm',
    },
    featuredRank: 10,
  },
];

const reviewsStore: ProductReview[] = [
  {
    id: 'rev-1',
    productId: 'wild-berry-blast',
    author: 'Maya Lin',
    rating: 5,
    title: 'Actually tastes like fresh crushed berries',
    comment: 'No syrupy aftertaste at all. The raspberry tartness comes through immediately when served ice cold.',
    createdAt: '2026-10-18',
    verified: true,
  },
  {
    id: 'rev-2',
    productId: 'wild-berry-blast',
    author: 'Daniel Park',
    rating: 5,
    title: 'Ordered the 12-pack twice already',
    comment: 'Super thick texture and glass bottles keep it tasting crisp in the fridge all week.',
    createdAt: '2026-11-02',
    verified: true,
  },
  {
    id: 'rev-3',
    productId: 'wild-berry-blast',
    author: 'Clara Rossi',
    rating: 5,
    title: 'Zero added sugar and genuinely filling',
    comment: 'My go-to post-run bottle. Love that it is just whole berries and apple puree.',
    createdAt: '2026-11-12',
    verified: true,
  },
  {
    id: 'rev-4',
    productId: 'sunburst-kiwi-zing',
    author: 'Noah Patel',
    rating: 5,
    title: 'Bright, zesty, not too sweet',
    comment: 'The little hint of lime makes this ridiculously refreshing after lunch.',
    createdAt: '2026-10-29',
    verified: true,
  },
  {
    id: 'rev-5',
    productId: 'sunburst-kiwi-zing',
    author: 'Hannah Kim',
    rating: 5,
    title: 'Best green smoothie I have bought bottled',
    comment: 'Real kiwi seeds and smooth pear base—feels freshly pressed.',
    createdAt: '2026-11-10',
    verified: true,
  },
  {
    id: 'rev-6',
    productId: 'golden-banana-velvet',
    author: 'Samira Hassan',
    rating: 5,
    title: 'Silky without any dairy',
    comment: 'Tastes like a proper café banana oat shake without the heavy sugar crash.',
    createdAt: '2026-11-04',
    verified: true,
  },
  {
    id: 'rev-7',
    productId: 'golden-banana-velvet',
    author: 'Lucas Meyer',
    rating: 5,
    title: 'Great breakfast grab',
    comment: 'Subtle vanilla bean aroma pairs so well with morning espresso.',
    createdAt: '2026-11-14',
    verified: true,
  },
  {
    id: 'rev-8',
    productId: 'garden-strawberry-silk',
    author: 'Elena Brooks',
    rating: 5,
    title: 'Pure summer strawberries',
    comment: 'Light coconut water keeps it super drinkable instead of overly dense.',
    createdAt: '2026-11-01',
    verified: true,
  },
  {
    id: 'rev-9',
    productId: 'garden-strawberry-silk',
    author: 'Tariq Aziz',
    rating: 5,
    title: 'My kids and I both finish the 6-pack fast',
    comment: 'Clean ingredient list and the pastel glass bottles look great on the table.',
    createdAt: '2026-11-15',
    verified: true,
  },
  {
    id: 'rev-10',
    productId: 'signature-4-pack',
    author: 'Grace O’Connor',
    rating: 5,
    title: 'Ideal starter carrier',
    comment: 'Loved trying all four before committing to a 12-bottle crate. Berry and Kiwi tied for first.',
    createdAt: '2026-11-09',
    verified: true,
  },
  {
    id: 'rev-11',
    productId: 'signature-4-pack',
    author: 'Ethan Wright',
    rating: 5,
    title: 'Arrived chilled and intact',
    comment: 'The kraft carrier makes it easy to bring straight to a weekend picnic.',
    createdAt: '2026-11-16',
    verified: true,
  },
  {
    id: 'rev-12',
    productId: 'tasting-crate-12',
    author: 'Sofia Alvarez',
    rating: 5,
    title: 'Gifted to my sister and ordered one for home',
    comment: 'Unboxing the twelve bottles lined up by pastel shade is such a treat.',
    createdAt: '2026-11-06',
    verified: true,
  },
  {
    id: 'rev-13',
    productId: 'tasting-crate-12',
    author: 'Benny Cho',
    rating: 5,
    title: 'Best value per bottle + free shipping',
    comment: 'Cold packs were still frosty when it reached our porch.',
    createdAt: '2026-11-17',
    verified: true,
  },
  {
    id: 'rev-14',
    productId: 'berry-strawberry-duo',
    author: 'Olivia Grant',
    rating: 5,
    title: 'Our household’s two favourites in one case',
    comment: 'No leftover flavours—every bottle gets finished.',
    createdAt: '2026-11-11',
    verified: true,
  },
  {
    id: 'rev-15',
    productId: 'green-gold-morning-case',
    author: 'Ravi Nair',
    rating: 5,
    title: 'Alternating Kiwi and Banana all week',
    comment: 'Zero decision fatigue in the morning.',
    createdAt: '2026-11-13',
    verified: true,
  },
  {
    id: 'rev-16',
    productId: 'craft-trio-tumbler-kit',
    author: 'Chloe Martin',
    rating: 5,
    title: 'The glass tumbler feels heavy and well made',
    comment: 'Makes my desk smoothie break feel like a café ritual.',
    createdAt: '2026-11-18',
    verified: true,
  },
  {
    id: 'rev-17',
    productId: 'insulated-canvas-tote',
    author: 'Liam Foster',
    rating: 5,
    title: 'Sturdy canvas and clever bottle dividers',
    comment: 'Fits four bottles cleanly without clinking together on the commute.',
    createdAt: '2026-11-19',
    verified: true,
  },
];

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function signToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(authHeader: string | undefined): StoredUser | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as { sub?: string };
    if (!parsed.sub) return null;
    return usersById.get(parsed.sub) ?? null;
  } catch {
    return null;
  }
}

function evaluatePromo(codeRaw: unknown, subtotal: number, deliveryMethod: 'standard' | 'express') {
  const code = typeof codeRaw === 'string' ? codeRaw.trim().toUpperCase() : '';
  if (!code) {
    return { valid: false, code: null, discount: 0, freeShippingOverride: false, message: '' };
  }
  if (code === 'BLENDY10') {
    return {
      valid: true,
      code,
      discount: roundMoney(subtotal * 0.1),
      freeShippingOverride: false,
      message: '10% off applied (BLENDY10)',
    };
  }
  if (code === 'FRESH5') {
    if (subtotal < 25) {
      return {
        valid: false,
        code: null,
        discount: 0,
        freeShippingOverride: false,
        message: 'FRESH5 requires a $25.00 minimum subtotal.',
      };
    }
    return {
      valid: true,
      code,
      discount: 5,
      freeShippingOverride: false,
      message: '$5.00 off applied (FRESH5)',
    };
  }
  if (code === 'FREESHIP') {
    return {
      valid: true,
      code,
      discount: 0,
      freeShippingOverride: deliveryMethod === 'standard',
      message:
        deliveryMethod === 'standard'
          ? 'Free standard chilled delivery applied (FREESHIP)'
          : 'FREESHIP applies to Standard Chilled delivery.',
    };
  }
  return {
    valid: false,
    code: null,
    discount: 0,
    freeShippingOverride: false,
    message: 'Unrecognized promo code. Try BLENDY10, FRESH5, or FREESHIP.',
  };
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.use('/fonts', express.static(path.join(__dirname, 'public', 'fonts'), { maxAge: '1y' }));

  // GET /api/products
  app.get('/api/products', (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const flavour = typeof req.query.flavour === 'string' ? req.query.flavour : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'featured';

    let results = [...initialProducts];

    if (category && category !== 'All Products') {
      results = results.filter((p) => p.category === category);
    }
    if (flavour && flavour !== 'All') {
      results = results.filter((p) => p.flavour === flavour);
    }
    if (q) {
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.flavour.toLowerCase().includes(q) ||
          p.ingredients.some((i) => i.toLowerCase().includes(q))
      );
    }

    if (sort === 'price-asc') {
      results.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      results.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      results.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    } else {
      results.sort((a, b) => a.featuredRank - b.featuredRank);
    }

    res.json({ products: results, freeShippingThreshold: FREE_SHIPPING_THRESHOLD });
  });

  // GET /api/products/:id
  app.get('/api/products/:id', (req, res) => {
    const product = initialProducts.find((p) => p.id === req.params.id || p.slug === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const reviews = reviewsStore.filter((r) => r.productId === product.id);
    return res.json({ product, reviews });
  });

  // POST /api/products/:id/reviews
  app.post('/api/products/:id/reviews', (req, res) => {
    const product = initialProducts.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const { author, rating, title, comment } = req.body ?? {};
    if (typeof author !== 'string' || author.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your name (at least 2 characters).' });
    }
    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }
    if (typeof title !== 'string' || title.trim().length < 2) {
      return res.status(400).json({ error: 'Please add a short review headline.' });
    }
    if (typeof comment !== 'string' || comment.trim().length < 5) {
      return res.status(400).json({ error: 'Please write at least a few words in your review.' });
    }

    const review: ProductReview = {
      id: `rev-${Date.now()}`,
      productId: product.id,
      author: author.trim().slice(0, 60),
      rating: numRating,
      title: title.trim().slice(0, 100),
      comment: comment.trim().slice(0, 500),
      createdAt: new Date().toISOString().slice(0, 10),
      verified: true,
    };

    reviewsStore.unshift(review);
    const productReviews = reviewsStore.filter((r) => r.productId === product.id);
    product.reviewCount = productReviews.length;
    product.rating = Number(
      (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
    );

    return res.status(201).json({ review, product, reviews: productReviews });
  });

  // POST /api/promo/validate
  app.post('/api/promo/validate', (req, res) => {
    const { code, subtotal, deliveryMethod } = req.body ?? {};
    const numSubtotal = Number(subtotal);
    if (!Number.isFinite(numSubtotal) || numSubtotal < 0) {
      return res.status(400).json({ error: 'Invalid subtotal' });
    }
    const method = deliveryMethod === 'express' ? 'express' : 'standard';
    const result = evaluatePromo(code, numSubtotal, method);
    if (!result.valid) {
      return res.status(400).json({ error: result.message || 'Invalid promo code' });
    }
    return res.json(result);
  });

  // POST /api/orders
  app.post('/api/orders', (req, res) => {
    const user = verifyToken(req.headers.authorization);
    const { items, shipping, paymentMethod, promoCode } = req.body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your bag is empty.' });
    }

    if (!shipping || typeof shipping !== 'object') {
      return res.status(400).json({ error: 'Shipping details are required.' });
    }

    const fullName = typeof shipping.fullName === 'string' ? shipping.fullName.trim() : '';
    const email = typeof shipping.email === 'string' ? shipping.email.trim() : '';
    const phone = typeof shipping.phone === 'string' ? shipping.phone.trim() : '';
    const address = typeof shipping.address === 'string' ? shipping.address.trim() : '';
    const city = typeof shipping.city === 'string' ? shipping.city.trim() : '';
    const postalCode = typeof shipping.postalCode === 'string' ? shipping.postalCode.trim() : '';
    const deliveryMethod = shipping.deliveryMethod === 'express' ? 'express' : 'standard';

    if (fullName.length < 2 || !email.includes('@') || phone.length < 6 || address.length < 4 || city.length < 2 || postalCode.length < 3) {
      return res.status(400).json({ error: 'Please complete all required delivery fields.' });
    }

    const receiptItems: OrderItemReceipt[] = [];
    let subtotal = 0;

    for (const rawItem of items) {
      const productId = typeof rawItem?.productId === 'string' ? rawItem.productId : '';
      const variantId = typeof rawItem?.variantId === 'string' ? rawItem.variantId : '';
      const quantity = Number(rawItem?.quantity);

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
        return res.status(400).json({ error: 'Invalid item quantity.' });
      }

      const product = initialProducts.find((p) => p.id === productId);
      if (!product) {
        return res.status(400).json({ error: `Product ${productId} not found.` });
      }

      const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
      if (product.stock < quantity) {
        return res.status(400).json({ error: `Only ${product.stock} left in stock for ${product.name}.` });
      }

      const lineTotal = roundMoney(variant.price * quantity);
      subtotal = roundMoney(subtotal + lineTotal);

      receiptItems.push({
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantLabel: variant.label,
        unitPrice: variant.price,
        quantity,
        lineTotal,
        flavourIds: product.flavourIds,
        visualType: product.visualType,
        imageKey: product.imageKey,
        bgTint: product.bgTint,
      });
    }

    // Decrement stock after full validation
    for (const item of receiptItems) {
      const p = initialProducts.find((prod) => prod.id === item.productId);
      if (p) p.stock = Math.max(0, p.stock - item.quantity);
    }

    const promo = evaluatePromo(promoCode, subtotal, deliveryMethod);
    const discount = promo.valid ? Math.min(subtotal, promo.discount) : 0;
    const afterDiscount = roundMoney(subtotal - discount);

    let shippingFee = 0;
    if (deliveryMethod === 'express') {
      shippingFee = EXPRESS_SHIPPING_FEE;
    } else if (!promo.freeShippingOverride && afterDiscount < FREE_SHIPPING_THRESHOLD) {
      shippingFee = STANDARD_SHIPPING_FEE;
    }

    const total = roundMoney(afterDiscount + shippingFee);
    const orderNumber = `BL-${orderSequence++}`;

    const order: Order = {
      orderNumber,
      userId: user ? user.id : null,
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
      estimatedDelivery: deliveryMethod === 'express' ? 'Today by 7:00 PM (Chilled Courier)' : '2–3 Business Days (Insulated Box)',
      paymentMethod: paymentMethod === 'cod' ? 'cod' : 'card',
      promoCode: promo.valid ? promo.code : null,
      subtotal,
      discount,
      shippingFee,
      total,
      shipping: {
        fullName,
        email,
        phone,
        address,
        city,
        postalCode,
        deliveryMethod,
      },
      items: receiptItems,
    };

    ordersStore.unshift(order);
    return res.status(201).json({ order, products: initialProducts });
  });

  // GET /api/orders (authenticated user orders)
  app.get('/api/orders', (req, res) => {
    const user = verifyToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Sign in to view saved account orders.' });
    }
    const userOrders = ordersStore.filter(
      (o) => o.userId === user.id || o.shipping.email.toLowerCase() === user.email.toLowerCase()
    );
    return res.json({ orders: userOrders });
  });

  // GET /api/orders/lookup?orderNumber=...&email=...
  app.get('/api/orders/lookup', (req, res) => {
    const orderNumber = typeof req.query.orderNumber === 'string' ? req.query.orderNumber.trim().toUpperCase() : '';
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    if (!orderNumber || !email) {
      return res.status(400).json({ error: 'Order number and email are required.' });
    }
    const found = ordersStore.find(
      (o) => o.orderNumber.toUpperCase() === orderNumber && o.shipping.email.toLowerCase() === email
    );
    if (!found) {
      return res.status(404).json({ error: 'No matching order found for that order number and email.' });
    }
    return res.json({ order: found });
  });

  // POST /api/auth/register
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body ?? {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';

    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }
    if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (usersByEmail.has(cleanEmail)) {
      return res.status(409).json({ error: 'An account with that email already exists. Try signing in.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const user: StoredUser = {
      id: `usr-${crypto.randomUUID()}`,
      name: cleanName,
      email: cleanEmail,
      salt,
      passwordHash: hashPassword(cleanPassword, salt),
    };
    usersByEmail.set(cleanEmail, user);
    usersById.set(user.id, user);

    const token = signToken(user.id);
    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  });

  // POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';

    const user = usersByEmail.get(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const candidateHash = Buffer.from(hashPassword(cleanPassword, user.salt), 'hex');
    const storedHash = Buffer.from(user.passwordHash, 'hex');
    if (candidateHash.length !== storedHash.length || !crypto.timingSafeEqual(candidateHash, storedHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user.id);
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', (req, res) => {
    const user = verifyToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const orders = ordersStore.filter(
      (o) => o.userId === user.id || o.shipping.email.toLowerCase() === user.email.toLowerCase()
    );
    return res.json({
      user: { id: user.id, name: user.name, email: user.email },
      orders,
    });
  });

  // POST /api/newsletter
  app.post('/api/newsletter', (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email.includes('@') || email.length < 5) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    newsletterEmails.add(email);
    return res.json({ subscribed: true, message: 'Subscribed to seasonal press drops.' });
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Blendy storefront running at http://${HOST}:${PORT}`);
  });
}

createServer();

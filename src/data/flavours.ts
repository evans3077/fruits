import type { FlavourId } from '../types';
import heroPourBerry from '../assets/images/hero_pour_berry_1795671013349.jpg';
import heroPourKiwi from '../assets/images/hero_pour_kiwi_1795670988870.jpg';
import heroPourBanana from '../assets/images/hero_pour_banana_1795670989001.jpg';
import heroPourStrawberry from '../assets/images/hero_pour_strawberry_1795670989760.jpg';

const PROXY_PREFIX = 'https://images.higgs.ai/?default=1&output=webp&w=2048&q=85&url=';
const sheetUrl = (raw: string) => PROXY_PREFIX + encodeURIComponent(raw);

export interface FruitPieceSpec {
  item: 1 | 2 | 3;
  x: number;
  y: number;
  w: number;
  rot: number;
  mirror: boolean;
  layer: 'behind' | 'fruit' | 'corner';
}

export interface FlavourSpec {
  id: FlavourId;
  word: string;
  bg: string;
  pourImage: string;
  pourScene: { x: number; y: number; w: number; h: number };
  sheet: string;
  items: [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number]
  ];
  bottle: { x: number; y: number; w: number };
  pieces: FruitPieceSpec[];
}

export const SHADOWS: [number, number, number, number][] = [
  [345, 650, 170, 24],
  [720, 748, 360, 32],
  [1318, 638, 160, 22],
  [1045, 760, 150, 22],
];

export const FLAVOURS: FlavourSpec[] = [
  {
    id: 'berry',
    word: 'Berry',
    bg: '#C2B0DC',
    pourImage: heroPourBerry,
    pourScene: { x: 405, y: 270, w: 630, h: 472 },
    sheet: sheetUrl(
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261117_053958_8803e421-29b1-4c24-8efd-54cae3f479b4.png'
    ),
    items: [
      [233, 60, 598, 917],
      [1209, 272, 569, 573],
      [265, 1230, 579, 572],
      [1192, 1192, 626, 641],
    ],
    bottle: { x: 518, y: 138, w: 372 },
    pieces: [
      { item: 1, x: 590, y: 315, w: 175, rot: -12, mirror: false, layer: 'behind' },
      { item: 2, x: 745, y: 405, w: 155, rot: 14, mirror: true, layer: 'behind' },
      { item: 2, x: 350, y: 178, w: 108, rot: 0, mirror: false, layer: 'fruit' },
      { item: 3, x: 980, y: 220, w: 122, rot: 0, mirror: false, layer: 'fruit' },
      { item: 1, x: 280, y: 488, w: 132, rot: -8, mirror: false, layer: 'fruit' },
      { item: 1, x: 1235, y: 455, w: 125, rot: 15, mirror: false, layer: 'fruit' },
      { item: 2, x: 995, y: 595, w: 114, rot: 30, mirror: false, layer: 'fruit' },
      { item: 1, x: -15, y: 590, w: 255, rot: 0, mirror: false, layer: 'corner' },
      { item: 3, x: 1282, y: 40, w: 200, rot: 0, mirror: false, layer: 'corner' },
    ],
  },
  {
    id: 'kiwi',
    word: 'Kiwi',
    bg: '#B4D58A',
    pourImage: heroPourKiwi,
    pourScene: { x: 405, y: 270, w: 630, h: 472 },
    sheet: sheetUrl(
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261117_053958_b5695e60-72da-4b5b-bfb7-a091d528af75.png'
    ),
    items: [
      [217, 90, 610, 874],
      [1204, 257, 619, 601],
      [250, 1197, 619, 522],
      [1200, 1186, 633, 650],
    ],
    bottle: { x: 504, y: 135, w: 403 },
    pieces: [
      { item: 1, x: 575, y: 315, w: 185, rot: -10, mirror: false, layer: 'behind' },
      { item: 2, x: 735, y: 410, w: 170, rot: 16, mirror: true, layer: 'behind' },
      { item: 2, x: 350, y: 170, w: 144, rot: -150, mirror: true, layer: 'fruit' },
      { item: 3, x: 985, y: 215, w: 152, rot: 0, mirror: false, layer: 'fruit' },
      { item: 1, x: 280, y: 472, w: 168, rot: 0, mirror: false, layer: 'fruit' },
      { item: 2, x: 1187, y: 462, w: 148, rot: -25, mirror: false, layer: 'fruit' },
      { item: 2, x: 985, y: 606, w: 150, rot: 10, mirror: true, layer: 'fruit' },
      { item: 1, x: -10, y: 575, w: 260, rot: 0, mirror: false, layer: 'corner' },
      { item: 3, x: 1285, y: 30, w: 200, rot: 0, mirror: false, layer: 'corner' },
    ],
  },
  {
    id: 'banana',
    word: 'Banana',
    bg: '#F3DA8A',
    pourImage: heroPourBanana,
    pourScene: { x: 405, y: 270, w: 630, h: 472 },
    sheet: sheetUrl(
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261117_053958_6cf14029-4bce-4c9a-b9fc-1c5b185082e3.png'
    ),
    items: [
      [194, 76, 579, 873],
      [1205, 228, 596, 597],
      [230, 1181, 624, 648],
      [1193, 1182, 646, 659],
    ],
    bottle: { x: 512, y: 135, w: 383 },
    pieces: [
      { item: 1, x: 580, y: 315, w: 180, rot: -8, mirror: false, layer: 'behind' },
      { item: 2, x: 740, y: 405, w: 170, rot: 18, mirror: true, layer: 'behind' },
      { item: 1, x: 355, y: 147, w: 123, rot: 0, mirror: false, layer: 'fruit' },
      { item: 2, x: 985, y: 215, w: 136, rot: -10, mirror: true, layer: 'fruit' },
      { item: 3, x: 278, y: 492, w: 132, rot: 15, mirror: false, layer: 'fruit' },
      { item: 2, x: 1245, y: 462, w: 150, rot: 20, mirror: false, layer: 'fruit' },
      { item: 3, x: 985, y: 588, w: 130, rot: -12, mirror: false, layer: 'fruit' },
      { item: 3, x: 0, y: 585, w: 235, rot: 0, mirror: false, layer: 'corner' },
      { item: 1, x: 1280, y: 30, w: 190, rot: 0, mirror: false, layer: 'corner' },
    ],
  },
  {
    id: 'strawberry',
    word: 'Strawberry',
    bg: '#F2AFC0',
    pourImage: heroPourStrawberry,
    pourScene: { x: 405, y: 270, w: 630, h: 472 },
    sheet: sheetUrl(
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261117_055135_cbfb5a8d-c52b-4358-a6ee-d941c6c42285.png'
    ),
    items: [
      [226, 88, 594, 887],
      [1190, 216, 561, 653],
      [257, 1168, 604, 662],
      [1240, 1169, 632, 686],
    ],
    bottle: { x: 512, y: 135, w: 386 },
    pieces: [
      { item: 1, x: 570, y: 305, w: 190, rot: -14, mirror: false, layer: 'behind' },
      { item: 3, x: 735, y: 395, w: 175, rot: 12, mirror: true, layer: 'behind' },
      { item: 1, x: 350, y: 142, w: 128, rot: 0, mirror: false, layer: 'fruit' },
      { item: 2, x: 985, y: 215, w: 117, rot: 20, mirror: false, layer: 'fruit' },
      { item: 3, x: 270, y: 465, w: 140, rot: -10, mirror: false, layer: 'fruit' },
      { item: 3, x: 1250, y: 432, w: 135, rot: 15, mirror: false, layer: 'fruit' },
      { item: 2, x: 990, y: 568, w: 146, rot: -15, mirror: false, layer: 'fruit' },
      { item: 1, x: -10, y: 555, w: 245, rot: 0, mirror: false, layer: 'corner' },
      { item: 1, x: 1285, y: 35, w: 200, rot: 20, mirror: false, layer: 'corner' },
    ],
  },
];

export const FLAVOUR_MAP: Record<FlavourId, FlavourSpec> = {
  berry: FLAVOURS[0],
  kiwi: FLAVOURS[1],
  banana: FLAVOURS[2],
  strawberry: FLAVOURS[3],
};

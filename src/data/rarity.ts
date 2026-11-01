import type { DataSource, RarityId, Series } from '../types/collectible';

/**
 * RARITY TIERS AND SERIES — edit names, colours and wording here.
 *
 * IMPORTANT: every rarity label in the catalogue is currently DEMO data. A
 * rarity means how a design is PLANNED to be printed (always in range, smaller
 * runs, occasional batches, one fixed run). It is not a drop chance, and the
 * site never shows odds or stock counts. Switch `rarityDataSource` to
 * 'production' only when the labels match real print runs.
 */
export const rarityDataSource: DataSource = 'demo';

export interface RarityTier {
  id: RarityId;
  label: string;
  /** What the tier means, in one line. */
  meaning: string;
  /** Badge colours. */
  bg: string;
  fg: string;
  /** Frame style used around artwork in the collection explorer. */
  frame: 'plain' | 'dashed' | 'double' | 'foil';
}

export const rarityTiers: RarityTier[] = [
  { id: 'common', label: 'Common', meaning: 'Part of the regular range — planned to stay available.', bg: '#FFFFFF', fg: '#121212', frame: 'plain' },
  { id: 'uncommon', label: 'Uncommon', meaning: 'Planned for smaller print runs; may rotate out of the range.', bg: '#7FE0B5', fg: '#121212', frame: 'dashed' },
  { id: 'rare', label: 'Rare', meaning: 'Planned for occasional small batches rather than permanent stock.', bg: '#8A6CFF', fg: '#121212', frame: 'double' },
  {
    id: 'limited',
    label: 'Limited Edition',
    meaning: 'One fixed print run. Edition size and numbers are published only once the run is confirmed.',
    bg: '#121212',
    fg: '#D4FF3A',
    frame: 'foil',
  },
];

export function getRarity(id: RarityId | undefined): RarityTier | undefined {
  return rarityTiers.find((r) => r.id === id);
}

/** Series codes double as the code printed on packs and the passport. */
export const series: Series[] = [
  { id: 'S01', name: 'Campus Classics', blurb: 'Attendance maths, chai breaks and last-bench pride.', color: '#FFD447', source: 'demo' },
  { id: 'S02', name: 'Dev Mode', blurb: 'Bugs, brackets and late-night builds.', color: '#8FD3FF', source: 'demo' },
  { id: 'S03', name: 'Soft Days', blurb: 'Clouds, cats, music and small joys.', color: '#FFB3D1', source: 'demo' },
  { id: 'S04', name: 'Pit Lane & Pixels', blurb: 'Original cars, flags and pixel art.', color: '#D4FF3A', source: 'demo' },
  { id: 'S05', name: 'Screen Time', blurb: 'Anime-inspired art, movie nights and original heroes.', color: '#8A6CFF', source: 'demo' },
];

export function getSeries(id: string | undefined): Series | undefined {
  return series.find((s) => s.id === id);
}

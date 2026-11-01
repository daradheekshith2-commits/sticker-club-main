import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const duosData = [
  {
    key: 'blood_moon_samurai',
    slug: 'blood-moon-samurai-duo',
    name: 'Blood Moon Samurai (Matching Duo)',
    shortDescription: 'Twin katana warriors bound by the crimson eclipse.',
    description: 'A striking matching pair of Japanese warrior stickers: the Blood Moon Katana Master and the Scarlet Blade Onna-Musha. Sold together as one matching duo product — keep both or share with someone special.',
    price: 39.00,
    categories: ['anime', 'duos'],
    tags: ['duo', 'pair', 'anime', 'samurai', 'katana', 'blood-moon', 'warrior'],
    rarity: 'rare',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Blood Moon Katana Master',
    partB: 'Scarlet Blade Onna-Musha',
    pairNote: 'Two complementary samurai warriors in dynamic battle stance. They form a coordinated duel when placed side by side.',
    fileA: '01_Blood_Moon_Samurai_A.png',
    fileB: '02_Blood_Moon_Samurai_B.png',
  },
  {
    key: 'cherry_blossom_samurai',
    slug: 'cherry-blossom-samurai-duo',
    name: 'Cherry Blossom Samurai (Matching Duo)',
    shortDescription: 'Serene sakura swordsmen amidst fluttering spring petals.',
    description: 'Delicate yet lethal: the Sakura Swordsman with bamboo hat and the Blossom Kunoichi surrounded by swirling cherry blossoms. Sold together as one matching pair.',
    price: 39.00,
    categories: ['anime', 'duos'],
    tags: ['duo', 'pair', 'anime', 'samurai', 'sakura', 'cherry-blossom'],
    rarity: 'common',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Sakura Swordsman',
    partB: 'Blossom Kunoichi',
    pairNote: 'Two companion samurai warriors surrounded by falling cherry blossom petals.',
    fileA: '01_Cherry_Blossom_Samurai_A.png',
    fileB: '01_Cherry_Blossom_Samurai_B.png',
  },
  {
    key: 'oni_masks',
    slug: 'oni-masks-duo',
    name: 'Twin Oni Masks (Matching Duo)',
    shortDescription: 'Legendary Crimson Aka-Oni and Azure Ao-Oni guardian masks.',
    description: 'Traditional Japanese folklore demon masks: fierce red Aka-Oni with golden horns and menacing blue Ao-Oni with silver lightning aura. Sold together as a matching duo.',
    price: 39.00,
    categories: ['anime', 'duos'],
    tags: ['duo', 'pair', 'anime', 'oni', 'demon-mask', 'japanese', 'folklore'],
    rarity: 'uncommon',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Crimson Aka-Oni Mask',
    partB: 'Azure Ao-Oni Mask',
    pairNote: 'Complementary red and blue oni masks that balance fierce guardian energy.',
    fileA: '03_Oni_Masks_A.png',
    fileB: '04_Oni_Masks_B.png',
  },
  {
    key: 'shadow_sorcerer',
    slug: 'shadow-sorcerers-duo',
    name: 'Shadow Sorcerers (Matching Duo)',
    shortDescription: 'Dark occult sorcery and purple cursed flames.',
    description: 'Mystic dark fantasy pair: Void Summoner weaving shadow tendrils and Eclipse Sorceress channeling violet spirit flames. Perfect for Jujutsu and anime magic fans.',
    price: 39.00,
    categories: ['anime', 'duos'],
    tags: ['duo', 'pair', 'anime', 'sorcerer', 'magic', 'dark-fantasy', 'jujutsu'],
    rarity: 'uncommon',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Void Summoner',
    partB: 'Eclipse Sorceress',
    pairNote: 'Twin shadow practitioners wielding complementary cursed flame arts.',
    fileA: '04_Shadow_Sorcerer_A.png',
    fileB: '04_Shadow_Sorcerer_B.png',
  },
  {
    key: 'flame_lightning_ninjas',
    slug: 'flame-and-lightning-ninjas-duo',
    name: 'Flame & Lightning Ninjas (Matching Duo)',
    shortDescription: 'Rival elemental shinobi crackling with fire and thunder.',
    description: 'Blazing Fire Shinobi with incandescent flame daggers paired with Chidori Lightning Shinobi crackling with blue electricity kunai. Sold together as one matching duo.',
    price: 39.00,
    categories: ['anime', 'duos'],
    tags: ['duo', 'pair', 'anime', 'ninja', 'shinobi', 'fire', 'lightning', 'naruto'],
    rarity: 'rare',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Blazing Fire Shinobi',
    partB: 'Chidori Lightning Shinobi',
    pairNote: 'Opposing elemental jutsu warriors designed to mirror each other on your devices.',
    fileA: '05_Flame_Lightning_Ninjas_A.png',
    fileB: '05_Flame_Lightning_Ninjas_B.png',
  },
  {
    key: 'tactical_fighters',
    slug: 'tactical-fighters-duo',
    name: 'Tactical Spec-Ops Fighters (Matching Duo)',
    shortDescription: 'Cyber tactical ghost operatives equipped for urban stealth.',
    description: 'Two elite tactical operatives: Spec-Ops Ghost with night-vision optics and Cyber Recon Sniper with silenced loadout. A prime matching duo for tactical gaming fans.',
    price: 39.00,
    categories: ['gaming', 'duos'],
    tags: ['duo', 'pair', 'gaming', 'tactical', 'military', 'spec-ops', 'cyberpunk'],
    rarity: 'common',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Spec-Ops Ghost Operative',
    partB: 'Cyber Recon Sniper',
    pairNote: 'Coordinated squad members watching each other’s six in high-stakes operations.',
    fileA: '05_Tactical_Fighters_A.png',
    fileB: '06_Tactical_Fighters_B.png',
  },
  {
    key: 'elemental_dragons',
    slug: 'elemental-dragons-duo',
    name: 'Celestial Elemental Dragons (Matching Duo)',
    shortDescription: 'Serpentine Solar and Lunar dragons circling the heavens.',
    description: 'Breathtaking Eastern mythical dragons: Celestial Solar Dragon glowing with golden sun rays and Abyssal Lunar Dragon coiling under the crescent moon.',
    price: 39.00,
    categories: ['anime', 'duos'],
    tags: ['duo', 'pair', 'anime', 'dragon', 'celestial', 'mythology'],
    rarity: 'rare',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Celestial Solar Dragon',
    partB: 'Abyssal Lunar Dragon',
    pairNote: 'Sun and moon serpentine dragons that create a cosmic circular harmony.',
    fileA: '07_Elemental_Dragons_A.png',
    fileB: '08_Elemental_Dragons_B.png',
  },
  {
    key: 'water_blossom_warriors',
    slug: 'water-blossom-warriors-duo',
    name: 'Water Blossom Warriors (Matching Duo)',
    shortDescription: 'Flowing water breathing swordsmanship and lotus petals.',
    description: 'Dynamic swordsmanship stickers inspired by water breathing forms: Tidal Blade Swordsman slicing surging waves and Lotus Flow Swordswoman dancing with floral ripples.',
    price: 39.00,
    categories: ['anime', 'duos'],
    tags: ['duo', 'pair', 'anime', 'water-breathing', 'demon-slayer', 'swordsman'],
    rarity: 'uncommon',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Tidal Blade Swordsman',
    partB: 'Lotus Flow Swordswoman',
    pairNote: 'Fluid water techniques that connect seamlessly when displayed together.',
    fileA: '08_Water_Blossom_Warriors_A.png',
    fileB: '08_Water_Blossom_Warriors_B.png',
  },
  {
    key: 'fire_ice_dragons',
    slug: 'fire-and-ice-dragons-duo',
    name: 'Fire & Ice Dragons (Matching Duo)',
    shortDescription: 'Molten magma dragon paired with glacial frostbite dragon.',
    description: 'Two legendary fantasy wyverns: Inferno Dragon radiating volcanic heat and Frostbite Dragon enveloped in frozen glacial spikes. Sold together as a matching pair.',
    price: 39.00,
    categories: ['anime', 'duos'],
    tags: ['duo', 'pair', 'anime', 'dragon', 'fire', 'ice', 'fantasy'],
    rarity: 'rare',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Inferno Dragon',
    partB: 'Frostbite Dragon',
    pairNote: 'Elemental opposites: pure fire meets sub-zero ice in high-detail die-cut vinyl.',
    fileA: '09_Fire_Ice_Dragons_A.png',
    fileB: '10_Fire_Ice_Dragons_B.png',
  },
  {
    key: 'shadow_ninjas',
    slug: 'shadow-ninjas-duo',
    name: 'Shadow Ninjas (Matching Duo)',
    shortDescription: 'Midnight katana shinobi leaping through smoke and darkness.',
    description: 'Stealth shinobi duo: Midnight Katana Shinobi drawing his blade mid-leap and Shuriken Smoke Shinobi disappearing into smoke bombs.',
    price: 39.00,
    categories: ['anime', 'duos'],
    tags: ['duo', 'pair', 'anime', 'ninja', 'shinobi', 'katana', 'stealth'],
    rarity: 'common',
    seriesId: 'S01',
    pairing: 'two-poses',
    partA: 'Midnight Katana Shinobi',
    partB: 'Shuriken Smoke Shinobi',
    pairNote: 'Two action poses of covert shinobi executing a synchronized night raid.',
    fileA: '09_Shadow_Ninjas_A.png',
    fileB: '10_Shadow_Ninjas_B.png',
  },
  {
    key: 'sun_moon',
    slug: 'celestial-sun-and-moon-duo',
    name: 'Celestial Sun & Moon (Matching Duo)',
    shortDescription: 'Boho radiant sun and dreamy silver crescent moon.',
    description: 'Golden radiant sun with celestial rays paired with a serene crescent moon face surrounded by stars. The timeless harmony of day and night.',
    price: 39.00,
    categories: ['cute', 'minimal', 'duos'],
    tags: ['duo', 'pair', 'cute', 'minimal', 'sun', 'moon', 'celestial', 'boho'],
    rarity: 'common',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Golden Radiant Sun',
    partB: 'Silver Crescent Moon',
    pairNote: 'Day and night harmony: share the sun and moon with someone in your universe.',
    fileA: '02_Sun_Moon_Sticker_A.png',
    fileB: '02_Sun_Moon_Sticker_B.png',
  },
  {
    key: 'astronauts',
    slug: 'astronauts-in-space-duo',
    name: 'Astronauts in Space (Matching Duo)',
    shortDescription: 'Two cosmic spacewalkers reaching across the starlight.',
    description: 'Romantic cosmic adventure: Floating Spacewalker reaching out his gloved hand and Star-Tethered Explorer floating back to meet his grasp across zero gravity.',
    price: 39.00,
    categories: ['cute', 'minimal', 'duos'],
    tags: ['duo', 'pair', 'cute', 'space', 'astronaut', 'stars', 'couple'],
    rarity: 'uncommon',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Floating Spacewalker',
    partB: 'Star-Tethered Explorer',
    pairNote: 'Two astronauts reaching across the vastness of space to stay connected.',
    fileA: '03_Astronauts_Sticker_A.png',
    fileB: '03_Astronauts_Sticker_B.png',
  },
  {
    key: 'crystal_heart',
    slug: 'crystal-heart-halves-duo',
    name: 'Crystal Heart Halves (Matching Duo)',
    shortDescription: 'Rose quartz gemstone heart split into two interlocking halves.',
    description: 'A sparkling rose quartz crystal heart split cleanly down the center. Keep one half and give the other away — the crystal only sparkles whole when both are together.',
    price: 39.00,
    categories: ['cute', 'duos'],
    tags: ['duo', 'pair', 'cute', 'heart', 'crystal', 'rose-quartz', 'bff'],
    rarity: 'common',
    seriesId: 'S01',
    pairing: 'halves',
    partA: 'Left Crystal Facet',
    partB: 'Right Crystal Facet',
    pairNote: 'Two halves of one faceted crystal heart illustration. One for you, one for your person.',
    fileA: '04_Crystal_Heart_Sticker_A.png',
    fileB: '04_Crystal_Heart_Sticker_B.png',
  },
  {
    key: 'paper_airplane_love_note',
    slug: 'paper-airplane-love-note-duo',
    name: 'Paper Airplane & Love Note (Matching Duo)',
    shortDescription: 'A sealed vintage love letter and a gliding paper plane.',
    description: 'Whimsical romantic pair: a folded love letter with red wax heart seal and a crisp paper airplane flying through the clouds leaving a dotted heart trail.',
    price: 39.00,
    categories: ['cute', 'motivation', 'duos'],
    tags: ['duo', 'pair', 'cute', 'paper-airplane', 'love-letter', 'aesthetic'],
    rarity: 'common',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Sealed Love Letter',
    partB: 'Gliding Paper Airplane',
    pairNote: 'A heartfelt letter sent, and the paper plane carrying it across the distance.',
    fileA: '06_Paper_Airplane_Love_Note_Sticker_A.png',
    fileB: '06_Paper_Airplane_Love_Note_Sticker_B.png',
  },
  {
    key: 'shared_umbrella_in_rain',
    slug: 'shared-umbrella-in-rain-duo',
    name: 'Shared Umbrella in the Rain (Matching Duo)',
    shortDescription: 'Rain boots splashing in puddles under a shared bright umbrella.',
    description: 'Cozy rainy day warmth: rain boots splashing happily in ripples and a cheerful yellow umbrella keeping two people dry and safe from the storm.',
    price: 39.00,
    categories: ['cute', 'duos'],
    tags: ['duo', 'pair', 'cute', 'rain', 'umbrella', 'cozy', 'sweet'],
    rarity: 'common',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Rain Boots in Puddle',
    partB: 'Yellow Umbrella Shelter',
    pairNote: 'Staying warm and sheltered together even on the rainiest afternoon.',
    fileA: '07_Shared_Umbrella_in_Rain_Sticker_A.png',
    fileB: '07_Shared_Umbrella_in_Rain_Sticker_B.png',
  },
  {
    key: 'spaghetti_pets',
    slug: 'spaghetti-pets-duo',
    name: 'Spaghetti Pets (Matching Duo)',
    shortDescription: 'Fluffy puppy and cute kitten sharing a pasta strand.',
    description: 'Heart-melting pet pair inspired by classic cinematic romance: an eager golden puppy slurping one end of a spaghetti strand and a sweet calico kitten meeting at the other.',
    price: 39.00,
    categories: ['cute', 'duos'],
    tags: ['duo', 'pair', 'cute', 'pets', 'puppy', 'kitten', 'spaghetti', 'food'],
    rarity: 'common',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Spaghetti Puppy',
    partB: 'Spaghetti Kitten',
    pairNote: 'Two adorable pets sharing one long pasta noodle until their noses touch.',
    fileA: '08_Spaghetti_Pets_Sticker_A.png',
    fileB: '08_Spaghetti_Pets_Sticker_B.png',
  },
  {
    key: 'magnetic_hearts',
    slug: 'magnetic-hearts-duo',
    name: 'Magnetic Hearts (Matching Duo)',
    shortDescription: 'North and South pole hearts attracted by irresistible magnetism.',
    description: 'Opposites attract: vibrant red North Pole magnetic heart and cool blue South Pole magnetic heart throwing electric magnetic sparks toward each other.',
    price: 39.00,
    categories: ['cute', 'duos'],
    tags: ['duo', 'pair', 'cute', 'magnet', 'heart', 'attraction', 'couple'],
    rarity: 'common',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'North Pole Heart (Red)',
    partB: 'South Pole Heart (Blue)',
    pairNote: 'Physical law of attraction: no matter where you place them, they pull together.',
    fileA: '09_Magnetic_Hearts_Sticker_A.png',
    fileB: '09_Magnetic_Hearts_Sticker_B.png',
  },
  {
    key: 'lock_and_vintage_key',
    slug: 'lock-and-vintage-key-duo',
    name: 'Heart Lock & Vintage Key (Matching Duo)',
    shortDescription: 'Ornate antique heart padlock and its matching filigree key.',
    description: 'A timeless symbol of trust and devotion: an embossed brass heart padlock and an ornate vintage skeleton key designed precisely to unlock it.',
    price: 39.00,
    categories: ['cute', 'duos'],
    tags: ['duo', 'pair', 'cute', 'lock', 'key', 'vintage', 'love'],
    rarity: 'common',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Antique Heart Padlock',
    partB: 'Filigree Skeleton Key',
    pairNote: 'The lock and the only key in the world that turns it.',
    fileA: '10_Lock_and_Vintage_Key_Sticker_A.png',
    fileB: '10_Lock_and_Vintage_Key_Sticker_B.png',
  },
  {
    key: 'campfire_marshmallow',
    slug: 'campfire-and-marshmallow-duo',
    name: 'Campfire & Marshmallow (Matching Duo)',
    shortDescription: 'A crackling woodland campfire and a toasted golden marshmallow.',
    description: 'Nostalgic outdoor adventure vibes: glowing campfire logs crackling with embers and a fluffy golden-brown marshmallow roasted on a birch stick.',
    price: 39.00,
    categories: ['cute', 'duos'],
    tags: ['duo', 'pair', 'cute', 'campfire', 'marshmallow', 'camping', 'outdoor'],
    rarity: 'common',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Crackling Campfire',
    partB: 'Toasted Marshmallow Skewer',
    pairNote: 'The flame and the treat: best friends around the evening fire.',
    fileA: '15_Campfire_Marshmallow_A.png',
    fileB: '15_Campfire_Marshmallow_B.png',
  },
  {
    key: 'walkie_talkie',
    slug: 'walkie-talkies-over-and-out-duo',
    name: 'Walkie-Talkies: Over & Out (Matching Duo)',
    shortDescription: 'Retro 80s handheld walkie-talkies with speech waveforms.',
    description: 'Retro 80s adventure comms: Teal radio transmitting "Do you copy?" and Coral radio replying "Loud and clear, over and out!". Perfect for retro sci-fi & Stranger Things fans.',
    price: 39.00,
    categories: ['cute', 'movies', 'duos'],
    tags: ['duo', 'pair', 'cute', 'movies', 'walkie-talkie', 'stranger-things', 'retro', '80s'],
    rarity: 'uncommon',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Walkie-Talkie: Do You Copy?',
    partB: 'Walkie-Talkie: Over & Out',
    pairNote: 'Direct secret channel between two best friends or partners in adventure.',
    fileA: '16_Walkie_Talkie_A.png',
    fileB: '16_Walkie_Talkie_B.png',
  },
  {
    key: 'origami_cranes',
    slug: 'origami-cranes-duo',
    name: 'Origami Cranes (Matching Duo)',
    shortDescription: 'Delicate pastel blush and mint folded paper cranes in flight.',
    description: 'Japanese paper craft elegance: soft blush pink origami crane paired with a calm mint green crane, both accented with subtle gold foil edges.',
    price: 39.00,
    categories: ['cute', 'duos'],
    tags: ['duo', 'pair', 'cute', 'origami', 'crane', 'paper-craft', 'zen'],
    rarity: 'common',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Blush Origami Crane',
    partB: 'Mint Origami Crane',
    pairNote: 'A thousand wishes in flight: peaceful origami companions for laptops and journals.',
    fileA: '17_Origami_Cranes_A.png',
    fileB: '17_Origami_Cranes_B.png',
  },
  {
    key: 'love_potions',
    slug: 'love-potions-duo',
    name: 'Magic Love Potions (Matching Duo)',
    shortDescription: 'Enchanted glass elixir bottles sparkling with magical mist.',
    description: 'Whimsical alchemy glassware: heart-shaped Elixir of Amour flask bubbling with pink fumes and star-shaped Potion of Eternity glowing with starry lavender mist.',
    price: 39.00,
    categories: ['cute', 'duos'],
    tags: ['duo', 'pair', 'cute', 'potion', 'magic', 'alchemy', 'fantasy'],
    rarity: 'uncommon',
    seriesId: 'S01',
    pairing: 'complementary',
    partA: 'Elixir of Amour Flask',
    partB: 'Potion of Eternity Flask',
    pairNote: 'Two brewed alchemical concoctions of romance and magic.',
    fileA: '18_Love_Potions_A.png',
    fileB: '18_Love_Potions_B.png',
  },
  {
    key: 'kissing_koi',
    slug: 'kissing-koi-fish-duo',
    name: 'Yin-Yang Kissing Koi (Matching Duo)',
    shortDescription: 'Graceful Japanese Kohaku and Karashi carp forming a yin-yang circle.',
    description: 'Fluid aquatic harmony: a vibrant crimson & white Kohaku koi swimming clockwise and a sleek midnight black Karashi koi completing the sacred circle of balance.',
    price: 39.00,
    categories: ['anime', 'cute', 'duos'],
    tags: ['duo', 'pair', 'anime', 'cute', 'koi', 'yin-yang', 'japanese', 'fish'],
    rarity: 'rare',
    seriesId: 'S01',
    pairing: 'halves',
    partA: 'Ruby Kohaku Koi',
    partB: 'Ink Black Karashi Koi',
    pairNote: 'Two swimming koi that together form a complete yin-yang circle of balance.',
    fileA: '19_Kissing_Koi_A.png',
    fileB: '19_Kissing_Koi_B.png',
  },
  {
    key: 'red_string_hands',
    slug: 'red-string-of-fate-duo',
    name: 'Red String of Fate (Matching Duo)',
    shortDescription: 'Hands connected by the unbroken crimson thread of destiny.',
    description: 'Poignant East Asian legend: Left hand pinky reaching forward bound by a red string, and the matching Right hand pinky holding the other end of an unbreakable bond.',
    price: 39.00,
    categories: ['cute', 'anime', 'duos'],
    tags: ['duo', 'pair', 'cute', 'anime', 'red-string', 'fate', 'destiny', 'hands'],
    rarity: 'rare',
    seriesId: 'S01',
    pairing: 'halves',
    partA: 'Left Pinky with Red String',
    partB: 'Right Pinky with Red String',
    pairNote: 'The red string of fate that connects two people destined to meet, regardless of time or distance.',
    fileA: '020_Red_String_Hands_Sticker_A.png',
    fileB: '020_Red_String_Hands_Sticker_B.png',
  },
];

async function main() {
  console.log(`Starting ingestion of ${duosData.length} Matching Duos...`);

  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < duosData.length; i++) {
    const duo = duosData[i];
    const productId = `duo-${duo.key.replace(/_/g, '-')}`;
    const displayOrder = 100 + i;

    const metadata = {
      shortDescription: duo.shortDescription,
      duo: {
        pairing: duo.pairing,
        partA: duo.partA,
        partB: duo.partB,
        pairNote: duo.pairNote,
      }
    };

    const imageUrlA = `/api/uploads/products/${duo.fileA}`;
    const imageUrlB = `/api/uploads/products/${duo.fileB}`;

    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { id: productId },
          { slug: duo.slug },
        ]
      },
      include: { categories: true, images: true, inventory: true }
    });

    if (existing) {
      // Update existing
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: duo.name,
          description: duo.description,
          price: duo.price,
          active: true,
          status: 'PUBLISHED',
          category: 'stickers',
          productType: 'duo',
          packQuantity: 2,
          rarity: duo.rarity,
          seriesId: duo.seriesId,
          displayOrder,
          metadata,
        }
      });

      // Update images
      await prisma.productImage.deleteMany({ where: { productId: existing.id } });
      await prisma.productImage.createMany({
        data: [
          {
            productId: existing.id,
            url: imageUrlA,
            alt: `${duo.name} - ${duo.partA}`,
            position: 0,
            isPrimary: true,
          },
          {
            productId: existing.id,
            url: imageUrlB,
            alt: `${duo.name} - ${duo.partB}`,
            position: 1,
            isPrimary: false,
          }
        ]
      });

      // Update categories
      for (const catId of duo.categories) {
        const has = existing.categories.some(c => c.categoryId === catId);
        if (!has) {
          await prisma.productCategory.create({
            data: { productId: existing.id, categoryId: catId }
          }).catch(() => {});
        }
      }

      // Ensure inventory
      if (!existing.inventory) {
        await prisma.inventory.create({
          data: { productId: existing.id, quantity: 100 }
        });
      }

      updatedCount++;
    } else {
      // Create product
      const created = await prisma.product.create({
        data: {
          id: productId,
          slug: duo.slug,
          name: duo.name,
          description: duo.description,
          price: duo.price,
          active: true,
          status: 'PUBLISHED',
          category: 'stickers',
          productType: 'duo',
          packQuantity: 2,
          rarity: duo.rarity,
          seriesId: duo.seriesId,
          displayOrder,
          metadata,
          inventory: {
            create: { quantity: 100 }
          },
          images: {
            create: [
              {
                url: imageUrlA,
                alt: `${duo.name} - ${duo.partA}`,
                position: 0,
                isPrimary: true,
              },
              {
                url: imageUrlB,
                alt: `${duo.name} - ${duo.partB}`,
                position: 1,
                isPrimary: false,
              }
            ]
          },
          categories: {
            create: duo.categories.map(cId => ({ categoryId: cId }))
          }
        }
      });

      createdCount++;
    }
  }

  console.log(`\n========================================`);
  console.log(`MATCHING DUOS INGESTION SUMMARY:`);
  console.log(`- Created: ${createdCount}`);
  console.log(`- Updated: ${updatedCount}`);
  console.log(`- Total duos processed: ${duosData.length}`);
  console.log(`========================================`);
}

main()
  .catch(err => {
    console.error('Fatal error ingesting matching duos:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

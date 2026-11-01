import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Map folder to primary collection ID
const folderCategoryMap = {
  'Aesthetics': 'cute',
  'Anime': 'anime',
  'Flowers': 'cute',
  'Life quotes': 'motivation',
  'Marvel': 'marvel',
  'Movie': 'movies',
  'Stranger things': 'movies',
  'Swag': 'minimal',
  'Vehicles': 'quotes', // 'quotes' is the DB id for 'Cars & Bikes'
};

// Custom Title & Description Dictionary for key stickers
const customMetadata = {
  // Anime
  'anya-forger-smiling': { name: 'Anya Forger Smiling', desc: 'Cute Anya Forger flashing her signature adorable smile from Spy x Family.' },
  'anya-forger-studying': { name: 'Anya Forger Studying', desc: 'Relatable Anya Forger trying her best to study with serious focus.' },
  'bachira-tongue-out-portrait': { name: 'Meguru Bachira Tongue Out', desc: 'Playful Meguru Bachira striking his iconic tongue-out expression from Blue Lock.' },
  'eren-yeager-raised-hand': { name: 'Eren Yeager Titan Transformation', desc: 'Intense Eren Yeager sparking lightning from Attack on Titan.' },
  'frieren-smug-chibi': { name: 'Frieren Smug Chibi', desc: 'Hilarious smug expression chibi sticker of Frieren beyond journey’s end.' },
  'gengar-tongue-out': { name: 'Gengar Tongue Out', desc: 'Mischievous Shadow Pokémon Gengar sticking its purple tongue out.' },
  'gojo-blue-eyes-close-up': { name: 'Satoru Gojo Six Eyes Close-Up', desc: 'Mesmerizing close-up of Satoru Gojo revealing the limitless Six Eyes.' },
  'gojo-chibi-sunglasses': { name: 'Satoru Gojo Chibi Sunglasses', desc: 'Chibi Satoru Gojo rocking his round black sunglasses with swagger.' },
  'goku-colourful-hair-portrait': { name: 'Son Goku Vibrant Saiyan', desc: 'Legendary Dragon Ball Z hero Son Goku in full dynamic color.' },
  'hatsune-miku-shocked-chibi': { name: 'Hatsune Miku Shocked Chibi', desc: 'Cute vocaloid superstar Hatsune Miku with wide shocked eyes and twin teals.' },
  'ichigo-half-hollow-mask': { name: 'Ichigo Kurosaki Hollow Mask', desc: 'Bleach Soul Reaper Ichigo donning the terrifying Hollow mask.' },
  'inosuke-boar-mask': { name: 'Inosuke Hashibira Boar Mask', desc: 'Demon Slayer wild beast Inosuke Hashibira wearing his iconic boar mask.' },
  'itachi-akatsuki-crows': { name: 'Itachi Uchiha Akatsuki Crows', desc: 'Legendary rogue shinobi Itachi Uchiha emerging amidst genjutsu crows.' },
  'jujutsu-kaisen-group-gojo-yuji-megumi-nobara': { name: 'JJK Tokyo First-Years & Gojo', desc: 'Yuji, Megumi, Nobara, and sensei Gojo together in one iconic team sticker.' },
  'ken-kaneki-ghoul-mask': { name: 'Ken Kaneki Ghoul Mask', desc: 'Tokyo Ghoul protagonist Kaneki wearing his zipped leather mask and red eye.' },
  'killua-relaxed-hands-behind-head': { name: 'Killua Zoldyck Relaxed', desc: 'Cool and carefree Killua from Hunter x Hunter with hands behind his head.' },
  'l-death-note-black-and-white': { name: 'L Lawliet B&W Portrait', desc: 'Enigmatic master detective L crouching with his thoughtful gaze from Death Note.' },
  'levi-ackerman-portrait': { name: 'Captain Levi Ackerman', desc: 'Humanity’s strongest soldier Levi Ackerman in stoic Survey Corps style.' },
  'luffy-gear-five-laughing': { name: 'Monkey D. Luffy Gear 5 Joyboy', desc: 'Warrior of Liberation Luffy laughing freely in his legendary white Gear 5 form.' },
  'naruto-eating-ramen': { name: 'Naruto Uzumaki Ichiraku Ramen', desc: 'Classic Naruto happily devouring a hot bowl of Ichiraku miso ramen.' },
  'nezuko-running-chibi': { name: 'Nezuko Kamado Running Chibi', desc: 'Adorable chibi Nezuko Kamado running in her pink patterned kimono.' },
  'rengoku-umai-bento': { name: 'Kyojuro Rengoku Umai Bento', desc: 'Flame Hashira Rengoku enthusiastically shouting Umai over his train bento.' },
  'saitama-blank-expression': { name: 'Saitama Okay Blank Face', desc: 'One Punch Man Saitama with his peak deadpan, unimpressed expression.' },
  'shin-chan-dancing-blue-shirt': { name: 'Shin-chan Dancing', desc: 'Mischievous Nohara Shinnosuke showing off his signature wiggle dance.' },
  'sukuna-white-robe-red-background': { name: 'Ryomen Sukuna King of Curses', desc: 'The terrifying King of Curses Sukuna draped in his regal white robe.' },
  'tanjiro-green-checkered-cloak': { name: 'Tanjiro Kamado Checkered Haori', desc: 'Tanjiro Kamado in his iconic green and black checkered cloak.' },
  'zenitsu-screaming-ahhhhh': { name: 'Zenitsu Agatsuma Screaming', desc: 'Thunder Breathing swordsman Zenitsu in complete comedic panic mode.' },

  // Movie & Stranger Things
  'absolute-cinema-raised-hands': { name: 'Absolute Cinema Raised Hands', desc: 'The legendary Scorsese meme celebrating undisputed cinematic masterpieces.' },
  'american-psycho-black-and-white': { name: 'Patrick Bateman American Psycho', desc: 'Christian Bale as Patrick Bateman in stylish monochrome thriller aesthetic.' },
  'batman-red-comic-silhouette': { name: 'The Batman Red Comic Silhouette', desc: 'The Dark Knight silhouetted in crimson neo-noir comic style.' },
  'black-and-white-film-clapperboard': { name: 'Film Director Clapperboard', desc: 'Vintage production slate clapperboard for cinema lovers and filmmakers.' },
  'flat-cap-man-with-cigarette': { name: 'Thomas Shelby Peaky Blinders', desc: 'Birmingham kingpin Thomas Shelby with newsboy cap and cigarette.' },
  'ahoy-sailor-boy-chibi': { name: 'Steve Harrington Scoops Ahoy Chibi', desc: 'Everyone’s favorite babysitter Steve in his Scoops Ahoy sailor uniform.' },
  'ahoy-sailor-uniform-woman': { name: 'Robin Buckley Scoops Ahoy Chibi', desc: 'Robin Buckley rocking the Scoops Ahoy sailor outfit with whiteboard sass.' },
  'alphabet-wall-christmas-lights-photo': { name: 'Hawkins Alphabet Christmas Lights', desc: 'Joyce Byers’ alphabet wall painted with glowing fairy lights to reach the Upside Down.' },
  'demogorgon-open-flower-mouth': { name: 'Demogorgon Petal Maw', desc: 'The terrifying apex predator of the Upside Down opening its flower petal jaw.' },
  'friends-dont-lie-pink-speech-bubble': { name: 'Friends Don’t Lie Speech Bubble', desc: 'Eleven’s golden rule rendered in retro synthwave bubblegum typography.' },
  'hellfire-club-demon-and-weapons': { name: 'Hellfire Club Crest', desc: 'Official Eddie Munson Hawkins High D&D Hellfire Club horned devil insignia.' },
  'stranger-things-bicycles-sunset-road': { name: 'Hawkins Bicycles Sunset Ride', desc: 'The kids riding BMX bikes along the misty road under an ominous Hawkins sunset.' },

  // Vehicles (Cars & Bikes)
  'angular-black-sportbike-silhouette': { name: 'Stealth Sportbike Silhouette', desc: 'Aggressive aerodynamic superbike silhouette cutting through the night.' },
  'black-and-white-porsche-side-view': { name: 'Porsche 911 Monochrome Profile', desc: 'Timeless German engineering silhouette of the iconic Porsche 911.' },
  'black-cafe-racer-bikelife': { name: 'Black Cafe Racer Custom', desc: 'Custom vintage cafe racer motorcycle built for pure asphalt freedom.' },
  'black-classic-chevrolet-camaro-ss': { name: 'Classic Chevrolet Camaro SS', desc: 'Raw American muscle: roaring black Chevy Camaro SS with heritage lines.' },
  'black-classic-ford-mustang': { name: 'Classic Ford Mustang Fastback', desc: 'Legendary American pony car with aggressive front grille and timeless styling.' },
  'black-dodge-charger-front-view': { name: 'Black Dodge Charger Widebody', desc: 'Sinister black Dodge Charger front fascia radiating pure HEMI horsepower.' },
  'black-ferrari-open-doors': { name: 'Black Ferrari Butterfly Doors', desc: 'Exotic Italian stallion with dihedral butterfly doors raised to the sky.' },
  'black-mclaren-p1-open-doors': { name: 'McLaren P1 Hypercar', desc: 'Aerodynamic perfection: twin-turbo hybrid hypercar with iconic dihedral doors.' },
  'black-nissan-skyline': { name: 'Nissan Skyline GT-R Midnight', desc: 'Legendary JDM Godzilla: black Nissan Skyline GT-R ready for the touge.' },
  'blue-bugatti': { name: 'Bugatti Chiron French Racing Blue', desc: 'Quad-turbo W16 masterpiece representing the absolute pinnacle of speed.' },
  'godzilla-and-silver-skyline': { name: 'Godzilla & Silver Skyline R34', desc: 'The ultimate JDM tribute pairing King of the Monsters with the iconic GT-R.' },
  'kawasaki-ninja-h2r': { name: 'Kawasaki Ninja H2R Supercharged', desc: 'The 300hp track monster: supercharged Ninja H2R with carbon aerodynamic wings.' },
  'lightning-mcqueen-kachow': { name: 'Lightning McQueen Ka-Chow!', desc: 'Piston Cup champion #95 Lightning McQueen striking his famous Ka-chow pose.' },
  'white-porsche-gt3-rs': { name: 'Porsche 911 GT3 RS Weissach', desc: 'Track-bred perfection with giant swan-neck rear wing and Weissach styling.' },
  'orange-toyota-supra': { name: 'Toyota Supra MK4 Turbo', desc: '2JZ legend: orange MK4 Supra ready for quarter-mile domination.' },

  // Life quotes
  'be-your-own-inspiration': { name: 'Be Your Own Inspiration', desc: 'Inspiring typographic sticker reminding you that your greatest hero is yourself.' },
  'be-yourself-and-dont-apologize': { name: 'Be Yourself & Don’t Apologize', desc: 'Bold self-love sticker celebrating authentic individuality without compromise.' },
  'believe-you-can-and-youre-halfway-there': { name: 'Believe You Can & You’re Halfway There', desc: 'Theodore Roosevelt’s timeless wisdom rendered in clean modern lettering.' },
  'dream-it-believe-it-achieve-it': { name: 'Dream It, Believe It, Achieve It', desc: 'Daily motivational fuel for laptops, journals, and water bottles.' },
  'enjoy-the-little-things-in-life': { name: 'Enjoy the Little Things in Life', desc: 'Gentle reminder to cherish daily coffee, morning sun, and simple pleasures.' },
  'life-is-tough-but-so-are-you': { name: 'Life Is Tough But So Are You', desc: 'Empowering resilience quote sticker designed to keep your spirits unbreakable.' },
  'mindset-is-everything': { name: 'Mindset Is Everything', desc: 'Bold reminder that your attitude determines your trajectory in everything you build.' },
  'work-hard-dream-big-never-give-up': { name: 'Work Hard, Dream Big, Never Give Up', desc: 'The foundational hustle mantra for creators, builders, and dreamers.' },

  // Swag
  'dont-touch-hand-symbol': { name: 'Don’t Touch Warning Hand', desc: 'Bold graphic hazard hand sign warning everyone to keep off your laptop.' },
  'mission-passed-respect-plus': { name: 'Mission Passed: Respect +', desc: 'Classic GTA celebration banner in crisp neon green for daily wins.' },
  'no-smoking-pixel-sign': { name: 'No Smoking 8-Bit Pixel Sign', desc: 'Retro 8-bit cigarette prohibition sign with gaming arcade flair.' },
  'playstation-pixel-logo': { name: 'PlayStation 8-Bit Pixel Logo', desc: 'Retro gaming tribute featuring the iconic four-symbol console mark.' },
  'pubg-orange-pixel-logo': { name: 'PUBG Orange Pixel Logo', desc: 'Retro pixelated battle royale emblem for Winner Winner Chicken Dinner champions.' },
  'red-among-us-pixel-crewmate': { name: 'Among Us Red Pixel Crewmate', desc: 'Pixelated red spaceman crewmate (or imposter) from the popular deduction game.' },
  'red-bull-pixel-logo': { name: 'Red Bull 8-Bit Pixel Logo', desc: 'Pixel energy drink icon giving your gear digital wings.' },
  'wasted-red-lettering': { name: 'WASTED Red Lettering', desc: 'The unmistakable arcade fail text for true gaming culture fans.' },
};

function formatTitleFromSlug(slug) {
  if (customMetadata[slug]?.name) {
    return customMetadata[slug].name;
  }
  const acronyms = {
    'bmw': 'BMW',
    'gt-r': 'GT-R',
    'gtr': 'GTR',
    'rs': 'RS',
    'ss': 'SS',
    'p1': 'P1',
    'h2r': 'H2R',
    'jdm': 'JDM',
    'ktm': 'KTM',
    'dvd': 'DVD',
    'bts': 'BTS',
    'pubg': 'PUBG',
    'uno': 'UNO',
    'gta': 'GTA',
    'omg': 'OMG',
    'wtf': 'WTF',
  };

  return slug
    .split('-')
    .map(word => {
      const lower = word.toLowerCase();
      if (acronyms[lower]) return acronyms[lower];
      if (/^\d+$/.test(word)) return `#${word}`;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function formatDescription(slug, title, categoryName) {
  if (customMetadata[slug]?.desc) {
    return customMetadata[slug].desc;
  }
  return `Premium waterproof die-cut vinyl sticker featuring ${title}. Perfect for laptops, phones, bottles, and helmets.`;
}

async function main() {
  const baseDir = path.resolve('..', 'public', 'PNG');
  const uploadsDirBackend = path.resolve('uploads', 'products');
  const uploadsDirRoot = path.resolve('..', 'uploads', 'products');

  fs.mkdirSync(uploadsDirBackend, { recursive: true });
  fs.mkdirSync(uploadsDirRoot, { recursive: true });

  const folders = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log(`Discovered folders: ${folders.join(', ')}`);

  let copiedCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;

  for (const folder of folders) {
    if (folder === 'Marvel') {
      console.log(`Skipping Marvel folder as it was already ingested.`);
      continue;
    }

    const primaryCategoryId = folderCategoryMap[folder];
    if (!primaryCategoryId) {
      console.warn(`No category mapping found for folder: ${folder}`);
      continue;
    }

    const folderPath = path.join(baseDir, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.png'));

    console.log(`\nProcessing ${folder} (${files.length} stickers) -> Category: ${primaryCategoryId}`);

    for (const file of files) {
      const srcPath = path.join(folderPath, file);
      const destPathBackend = path.join(uploadsDirBackend, file);
      const destPathRoot = path.join(uploadsDirRoot, file);

      // Copy file to uploads if not exists or update
      if (!fs.existsSync(destPathBackend)) {
        fs.copyFileSync(srcPath, destPathBackend);
        copiedCount++;
      }
      if (!fs.existsSync(destPathRoot)) {
        fs.copyFileSync(srcPath, destPathRoot);
      }

      const slug = file.replace(/\.png$/, '');
      const name = formatTitleFromSlug(slug);
      const desc = formatDescription(slug, name, folder);
      const productId = `stk-${slug}`.toLowerCase();
      const imageUrl = `/api/uploads/products/${file}`;

      // Check if product exists by slug or id
      const existing = await prisma.product.findFirst({
        where: {
          OR: [
            { id: productId },
            { slug: slug },
          ]
        },
        include: { categories: true, images: true, inventory: true }
      });

      if (existing) {
        // Update product to ensure price = 20, active = true, status = PUBLISHED
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name,
            description: desc,
            price: 20.00,
            active: true,
            status: 'PUBLISHED',
            category: 'stickers',
            productType: 'single',
          }
        });

        // Ensure primary category relation
        const hasCategory = existing.categories.some(c => c.categoryId === primaryCategoryId);
        if (!hasCategory) {
          await prisma.productCategory.create({
            data: {
              productId: existing.id,
              categoryId: primaryCategoryId,
            }
          });
        }

        // Ensure inventory exists
        if (!existing.inventory) {
          await prisma.inventory.create({
            data: { productId: existing.id, quantity: 100 }
          });
        }

        updatedCount++;
      } else {
        // Create new product
        await prisma.product.create({
          data: {
            id: productId,
            slug: slug,
            name: name,
            description: desc,
            price: 20.00,
            active: true,
            status: 'PUBLISHED',
            productType: 'single',
            category: 'stickers',
            displayOrder: 100,
            rarity: 'common',
            seriesId: 'S01',
            inventory: {
              create: { quantity: 100 }
            },
            images: {
              create: [
                {
                  url: imageUrl,
                  alt: name,
                  position: 0,
                  isPrimary: true,
                }
              ]
            },
            categories: {
              create: [
                { categoryId: primaryCategoryId }
              ]
            }
          }
        });

        insertedCount++;
      }
    }
  }

  // Also double check all Marvel products in DB to ensure price = 20 and status = PUBLISHED
  const marvelUpdate = await prisma.product.updateMany({
    where: {
      categories: { some: { categoryId: 'marvel' } }
    },
    data: {
      price: 20.00,
      active: true,
      status: 'PUBLISHED',
      category: 'stickers'
    }
  });

  console.log(`\n========================================`);
  console.log(`INGESTION COMPLETE SUMMARY:`);
  console.log(`- New files copied: ${copiedCount}`);
  console.log(`- New products created: ${insertedCount}`);
  console.log(`- Products updated: ${updatedCount}`);
  console.log(`- Marvel products refreshed: ${marvelUpdate.count}`);
  console.log(`========================================`);
}

main()
  .catch(err => {
    console.error('Fatal ingestion error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


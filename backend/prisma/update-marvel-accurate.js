import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const marvelProducts = [
  {
    num: 145,
    name: "Thor Odinson — Stormbreaker Awakening",
    slug: "thor-odinson-stormbreaker-awakening",
    description: "Electrifying portrait of Thor Odinson wielding Stormbreaker as the God of Thunder summons cosmic lightning across the battlefield.",
    alt: "Thor Odinson wielding Stormbreaker with lightning"
  },
  {
    num: 146,
    name: "Chibi Captain America",
    slug: "chibi-captain-america",
    description: "Super cute chibi badge of Captain America in his iconic blue helmet and white star insignia.",
    alt: "Chibi Captain America helmet badge"
  },
  {
    num: 147,
    name: "Thundershield — Mjolnir & Vibranium",
    slug: "thundershield-mjolnir-vibranium",
    description: "The unstoppable power of Thor's enchanted hammer Mjolnir resting over Captain America's vibranium shield.",
    alt: "Mjolnir resting on Captain America vibranium shield"
  },
  {
    num: 148,
    name: "Deadpool & Wolverine Chibi Duo",
    slug: "deadpool-and-wolverine-chibi-duo",
    description: "Hilarious chibi duo sticker featuring Deadpool blowing hearts at an exasperated Wolverine with his adamantium claws bared.",
    alt: "Chibi Deadpool blowing hearts at angry Wolverine"
  },
  {
    num: 149,
    name: "Retro 8-Bit Pixel Deadpool",
    slug: "retro-8-bit-pixel-deadpool",
    description: "Vintage arcade-style 8-bit pixel art of the Merc with a Mouth carrying dual katanas on his back.",
    alt: "Pixel art 8-bit Deadpool"
  },
  {
    num: 150,
    name: "Loki & Sylvie TVA Timeline Collage",
    slug: "loki-sylvie-tva-timeline-collage",
    description: "Cinematic poster collage featuring Tom Hiddleston as Loki and Sylvie navigating the Sacred Timeline and TVA.",
    alt: "Loki and Sylvie TVA Sacred Timeline collage"
  },
  {
    num: 151,
    name: "Captain America Shield Wall Impact 3D",
    slug: "captain-america-shield-wall-impact-3d",
    description: "Dynamic 3D wall crack decal showing Captain America's vibranium shield forcefully embedded into concrete.",
    alt: "Captain America shield cracking through wall"
  },
  {
    num: 152,
    name: "Tony Stark & Doctor Doom Dual Face Split",
    slug: "tony-stark-doctor-doom-dual-face-split",
    description: "Intriguing split portrait combining Robert Downey Jr. as Tony Stark and the masked sovereign Doctor Doom.",
    alt: "Tony Stark and Doctor Doom split portrait"
  },
  {
    num: 153,
    name: "Broken Vibranium Shield — Avengers Assemble",
    slug: "broken-vibranium-shield-avengers-assemble",
    description: "Battle-worn Captain America shield fractured during the endgame standoff, symbolizing unbreakable resilience.",
    alt: "Broken battle-worn Captain America shield"
  },
  {
    num: 154,
    name: "Black Panther Kinetic Energy Neon Splash",
    slug: "black-panther-kinetic-energy-neon-splash",
    description: "Vibrant purple neon kinetic energy blast radiating from King T'Challa's Black Panther vibranium suit.",
    alt: "Black Panther with purple kinetic energy surge"
  },
  {
    num: 155,
    name: "Doctor Doom Sovereign Crest",
    slug: "doctor-doom-sovereign-crest",
    description: "Imposing emerald-hooded Victor Von Doom crest with ornate Latverian styling.",
    alt: "Doctor Doom green hooded sovereign crest"
  },
  {
    num: 156,
    name: "Spider-Man Stealth Chest Emblem",
    slug: "spider-man-stealth-chest-emblem",
    description: "Sleek, modern angular black Spider-Man chest insignia sticker.",
    alt: "Spider-Man sleek angular chest logo"
  },
  {
    num: 157,
    name: "Iron Man Mark 85 Nanotech Helmet",
    slug: "iron-man-mark-85-nanotech-helmet",
    description: "High-gloss crimson and gold Iron Man Mark LXXXV nanotech helmet bust.",
    alt: "Iron Man Mark 85 crimson and gold helmet"
  },
  {
    num: 158,
    name: "Iron Man Crimson Typography Poster",
    slug: "iron-man-crimson-typography-poster",
    description: "Bold vertical crimson poster featuring Iron Man Tony Stark in a minimalist typographic aesthetic.",
    alt: "Iron Man vertical crimson poster"
  },
  {
    num: 159,
    name: "Chibi Black Panther — Wakanda Forever!",
    slug: "chibi-black-panther-wakanda-forever",
    description: "Adorable chibi T'Challa striking the iconic Wakanda Forever salute on royal purple.",
    alt: "Chibi Black Panther Wakanda Forever salute"
  },
  {
    num: 160,
    name: "Captain America Watercolor Shield Brushstroke",
    slug: "captain-america-watercolor-shield-brushstroke",
    description: "Fine art watercolor splatter of Captain America in battle pose holding his vibranium shield.",
    alt: "Captain America watercolor brushstroke art"
  },
  {
    num: 161,
    name: "Doctor Doom & Tony Stark Comic Vintage Panel",
    slug: "doctor-doom-tony-stark-comic-vintage-panel",
    description: "Vintage comic halftone illustration of Doctor Doom casting spells alongside Tony Stark with a glowing arc reactor.",
    alt: "Doctor Doom and Tony Stark vintage comic panel"
  },
  {
    num: 162,
    name: "Spider-Man Techwear Streetwear Edition",
    slug: "spider-man-techwear-streetwear-edition",
    description: "Urban street-style Peter Parker crouching in a white techwear hoodie, backpack, headphones, and high-top sneakers.",
    alt: "Spider-Man in techwear hoodie and high-top sneakers"
  },
  {
    num: 163,
    name: "Ghost-Spider Spider-Gwen Hooded Mask",
    slug: "ghost-spider-spider-gwen-hooded-mask",
    description: "Gwen Stacy's sleek white and neon-purple hooded Ghost-Spider mask.",
    alt: "Ghost-Spider Spider-Gwen hooded bust"
  },
  {
    num: 164,
    name: "Avengers: Endgame 'Whatever It Takes' Relics",
    slug: "avengers-endgame-whatever-it-takes-relics",
    description: "Emotional tribute featuring Cap's broken shield, Mjolnir, Stormbreaker, Tony's glasses, and the Nano Gauntlet on cracked stone.",
    alt: "Avengers Endgame whatever it takes fallen hero relics"
  },
  {
    num: 165,
    name: "Iron Man Crimson Nanotech Dissolve",
    slug: "iron-man-crimson-nanotech-dissolve",
    description: "Mesmerizing visual of Tony Stark's Iron Man armor disintegrating into glowing red nanotech particle energy.",
    alt: "Iron Man crimson nanotech particle dissolve"
  },
  {
    num: 166,
    name: "Moon Knight Crescent Dart Strike",
    slug: "moon-knight-crescent-dart-strike",
    description: "Marc Spector in full ceremonial mummy wraps and hooded cape launching golden crescent blades amid flying debris.",
    alt: "Moon Knight striking with crescent darts"
  },
  {
    num: 167,
    name: "Avengers 'A' Emblem Comic Panel Mosaic",
    slug: "avengers-a-emblem-comic-panel-mosaic",
    description: "Iconic Avengers 'A' logo intricately packed with black-and-white classic comic book hero illustrations.",
    alt: "Avengers A logo comic art mosaic"
  },
  {
    num: 168,
    name: "Avengers Trinity Comic Eyes Collage",
    slug: "avengers-trinity-comic-eyes-collage",
    description: "Dramatic stacked panels highlighting the fierce gaze of the Incredible Hulk, Iron Man, Thor, and Captain America.",
    alt: "Avengers comic eyes gaze collage"
  },
  {
    num: 169,
    name: "Iron Man Glowing Visor Cyber Decal",
    slug: "iron-man-glowing-visor-cyber-decal",
    description: "Close-up cut decal of Iron Man's metallic brow with piercing illuminated cyan visor eyes.",
    alt: "Iron Man glowing cyan visor eyes"
  },
  {
    num: 170,
    name: "Classic Comic Iron Man Arc Reactor Bust",
    slug: "classic-comic-iron-man-arc-reactor-bust",
    description: "Vibrant comic-book pop art bust of Iron Man with radiant glowing repulsor chest plate.",
    alt: "Classic comic Iron Man bust"
  },
  {
    num: 171,
    name: "Spider-Man 'Don't Think Just Do' Minimalist Poster",
    slug: "spider-man-dont-think-just-do-minimalist-poster",
    description: "Cinematic black-and-red poster featuring Spider-Man beneath bold monochrome typography: 'Don't Think Just Do'.",
    alt: "Spider-Man Don't Think Just Do motivational poster"
  },
  {
    num: 172,
    name: "Vintage Marvel Comic Panel Cover Grid",
    slug: "vintage-marvel-comic-panel-cover-grid",
    description: "Authentic retro Marvel logo centered over nostalgic black-and-white Golden Age comic strip panels.",
    alt: "Marvel vintage comic panel grid poster"
  },
  {
    num: 173,
    name: "Incredible Hulk Wall Burst Smash",
    slug: "incredible-hulk-wall-burst-smash",
    description: "Fierce graphic of the Incredible Hulk tearing through a wall with massive green hands and a ferocious roar.",
    alt: "Incredible Hulk tearing through wall"
  },
  {
    num: 174,
    name: "Chibi Homelander Laser Eyes Parody",
    slug: "chibi-homelander-laser-eyes-parody",
    description: "Humorous chibi superhero sticker featuring glowing red laser eyes, eagle shoulder pads, and red cape.",
    alt: "Chibi Homelander with glowing red laser eyes"
  },
  {
    num: 175,
    name: "Incredible Hulk Gamma Blueprint",
    slug: "incredible-hulk-gamma-blueprint",
    description: "Architectural blueprint aesthetic of the Hulk leaping with crackling green gamma lightning.",
    alt: "Hulk gamma lightning blueprint poster"
  },
  {
    num: 176,
    name: "Iron Spider Chibi with Waldoes",
    slug: "iron-spider-chibi-with-waldoes",
    description: "Peter Parker in his nanotech Iron Spider suit deploying four golden mechanical waldoes in chibi style.",
    alt: "Chibi Iron Spider with golden spider waldoes"
  },
  {
    num: 177,
    name: "Doctor Strange Sanctum Window Silhouette",
    slug: "doctor-strange-sanctum-window-silhouette",
    description: "Minimalist black silhouette of Doctor Strange levitating before the circular Seal of the Vishanti window.",
    alt: "Doctor Strange silhouette in front of Sanctum Sanctorum window"
  },
  {
    num: 178,
    name: "Spider-Man Stark Suit Noir Crimson",
    slug: "spider-man-stark-suit-noir-crimson",
    description: "Intense, dramatic portrait of Spider-Man adjusting his web shooter against a moody red and black mist.",
    alt: "Spider-Man adjusting web shooter in crimson lighting"
  },
  {
    num: 179,
    name: "Avengers Circular 'A' Minimalist Badge",
    slug: "avengers-circular-a-minimalist-badge",
    description: "Clean, timeless monochrome circle badge featuring the iconic Avengers 'A' insignia.",
    alt: "Monochrome Avengers circular logo decal"
  },
  {
    num: 180,
    name: "Captain America Vibranium Shield Metallic Finish",
    slug: "captain-america-vibranium-shield-metallic-finish",
    description: "Pristine circular Captain America vibranium shield with spun concentric brushed steel finish.",
    alt: "Captain America vibranium star shield brushed metallic"
  },
  {
    num: 181,
    name: "Iron Man Mark 42 Ground Slam Repulsor",
    slug: "iron-man-mark-42-ground-slam-repulsor",
    description: "Action-packed superhero landing pose of Iron Man Mark XLII with glowing palm repulsor blast.",
    alt: "Iron Man Mark 42 repulsor ground landing"
  },
  {
    num: 182,
    name: "Iron Man & Doctor Doom Mask Split",
    slug: "iron-man-and-doctor-doom-mask-split",
    description: "Comic split mask featuring Tony Stark's Iron Man armor and Victor Von Doom's hooded titanium visage.",
    alt: "Iron Man and Doctor Doom split mask"
  },
  {
    num: 183,
    name: "Spider-Man 'The Fall of Gwen Stacy' Reaching Hand",
    slug: "spider-man-the-fall-of-gwen-stacy-reaching-hand",
    description: "Heartbreaking iconic moment where Spider-Man's web line reaches out desperately toward Gwen Stacy's falling hand.",
    alt: "Spider-Man web reaching Gwen Stacy falling hand"
  },
  {
    num: 184,
    name: "Spider Web Line & Hand of Fate",
    slug: "spider-web-line-and-hand-of-fate",
    description: "Dramatic visual of Spider-Man's high-tension web strand reaching toward an outstretched open hand.",
    alt: "Spider-Man web shooter line and outstretched hand"
  },
  {
    num: 185,
    name: "Doctor Doom Emerald Lightning 'DOOM' Poster",
    slug: "doctor-doom-emerald-lightning-doom-poster",
    description: "Victor Von Doom in his iconic hooded iron mask surrounded by crackling green lightning and bold 'DOOM' lettering.",
    alt: "Doctor Doom emerald lightning typographic poster"
  },
  {
    num: 186,
    name: "Retro Distressed 'DOOM' Comic Badge",
    slug: "retro-distressed-doom-comic-badge",
    description: "Vintage grunge badge of Doctor Doom's hooded face framed by chunky 3D letterforms.",
    alt: "Doctor Doom vintage green distressed logo badge"
  },
  {
    num: 187,
    name: "Thor Thunderstorm Silhouette Watercolor",
    slug: "thor-thunderstorm-silhouette-watercolor",
    description: "Atmospheric silhouette of Thor standing tall with Mjolnir as blue electric bolts crackle through ink clouds.",
    alt: "Thor silhouette with blue thunderstorm lightning"
  },
  {
    num: 188,
    name: "Doctor Doom Low-Poly Emerald Armor",
    slug: "doctor-doom-low-poly-emerald-armor",
    description: "Stylized geometric low-poly art of Victor Von Doom with crossed arms in green cape and faceted titanium armor.",
    alt: "Doctor Doom low-poly green hooded armor"
  },
  {
    num: 189,
    name: "Avengers 'A' Retro Pixel Art Badge",
    slug: "avengers-a-retro-pixel-art-badge",
    description: "Nostalgic 8-bit white Avengers logo emblazoned on a crisp crimson pixel grid.",
    alt: "Pixel art Avengers A logo on red grid"
  },
  {
    num: 190,
    name: "Captain America Battle-Damaged Shattered Shield",
    slug: "captain-america-battle-damaged-shattered-shield",
    description: "The cleaved vibranium shield bearing heavy scuffs and Thanos' double-bladed sword damage.",
    alt: "Captain America shattered battle-damaged shield"
  },
  {
    num: 191,
    name: "Iron Spider Chibi Perched on Gargoyle",
    slug: "iron-spider-chibi-perched-on-gargoyle",
    description: "Cute chibi Peter Parker crouching atop a stone perch with golden mechanical spider arms deployed.",
    alt: "Chibi Iron Spider crouching on stone"
  },
  {
    num: 192,
    name: "Tony Stark & Doctor Doom Reversible Playing Card",
    slug: "tony-stark-doctor-doom-reversible-playing-card",
    description: "Collector's card design featuring Tony Stark 'I'M IRON MAN' on top and Victor Von Doom 'I'M DOOM' mirrored below.",
    alt: "Tony Stark and Doctor Doom split playing card"
  },
  {
    num: 193,
    name: "GTA 'Mission Passed! RESPECT +' Retro Badge",
    slug: "gta-mission-passed-respect-plus-badge",
    description: "The iconic gaming sticker: bold orange 'Mission Passed!' with white outlined 'RESPECT +' decal.",
    alt: "Mission Passed Respect Plus decal"
  },
  {
    num: 194,
    name: "Avengers 'A' Weathered Steel Doomsday Logo",
    slug: "avengers-a-weathered-steel-doomsday-logo",
    description: "Heavy brushed industrial steel Avengers 'A' logo highlighted with an ominous green rim glow.",
    alt: "Weathered steel Avengers A logo with green rim glow"
  },
  {
    num: 195,
    name: "Captain America Patriotic Watercolor Splash",
    slug: "captain-america-patriotic-watercolor-splash",
    description: "Majestic watercolor painting of Steve Rogers standing ready with his vibranium shield in splashes of red, white, and blue.",
    alt: "Captain America patriotic watercolor splatter artwork"
  },
  {
    num: 196,
    name: "Miles Morales Into the Spider-Verse Comic Collage",
    slug: "miles-morales-into-the-spider-verse-comic-collage",
    description: "Miles Morales in his iconic red-and-black hooded suit set against a collage of retro Marvel Spider-Man comics.",
    alt: "Miles Morales Spider-Verse comic collage poster"
  },
  {
    num: 197,
    name: "Robert Downey Jr. Doctor Doom 'New Mask Same Task'",
    slug: "robert-downey-jr-doctor-doom-new-mask-same-task",
    description: "Vintage magazine cover art featuring Robert Downey Jr. seamlessly transitioning into Doctor Doom with authentic signature.",
    alt: "Robert Downey Jr as Doctor Doom vintage magazine cover"
  },
  {
    num: 198,
    name: "Captain America 3D Brick Wall Punch Decal",
    slug: "captain-america-3d-brick-wall-punch-decal",
    description: "Trompe-l'œil 3D wall sticker of Captain America punching through a broken brick wall with shield raised.",
    alt: "Captain America punching through cracked brick wall"
  },
  {
    num: 199,
    name: "PUBG Retro Pixel Supply Drop Badge",
    slug: "pubg-retro-pixel-supply-drop-badge",
    description: "Vintage 8-bit pixel art supply crate badge featuring bold yellow-orange 'PUBG' lettering.",
    alt: "PUBG retro pixel art badge"
  },
  {
    num: 200,
    name: "Loki God of Stories Emerald Sorcery",
    slug: "loki-god-of-stories-emerald-sorcery",
    description: "Tom Hiddleston as Loki summoning swirling emerald mist and temporal sorcery in his Asgardian tunic.",
    alt: "Loki summoning green sorcery energy"
  },
  {
    num: 201,
    name: "Chibi Worthy Captain America Lightning Strike",
    slug: "chibi-worthy-captain-america-lightning-strike",
    description: "Super cute chibi Captain America raising Mjolnir high as crackling blue lightning energizes his shield.",
    alt: "Chibi Captain America wielding Mjolnir with lightning"
  },
  {
    num: 202,
    name: "Thor Odinson Aviator Sunglasses Peace Sign",
    slug: "thor-odinson-aviator-sunglasses-peace-sign",
    description: "Casual blonde Thor in dark aviator sunglasses flashing a cool peace sign.",
    alt: "Thor wearing sunglasses flashing peace sign"
  },
  {
    num: 203,
    name: "Chibi Scarlet Witch 'WANDA.' Peeking",
    slug: "chibi-scarlet-witch-wanda-peeking",
    description: "Adorable chibi Wanda Maximoff in her scarlet tiara and flowing hair peeking around a wall with glowing red chaos magic.",
    alt: "Chibi Scarlet Witch peeking with glowing chaos magic"
  },
  {
    num: 204,
    name: "Doctor Strange Thousand Hands Illusion Spell",
    slug: "doctor-strange-thousand-hands-illusion-spell",
    description: "Stephen Strange performing the multi-arm Image of Ikonn spell within a golden glowing Eldritch mandala.",
    alt: "Doctor Strange thousand hands multi-arm spell"
  },
  {
    num: 205,
    name: "Star-Lord 'Dance Off Bro' Helmet Decal",
    slug: "star-lord-dance-off-bro-helmet-decal",
    description: "Peter Quill's Guardians of the Galaxy battle helmet with glowing red visor lenses and 'DANCE OFF BRO' ribbon banner.",
    alt: "Star-Lord helmet Dance Off Bro decal"
  },
  {
    num: 206,
    name: "Doctor Strange Sorcerer Supreme Comic Portrait",
    slug: "doctor-strange-sorcerer-supreme-comic-portrait",
    description: "Crisp comic-book illustration of Stephen Strange in his high-collared Cloak of Levitation with a confident smirk.",
    alt: "Doctor Strange comic art portrait"
  },
  {
    num: 207,
    name: "Spider-Man & Miles Morales Cyber Vision Triptych",
    slug: "spider-man-miles-morales-cyber-vision-triptych",
    description: "Sleek three-tier poster showcasing Spider-Man and Miles Morales with illuminated neon lenses and dark techwear.",
    alt: "Spider-Man and Miles Morales glowing eye lenses poster"
  },
  {
    num: 208,
    name: "Thor Odinson Grayscale & Red Comic Poster",
    slug: "thor-odinson-grayscale-and-red-comic-poster",
    description: "High-contrast monochrome portrait of Chris Hemsworth as Thor with crimson cape highlights and comic collage background.",
    alt: "Thor Odinson monochrome and crimson poster"
  },
  {
    num: 209,
    name: "Cyberpunk Mecha Deadpool Neon Glow",
    slug: "cyberpunk-mecha-deadpool-neon-glow",
    description: "Futuristic armored cyborg Wade Wilson wielding dual high-tech blades with glowing red targeting rings.",
    alt: "Cyberpunk armored Mecha Deadpool"
  },
  {
    num: 210,
    name: "Doctor Strange Eldritch Shield Minimalist Art",
    slug: "doctor-strange-eldritch-shield-minimalist-art",
    description: "Clean, flat graphic illustration of Doctor Stephen Strange projecting a radiant geometric orange magic shield.",
    alt: "Doctor Strange minimalist orange mandala shield"
  },
  {
    num: 211,
    name: "Doctor Doom 'DOOM DOOM' Emerald Glare",
    slug: "doctor-doom-doom-doom-emerald-glare",
    description: "Intense comic gaze of Victor Von Doom framed by stacked emerald green typography and lightning.",
    alt: "Doctor Doom emerald eyes typography artwork"
  },
  {
    num: 212,
    name: "Chibi Deadpool Crossed Arms Badass",
    slug: "chibi-deadpool-crossed-arms-badass",
    description: "Tough yet adorable chibi Wade Wilson with arms crossed, twin katanas sheathed, and comic drop shadow.",
    alt: "Chibi Deadpool standing with arms crossed"
  },
  {
    num: 213,
    name: "Chibi Spider-Man Heavy Barbell Deadlift",
    slug: "chibi-spider-man-heavy-barbell-deadlift",
    description: "Cute gym motivation sticker of a mini Spider-Man sweating as he lifts a massive iron barbell.",
    alt: "Chibi Spider-Man deadlifting barbell"
  },
  {
    num: 214,
    name: "Avengers: Endgame Battle of Earth Tribute Poster",
    slug: "avengers-endgame-battle-of-earth-tribute-poster",
    description: "Epic grayscale and blue watercolor poster of Tony Stark with the Infinity Gauntlet alongside Cap, Thor, and Thanos.",
    alt: "Avengers Endgame Battle of Earth finale poster"
  },
  {
    num: 215,
    name: "Moon Knight Hooded Word-Art Mask",
    slug: "moon-knight-hooded-word-art-mask",
    description: "Stone-textured typography decal forming Marc Spector's hooded mask from the words 'MOON KNIGHT'.",
    alt: "Moon Knight typography word mask"
  },
  {
    num: 216,
    name: "Among Us Red Crewmate Retro Pixel Art",
    slug: "among-us-red-crewmate-retro-pixel-art",
    description: "Charming 8-bit grid pixel artwork of the iconic Red Crewmate with cyan visor from Among Us.",
    alt: "Among Us red crewmate pixel art"
  },
  {
    num: 217,
    name: "Avengers 'A' Stan Lee Tribute Emblem",
    slug: "avengers-a-stan-lee-tribute-emblem",
    description: "Circular Avengers 'A' typography emblem honoring Stan Lee, encircled by colorful MCU hero insignias.",
    alt: "Avengers Stan Lee typography emblem with hero badges"
  },
  {
    num: 218,
    name: "Spider-Man 'Underoos' Shield Heist",
    slug: "spider-man-underoos-shield-heist",
    description: "Spider-Man making his epic airport entrance in Captain America: Civil War while balancing Cap's vibranium shield.",
    alt: "Spider-Man holding Captain America shield Civil War"
  },
  {
    num: 219,
    name: "Deadpool Gritty Sketch Typography Poster",
    slug: "deadpool-gritty-sketch-typography-poster",
    description: "Crosshatched ink sketch of Deadpool glancing back over his katanas against bold white-on-crimson block lettering.",
    alt: "Deadpool sketch red typography poster"
  },
  {
    num: 220,
    name: "Symbiote Spider-Man Techwear Streetwear",
    slug: "symbiote-spider-man-techwear-streetwear",
    description: "Peter Parker in sleek black symbiote hoodie, silver cuban chain, and glowing lenses under a silver spider icon.",
    alt: "Black suit Spider-Man in techwear hoodie and chain"
  },
  {
    num: 221,
    name: "Spider-Man 8-Bit Pixel Chest Logo",
    slug: "spider-man-8-bit-pixel-chest-logo",
    description: "Retro arcade black spider symbol pixelated on an 8-bit crimson grid background.",
    alt: "Spider-Man 8-bit pixel art logo on red grid"
  },
  {
    num: 222,
    name: "Doctor Strange Mirror Dimension Shards",
    slug: "doctor-strange-mirror-dimension-shards",
    description: "Benedict Cumberbatch as Doctor Strange weaving mystic spells through fractured crystalline mirror dimension glass.",
    alt: "Doctor Strange shattered mirror dimension portrait"
  },
  {
    num: 223,
    name: "Miles Morales Spider-Verse Cyberpunk Poster",
    slug: "miles-morales-spider-verse-cyberpunk-poster",
    description: "Miles Morales looking upward in sleek black suit and red hood with vibrant pink and blue neon typography.",
    alt: "Miles Morales Spider-Verse vertical poster"
  },
  {
    num: 224,
    name: "Spider-Man Inverted Web Drop Silhouette",
    slug: "spider-man-inverted-web-drop-silhouette",
    description: "Sleek minimalist black silhouette of Spider-Man hanging upside down by a single strand of web line.",
    alt: "Spider-Man hanging upside down on web silhouette"
  },
  {
    num: 225,
    name: "Captain America The Winter Soldier Shadow Poster",
    slug: "captain-america-the-winter-soldier-shadow-poster",
    description: "Brooding monochrome silhouette of Steve Rogers in his stealth strike suit holding a splash-colored shield.",
    alt: "Captain America Winter Soldier stealth suit silhouette"
  },
  {
    num: 226,
    name: "Mjolnir Lightning Spark Ground Sticker",
    slug: "mjolnir-lightning-spark-ground-sticker",
    description: "Thor's enchanted uru hammer Mjolnir struck firmly into the earth surrounded by electric sparks.",
    alt: "Mjolnir hammer embedded in ground with sparks"
  },
  {
    num: 227,
    name: "Iron Man Mark 42 Heroic Landing Blast",
    slug: "iron-man-mark-42-heroic-landing-blast",
    description: "Tony Stark's Iron Man Mark XLII touching down in signature three-point landing with palm repulsor fired forward.",
    alt: "Iron Man Mark 42 three-point superhero landing"
  },
  {
    num: 228,
    name: "Chibi Batman The Dark Knight",
    slug: "chibi-batman-the-dark-knight",
    description: "Cute mini Dark Knight standing firmly with black scalloped cape, cowl, and yellow utility belt.",
    alt: "Chibi Batman in black cowl with utility belt"
  },
  {
    num: 229,
    name: "Loki Silhouette Emerald Paint Splatter",
    slug: "loki-silhouette-emerald-paint-splatter",
    description: "Dark regal silhouette of Loki with horned helm and Chitauri sceptre set against a violent emerald spray.",
    alt: "Loki horned silhouette with green paint drip"
  },
  {
    num: 230,
    name: "Infamous Iron Man Doctor Doom Sorcerer Hood",
    slug: "infamous-iron-man-doctor-doom-sorcerer-hood",
    description: "Iron Man nanotech helmet draped in Doctor Doom's green sorcerer's cloak with swirling mystical particles.",
    alt: "Iron Man helmet wearing green Doctor Doom hood"
  },
  {
    num: 231,
    name: "Doctor Doom Fist of Latveria Comic Art",
    slug: "doctor-doom-fist-of-latveria-comic-art",
    description: "Victor Von Doom in green hooded tunic raising his steel-clad fist in defiance as the supreme ruler of Latveria.",
    alt: "Doctor Doom raising armored fist in triumph"
  },
  {
    num: 232,
    name: "Marvel Cinematic Universe Epic Roster Poster",
    slug: "marvel-cinematic-universe-epic-roster-poster",
    description: "Comprehensive MCU ensemble poster featuring Doctor Strange, Scarlet Witch, Captain Marvel, Black Panther, Vision, Hulk, Cap, Thor, and Iron Man.",
    alt: "MCU heroes ensemble comic poster"
  },
  {
    num: 233,
    name: "Spider-Man Mask Comic Collage Poster",
    slug: "spider-man-mask-comic-collage-poster",
    description: "Peter Parker's red hooded mask taking center stage over an authentic tapestry of vintage Spider-Man comic strips.",
    alt: "Spider-Man red hooded mask over comic pages"
  },
  {
    num: 234,
    name: "Doctor Doom Titanium Mask Green Cowl",
    slug: "doctor-doom-titanium-mask-green-cowl",
    description: "Iconic metal mask of Doctor Doom shrouded in deep shadow within his forest-green hooded cowl.",
    alt: "Doctor Doom hooded metallic face mask"
  },
  {
    num: 235,
    name: "Miles Morales Crimson Web Mask Decal",
    slug: "miles-morales-crimson-web-mask-decal",
    description: "Striking profile bust of Miles Morales in his glossy black suit with vibrant crimson webbing and oversized white lenses.",
    alt: "Miles Morales black and red webbed mask profile"
  },
  {
    num: 236,
    name: "Iron Man Comic Action Thrust Flight",
    slug: "iron-man-comic-action-thrust-flight",
    description: "Iron Man Mark XLVI rocket-thrusting into flight with palm repulsor aimed forward over black-and-white comic backgrounds.",
    alt: "Iron Man flying forward over comic pages"
  },
  {
    num: 237,
    name: "The Amazing Spider-Man & Scuderia Racing Collage",
    slug: "the-amazing-spider-man-and-scuderia-racing-collage",
    description: "Electrifying hybrid collage blending Andrew Garfield's Spider-Man suit with high-speed Formula 1 racing aesthetics.",
    alt: "The Amazing Spider-Man and Formula 1 race car collage"
  },
  {
    num: 238,
    name: "Doctor Strange Multi-Arm Mandala Spell Poster",
    slug: "doctor-strange-multi-arm-mandala-spell-poster",
    description: "Glowing-eyed Doctor Strange manifesting multiple mystic arms and circular runic shields against the cosmos.",
    alt: "Doctor Strange multi-arm spell with glowing runic circles"
  },
  {
    num: 239,
    name: "Bro Thor 'I'm Still Worthy' Poster",
    slug: "bro-thor-im-still-worthy-poster",
    description: "Endgame Thor in sunglasses and bathrobe holding his coffee mug with distressed typography: 'I'M STILL WORTHY'.",
    alt: "Bro Thor holding coffee mug I'm Still Worthy poster"
  },
  {
    num: 240,
    name: "Chibi Loki 'Your Savior Is Here!'",
    slug: "chibi-loki-your-savior-is-here",
    description: "Smiling chibi Loki with curved golden horns and flowing green cape proclaiming 'Your Savior Is Here!'.",
    alt: "Chibi Loki Your Savior Is Here sticker"
  },
  {
    num: 241,
    name: "Iron Man Mark 46 Full-Power Repulsor Blast",
    slug: "iron-man-mark-46-full-power-repulsor-blast",
    description: "Iron Man soaring forward in crimson and gold armor firing a radiant white-hot repulsor beam directly at the viewer.",
    alt: "Iron Man mid-flight repulsor blast decal"
  },
  {
    num: 242,
    name: "The Amazing Spider-Man NYC Skyline Vintage Poster",
    slug: "the-amazing-spider-man-nyc-skyline-vintage-poster",
    description: "Retro newsprint poster of Spider-Man overlooking the Empire State Building with the immortal quote: 'With Great Power Comes Great Responsibility'.",
    alt: "The Amazing Spider-Man overlooking NYC skyline poster"
  },
  {
    num: 243,
    name: "Captain America & Winter Soldier Split Shield",
    slug: "captain-america-and-winter-soldier-split-shield",
    description: "Circular split emblem pairing Steve Rogers' red-and-blue star shield with Bucky Barnes' titanium arm and Soviet red star.",
    alt: "Captain America shield and Winter Soldier arm split badge"
  },
  {
    num: 244,
    name: "Chibi Doctor Doom Hovering Magic",
    slug: "chibi-doctor-doom-hovering-magic",
    description: "Cute floating chibi Victor Von Doom in green tunic and cape preparing to cast Latverian sorcery.",
    alt: "Chibi Doctor Doom hovering in mid-air"
  },
  {
    num: 245,
    name: "Tony Stark 'Legends Never Die' Photo Collage",
    slug: "tony-stark-legends-never-die-photo-collage",
    description: "Comprehensive memorial collage honoring Robert Downey Jr.'s Tony Stark with arc reactor, Iron Man suits, and famous MCU quotes.",
    alt: "Tony Stark Legends Never Die photo collage poster"
  },
  {
    num: 246,
    name: "Doctor Doom & Iron Man Armored Gauntlet Fist Bump",
    slug: "doctor-doom-and-iron-man-armored-gauntlet-fist-bump",
    description: "Retro comic panel of Doctor Doom's steel gauntlet and Iron Man's red-and-gold armor fist-bumping in mutual respect.",
    alt: "Doctor Doom and Iron Man armored gauntlet fist bump"
  },
  {
    num: 247,
    name: "Chibi Thor Stormbreaker Lightning Surge",
    slug: "chibi-thor-stormbreaker-lightning-surge",
    description: "Cute chibi Thor kneeling with glowing white eyes while raising Stormbreaker into a storm of crackling blue thunderbolts.",
    alt: "Chibi Thor summoning lightning with Stormbreaker"
  },
  {
    num: 248,
    name: "Tony Stark 'I Am Iron Man' Monolith Poster",
    slug: "tony-stark-i-am-iron-man-monolith-poster",
    description: "Robert Downey Jr. in his tailored pinstripe suit posing with outstretched arms against a stark crimson rectangle and Avengers logo.",
    alt: "Tony Stark pinstripe suit I Am Iron Man poster"
  },
  {
    num: 249,
    name: "Tony Stark's Original Arc Reactor 'Proof That Tony Stark Has A Heart'",
    slug: "tony-starks-original-arc-reactor-proof-that-tony-stark-has-a-heart",
    description: "Pepper Potts' sentimental display case of Tony's first Mk 1 miniature arc reactor inscribed 'Proof That Tony Stark Has A Heart'.",
    alt: "Proof That Tony Stark Has A Heart arc reactor keepsake"
  },
  {
    num: 250,
    name: "Marvel Comic Strip Classic Box Logo",
    slug: "marvel-comic-strip-classic-box-logo",
    description: "Wide red rectangular banner with the iconic MARVEL logo filled with black-and-white classic comic panels.",
    alt: "Classic Marvel comic strip box logo"
  },
  {
    num: 251,
    name: "Batman Gotham Night Minimalist Yellow Poster",
    slug: "batman-gotham-night-minimalist-yellow-poster",
    description: "Sharp black Bat insignia centered boldly on a vibrant Gotham yellow poster field.",
    alt: "Minimalist Batman black logo on yellow poster"
  },
  {
    num: 252,
    name: "Avengers Infinity War 'A' Hero Collage",
    slug: "avengers-infinity-war-a-hero-collage",
    description: "The iconic Avengers 'A' logo filled with dynamic action portraits of Earth's Mightiest Heroes and Guardians of the Galaxy.",
    alt: "Avengers Infinity War heroes in A emblem"
  },
  {
    num: 253,
    name: "Thanos Infinity Gauntlet Snarl",
    slug: "thanos-infinity-gauntlet-snarl",
    description: "The Mad Titan Thanos grinning menacingly while wielding the complete Infinity Gauntlet with all 6 glowing Infinity Stones.",
    alt: "Thanos wearing the complete Infinity Gauntlet"
  },
  {
    num: 254,
    name: "Chibi Black Panther Vibranium Habit",
    slug: "chibi-black-panther-vibranium-habit",
    description: "Cute mini King T'Challa in his detailed silver-accented Black Panther suit with white reflective eyes.",
    alt: "Chibi Black Panther standing in vibranium habit"
  },
  {
    num: 255,
    name: "Deadpool 'Do I Look Like I Care?' Sarcastic Poster",
    slug: "deadpool-do-i-look-like-i-care-sarcastic-poster",
    description: "Wade Wilson shrugging with hands palms up under distressed typography: 'Do I Look Like I Care?'.",
    alt: "Deadpool shrugging Do I Look Like I Care poster"
  },
  {
    num: 256,
    name: "Chibi Infamous Iron Man Victor Von Doom",
    slug: "chibi-infamous-iron-man-victor-von-doom",
    description: "Cute chibi Victor Von Doom combining his green hood with a gold-and-red Iron Man armor plate and chest arc reactor.",
    alt: "Chibi Infamous Iron Man Doctor Doom with arc reactor"
  },
  {
    num: 257,
    name: "Deadpool Bench Nap 'Zzz' Poster",
    slug: "deadpool-bench-nap-zzz-poster",
    description: "Humorous minimalist poster of Deadpool sprawled out fast asleep on a park bench under a bright yellow sunny sky.",
    alt: "Deadpool sleeping on park bench yellow poster"
  },
  {
    num: 258,
    name: "Avengers: Doomsday Victor Von Doom Title Poster",
    slug: "avengers-doomsday-victor-von-doom-title-poster",
    description: "Ominous Doctor Doom with folded metal gauntlets cloaked in green above the metallic 'AVENGERS: DOOMSDAY' logo.",
    alt: "Avengers Doomsday Doctor Doom title poster"
  },
  {
    num: 259,
    name: "Marvel Red Cosmic Nebula Deep Space Poster",
    slug: "marvel-red-cosmic-nebula-deep-space-poster",
    description: "The classic white-on-red Marvel logo floating in the radiant heart of a glowing stellar cosmic nebula.",
    alt: "Marvel logo in deep space cosmic nebula poster"
  },
  {
    num: 260,
    name: "Chibi Doctor Strange Mystic Mandala Circles",
    slug: "chibi-doctor-strange-mystic-mandala-circles",
    description: "Cute chibi Stephen Strange hovering with the Eye of Agamotto and multiple glowing orange Tao mandalas.",
    alt: "Chibi Doctor Strange casting orange mystic shields"
  },
  {
    num: 261,
    name: "The Incredible Hulk Leap Fist Comic Art",
    slug: "the-incredible-hulk-leap-fist-comic-art",
    description: "Vintage comic book art of the Incredible Hulk launching forward through the air with clenched fist ready to smash.",
    alt: "The Incredible Hulk leaping comic action art"
  },
  {
    num: 262,
    name: "The Flash Scarlet Speedster Comic Bust",
    slug: "the-flash-scarlet-speedster-comic-bust",
    description: "Classic DC superhero Barry Allen in his iconic crimson cowl with golden lightning bolt chest crest and ear wings.",
    alt: "The Flash comic book speedster bust"
  },
  {
    num: 263,
    name: "Doctor Doom & Iron Man Crest Arc Reactor Split",
    slug: "doctor-doom-and-iron-man-crest-arc-reactor-split",
    description: "Circular split badge showing the green Latverian Doom monogram on the left and Tony Stark's glowing arc reactor on the right.",
    alt: "Doctor Doom crest and Iron Man arc reactor circular badge"
  },
  {
    num: 264,
    name: "Doctor Strange Master of the Mystic Arts Galaxy Poster",
    slug: "doctor-strange-master-of-the-mystic-arts-galaxy-poster",
    description: "Stephen Strange striding confidently through sacred geometric spells and celestial astrological wheels.",
    alt: "Doctor Strange master of mystic arts celestial poster"
  },
  {
    num: 265,
    name: "Doctor Strange Shield of the Seraphim Runic Magic",
    slug: "doctor-strange-shield-of-the-seraphim-runic-magic",
    description: "Benedict Cumberbatch as Doctor Strange projecting a blazing fiery runic mandala shield from his outstretched hand.",
    alt: "Doctor Strange conjuring glowing runic shield"
  },
  {
    num: 266,
    name: "Doctor Strange Blood Red Moon Skyline Silhouette",
    slug: "doctor-strange-blood-red-moon-skyline-silhouette",
    description: "Dramatic dark silhouette of Doctor Strange levitating high over New York City within a blood-red mystic moon ring.",
    alt: "Doctor Strange floating silhouette over city skyline"
  },
  {
    num: 267,
    name: "Sanctum Sanctorum Window of the Worlds Blueprint",
    slug: "sanctum-sanctorum-window-of-the-worlds-blueprint",
    description: "Crisp architectural line art of Doctor Strange's iconic circular Sanctum Sanctorum skylight (Seal of the Vishanti).",
    alt: "Doctor Strange Sanctum Sanctorum circular window line art"
  },
  {
    num: 268,
    name: "Doctor Strange Sorcerer Supreme Walking Incantation",
    slug: "doctor-strange-sorcerer-supreme-walking-incantation",
    description: "Full-length illustration of Doctor Strange walking forward in flowing Cloak of Levitation with a blazing fiery spell sphere.",
    alt: "Doctor Strange walking with fiery magic sphere"
  },
  {
    num: 269,
    name: "Spider-Man & Gwen Stacy 'The Plunge' Silhouette",
    slug: "spider-man-gwen-stacy-the-plunge-silhouette",
    description: "Haunting silhouette poster of Spider-Man diving on a web strand to save Gwen Stacy falling into the abyss.",
    alt: "Spider-Man reaching for falling Gwen Stacy silhouette"
  },
  {
    num: 270,
    name: "Mjolnir Armored Forearm Lightning Grasp",
    slug: "mjolnir-armored-forearm-lightning-grasp",
    description: "Powerful graphic of Thor's golden armored gauntlet clutching Mjolnir as bright blue lightning arcs across the sky.",
    alt: "Thor gauntlet gripping Mjolnir with lightning"
  },
  {
    num: 271,
    name: "Captain America Heroic Charge Starburst Badge",
    slug: "captain-america-heroic-charge-starburst-badge",
    description: "Classic comic Cap sprinting into action with his vibranium shield against an explosive red-and-blue starburst.",
    alt: "Captain America running with shield starburst badge"
  },
  {
    num: 272,
    name: "Spider-Man Web Slinger Dynamic Comic Collage",
    slug: "spider-man-web-slinger-dynamic-comic-collage",
    description: "Action-packed perspective of Spider-Man reaching forward shooting webs over a dense red-and-black collage of comic book panels.",
    alt: "Spider-Man shooting web over comic collage poster"
  },
  {
    num: 273,
    name: "Chibi Avengers Peeking Ledge Cuties",
    slug: "chibi-avengers-peeking-ledge-cuties",
    description: "Super cute horizontal decal of mini Spider-Man, Iron Man, Captain America, Hulk, and Thor peeking over a ledge.",
    alt: "Chibi Avengers heroes peeking over ledge"
  },
  {
    num: 274,
    name: "Chibi Hawkeye Peeking Archer",
    slug: "chibi-hawkeye-peeking-archer",
    description: "Adorable chibi Clint Barton in purple tactical gear with bow and arrows peeking shyly from the edge.",
    alt: "Chibi Hawkeye peeking with bow"
  },
  {
    num: 275,
    name: "Classic Spider-Man NYC Skyscraper Leap Poster",
    slug: "classic-spider-man-nyc-skyscraper-leap-poster",
    description: "Vintage pulp-style comic poster of Spider-Man leaping between New York City skyscrapers above the Empire State Building.",
    alt: "Classic Spider-Man leaping over New York City skyline poster"
  },
  {
    num: 276,
    name: "Thor 'God of Thunder' Purple Wave Poster",
    slug: "thor-god-of-thunder-purple-wave-poster",
    description: "Chris Hemsworth as Thor surrounded by crackling lightning against purple wavy typography reading 'GOD OF THUNDER THOR'.",
    alt: "Thor God of Thunder purple typography poster"
  },
  {
    num: 277,
    name: "Spider-Sense Tingling Retro Pop Art",
    slug: "spider-sense-tingling-retro-pop-art",
    description: "Pop art portrait of Spider-Man looking alert with blue and red electric Spider-Sense waves radiating on yellow sunburst.",
    alt: "Spider-Man with tingling Spider-Sense waves pop art"
  },
  {
    num: 278,
    name: "Avengers Heroes Assemble 'A' Cutout Emblem",
    slug: "avengers-heroes-assemble-a-cutout-emblem",
    description: "Massive metallic Avengers 'A' silhouette filled with Earth's Mightiest Heroes in full MCU combat gear.",
    alt: "Avengers A logo cutout filled with Marvel heroes"
  },
  {
    num: 279,
    name: "Chibi Doctor Doom Stern Arms Folded",
    slug: "chibi-doctor-doom-stern-arms-folded",
    description: "Cute chibi Victor Von Doom looking formidable with arms crossed in his green hooded mantle and metallic armor.",
    alt: "Chibi Doctor Doom standing with crossed arms"
  },
  {
    num: 280,
    name: "Avengers Fiery Embers Cosmic 'A' Logo Poster",
    slug: "avengers-fiery-embers-cosmic-a-logo-poster",
    description: "Cinematic, epic glowing metallic Avengers 'A' insignia bathed in radiant orange nebula light and cosmic embers.",
    alt: "Avengers A logo glowing in cosmic space nebula poster"
  }
];

async function main() {
  console.log(`Starting update for ${marvelProducts.length} Marvel products...`);

  let updatedCount = 0;
  for (const item of marvelProducts) {
    const productId = `stk-marvel-${item.num}`;
    
    // Update product
    await prisma.product.upsert({
      where: { id: productId },
      update: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        price: 20.00,
        category: 'stickers',
        status: 'PUBLISHED',
        active: true
      },
      create: {
        id: productId,
        name: item.name,
        slug: item.slug,
        description: item.description,
        price: 20.00,
        category: 'stickers',
        productType: 'single',
        status: 'PUBLISHED',
        active: true
      }
    });

    // Update primary image alt
    await prisma.productImage.updateMany({
      where: { productId: productId },
      data: {
        alt: item.alt
      }
    });

    updatedCount++;
    if (updatedCount % 20 === 0 || updatedCount === marvelProducts.length) {
      console.log(`Updated ${updatedCount}/${marvelProducts.length} products...`);
    }
  }

  console.log(`Successfully updated all ${updatedCount} Marvel products!`);
}

main()
  .catch((e) => {
    console.error('Error updating Marvel products:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

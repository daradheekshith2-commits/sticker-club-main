# Sticker Club — storefront prototype

A mobile-first storefront for a college-first **sticker** brand in Hyderabad, with posters as a
secondary line and a set of collectible features (mystery packs, build-your-own packs, duos,
secret messages, rarity, a collector passport and community voting).
**Frontend only:** the catalogue, search, filters, cart and checkout preview all work in the
browser, but no orders, payments or customer data go anywhere.

> "STICKER CLUB" is a temporary working name. Change it in one place: `src/config/brand.ts`.

## Run it

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # cart, catalogue, checkout, configurator, collectible and QR logic tests
npm run typecheck  # TypeScript only
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

Deploying to Vercel: import the repo, framework preset "Vite". `vercel.json` already
rewrites every path to `index.html`, so links like `/product/chai-first` work on refresh.

## Where things live

| You want to change… | Edit |
|---|---|
| Brand name, tagline, contact links | `src/config/brand.ts` |
| Products, prices, descriptions, pack contents | `src/data/products.ts` |
| Vibes/collections (names, colours, homepage tiles, old-id aliases, notes) | `src/data/collections.ts` |
| Homepage Shop by Vibe cards and their animated artwork | `src/components/vibes/ShopByVibe.tsx` (+ motion CSS at the end of `src/index.css`) |
| Header dropdown menus (Stickers / Posters) | `src/config/navigation.ts` |
| Poster sizes and their prices | `posterSizes` in `src/data/products.ts` |
| Wall builder layouts (presets) and pack arrangements | `src/data/wallLayouts.ts` |
| Custom wall pricing rule | `wallPrice` in `src/utils/customWall.ts` |
| Image link / file checks (+ exact customer wording) | `src/utils/imageSource.ts` |
| Custom sticker sizes, finishes, shapes, prices | `src/data/customStickerOptions.ts` |
| Custom sticker pricing rule | `src/utils/customSticker.ts` |
| Rarity tiers and series (S01–S04) | `src/data/rarity.ts` |
| Mystery pack contents, themes, odds (null = not configured) | `mys-001` in `src/data/products.ts` |
| Build Your Own Pack sizes, prices, finishes, surprise wording | `src/data/packBuilder.ts` |
| Secret message card series + sample card | `src/data/messageCards.ts` |
| Vote themes, design directions, upcoming drop | `src/data/drops.ts` |
| Unexpected gift (bonus policy) | `src/config/bonusGift.ts` |
| Collector passport goal and reward | `src/config/passport.ts` |
| Public site address for printed QR codes | `publicUrl` in `src/config/brand.ts` |
| Colours and fonts (site-wide dark cinematic palette; `.on-light` for bright cards) | `@theme` block in `src/index.css` |
| Homepage sections | `src/pages/HomePage.tsx` |
| Search / filter / sort rules | `src/utils/catalogue.ts` |
| Cart maths and saved-cart handling | `src/utils/cart.ts` |
| Checkout form validation | `src/utils/checkout.ts` |

```
src/
  config/brand.ts         temporary brand identity + feature switches
  data/                   products.ts, collections.ts (the only product data source)
  types/product.ts        Product, ProductArt, StickerDesign types
  utils/                  pure logic + *.test.ts
  context/CartContext.tsx cart state shared by every page, saved to localStorage
  router/router.tsx       small client-side router (see note below)
  components/
    art/                  original SVG sticker artwork + ProductImage
    layout/               header, footer, layout shell
    product/              ProductCard/ProductGrid, QuantitySelector
    cart/                 CartDrawer
    ui/                   Breadcrumbs, EmptyState, Notice/Placeholder, SectionHeading
  pages/                  Home, Shop, Product, Vibes, Checkout, About/FAQ/Contact/Policies/404
```

## Homepage hero (dark cinematic + sticker mosaic)

`src/components/home/AnimatedStickerHero.tsx` (copy, CTAs) and `AnimatedStickerMosaic.tsx`
(the moving columns). The whole site uses the dark cinematic palette (tokens at the top of `src/index.css`:
black-green background, ivory text, racing-red accent, mint highlights). Bright collection
cards add `.on-light`, which restores dark text and black borders inside them.

**Your sticker images:** put PNG / WebP / JPG / AVIF (or safe SVG) files in
`public/hero-stickers/`. `scripts/generate-hero-sticker-manifest.mjs` reads every file's real
size and transparency, skips broken/unsupported/unsafe files, and writes
`src/data/heroStickers.generated.ts`. It runs automatically before `npm run dev` and
`npm run build`, or manually with `npm run hero:manifest`; it prints how many files it used.
If the folder is empty, the mosaic falls back to the shop's own sticker artwork.

How the loop works: each column holds its tiles twice and moves by exactly -50% with a CSS
animation (columns alternate up/down at different speeds); with reduced motion it's a still
collage. A file that fails to load is hidden from both copies, so the loop stays seamless.

## Shop by Vibe

The homepage cards are Anime, Movies, Life Quotes, Marvel and Cute & Aesthetic (unchanged).
The old ids still work as links: `?vibe=campus` → Anime, `tech` → Movies, `desi` → Life Quotes,
`auto` → Marvel (`collectionAliases` in `src/data/collections.ts`). Counts on the cards come
from the catalogue (`src/utils/vibes.ts`).

**Licensing:** there is no Marvel licence. Every product in the "Marvel" collection is an original
superhero-inspired design, tagged `unofficial`, and the collection's `note` (shown on the card,
shop filter, vibes page and product pages) says it isn't official or licensed Marvel merchandise.
Selling under the "Marvel" name without a licence is a trademark risk — rename the collection
(only `name` in `collections.ts`) unless you obtain a licence. Anime and Movies designs are
original too; don't add real characters, film titles, stills or logos without rights.

## Collectibles

Hub: `/collectibles`. Everything below is a working frontend; anything that needs real
stock, orders or shared data is clearly marked as demo/planned and has an integration point in
`src/services/` (`inventory.ts`, `community.ts`, `rewards.ts`).

- **Mystery Sticker Pack** (`/product/mystery-pack`): choose a series theme (a variant). The page
  shows the 6-sticker composition (5 guaranteed from the theme's listed designs + 1 mystery),
  packaging, a visibly DEMO pack number, and an odds table that says "not configured" while
  `mystery.odds` is `null`. Holographic designs are listed as *not included* until
  `inventoryConfirmed` is true.
- **Rare collections** (`/rare-collections?series=S01`): Common / Uncommon / Rare / Limited Edition.
  All rarity data is demo (`rarityDataSource`). Limited editions show a run size only when
  `edition.confirmed` is true. No stock counts or odds anywhere.
- **Build your own pack** (`/build-your-pack`): theme → 5 or 10 → pick exactly that many
  Common/Uncommon singles → finish (only `available: true` finishes) → +1 surprise → cart.
  Rules live in `src/utils/customPack.ts`; packs are saved in the cart as ids and re-validated on load.
- **Matching duos** (`/matching-duos`) and **Secret messages** (`/secret-messages`): normal
  products (`productType: 'duo' | 'secret'`). Real message texts are deliberately not in the code.
- **Unexpected gift**: planned bonus shown in the cart, product pages and the hub; `status: 'planned'`
  until real orders are packed. No coupons or discounts.
- **Collector passport** (`/collector-passport`): printed card design + a digital demo in page
  state only (nothing stored). Real rewards must come from server order records.
- **Vote for the next drop** (`/vote-next-drop`): demo voting + idea form (validated in
  `src/utils/community.ts`), no totals shown. Includes a QR code (generated by `src/utils/qr.ts`,
  no dependency) that is flagged "Preview only" on localhost; set `brand.publicUrl` before printing.

## Create your own stickers (`/create-your-stickers`)

Add one image (upload or direct link), choose a shape (rounded square, circle, or "follow
the shape" for transparent PNG/WebP), size (Small/Medium/Large), a provisional finish and a
quantity (1–20). The preview is a CSS simulation of a white die-cut border — not a cut path —
and works for linked images too because nothing reads the image's pixels (no canvas).
Price = (size price + finish surcharge) × quantity, from `customStickerOptions.ts`. Sizes
show "Size to be confirmed" until you fill in `dimensions`. Adding to cart needs the
image-rights confirmation and creates a `custom-sticker` cart line.

## Shared image input (both configurators)

`src/components/image/ImageSourcePicker.tsx` (Upload / Image link tabs, plus extra tabs a
page adds), backed by `ImageUploader`, `ImageUrlInput` and `src/utils/imageSource.ts`:
- Files: real MIME type (JPG/PNG/WebP) and size (≤ 15 MB) are checked; the preview appears
  immediately; the file stays in the browser as a temporary blob: URL.
- Links: only http(s); the browser must actually load the image before it can be used
  (file extension alone means nothing). The original URL is displayed — never downloaded or
  copied. Any failure shows the agreed message: "This link doesn't appear to be a direct
  image. …". Pinterest pin pages (e.g. https://in.pinterest.com/pin/1082623198501539240/) and
  Google results are recognised as web pages and rejected with the same message.

## Build your own wall (`/build-your-wall`)

1. **Choose a layout** — Compact (5), Classic (8), Studio (10) or Large (15) Wall. Layouts are
   rows of sizes in `src/data/wallLayouts.ts`; `buildLayout` turns them into exact positions
   using real A5/A4/A3 dimensions, so previews keep true proportions.
2. **Fill each position** with one of our poster designs, a photo from the device
   (JPG/PNG/WebP, max 15 MB) or a direct image link.
3. **Adjust** your own images (fill/fit, focal point), check the price, confirm image rights,
   and add the wall to the cart as its own line.

Honest limits of the prototype:
- **Uploads never leave the browser.** They become temporary `blob:` URLs (managed with
  reference counting in `src/utils/objectUrls.ts`) and disappear on refresh.
- **Custom walls aren't saved** to localStorage, so they leave the cart on refresh; regular
  products stay.
- **Image links are only displayed**, never downloaded. A link must point at the image
  file. Pinterest pins and Google results are web pages, so they're refused with an
  explanation; nothing is scraped. A future approved integration can be added as an
  `ImageResolver` in `src/utils/imageSource.ts`.
- **Price** = sum of each position's poster size price. No bundle discount exists yet.
- A low-resolution warning appears for images under ~100 pixels per inch for their size.
- For real orders you'll need: controlled storage for photos, a backend that receives the
  `CustomWallConfig` (see `src/types/wall.ts`), and print-ready file checks.

### Routes

`/` · `/shop` (filters live in the URL, e.g. `/shop?type=sheet&vibe=tech&sort=price-asc`) ·
`/vibes` · `/product/:slug` · `/create-your-stickers` · `/build-your-wall` · `/collectibles` · `/build-your-pack` ·
`/matching-duos` · `/secret-messages` · `/rare-collections` · `/collector-passport` · `/vote-next-drop` · `/checkout` · `/about` · `/faq` · `/contact` ·
`/policies/shipping|returns|privacy|terms` · anything else → 404.

## How the product images work

Each product has an `art` description (shape, colours, motif, label). Components draw it as SVG,
so there are no image files to break. When you have real photos, put them in
`public/products/` and add them to the product:

```ts
images: [{ src: '/products/chai-first-1.jpg', alt: 'Chai First sticker on a laptop' }],
```

`ProductImage` automatically uses the photos instead of the drawing.

## Adding a product

Copy an existing entry in `src/data/products.ts`, give it a **new unique `id` and `slug`**, and
edit the text, price, `collections` and `art`. `npm test` checks that ids and slugs are unique
and prices are valid.

**Adding a single poster** is shorter: copy one of the `poster({ ... })` entries. It automatically
gets every size in `posterSizes` (A5/A4/A3) with their prices. Wall packs and sets are written out
in full (fixed A4, one price).

**Sizes (variants):** a product with `variants` must be bought in one of them. The cart keeps
an A4 and an A3 of the same poster as separate lines with separate prices, and the product's
`price` must equal its cheapest size (a test checks this; it's shown as "From ₹…").

- `status: 'demo'` → can be added to the cart. `status: 'coming-soon'` → visible, not orderable.
- Leave `dimensions`, `material` and `finish` out until a supplier confirms them; the product
  page then says "To be confirmed after supplier samples" instead of inventing specs.
- Pack/sheet contents and counts are worked out from the designs in `art`, so they can't drift.

## Two deliberate technical choices

- **Router:** `src/router/router.tsx` is a ~150-line router instead of React Router. The
  function names (`Link`, `NavLink`, `useNavigate`, `useParams`, `useSearchParams`) match
  React Router, so switching later is mostly changing imports.
- **Icons:** `react-icons/lu` (the Lucide icon set via react-icons).

## What works now vs. what's intentionally not built

Works in the browser: Stickers and Posters dropdown menus, shop-by-vibe, a swipeable tile row on
the shop page, search, collapsible filters with counts (category, format, poster size, vibe, price),
sorting, "in use" image on hover, product pages with gallery and poster size picker, cart drawer
(add, update, remove, per-size prices, totals), cart saved across refreshes and synced across
tabs, checkout form with validation, mobile navigation and filter sheet.

Ideas borrowed from the reference stores (layout patterns only, no content copied): theme menus
and sub-collection tiles (Posterized), size options and wall packs (Posterized), filter groups
with counts and hover images (Stick It Up). Left out on purpose: fake "sale" prices, countdown
timers, spin-to-win popups, "only N left" badges, review counts, and licensed/brand artwork.

Intentionally frontend-only: **no backend, database, payment, order storage, email/SMS or
accounts.** The checkout preview validates the form, then clears it and says plainly that no
order was placed. Shipping/pickup costs are shown as "to be confirmed", never calculated.

## Before taking real orders — checklist

1. **Brand:** pick the final name; update `brand.ts`, the wordmark in `SiteHeader.tsx`,
   `public/favicon.svg`, and the `<title>`/description in `index.html`.
2. **Contact:** fill in `email`, `instagramUrl`/`instagramHandle` and/or `whatsappNumber`
   in `brand.ts`. Until then the footer and Contact page show a visible placeholder.
3. **Products:** replace demo designs with your final artwork and photos; set real prices
   once supplier costs are known (stickers *and* each poster size); add confirmed
   material/finish. Posters cost more per piece and can bend in transit, so get printer
   quotes and plan packaging (e.g. tubes or board-backed envelopes) for both lines.
4. **Policies:** write real Shipping, Returns, Privacy and Terms pages (currently placeholders
   in `src/pages/InfoPages.tsx`).
5. **Ordering:** decide how orders are taken (even a simple WhatsApp/Instagram flow first),
   then replace `handleSubmit` in `CheckoutPage.tsx` with a real submission.
6. **Collectibles:** set real pack/edition numbering from production, fill `mystery.odds` only
   from a real print plan, confirm finishes, set `bonusGift.costAllowancePerOrder` and the passport
   reward cap once margins are known, connect `src/services/*`, and set `brand.publicUrl` before
   printing QR inserts.
7. **Prototype flag:** set `brand.isPrototype = false` only when real ordering exists.

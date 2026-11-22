export interface StoreFaq {
  q: string;
  a: string;
  category?: 'stickers' | 'posters' | 'custom' | 'orders' | 'general';
}

/**
 * Authoritative, customer-relevant FAQs for Pixwora.
 * Used across the Homepage FAQ section, FAQ landing page, and build-time SEO prerendering.
 * These answers provide clear, factual information for shoppers and search engines (AEO/GEO).
 */
export const STORE_FAQS: StoreFaq[] = [
  {
    q: 'What makes Pixwora stickers waterproof and durable?',
    a: 'Every Pixwora sticker is printed on premium heavy-duty vinyl with a protective matte lamination. This makes them 100% waterproof, scratch-resistant, fade-proof under sunlight, and completely residue-free when peeled from laptops, water bottles, phones, and bike helmets.',
    category: 'stickers',
  },
  {
    q: 'What poster sizes do you offer and what paper is used?',
    a: 'Pixwora wall posters come in three standard international sizes: A5 (14.8 × 21 cm / 5.8 × 8.3 in), A4 (21 × 29.7 cm / 8.3 × 11.7 in), and A3 (29.7 × 42 cm / 11.7 × 16.5 in). All posters are printed on heavy 300 GSM archival matte art cardstock with deep, non-reflective color reproduction designed for framing or tape mounting.',
    category: 'posters',
  },
  {
    q: 'How does "Create Your Own" custom sticker printing work?',
    a: 'Upload your own image, illustration, or photo in our custom sticker studio. Choose precision contour die-cut or geometric shapes, select standard 5cm × 5cm (₹20), 6cm × 6cm (₹25), or enter custom dimensions with instant automated pricing. We review every uploaded file for print resolution before printing on waterproof vinyl.',
    category: 'custom',
  },
  {
    q: 'Where is Pixwora based and how long does delivery take across India?',
    a: 'Pixwora is an independent, student-run creative studio based in Hyderabad, Telangana, India. Orders are printed, precision cut, and securely packed in rigid bend-proof mailers within 24 to 48 hours. Pan-India tracked delivery typically arrives in 3–5 business days to over 24,000 PIN codes.',
    category: 'orders',
  },
  {
    q: 'How do I pay using UPI or Cash on Delivery (COD)?',
    a: 'At checkout, you can pay via direct UPI transfer (Google Pay, PhonePe, Paytm, BHIM) by scanning our dynamic store QR code and confirming with your 12-digit UTR reference number. We also offer Cash on Delivery (COD) for eligible pincodes across India with a nominal ₹15 courier handling fee.',
    category: 'orders',
  },
  {
    q: 'Do your stickers peel off cleanly without sticky glue residue?',
    a: 'Yes. We use premium removable vinyl adhesive. You can safely peel and reposition your stickers on MacBook lids, plastic or metal water bottles, phone cases, and glass surfaces with zero sticky glue residue or paper tearing.',
    category: 'stickers',
  },
  {
    q: 'What is the minimum order requirement and why?',
    a: 'Pixwora has a ₹99 minimum order total at checkout. This ensures every shipment can be packed in protective, reinforced bend-proof mailers with moisture-sealed sleeves and dispatched via reliable tracked courier partners without compromising packaging quality.',
    category: 'orders',
  },
  {
    q: 'What is the Mystery Sticker Pack?',
    a: 'The Mystery Pack includes 6 stickers for ₹129: 5 guaranteed designs from your selected theme (Anime, Marvel, Gaming, Cars & Bikes, Cute, Devotion, Sports, or Movies) plus 1 surprise bonus sticker hand-picked by our studio team.',
    category: 'stickers',
  },
  {
    q: 'Can I personalize Secret Message stickers?',
    a: 'Yes! Every Secret Message sticker includes a wax-sealed kraft envelope card. You can write your own custom message during checkout or in our builder to surprise a friend, or opt for our studio-curated surprise quote.',
    category: 'custom',
  },
  {
    q: 'How does the "Build Your Wall" poster collage kit work?',
    a: 'Our Build Your Wall tool lets you visually arrange custom room collages mixing A5, A4, and A3 prints on an interactive canvas. You can combine our curated catalog designs with your own uploaded photos, preview real-world wall spacing, and order the entire set in one click.',
    category: 'posters',
  },
  {
    q: 'How can I contact Pixwora customer support?',
    a: 'You can reach our Hyderabad studio team directly via WhatsApp or phone at +91 7981793020 and +91 8019345200, or email us anytime at pixworastore@gmail.com. We typically respond within a few hours on business days.',
    category: 'general',
  },
];

export const HOMEPAGE_FAQS = STORE_FAQS.slice(0, 5);

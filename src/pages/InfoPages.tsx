/**
 * ABOUT, FAQ, CONTACT, POLICIES and 404.
 * All copy here is a first draft. Policy pages are placeholders on purpose:
 * replace them with real, founder-approved terms before taking real orders.
 */
import type { ReactNode } from 'react';
import { LuInstagram, LuMail, LuMessageCircle } from 'react-icons/lu';
import { brand, hasAnyContact, whatsappLink } from '../config/brand';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link, useParams } from '../router/router';
import { shopUrl } from '../utils/catalogue';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';
import { Notice, Placeholder } from '../components/ui/Placeholder';

function Page({ title, crumb, intro, children }: { title: string; crumb: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: crumb }]} />
      <h1 className="mt-4 text-5xl leading-[0.95] font-extrabold md:text-7xl">{title}</h1>
      {intro && <p className="mt-5 text-xl text-ink-soft">{intro}</p>}
      <div className="mt-10 space-y-6 text-lg leading-relaxed [&_h2]:mt-10 [&_h2]:text-3xl [&_h2]:font-extrabold">{children}</div>
    </div>
  );
}

export function AboutPage() {
  usePageMeta('About', 'Boring was never our thing. Meet Sticker Club.');
  const collections = [
    { title: 'Stickers', copy: 'Little designs with a lot to say.', to: shopUrl({ category: 'stickers' }), color: '#FFD447' },
    { title: 'Posters', copy: 'Give the walls a personality of their own.', to: shopUrl({ category: 'posters' }), color: '#8FD3FF' },
    { title: 'Cars & Bikes', copy: 'For track-day dreamers and everyday riders.', to: shopUrl({ collections: ['quotes'] }), color: '#FF5B2E' },
    { title: 'Shop Your Own', copy: 'Your design, your shape, your rules.', to: '/create-your-stickers', color: '#A8F0DC' },
  ];
  return (
    <div>
      <section className="relative overflow-hidden bg-[#F5F0E6] px-4 py-20 text-[#03110f] sm:px-6 md:py-28">
        <div className="mx-auto max-w-7xl">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'About' }]} />
          <p className="mt-14 text-xs font-extrabold uppercase tracking-[0.2em]">A little rebellion against boring things</p>
          <h1 className="mt-5 max-w-5xl font-display text-[clamp(3.5rem,10vw,9rem)] font-extrabold leading-[0.87] tracking-tight">BORING WAS NEVER OUR THING.</h1>
          <p className="mt-8 max-w-xl text-xl leading-relaxed sm:text-2xl">Your laptop, your walls, your world. Make every little corner feel a little more like you.</p>
          <Link to="/shop" className="mt-8 inline-flex rounded-full bg-[#03110f] px-7 py-4 text-sm font-bold text-[#F5F0E6] transition hover:-translate-y-1">Explore the club →</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-24 sm:px-6 md:grid-cols-2 md:gap-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint">01 / What we believe</p>
        <div>
          <h2 className="font-display text-5xl font-extrabold leading-none sm:text-7xl">SMALL STICKERS. BIG PERSONALITY.</h2>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-ink-soft">A plain laptop is fine. A wall with nothing on it is fine. But why settle for fine? Sticker Club is about making your everyday space unmistakably yours—with small designs, bold ideas and plenty of character.</p>
          <p className="mt-4 max-w-lg text-sm text-ink-soft">We're starting as a student-run brand in {brand.city}. Original stickers, custom cuts, and posters crafted for students and creators.</p>
        </div>
      </section>
      <section className="bg-[#F5F0E6] px-4 py-24 text-[#03110f] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em]">02 / Find your thing</p>
          <h2 className="mt-3 max-w-3xl font-display text-5xl font-extrabold leading-none sm:text-7xl">YOUR WORLD, YOUR COLLECTION.</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {collections.map((c) => (
              <Link key={c.title} to={c.to} className="group flex min-h-64 flex-col justify-between rounded-3xl border-2 border-[#03110f] p-7 transition duration-200 hover:-translate-y-1 hover:shadow-[8px_8px_0_#03110f]" style={{ backgroundColor: c.color }}>
                <span className="self-end text-2xl transition group-hover:translate-x-1" aria-hidden>↗</span>
                <span><span className="block font-display text-4xl font-extrabold sm:text-5xl">{c.title}</span><span className="mt-2 block max-w-xs text-base">{c.copy}</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-24 sm:px-6 md:grid-cols-2">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-mint">03 / Make it yours</p><h2 className="mt-4 font-display text-5xl font-extrabold leading-none sm:text-7xl">YOUR IDEAS. YOUR RULES.</h2></div>
        <div><p className="text-lg leading-relaxed text-ink-soft">Your sketches, your photos, your ideas. Upload a design, adjust the crop, pick a shape and create a sticker that could only belong to you.</p><Link to="/create-your-stickers" className="btn-accent mt-6">Create your own sticker →</Link></div>
      </section>
      <section className="bg-[#06483D] px-4 py-24 text-center sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint">This is your sign</p>
        <h2 className="mx-auto mt-5 max-w-5xl font-display text-[clamp(3.5rem,9vw,8rem)] font-extrabold leading-[0.9]">THE WORLD IS YOUR CANVAS.</h2>
        <p className="mt-6 text-lg">Find something that feels like you.</p>
        <Link to="/shop" className="mt-8 inline-flex rounded-full bg-[#F5F0E6] px-8 py-4 text-sm font-extrabold text-[#03110f] transition hover:-translate-y-1">FIND YOUR VIBE →</Link>
      </section>
    </div>
  );
}

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: 'Can I place an order right now?',
    a: 'Yes! Pixwora is live. You can add stickers, posters, and custom prints to your cart and proceed to checkout. We deliver pan-India with a minimum order total of ₹99.',
  },
  {
    q: 'What size and material are the stickers?',
    a: 'Our stickers are printed on premium 100% waterproof, scratch-resistant vinyl with a protective matte laminate. Individual stickers fit within a standard 5cm × 5cm (approx 2" × 2") area with die-cut precision, while sticker sheets are standard A6 format (10.5 × 14.8 cm).',
  },
  {
    q: 'How does "Create Your Own" custom stickers work?',
    a: 'You can upload your own image or photo, use our interactive corner-bracket crop tool to frame it, and pick your dimensions: 5cm × 5cm (₹20), 6cm × 6cm (₹25), or enter any custom dimensions in cm with instant automated pricing. We inspect every uploaded artwork for print clarity before production.',
  },
  {
    q: 'What poster sizes do you offer and what paper is used?',
    a: 'Our wall posters come in three standard international sizes: A5 (14.8 × 21 cm / 5.8 × 8.3 in), A4 (21 × 29.7 cm / 8.3 × 11.7 in), and A3 (29.7 × 42 cm / 11.7 × 16.5 in). All posters are printed on heavy 300 GSM archival matte cardstock with rich, fade-resistant color reproduction.',
  },
  {
    q: 'What is the minimum order requirement?',
    a: 'Pixwora has a ₹99 minimum order total to checkout. This allows us to use rigid bend-proof mailers, protective moisture-sealed packaging, and reliable tracked courier dispatch.',
  },
  {
    q: 'How do I pay using UPI?',
    a: 'Select UPI at checkout. You will see our verified store UPI ID with display payee name KOMMULA SRUJAN REDDY along with a dynamic QR code. Scan and transfer via Google Pay, PhonePe, Paytm, or any UPI app, then submit your 12-digit UPI Transaction ID (UTR) to confirm your order.',
  },
  {
    q: 'Do you offer Cash on Delivery (COD)?',
    a: 'Yes! Cash on Delivery is available for eligible addresses across India. Payment is collected in cash by the delivery courier upon arrival.',
  },
  {
    q: 'What is the Mystery Sticker Pack?',
    a: 'The Mystery Pack gives you 6 stickers for ₹129: 5 guaranteed stickers from your chosen theme (Anime, Marvel, Cars & Bikes, Gaming, Cute, Devotion, Sports, or Movies) plus 1 surprise mystery sticker chosen by our team.',
  },
  {
    q: 'Can I personalize Secret Message stickers?',
    a: 'Yes! Every Secret Message sticker includes a wax-sealed envelope card. You can enter your own custom message during checkout or in our interactive builder to surprise a friend, or receive our curated secret quote.',
  },
  {
    q: 'Do your stickers peel off cleanly without residue?',
    a: 'Yes. Our stickers use premium removable vinyl adhesive. You can peel and reposition them on laptops, phone cases, water bottles, and glass cleanly with zero sticky glue residue.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Orders are printed, precision cut, and packed within 1-2 business days. Delivery across major metro cities in India typically takes 3-5 business days. You can track your order status live from your Pixwora account.',
  },
];

export function FaqPage() {
  usePageMeta('FAQ', 'Answers to common questions about our stickers, ordering and delivery.');
  return (
    <Page title="Questions, answered." crumb="FAQ">
      <div className="divide-y-2 divide-ink/10 border-y-2 border-ink/10">
        {faqs.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-extrabold">
              {f.q}
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-ink-soft">{f.a}</p>
          </details>
        ))}
      </div>
    </Page>
  );
}

export function ContactPage() {
  usePageMeta('Contact', `How to reach ${brand.displayName}.`);
  const { email, instagramUrl, instagramHandle } = brand.contact;
  const wa = whatsappLink('Hi! I found your sticker store.');
  return (
    <Page title="Say hi." crumb="Contact" intro="Questions, design requests, feedback on prices — we want to hear all of it.">
      {hasAnyContact() ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {instagramUrl && (
            <li>
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white p-5 font-bold hover:bg-lime">
                <LuInstagram aria-hidden className="size-6" /> {instagramHandle ?? 'Instagram'}
              </a>
            </li>
          )}
          {wa && (
            <li>
              <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white p-5 font-bold hover:bg-lime">
                <LuMessageCircle aria-hidden className="size-6" /> WhatsApp
              </a>
            </li>
          )}
          {email && (
            <li>
              <a href={`mailto:${email}`} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white p-5 font-bold hover:bg-lime">
                <LuMail aria-hidden className="size-6" /> {email}
              </a>
            </li>
          )}
        </ul>
      ) : (
        <Notice>
          <p className="font-bold">Contact details aren’t set up yet.</p>
          <p className="mt-1">
            <Placeholder>Founders: add an email, Instagram or WhatsApp number in src/config/brand.ts</Placeholder>
          </p>
        </Notice>
      )}
    </Page>
  );
}

const policies: Record<string, { title: string; points: string[]; placeholderNotice: string }> = {
  terms: {
    title: 'Terms of Service',
    points: [
      'Store operator information and user eligibility',
      'Pricing, payment terms (UPI and Cash on Delivery), and billing policies',
      'Order acceptance, dispatch, and delivery terms',
      'Intellectual property and ownership of original sticker and poster artwork',
      'Limitation of liability and local jurisdiction in Hyderabad, India',
    ],
    placeholderNotice: 'Founders: Replace this placeholder with your approved Terms of Service before public launch.',
  },
  privacy: {
    title: 'Privacy Policy',
    points: [
      'Customer personal data collected (name, email, delivery addresses, phone number)',
      'Secure storage in PostgreSQL and non-disclosure to unauthorized third parties',
      'Session token management and encryption of credentials',
      'Customer rights regarding data access, updates, and account deletion',
    ],
    placeholderNotice: 'Founders: Replace this placeholder with your approved Privacy Policy.',
  },
  shipping: {
    title: 'Shipping & Delivery Policy',
    points: [
      'Delivery coverage across Hyderabad local areas and pan-India shipping',
      'Standard dispatch times and delivery partner schedules',
      'Protective cardboard and bubble packaging for vinyl stickers and art posters',
      'Shipping fee calculations and delivery confirmation tracking',
    ],
    placeholderNotice: 'Founders: Replace this placeholder with your approved Shipping and Delivery terms.',
  },
  returns: {
    title: 'Refund & Cancellation Policy',
    points: [
      'Customer cancellation rights for orders in PENDING status prior to processing',
      'Guidelines for customized or personalized products once production begins',
      'Damaged in transit, defective or misprinted item replacement procedures',
      'Refund timelines for manual UPI payments and COD exceptions',
    ],
    placeholderNotice: 'Founders: Replace this placeholder with your approved Refund and Cancellation policy.',
  },
};

// Aliases for intuitive URL matching
policies['shipping-delivery'] = policies.shipping;
policies['refund'] = policies.returns;
policies['refund-cancellation'] = policies.returns;

export function PolicyPage({ slug: propSlug }: { slug?: string } = {}) {
  const params = useParams();
  const slug = propSlug ?? params.slug;
  const policy = policies[slug ?? ''];
  usePageMeta(policy ? policy.title : 'Policy not found');
  if (!policy) return <NotFoundPage />;
  return (
    <Page title={policy.title} crumb={policy.title}>
      <Notice tone="demo">
        <strong>[PLACEHOLDER FOR STORE OWNER]</strong> — {policy.placeholderNotice}
      </Notice>
      <p className="font-semibold text-ink">This policy section will detail:</p>
      <ul className="list-disc space-y-2.5 pl-6 text-ink-soft">
        {policy.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div className="mt-8 rounded-xl border border-dashed border-ink/20 p-4 text-xs text-ink-soft">
        <p className="font-bold text-ink">Owner Note:</p>
        <p className="mt-1">
          To finalize this policy, replace this placeholder with your verified legal copy. No arbitrary policies,
          phone numbers or unconfirmed delivery terms are assumed by the system.
        </p>
      </div>
    </Page>
  );
}

export function NotFoundPage() {
  usePageMeta('Page not found');
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <EmptyState
        title="This page came unstuck."
        body="The link might be old, or the page doesn’t exist."
        action={
          <Link to="/" className="btn-primary">
            Go home
          </Link>
        }
      />
    </div>
  );
}

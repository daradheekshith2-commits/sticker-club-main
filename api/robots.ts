export default function handler(_req: any, res: any) {
  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /account
Disallow: /account/
Disallow: /checkout
Disallow: /checkout/
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /api/

# Search and AI Crawlers
User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: https://www.pixwora.store/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  res.status(200).send(robots);
}

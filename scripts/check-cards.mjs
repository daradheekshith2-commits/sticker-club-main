import { chromium } from 'playwright';

async function checkProducts() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://sticker-club-main.vercel.app/');
  await page.waitForTimeout(3000);

  // Check what products are rendered in the Featured stickers row
  const cardData = await page.$$eval('section:has-text("Start small") article', articles => {
    return articles.map(art => {
      const title = art.querySelector('h3, h2')?.innerText?.trim();
      const img = art.querySelector('img');
      const svg = art.querySelector('svg');
      return {
        title,
        hasImg: !!img,
        imgSrc: img ? img.src : null,
        hasSvg: !!svg,
        svgLabel: svg ? svg.getAttribute('aria-label') : null,
      };
    });
  });

  console.log('Cards in "Start small. Collect them all.":', cardData);

  await browser.close();
}
checkProducts();

import { chromium } from 'playwright';

async function inspectProductObject() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('https://sticker-club-main.vercel.app/');
  await page.waitForTimeout(3000);

  const productData = await page.evaluate(() => {
    // Look at React internal fiber or fetch the json directly
    const cards = Array.from(document.querySelectorAll('article'));
    return cards.map(c => {
      const h3 = c.querySelector('h3, h2')?.textContent?.trim();
      const img = c.querySelector('img');
      const svg = c.querySelector('svg');
      return {
        title: h3,
        hasImg: !!img,
        imgSrc: img?.getAttribute('src'),
        hasSvg: !!svg
      };
    });
  });

  console.log('Product cards on page:', productData.slice(0, 8));

  // Now let's fetch what Supabase or API returns in the browser
  const catalogueFetchResult = await page.evaluate(async () => {
    try {
      const res = await fetch('/products-catalogue.json');
      const data = await res.json();
      const first = data[0];
      return {
        status: res.status,
        dataLength: data.length,
        firstSample: {
          id: first.id,
          name: first.name,
          images: first.images
        }
      };
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('Catalogue fetch in browser:', catalogueFetchResult);

  await browser.close();
}

inspectProductObject();

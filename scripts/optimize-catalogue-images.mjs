import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const DIRS = [
  { path: 'public/PNG', maxWidth: 600, maxHeight: 600 },
  { path: 'public/Stickers', maxWidth: 600, maxHeight: 600 },
  { path: 'public/Poster', maxWidth: 600, maxHeight: 850 },
  { path: 'public/hero-stickers', maxWidth: 350, maxHeight: 350 },
];

function getAllImages(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllImages(full));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        results.push(full);
      }
    }
  }
  return results;
}

async function optimizeAll() {
  console.log('Scanning directories for unoptimized images...');
  let totalTasks = [];
  for (const item of DIRS) {
    const images = getAllImages(item.path);
    for (const img of images) {
      totalTasks.push({ file: img, maxWidth: item.maxWidth, maxHeight: item.maxHeight });
    }
  }

  console.log(`Found ${totalTasks.length} total source images across folders.`);

  // Filter tasks that need conversion
  const pending = totalTasks.filter((t) => {
    const parsed = path.parse(t.file);
    const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);
    if (!fs.existsSync(webpPath)) return true;
    const webpStat = fs.statSync(webpPath);
    const srcStat = fs.statSync(t.file);
    return webpStat.size === 0 || webpStat.mtimeMs < srcStat.mtimeMs;
  });

  console.log(`Pending conversions: ${pending.length} files.`);
  if (pending.length === 0) {
    console.log('All images are already optimized to WebP!');
    return;
  }

  const concurrency = 16;
  let completed = 0;
  let totalOrigBytes = 0;
  let totalWebpBytes = 0;
  const startTime = Date.now();

  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (task) => {
        const parsed = path.parse(task.file);
        const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);
        try {
          const origSize = fs.statSync(task.file).size;
          totalOrigBytes += origSize;

          await sharp(task.file)
            .resize(task.maxWidth, task.maxHeight, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({ quality: 82, effort: 4 })
            .toFile(webpPath);

          const webpSize = fs.statSync(webpPath).size;
          totalWebpBytes += webpSize;
          completed++;
        } catch (err) {
          console.error(`\nFailed to convert ${task.file}:`, err.message);
        }
      })
    );

    const percent = Math.round((completed / pending.length) * 100);
    process.stdout.write(`\rConverted ${completed} / ${pending.length} images (${percent}%)...`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const origMb = (totalOrigBytes / 1024 / 1024).toFixed(1);
  const webpMb = (totalWebpBytes / 1024 / 1024).toFixed(1);
  const savings = totalOrigBytes > 0 ? (((totalOrigBytes - totalWebpBytes) / totalOrigBytes) * 100).toFixed(1) : 0;

  console.log(`\n\nOptimization complete in ${duration}s!`);
  console.log(`Original size: ${origMb} MB`);
  console.log(`WebP size:     ${webpMb} MB`);
  console.log(`Bandwidth saved: ${savings}% reduction!`);
}

optimizeAll().catch((err) => {
  console.error('Fatal optimization error:', err);
  process.exit(1);
});

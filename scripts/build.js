/**
 * scripts/build.js
 * Builds the static production site into _site/
 * Runs with `npm run build`.
 */

const fs = require('fs');
const path = require('path');
const { renderPage } = require('./render.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, '_site');

function copyRecursive(src, dest, filterFn) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    const base = path.basename(src);
    if (base === 'node_modules' || base === '.git' || base === '.cache') return;

    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      if (child === 'node_modules' || child === '.git') return;
      const srcChild = path.join(src, child);
      const destChild = path.join(dest, child);
      if (!filterFn || filterFn(srcChild)) {
        copyRecursive(srcChild, destChild, filterFn);
      }
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function build() {
  console.log('Building site into _site/...');
  const startTime = Date.now();

  if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1. Render index.html
  const indexHtml = await renderPage('index.html');
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml, 'utf-8');
  console.log('  ✔ Rendered _site/index.html');

  // 1b. Render Blog Posts
  const postsDir = path.join(ROOT_DIR, '_posts');
  if (fs.existsSync(postsDir)) {
    const postsOutDir = path.join(OUT_DIR, 'posts');
    fs.mkdirSync(postsOutDir, { recursive: true });
    const postFiles = fs.readdirSync(postsDir);
    for (const file of postFiles) {
      if (file.endsWith('.md') || file.endsWith('.html')) {
        const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.(md|html)$/, '');
        try {
          const postHtml = await renderPage(path.join('_posts', file));
          const postSubDir = path.join(postsOutDir, slug);
          fs.mkdirSync(postSubDir, { recursive: true });
          fs.writeFileSync(path.join(postSubDir, 'index.html'), postHtml, 'utf-8');
          fs.writeFileSync(path.join(postsOutDir, `${slug}.html`), postHtml, 'utf-8');
          console.log(`  ✔ Rendered _site/posts/${slug}/index.html`);
        } catch (err) {
          console.warn(`  ⚠ Warning: failed rendering post ${file}: ${err.message}`);
        }
      }
    }
  }

  // 2. Copy 404.html
  const custom404 = path.join(ROOT_DIR, '404.html');
  if (fs.existsSync(custom404)) {
    fs.copyFileSync(custom404, path.join(OUT_DIR, '404.html'));
    console.log('  ✔ Copied _site/404.html');
  }

  // 3. Copy assets/
  const assetsDir = path.join(ROOT_DIR, 'assets');
  if (fs.existsSync(assetsDir)) {
    copyRecursive(assetsDir, path.join(OUT_DIR, 'assets'));
    console.log('  ✔ Copied _site/assets/');
  }

  // 4. Copy IMAGINE/ (excluding node_modules)
  const imagineDir = path.join(ROOT_DIR, 'IMAGINE');
  if (fs.existsSync(imagineDir)) {
    copyRecursive(imagineDir, path.join(OUT_DIR, 'IMAGINE'), (p) => !p.includes('node_modules'));
    console.log('  ✔ Copied _site/IMAGINE/');
  }

  // 5. Copy CV PDF if present
  const cvPdf = path.join(ROOT_DIR, 'Guillermo_Sahonero_CV.pdf');
  if (fs.existsSync(cvPdf)) {
    fs.copyFileSync(cvPdf, path.join(OUT_DIR, 'Guillermo_Sahonero_CV.pdf'));
    console.log('  ✔ Copied _site/Guillermo_Sahonero_CV.pdf');
  }

  const duration = Date.now() - startTime;
  console.log(`\nBuild completed in ${duration}ms. Output directory: _site/\n`);
}

if (require.main === module) {
  build().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}

module.exports = { build };

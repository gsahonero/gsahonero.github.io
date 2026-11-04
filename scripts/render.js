/**
 * scripts/render.js
 * Pure Node.js Liquid template renderer compatible with Jekyll.
 * Renders Jekyll layouts (_layouts), includes, and _data without needing Ruby/Gem.
 */

const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');
const yaml = require('js-yaml');

const ROOT_DIR = path.resolve(__dirname, '..');

// Helper to parse YAML front matter (supporting nested objects and arrays)
function parseFrontMatter(content) {
  if (!content.startsWith('---')) {
    return { data: {}, body: content };
  }

  const endIdx = content.indexOf('\n---', 3);
  if (endIdx === -1) {
    return { data: {}, body: content };
  }

  const yamlBlock = content.slice(3, endIdx).trim();
  const body = content.slice(endIdx + 4).trim();
  let data = {};
  try {
    data = yaml.load(yamlBlock) || {};
  } catch (err) {
    console.warn(`[render] YAML parse error: ${err.message}`);
  }

  return { data, body };
}

// Load site data from _data/*.json
function loadSiteData() {
  const dataDir = path.join(ROOT_DIR, '_data');
  const data = {};
  if (fs.existsSync(dataDir)) {
    fs.readdirSync(dataDir).forEach(file => {
      if (file.endsWith('.json')) {
        const key = path.basename(file, '.json');
        try {
          const raw = fs.readFileSync(path.join(dataDir, file), 'utf-8');
          data[key] = JSON.parse(raw);
        } catch (err) {
          console.warn(`[render] Warning: failed to parse ${file}: ${err.message}`);
        }
      }
    });
  }
  return data;
}

// Load site posts from _posts
function loadSitePosts() {
  const postsDir = path.join(ROOT_DIR, '_posts');
  const posts = [];
  if (fs.existsSync(postsDir)) {
    fs.readdirSync(postsDir).forEach(file => {
      if (file.endsWith('.md') || file.endsWith('.html')) {
        const full = path.join(postsDir, file);
        const raw = fs.readFileSync(full, 'utf-8');
        const { data, body } = parseFrontMatter(raw);
        const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.(md|html)$/, '');
        const url = data.permalink || `/posts/${slug}/`;
        posts.push({
          layout: 'post',
          ...data,
          filename: file,
          slug,
          url,
          body
        });
      }
    });
  }

  // Sort posts newest first (descending date)
  posts.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  return posts;
}

// Build Liquid engine
function createEngine() {
  const engine = new Liquid({
    root: [ROOT_DIR, path.join(ROOT_DIR, '_layouts'), path.join(ROOT_DIR, '_includes')],
    partials: [path.join(ROOT_DIR, '_includes'), path.join(ROOT_DIR, '_layouts')],
    extname: '.html',
    cache: false,
    dynamicPartials: true
  });

  // Register jekyll-seo-tag equivalent
  engine.registerTag('seo', {
    render: function (ctx, emitter) {
      emitter.write(
        '<meta name="description" content="MRI Researcher, Software Developer & Educator.">\n' +
        '<meta property="og:title" content="Guillermo Sahonero">\n' +
        '<meta property="og:type" content="website">\n'
      );
    }
  });

  // Register slice filter if not present
  engine.registerFilter('slice', (v, start, len) => {
    if (typeof v === 'string' || Array.isArray(v)) {
      return v.slice(start, start + len);
    }
    return v;
  });

  return engine;
}

// Render a template file (e.g. index.html) with layouts and context
async function renderPage(fileRelPath, extraContext = {}) {
  const filePath = path.join(ROOT_DIR, fileRelPath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data: pageData, body: pageBody } = parseFrontMatter(raw);

  const posts = loadSitePosts();
  const tagsMap = {};
  const allTags = [];
  posts.forEach(post => {
    if (post.published !== false && Array.isArray(post.tags)) {
      post.tags.forEach(tag => {
        const cleanTag = String(tag).trim();
        if (!tagsMap[cleanTag]) {
          tagsMap[cleanTag] = [];
          allTags.push(cleanTag);
        }
        tagsMap[cleanTag].push(post);
      });
    }
  });

  const site = {
    title: 'Guillermo Sahonero',
    description: 'PhD Candidate at UC Chile | MRI Researcher & Biomedical Engineer',
    url: 'https://gsahonero.github.io',
    baseurl: '',
    data: loadSiteData(),
    posts: posts,
    tags: tagsMap,
    all_tags: allTags,
    ...extraContext.site
  };

  const context = {
    site,
    page: { ...pageData, ...extraContext.page },
    ...extraContext
  };

  const engine = createEngine();

  // Step 1: Render page body
  const renderedContent = await engine.parseAndRender(pageBody, context);

  // Step 2: Render layout if specified
  if (pageData.layout) {
    const layoutPath = path.join(ROOT_DIR, '_layouts', `${pageData.layout}.html`);
    if (fs.existsSync(layoutPath)) {
      const layoutRaw = fs.readFileSync(layoutPath, 'utf-8');
      const { body: layoutBody } = parseFrontMatter(layoutRaw);
      const layoutContext = {
        ...context,
        content: renderedContent
      };
      return await engine.parseAndRender(layoutBody, layoutContext);
    }
  }

  return renderedContent;
}

module.exports = {
  renderPage,
  loadSiteData,
  loadSitePosts,
  parseFrontMatter
};

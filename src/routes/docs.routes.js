const { Router } = require('express');
const path = require('path');
const fs = require('fs');

const router = Router();

const DOCS_DIR = path.resolve(__dirname, '../../docs');
const DOC_FILES = ['API.md', 'WEBSOCKET.md', 'SETUP.md', 'DEPLOYMENT.md', 'SECURITY.md'];

router.get('/', (req, res) => {
  res.json({
    success: true,
    documentation: DOC_FILES.map((f) => ({
      name: f.replace('.md', ''),
      url: `/api/v1/docs/${f.replace('.md', '').toLowerCase()}`,
      file: f,
    })),
    note: 'Documentation is served as raw Markdown. Use a Markdown viewer or API client.',
  });
});

router.get('/:name', (req, res) => {
  const name = req.params.name.toLowerCase();
  const match = DOC_FILES.find((f) => f.replace('.md', '').toLowerCase() === name);

  if (!match) {
    return res.status(404).json({
      error: true,
      message: `Document '${name}' not found. Available: ${DOC_FILES.map((f) => f.replace('.md', '')).join(', ')}`,
    });
  }

  const filePath = path.join(DOCS_DIR, match);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: true, message: 'Document file not found' });
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  res.type('text/markdown').send(content);
});

module.exports = router;

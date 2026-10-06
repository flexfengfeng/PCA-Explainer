import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
// Behind Cloud Run container reverse proxy (Nginx on port 8080), this app must listen on 3000
const port = process.env.PORT && process.env.PORT !== '8080' ? parseInt(process.env.PORT, 10) : 3000;
const host = '0.0.0.0';

app.use(express.json());

// Health check endpoint for Cloud Run
app.get(['/healthz', '/api/health'], (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const distPath = path.resolve(import.meta.dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('*', (_req, res) => {
    res.status(200).send('<!DOCTYPE html><html><body><h1>Application Initializing</h1><p>Please refresh in a few seconds.</p></body></html>');
  });
}

const server = app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

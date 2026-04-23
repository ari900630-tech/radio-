import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import http from "http";
import https from "https";

// Force disable any environment proxies that might interfere
delete process.env.http_proxy;
delete process.env.HTTP_PROXY;
delete process.env.https_proxy;
delete process.env.HTTPS_PROXY;
delete process.env.ALL_PROXY;
delete process.env.all_proxy;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RADIO_MIRRORS = [
  "https://de1.api.radio-browser.info/json",
  "https://at1.api.radio-browser.info/json",
  "https://nl1.api.radio-browser.info/json"
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy route with mirror fallback
  app.get("/api/proxy/*", async (req, res) => {
    const subPath = req.params[0];
    let lastError = null;

    for (const mirror of RADIO_MIRRORS) {
      try {
        const targetUrl = `${mirror}/${subPath}`;
        console.log(`[Proxy] Attempting: ${targetUrl}`);
        
        const response = await axios.get(targetUrl, { 
          params: req.query,
          timeout: 10000,
          headers: {
            'User-Agent': 'CyberRadioGlobal/1.0 (ari900630@gmail.com)'
          },
          httpAgent: new http.Agent({ insecureHTTPParser: true, keepAlive: true } as any),
          httpsAgent: new https.Agent({ insecureHTTPParser: true, keepAlive: true, rejectUnauthorized: false } as any),
          proxy: false
        });
        
        return res.json(response.data);
      } catch (error: any) {
        console.warn(`[Proxy] Mirror ${mirror} failed: ${error.message}`);
        lastError = error;
        // Continue to next mirror
      }
    }

    console.error(`[Proxy] All mirrors failed for ${subPath}`);
    res.status(500).json({ 
      error: "Radio database synchronization failed", 
      details: lastError?.message 
    });
  });

  // Audio Stream Proxy to bypass Mixed Content and CORS
  app.get("/api/stream", async (req, res) => {
    const streamUrl = req.query.url as string;
    if (!streamUrl) return res.status(400).send("No URL provided");

    const fetchStream = async (url: string, useBrowserHeaders: boolean) => {
      const targetUrl = new URL(url);
      const headers: any = useBrowserHeaders ? {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'Icy-MetaData': '1',
        'Referer': 'https://www.google.com/',
        'Origin': targetUrl.origin,
        'Connection': 'keep-alive'
      } : {
        'User-Agent': 'Mozilla/5.0', // Legacy/Simple UA for older servers
        'Icy-MetaData': '1',
        'Accept': '*/*',
        'Range': 'bytes=0-'
      };

      return axios({
        method: 'get',
        url,
        params: req.query, // Pass any additional params if present
        responseType: 'stream',
        timeout: 30000,
        headers,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
        httpAgent: new http.Agent({ insecureHTTPParser: true, keepAlive: true } as any),
        httpsAgent: new https.Agent({ insecureHTTPParser: true, keepAlive: true, rejectUnauthorized: false } as any),
        proxy: false
      });
    };

    try {
      console.log(`[Stream Proxy] Requesting: ${streamUrl}`);
      
      let response;
      try {
        // First attempt: Browser-like headers
        response = await fetchStream(streamUrl, true);
      } catch (firstError: any) {
        const status = firstError.response?.status;
        if (status === 401 || status === 403 || status === 400) {
          console.warn(`[Stream Proxy] First attempt failed (${status}), retrying with legacy headers...`);
          // Second attempt: Minimal legacy headers
          response = await fetchStream(streamUrl, false);
        } else {
          throw firstError;
        }
      }

      // Forward relevant headers
      const contentType = response.headers['content-type'] || 'audio/mpeg';
      res.setHeader('Content-Type', contentType);
      
      if (response.headers['icy-metaint']) {
        res.setHeader('icy-metaint', response.headers['icy-metaint']);
      }
      if (response.headers['icy-name']) {
        res.setHeader('icy-name', response.headers['icy-name']);
      }
      
      response.data.pipe(res);

      req.on('close', () => {
        response.data.destroy();
      });

    } catch (error: any) {
      const statusCode = error.response?.status || 500;
      console.error(`[Stream Proxy] Failed for ${streamUrl}: ${error.message} (Status: ${statusCode})`);
      res.status(statusCode).send(`Stream connection failed: ${error.message}`);
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "CyberRadio Backend" });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CyberRadio] Server running on http://localhost:${PORT}`);
  });
}

startServer();

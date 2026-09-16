import express from 'express';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';

// Load environment variables
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("ERRORE: TELEGRAM_TOKEN o TELEGRAM_CHAT_ID mancanti nelle variabili d'ambiente.");
  process.exit(1);
}

// 1. Start a temporary Express Server to serve the static dashboard
const app = express();
app.use(express.static(__dirname));

const port = process.env.PORT || 3000;
const server = app.listen(port, async () => {
  const localUrl = `http://localhost:${port}`;
  console.log(`Server locale avviato su ${localUrl}`);

  // 2. Initialize Telegram Bot in Simple Mode (NO Polling, just to send message)
  const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

  let browser = null;
  try {
    console.log("Avvio generazione PDF in corso...");
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1000, height: 1200, deviceScaleFactor: 2 });
    
    // Pass ?mode=pdf to activate the PDF layout
    await page.goto(`${localUrl}?mode=pdf`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });

    await bot.sendDocument(TELEGRAM_CHAT_ID, pdfBuffer, {
      caption: "🌅 Buongiorno! Ecco il tuo report automatico giornaliero di Mareggia."
    }, {
      filename: 'bollettino_mareggia.pdf',
      contentType: 'application/pdf'
    });
    
    console.log(`✅ Bollettino inviato con successo!`);
  } catch (e) {
    console.error("Errore durante la generazione del bollettino:", e);
  } finally {
    if (browser) {
      await browser.close();
    }
    server.close();
    process.exit(0); // Ferma lo script, GitHub Action terminata con successo
  }
});

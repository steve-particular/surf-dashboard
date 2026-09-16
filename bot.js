import express from 'express';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';

// Load environment variables
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Il tuo ID personale per il report automatico

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!TELEGRAM_TOKEN) {
  console.error("ERRORE: TELEGRAM_TOKEN mancante nelle variabili d'ambiente.");
  process.exit(1);
}

// 1. Start a persistent Express Server to serve the static dashboard
const app = express();
app.use(express.static(__dirname));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  const localUrl = `http://localhost:${port}`;
  console.log(`Server locale avviato su ${localUrl}`);

  // 2. Initialize Telegram Bot in Polling Mode
  const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  console.log("Bot Telegram avviato e in ascolto...");

  // Funzione riutilizzabile per generare e inviare il PDF
  async function generateAndSendPDF(chatId, messageText = '🌊 Ecco il tuo bollettino del mare in tempo reale!') {
    let browser = null;
    try {
      bot.sendMessage(chatId, "⏳ Generazione del bollettino surf in corso...");
      
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      await page.setViewport({ width: 1000, height: 1200, deviceScaleFactor: 2 });
      console.log(`Generazione PDF per chat ${chatId}...`);
      
      // Pass ?mode=pdf to activate the PDF layout
      await page.goto(`${localUrl}?mode=pdf`, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
      });

      await bot.sendDocument(chatId, pdfBuffer, {
        caption: messageText
      }, {
        filename: 'bollettino_mareggia.pdf',
        contentType: 'application/pdf'
      });
      
      console.log(`✅ Bollettino inviato con successo a ${chatId}.`);
    } catch (e) {
      console.error("Errore durante la generazione del bollettino:", e);
      bot.sendMessage(chatId, "❌ Ops! Si è verificato un errore durante la generazione del bollettino.");
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Handle /bollettino command (Richiesta on-demand da chiunque)
  bot.onText(/\/(start|bollettino)/, (msg) => {
    generateAndSendPDF(msg.chat.id);
  });

  // 3. Ripristina il Report Automatico Mattutino (Cron Job interno)
  if (TELEGRAM_CHAT_ID) {
    // Esegue ogni giorno alle 06:00
    cron.schedule('0 6 * * *', () => {
      console.log("⏰ Esecuzione report automatico mattutino!");
      generateAndSendPDF(TELEGRAM_CHAT_ID, "🌅 Buongiorno! Ecco il tuo report automatico giornaliero di Mareggia.");
    });
    console.log(`Cron job impostato per inviare il report automatico a: ${TELEGRAM_CHAT_ID}`);
  } else {
    console.log("⚠️ TELEGRAM_CHAT_ID non impostato: il report automatico giornaliero è disattivato.");
  }
  
  bot.on('polling_error', (error) => {
    console.error("Polling error:", error);
  });
});

import express from 'express';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startBot() {
  if (!TELEGRAM_TOKEN) {
    console.error("ERRORE: TELEGRAM_TOKEN mancante nelle variabili d'ambiente.");
    process.exit(1);
  }

  // If no chat ID is provided, try to fetch the latest message to find the Chat ID
  if (!TELEGRAM_CHAT_ID) {
    console.log("TELEGRAM_CHAT_ID non fornito. Provo a recuperarlo dagli ultimi messaggi inviati al bot...");
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`);
      const data = await res.json();
      if (data.ok && data.result.length > 0) {
        const lastMessage = data.result[data.result.length - 1];
        const chatId = lastMessage.message?.chat?.id;
        if (chatId) {
          console.log(`\n✅ HO TROVATO IL TUO CHAT ID: ${chatId}`);
          console.log(`Inserisci questo valore come variabile TELEGRAM_CHAT_ID e riavvia lo script.\n`);
          process.exit(0);
        }
      }
      console.log("\n❌ Nessun messaggio trovato. Per favore invia un messaggio al tuo bot su Telegram (es. 'Ciao') e poi riavvia questo script.\n");
      process.exit(1);
    } catch (e) {
      console.error("Errore nel recupero degli updates da Telegram:", e);
      process.exit(1);
    }
  }

  console.log("Avvio generazione report PDF...");

  // 1. Start temporary Express Server to serve the static dashboard
  const app = express();
  app.use(express.static(__dirname));
  
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const localUrl = `http://localhost:${port}`;
    console.log(`Server temporaneo avviato su ${localUrl}`);

    try {
      // 2. Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      // Set viewport for a nice desktop layout screenshot
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
      
      console.log("Apertura dashboard nel browser invisibile...");
      await page.goto(localUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // Add a slight delay to ensure the Open-Meteo API data is fully rendered on the DOM
      await new Promise(r => setTimeout(r, 2000));

      console.log("Creazione PDF in corso...");
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
      });
      
      await browser.close();

      // 3. Send via Telegram
      console.log("Invio PDF su Telegram...");
      
      // Using native fetch with FormData for multipart/form-data upload
      const formData = new FormData();
      formData.append('chat_id', TELEGRAM_CHAT_ID);
      formData.append('caption', '🌊 Ecco il tuo report surf mattutino di Mareggia!');
      
      // We must pass the buffer as a Blob/File object in native fetch
      const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('document', pdfBlob, 'mareggia_report.pdf');

      const sendRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`, {
        method: 'POST',
        body: formData
      });

      const sendData = await sendRes.json();
      if (sendData.ok) {
        console.log("✅ Report inviato con successo!");
      } else {
        console.error("❌ Errore nell'invio del report:", sendData);
      }

    } catch (e) {
      console.error("Errore durante l'esecuzione del bot:", e);
    } finally {
      // Clean up server
      server.close();
      console.log("Processo terminato.");
      process.exit(0);
    }
  });
}

startBot();

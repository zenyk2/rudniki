/**
 * Rudniki Telegram Bot — минимальный бот для WebApp
 * Запуск: node bot.js
 */

const BOT_TOKEN = process.env.BOT_TOKEN || '8631959892:AAFbU3elE01qPjiOv1lx0dVGzqr4ZXtuGGI';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://zenyk2.github.io/rudniki/rudniki-v8.0.html';

const https = require('https');

function tgApi(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Polling loop
let offset = 0;

async function poll() {
  try {
    const res = await tgApi('getUpdates', { offset, timeout: 30 });
    if (res.ok && res.result) {
      for (const upd of res.result) {
        offset = upd.update_id + 1;
        await handleUpdate(upd);
      }
    }
  } catch(e) {
    console.error('Poll error:', e.message);
    await new Promise(r => setTimeout(r, 3000));
  }
  poll();
}

async function handleUpdate(upd) {
  if (!upd.message) return;
  const msg = upd.message;
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  if (text === '/start' || text.startsWith('/start ')) {
    // Extract referral code if present: /start ref_MINEXXX
    const ref = text.split(' ')[1] || '';

    await tgApi('sendMessage', {
      chat_id: chatId,
      text: '⛏️ *Welcome to RUDNIKI!*\n\nTap the button below to start mining!',
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          {
            text: '⛏️ Play RUDNIKI',
            web_app: { url: WEBAPP_URL + (ref ? '?ref=' + ref : '') }
          }
        ]]
      }
    });

    console.log(`/start from ${msg.from.first_name} (${msg.from.id})${ref ? ' ref=' + ref : ''}`);
  }
}

// Set bot menu button to WebApp
async function setupBot() {
  // Set menu button
  await tgApi('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'Play',
      web_app: { url: WEBAPP_URL }
    }
  });

  // Set bot description
  await tgApi('setMyDescription', {
    description: 'Mine ore, hire workers, upgrade equipment and compete in tournaments!'
  });

  // Set bot short description
  await tgApi('setMyShortDescription', {
    short_description: 'Idle mining game in Telegram'
  });

  const me = await tgApi('getMe', {});
  console.log(`Bot ready: @${me.result?.username}`);
  console.log(`WebApp URL: ${WEBAPP_URL}`);
}

setupBot().then(poll).catch(console.error);

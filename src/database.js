const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('webhook.db');
const crypto = require('crypto');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS webhook_config (
    id INTEGER PRIMARY KEY,
    webhook_id TEXT,
    secure_token TEXT
  )`);
});

function saveWebhookConfig(webhookId, secureToken) {
  return new Promise((resolve, reject) => {
    db.run('INSERT OR REPLACE INTO webhook_config (id, webhook_id, secure_token) VALUES (1, ?, ?)', 
      [webhookId, secureToken], 
      (err) => {
        if (err) reject(err);
        else resolve();
    });
  });
}

function getWebhookConfig() {
  return new Promise((resolve, reject) => {
    db.get('SELECT webhook_id, secure_token FROM webhook_config WHERE id = 1', (err, row) => {
      if (err) reject(err);
      else resolve(row || { webhook_id: null, secure_token: crypto.randomBytes(32).toString('hex') });
    });
  });
}

module.exports = {
  saveWebhookConfig,
  getWebhookConfig
};
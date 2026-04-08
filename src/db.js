const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.budget-cli', 'budget.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'checking',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    note TEXT,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    external_id TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
  CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id);
`);

module.exports = db;
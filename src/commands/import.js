const fs = require('fs');
const db = require('../db');
const chalk = require('chalk');

async function run(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`Error: File "${filePath}" not found.`));
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length < 2) {
    console.error(chalk.red('Error: CSV file is empty or has no data rows.'));
    process.exit(1);
  }

  const header = lines[0].toLowerCase();
  const expectedHeaders = ['date', 'account', 'category', 'amount', 'note'];
  const headers = header.split(',').map(h => h.trim().replace(/"/g, ''));

  for (const expected of expectedHeaders) {
    if (!headers.includes(expected)) {
      console.error(chalk.red(`Error: Missing required column: ${expected}`));
      process.exit(1);
    }
  }

  const dateIdx = headers.indexOf('date');
  const accountIdx = headers.indexOf('account');
  const categoryIdx = headers.indexOf('category');
  const amountIdx = headers.indexOf('amount');
  const noteIdx = headers.indexOf('note');

  let imported = 0;
  let skipped = 0;

  const insertStmt = db.prepare(`
    INSERT INTO transactions (account_id, amount, category, note, date, external_id)
    SELECT ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM transactions
      WHERE external_id = ? AND date = ? AND amount = ? AND category = ?
    )
  `);

  const transaction = db.transaction(() => {
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 4) continue;

      const date = values[dateIdx]?.trim();
      const accountName = values[accountIdx]?.trim();
      const category = values[categoryIdx]?.trim();
      const amount = parseFloat(values[amountIdx]) * 100; // Convert to cents
      const note = values[noteIdx]?.trim() || null;

      if (!date || !accountName || !category || isNaN(amount)) {
        console.log(chalk.yellow(`Warning: Skipping invalid row ${i + 1}`));
        continue;
      }

      // Get account ID
      const account = db.prepare('SELECT id FROM accounts WHERE name = ?').get(accountName);
      if (!account) {
        console.log(chalk.yellow(`Warning: Skipping row ${i + 1} - account "${accountName}" not found`));
        continue;
      }

      const externalId = `import-${date}-${accountName}-${amount}-${category}`;

      // Check for duplicates
      const existing = db.prepare(`
        SELECT id FROM transactions
        WHERE external_id = ? OR (date = ? AND account_id = ? AND amount = ? AND category = ?)
      `).get(externalId, date, account.id, amount, category);

      if (existing) {
        skipped++;
        continue;
      }

      insertStmt.run(account.id, amount, category, note, date, externalId, externalId, date, amount, category);
      imported++;
    }
  });

  transaction();

  console.log(chalk.green(`Import complete: ${imported} new transactions added, ${skipped} duplicates skipped.`));
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

module.exports = { run };
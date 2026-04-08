const fs = require('fs');
const db = require('../db');
const chalk = require('chalk');

async function run({ format, month, out }) {
  if (format !== 'csv') {
    console.error(chalk.red(`Error: Format "${format}" not supported. Only CSV is supported.`));
    process.exit(1);
  }

  let query = `
    SELECT t.date, a.name as account, t.category, t.amount, t.note
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE 1=1
  `;
  const params = [];

  if (month) {
    query += ' AND t.date LIKE ?';
    params.push(`${month}%`);
  }

  query += ' ORDER BY t.date DESC, t.id DESC';

  const transactions = db.prepare(query).all(...params);

  if (transactions.length === 0) {
    console.log('No transactions to export.');
    return;
  }

  // Build CSV
  const headers = ['date', 'account', 'category', 'amount', 'note'];
  const rows = [headers.join(',')];

  transactions.forEach(tx => {
    const amountDollars = tx.amount / 100;
    const row = [
      tx.date,
      escapeCSV(tx.account),
      escapeCSV(tx.category),
      amountDollars.toFixed(2),
      escapeCSV(tx.note || '')
    ];
    rows.push(row.join(','));
  });

  const csv = rows.join('\n');

  if (out) {
    fs.writeFileSync(out, csv);
    console.log(chalk.green(`Exported ${transactions.length} transactions to "${out}"`));
  } else {
    console.log(csv);
  }
}

function escapeCSV(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

module.exports = { run };
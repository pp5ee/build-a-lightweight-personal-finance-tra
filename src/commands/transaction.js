const db = require('../db');
const chalk = require('chalk');

function formatAmount(cents) {
  const isNegative = cents < 0;
  const dollars = Math.abs(cents) / 100;
  const formatted = `$${dollars.toFixed(2)}`;
  return isNegative ? chalk.red(`-${formatted}`) : chalk.green(`+${formatted}`);
}

async function add({ account: accountName, amount, category, note, date }) {
  // Get account ID
  const account = db.prepare('SELECT id FROM accounts WHERE name = ?').get(accountName);
  if (!account) {
    console.error(chalk.red(`Error: Account "${accountName}" not found.`));
    process.exit(1);
  }

  // Amount is provided as dollars, convert to cents for storage
  const amountInCents = Math.round(parseFloat(amount) * 100);

  const stmt = db.prepare(`
    INSERT INTO transactions (account_id, amount, category, note, date)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(account.id, amountInCents, category, note || null, date);

  const type = amountInCents >= 0 ? 'income' : 'expense';
  console.log(chalk.green(`Transaction added (ID: ${result.lastInsertRowid}, ${type})`));
}

async function list({ account: accountName, month, category }) {
  let query = `
    SELECT t.id, t.amount, t.category, t.note, t.date, a.name as account_name
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE 1=1
  `;
  const params = [];

  if (accountName) {
    query += ' AND a.name = ?';
    params.push(accountName);
  }
  if (month) {
    query += ' AND t.date LIKE ?';
    params.push(`${month}%`);
  }
  if (category) {
    query += ' AND t.category = ?';
    params.push(category);
  }

  query += ' ORDER BY t.date DESC, t.id DESC';

  const transactions = db.prepare(query).all(...params);

  if (transactions.length === 0) {
    console.log('No transactions found.');
    return;
  }

  // Sort by ID ascending for running balance calculation
  const sortedTx = [...transactions].sort((a, b) => a.id - b.id);

  let runningBalance = 0;
  sortedTx.forEach(tx => {
    runningBalance += tx.amount;
  });

  console.log('\nTransactions:');
  console.log('-'.repeat(80));
  console.log('ID    Date       Account      Category    Amount      Note');
  console.log('-'.repeat(80));

  transactions.forEach(tx => {
    const noteDisplay = tx.note || '-';
    console.log(
      `${tx.id.toString().padEnd(5)} ${tx.date} ${tx.account_name.padEnd(12)} ${tx.category.padEnd(11)} ${formatAmount(tx.amount).padEnd(12)} ${noteDisplay.substring(0, 20)}`
    );
  });

  console.log('-'.repeat(80));
  console.log(`Running balance: ${formatAmount(runningBalance)}`);
}

async function remove(id) {
  const tx = db.prepare('SELECT id FROM transactions WHERE id = ?').get(id);
  if (!tx) {
    console.error(chalk.red(`Error: Transaction ${id} not found.`));
    process.exit(1);
  }

  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  console.log(chalk.green(`Transaction ${id} deleted successfully.`));
}

module.exports = { add, list, remove };
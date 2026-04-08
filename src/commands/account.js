const db = require('../db');
const chalk = require('chalk');

function formatAmount(cents) {
  const isNegative = cents < 0;
  const dollars = Math.abs(cents) / 100;
  const formatted = `$${dollars.toFixed(2)}`;
  return isNegative ? chalk.red(formatted) : chalk.green(formatted);
}

async function add(name, type) {
  try {
    const stmt = db.prepare('INSERT INTO accounts (name, type) VALUES (?, ?)');
    const result = stmt.run(name, type);
    console.log(chalk.green(`Account "${name}" created successfully (ID: ${result.lastInsertRowid})`));
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      console.error(chalk.red(`Error: Account "${name}" already exists.`));
      process.exit(1);
    }
    throw err;
  }
}

async function list() {
  const accounts = db.prepare(`
    SELECT a.id, a.name, a.type, a.created_at,
           COALESCE(SUM(t.amount), 0) as balance
    FROM accounts a
    LEFT JOIN transactions t ON a.id = t.account_id
    GROUP BY a.id
    ORDER BY a.name
  `).all();

  if (accounts.length === 0) {
    console.log('No accounts found.');
    return;
  }

  console.log('\nAccounts:');
  console.log('-'.repeat(60));
  accounts.forEach(acc => {
    console.log(`${acc.name} (${acc.type})`);
    console.log(`  Balance: ${formatAmount(acc.balance)}`);
    console.log(`  ID: ${acc.id}`);
  });
  console.log('-'.repeat(60));
}

async function remove(name) {
  // Check if account has transactions
  const account = db.prepare('SELECT id FROM accounts WHERE name = ?').get(name);
  if (!account) {
    console.error(chalk.red(`Error: Account "${name}" not found.`));
    process.exit(1);
  }

  const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE account_id = ?').get(account.id);
  if (txCount.count > 0) {
    console.error(chalk.red(`Error: Cannot delete account "${name}" because it has ${txCount.count} transaction(s). Delete the transactions first or move them to another account.`));
    process.exit(1);
  }

  db.prepare('DELETE FROM accounts WHERE name = ?').run(name);
  console.log(chalk.green(`Account "${name}" deleted successfully.`));
}

module.exports = { add, list, remove };
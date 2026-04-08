const db = require('../db');
const chalk = require('chalk');

function formatAmount(cents) {
  const isNegative = cents < 0;
  const dollars = Math.abs(cents) / 100;
  const formatted = `$${dollars.toFixed(2)}`;
  return isNegative ? chalk.red(formatted) : chalk.green(formatted);
}

async function show({ month, all }) {
  let dateFilter = '';
  const params = [];

  if (!all && month) {
    dateFilter = "WHERE t.date LIKE ?";
    params.push(`${month}%`);
  } else if (!all && !month) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    dateFilter = "WHERE t.date LIKE ?";
    params.push(`${currentMonth}%`);
  }

  // Get totals
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN amount >= 0 THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0) as total_expense,
      COALESCE(SUM(amount), 0) as net_savings
    FROM transactions t
    ${dateFilter}
  `).get(...params);

  // Get per-category breakdown
  const categories = db.prepare(`
    SELECT category,
           SUM(CASE WHEN amount >= 0 THEN amount ELSE 0 END) as income,
           SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as expense
    FROM transactions t
    ${dateFilter}
    GROUP BY category
    ORDER BY expense ASC, income DESC
  `).all(...params);

  const period = all ? 'All Time' : (month || new Date().toISOString().substring(0, 7));

  console.log(`\n=== Summary: ${period} ===\n`);
  console.log(`Total Income:   ${formatAmount(totals.total_income)}`);
  console.log(`Total Expense:  ${formatAmount(totals.total_expense)}`);
  console.log(`Net Savings:    ${formatAmount(totals.net_savings)}`);

  if (categories.length > 0) {
    console.log('\n--- By Category ---');
    categories.forEach(cat => {
      if (cat.income > 0) {
        console.log(`${cat.category}: ${formatAmount(cat.income)} income`);
      }
      if (cat.expense < 0) {
        console.log(`${cat.category}: ${formatAmount(cat.expense)} expense`);
      }
    });
  }

  console.log('');
}

module.exports = { show };
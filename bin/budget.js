#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const account = require('../src/commands/account');
const transaction = require('../src/commands/transaction');
const summary = require('../src/commands/summary');
const importCmd = require('../src/commands/import');
const exportCmd = require('../src/commands/export');

// Global error handler
process.on('uncaughtException', (err) => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});

// Create main program
const program = new Command();

program
  .name('budget')
  .description('A lightweight personal finance tracker CLI')
  .version('1.0.0');

// Account subcommands
const accountCmd = new Command('account');
accountCmd
  .description('Manage accounts');

accountCmd
  .command('add')
  .description('Add a new account')
  .argument('<name>', 'Account name')
  .option('-t, --type <type>', 'Account type', 'checking')
  .action(async (name, options) => {
    await account.add(name, options.type);
  });

accountCmd
  .command('list')
  .description('List all accounts')
  .action(async () => {
    await account.list();
  });

accountCmd
  .command('delete')
  .description('Delete an account')
  .argument('<name>', 'Account name')
  .action(async (name) => {
    await account.remove(name);
  });

// Transaction subcommands
const txCmd = new Command('tx');
txCmd
  .description('Manage transactions');

txCmd
  .command('add')
  .description('Add a transaction')
  .requiredOption('-a, --account <name>', 'Account name')
  .requiredOption('-A, --amount <amount>', 'Amount (positive=income, negative=expense)')
  .requiredOption('-c, --category <category>', 'Category')
  .option('-n, --note <note>', 'Note')
  .option('-d, --date <date>', 'Date (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .action(async (options) => {
    await transaction.add({
      account: options.account,
      amount: parseInt(options.amount),
      category: options.category,
      note: options.note,
      date: options.date
    });
  });

txCmd
  .command('list')
  .description('List transactions')
  .option('-a, --account <name>', 'Filter by account')
  .option('-m, --month <month>', 'Filter by month (YYYY-MM)')
  .option('-c, --category <category>', 'Filter by category')
  .action(async (options) => {
    await transaction.list({
      account: options.account,
      month: options.month,
      category: options.category
    });
  });

txCmd
  .command('delete')
  .description('Delete a transaction')
  .argument('<id>', 'Transaction ID')
  .action(async (id) => {
    await transaction.remove(id);
  });

// Add subcommands to main program
program.addCommand(accountCmd);
program.addCommand(txCmd);

// Summary command
program
  .command('summary')
  .description('Show financial summary')
  .option('-m, --month <month>', 'Month (YYYY-MM)')
  .option('-a, --all', 'Show lifetime summary')
  .action(async (options) => {
    await summary.show({
      month: options.month,
      all: options.all
    });
  });

// Import command
program
  .command('import')
  .description('Import transactions from CSV')
  .requiredOption('-f, --file <file>', 'CSV file path')
  .action(async (options) => {
    await importCmd.run(options.file);
  });

// Export command
program
  .command('export')
  .description('Export transactions to CSV')
  .option('-f, --format <format>', 'Export format', 'csv')
  .option('-m, --month <month>', 'Month to export (YYYY-MM)')
  .option('-o, --out <file>', 'Output file')
  .action(async (options) => {
    await exportCmd.run({
      format: options.format,
      month: options.month,
      out: options.out
    });
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('Error: Unknown command. Run "budget --help" for usage.'));
  process.exit(1);
});

program.parse(process.argv);
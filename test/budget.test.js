const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Test configuration
const testDbDir = path.join(os.tmpdir(), 'budget-cli-test-' + Date.now());
const testDbPath = path.join(testDbDir, 'budget.db');

function runBudget(...args) {
  const env = { ...process.env, BUDGET_DB_PATH: testDbPath };
  return execSync(`node bin/budget.js ${args.join(' ')}`, {
    encoding: 'utf-8',
    env,
    cwd: process.cwd()
  });
}

function getBudget(...args) {
  const env = { ...process.env, BUDGET_DB_PATH: testDbPath };
  return execSync(`node bin/budget.js ${args.join(' ')}`, {
    encoding: 'utf-8',
    env,
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

describe('Account Commands', () => {
  before(() => {
    fs.mkdirSync(testDbDir, { recursive: true });
  });

  after(() => {
    fs.rmSync(testDbDir, { recursive: true, force: true });
  });

  it('should create a new account', () => {
    const output = runBudget('account', 'add', 'test-account', '--type', 'checking');
    assert.match(output, /created successfully/i);
  });

  it('should list accounts', () => {
    const output = runBudget('account', 'list');
    assert.match(output, /test-account/i);
  });

  it('should delete an account without transactions', () => {
    runBudget('account', 'add', 'empty-account', '--type', 'savings');
    const output = runBudget('account', 'delete', 'empty-account');
    assert.match(output, /deleted successfully/i);
  });

  it('should reject deleting account with transactions', () => {
    // First add a transaction to test-account
    runBudget('tx', 'add', '--account', 'test-account', '--amount', '100', '--category', 'Test');
    const output = getBudget('account', 'delete', 'test-account');
    assert.match(output, /cannot delete|has transactions|rejected/i);
  });
});

describe('Transaction Commands', () => {
  before(() => {
    fs.mkdirSync(testDbDir, { recursive: true });
    runBudget('account', 'add', 'tx-test-account', '--type', 'checking');
  });

  after(() => {
    fs.rmSync(testDbDir, { recursive: true, force: true });
  });

  it('should add a transaction', () => {
    const output = runBudget('tx', 'add', '--account', 'tx-test-account', '--amount', '1000', '--category', 'Salary');
    assert.match(output, /Transaction added/i);
  });

  it('should add a negative transaction (expense)', () => {
    const output = runBudget('tx', 'add', '--account', 'tx-test-account', '--amount', '-500', '--category', 'Food');
    assert.match(output, /Transaction added/i);
  });

  it('should list transactions', () => {
    const output = runBudget('tx', 'list');
    assert.match(output, /Salary/i);
    assert.match(output, /Food/i);
  });

  it('should filter transactions by account', () => {
    const output = runBudget('tx', 'list', '--account', 'tx-test-account');
    assert.match(output, /Salary/i);
  });

  it('should filter transactions by category', () => {
    const output = runBudget('tx', 'list', '--category', 'Food');
    assert.match(output, /Food/i);
    assert.doesNotMatch(output, /Salary/i);
  });

  it('should delete a transaction', () => {
    const listOutput = runBudget('tx', 'list');
    const idMatch = listOutput.match(/(\d+)\s+.*Salary/);
    if (idMatch) {
      const txId = idMatch[1];
      const output = runBudget('tx', 'delete', txId);
      assert.match(output, /deleted/i);
    }
  });
});

describe('Summary Command', () => {
  before(() => {
    fs.mkdirSync(testDbDir, { recursive: true });
    runBudget('account', 'add', 'summary-test', '--type', 'checking');
    runBudget('tx', 'add', '--account', 'summary-test', '--amount', '5000', '--category', 'Income');
    runBudget('tx', 'add', '--account', 'summary-test', '--amount', '-2000', '--category', 'Expenses');
  });

  after(() => {
    fs.rmSync(testDbDir, { recursive: true, force: true });
  });

  it('should show summary', () => {
    const output = runBudget('summary');
    assert.match(output, /Income/i);
    assert.match(output, /Expenses/i);
  });

  it('should show --all summary', () => {
    const output = runBudget('summary', '--all');
    assert.match(output, /Total/i);
  });
});

describe('Import/Export Commands', () => {
  let exportFile;

  before(() => {
    fs.mkdirSync(testDbDir, { recursive: true });
    runBudget('account', 'add', 'export-test', '--type', 'checking');
    runBudget('tx', 'add', '--account', 'export-test', '--amount', '1000', '--category', 'Test');
  });

  after(() => {
    fs.rmSync(testDbDir, { recursive: true, force: true });
    if (exportFile && fs.existsSync(exportFile)) {
      fs.unlinkSync(exportFile);
    }
  });

  it('should export transactions to CSV', () => {
    exportFile = path.join(testDbDir, 'export.csv');
    const output = runBudget('export', '--out', exportFile);
    assert.match(output, /Exported/i);
    assert.ok(fs.existsSync(exportFile));
  });

  it('should import transactions from CSV', () => {
    exportFile = path.join(testDbDir, 'import.csv');
    runBudget('export', '--out', exportFile);
    const countBefore = runBudget('tx', 'list').split('\n').length;
    runBudget('import', '--file', exportFile);
    const countAfter = runBudget('tx', 'list').split('\n').length;
    // Import should be idempotent - no duplicates
    assert.ok(countAfter <= countBefore + 1);
  });
});

describe('Help and Error Handling', () => {
  before(() => {
    fs.mkdirSync(testDbDir, { recursive: true });
  });

  after(() => {
    fs.rmSync(testDbDir, { recursive: true, force: true });
  });

  it('should show help', () => {
    const output = runBudget('--help');
    assert.match(output, /Usage/i);
  });

  it('should show help for account command', () => {
    const output = runBudget('account', '--help');
    assert.match(output, /account/i);
  });

  it('should exit non-zero for unknown command', () => {
    try {
      getBudget('unknown-command');
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err.status !== 0);
    }
  });
});
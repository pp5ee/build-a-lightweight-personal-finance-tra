# budget-cli

A lightweight personal finance tracker for the command line. Track income and expenses across multiple accounts, generate monthly summaries, and import/export your data — all stored locally in a SQLite database.

## Prerequisites

- **Node.js** v18 or later
- **npm** v8 or later

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd budget-cli

# Install dependencies
npm install

# Make the CLI globally available
npm link
```

After `npm link` the `budget` command is available from any directory.

## Project Structure

```
budget-cli/
├── bin/
│   └── budget.js        # CLI entry point (shebang)
├── src/
│   ├── db.js            # SQLite connection & schema init
│   ├── accounts.js      # Account CRUD logic
│   ├── transactions.js  # Transaction CRUD logic
│   ├── summary.js       # Summary/report logic
│   └── importexport.js  # CSV import/export logic
├── test/
│   └── *.test.js        # Unit and integration tests
├── package.json
└── README.md
```

## Database Schema

The SQLite database is stored at `~/.budget-cli/budget.db` and is created automatically on first run.

### `accounts` table

| Column      | Type    | Description                                 |
|-------------|---------|---------------------------------------------|
| `id`        | INTEGER | Primary key (auto-increment)                |
| `name`      | TEXT    | Unique account name                         |
| `type`      | TEXT    | Account type: `checking`, `savings`, `cash` |
| `created_at`| TEXT    | ISO-8601 creation timestamp                 |

### `transactions` table

| Column      | Type    | Description                                             |
|-------------|---------|---------------------------------------------------------|
| `id`        | INTEGER | Primary key (auto-increment)                            |
| `account_id`| INTEGER | Foreign key → `accounts.id`                             |
| `amount`    | INTEGER | Amount **in cents** (positive = income, negative = expense) |
| `category`  | TEXT    | Category label (e.g. `groceries`, `salary`)             |
| `note`      | TEXT    | Optional free-text description                          |
| `date`      | TEXT    | Transaction date (`YYYY-MM-DD`)                         |
| `hash`      | TEXT    | Unique hash for idempotent CSV import                   |
| `created_at`| TEXT    | ISO-8601 creation timestamp                             |

> **Amounts are stored as integers (cents)** to avoid floating-point precision issues. `$12.34` is stored as `1234`.

## Usage

### Global help

```bash
budget --help
```

---

### Account Management

#### Add an account

```bash
# Create a checking account (default type)
budget account add Checking

# Specify an account type
budget account add Savings --type savings
budget account add Wallet  --type cash
```

#### List all accounts

```bash
budget account list
```

Example output:

```
Name       Type       Balance
─────────────────────────────
Checking   checking   $2,450.00
Savings    savings    $8,000.00
Wallet     cash       $40.00
```

#### Delete an account

```bash
budget account delete Wallet
```

> An account that has transactions cannot be deleted. Remove or reassign its transactions first.

---

### Transaction Recording

#### Add a transaction

```bash
# Record an expense (negative amount)
budget tx add --account Checking --amount -45.50 --category groceries

# Record income (positive amount)
budget tx add --account Checking --amount 3000 --category salary

# With an optional note and explicit date
budget tx add --account Checking --amount -12.99 --category subscriptions \
  --note "Netflix" --date 2026-04-01
```

- **Positive amount** → income (displayed in green)
- **Negative amount** → expense (displayed in red)
- `--date` defaults to today if omitted

#### List transactions

```bash
# All transactions
budget tx list

# Filter by account
budget tx list --account Checking

# Filter by month
budget tx list --month 2026-04

# Filter by category
budget tx list --category groceries

# Combine filters
budget tx list --account Checking --month 2026-04 --category groceries
```

Example output:

```
ID  Date        Account   Category      Amount     Note           Balance
───────────────────────────────────────────────────────────────────────────
 1  2026-04-01  Checking  salary        +$3,000.00                $3,000.00
 2  2026-04-03  Checking  groceries       -$45.50                 $2,954.50
 3  2026-04-05  Checking  subscriptions   -$12.99  Netflix        $2,941.51
```

#### Delete a transaction

```bash
budget tx delete 3
```

---

### Summary & Reports

#### Monthly summary (defaults to current month)

```bash
budget summary

# Specific month
budget summary --month 2026-03
```

Example output:

```
Summary for 2026-04
───────────────────────────
Total Income:   +$3,000.00
Total Expenses:   -$225.75
Net Savings:    +$2,774.25

Category Breakdown
──────────────────
salary          +$3,000.00
groceries         -$135.00
subscriptions     -$25.98
dining            -$64.77
```

#### Lifetime summary (all accounts, all time)

```bash
budget summary --all
```

---

### Import / Export

#### Export transactions to CSV

```bash
# Export all transactions
budget export --format csv --out transactions.csv

# Export a specific month
budget export --format csv --month 2026-04 --out april-2026.csv
```

The CSV file contains the columns:
`id`, `date`, `account`, `amount`, `category`, `note`

#### Import transactions from CSV

```bash
budget import --file april-2026.csv
```

- Import is **idempotent**: re-running the same file will not create duplicate transactions.
- Rows already present in the database are silently skipped.

---

## Configuration

The database path defaults to `~/.budget-cli/budget.db`. Override it with the environment variable:

```bash
BUDGET_DB=/path/to/custom.db budget account list
```

---

## Development

```bash
# Run tests
npm test

# Run a single test file
npx jest test/accounts.test.js
```

## License

MIT

# Implementation Plan

## Goal
Build a lightweight personal finance tracker CLI called `budget-cli` using Node.js. The tool helps users track income and expenses stored in a local SQLite database (using better-sqlite3).

## Core Features

### 1. Account Management
- `budget account add <name> [--type checking|savings|cash]` — create a named account
- `budget account list` — list all accounts with current balance
- `budget account delete <name>` — remove an account (reject if it has transactions)

### 2. Transaction Recording
- `budget tx add --account <name> --amount <number> --category <cat> [--note <text>] [--date YYYY-MM-DD]`
  - Positive amount = income, negative = expense
  - Default date is today
- `budget tx list [--account <name>] [--month YYYY-MM] [--category <cat>]` — filtered transaction list with running balance
- `budget tx delete <id>` — remove a transaction by ID

### 3. Summary & Reports
- `budget summary [--month YYYY-MM]` — show total income, total expense, net savings, and per-category breakdown for the period
- `budget summary --all` — lifetime summary across all accounts

### 4. Data Portability
- `budget export --format csv [--month YYYY-MM] --out <file>` — export transactions to CSV
- `budget import --file <csv>` — import transactions from a compatible CSV (idempotent, skip duplicates)

## Technical Requirements
- SQLite persistence via `better-sqlite3`
- Commander.js for CLI argument parsing
- Chalk for colored output (amounts: green for income, red for expense)
- All monetary amounts stored as integers (cents) to avoid float precision issues
- Proper error messages with non-zero exit codes on failure
- `npm link` installable with `#!/usr/bin/env node` shebang
- Include a `README.md` with installation, usage examples, and database schema

## Acceptance Criteria
- AC-1: Account CRUD works; deleting an account with transactions is rejected with a clear error
- AC-2: Transaction add/list/delete works; listing supports all three filters independently and combined
- AC-3: Amounts stored as cents; display formatted as $X.XX with correct sign
- AC-4: Summary command shows correct totals and per-category breakdown for a given month
- AC-5: Export produces valid CSV; import is idempotent (re-importing the same CSV adds no duplicates)
- AC-6: `budget --help` and per-command help work; unknown commands exit non-zero
- AC-7: npm link installable; all commands work from any directory
- AC-8: README.md present at project root with usage examples

## Acceptance Criteria

- AC-1: The primary feature described in the requirement is implemented and working
- AC-2: Code is tested and passes all tests
- AC-3: Documentation is updated

## Implementation Tasks

### Phase 1: Analysis & Setup
- task1: Analyze the requirement and set up project structure

### Phase 2: Implementation
- task2: Implement the core functionality
- task3: Write tests

### Phase 3: Documentation & Cleanup
- task4: Update documentation and clean up code

# Security Specification: WalletWisely Firestore Access Control

## 1. Data Invariants
1. **User Identity Invariant**: A user can only read, write, or modify their own profile, transactions, budgets, and import batches where `userId == request.auth.uid` and path variable `{userId} == request.auth.uid`.
2. **Path Hardening Invariant**: All document ID path variables (`userId`, `transactionId`, `budgetId`, `batchId`) must satisfy `isValidId(id)` (alphanumeric, dashes, underscores, max length 128) to prevent ID injection.
3. **Immutability Invariant**: Critical identity attributes (`userId`, `createdAt`) cannot be altered post-creation on update.
4. **Denial-of-Wallet & Volumetric Invariant**: All incoming text payloads have explicit length boundaries (e.g. description <= 500 chars, merchant <= 150 chars, tags array <= 20 items with item length <= 50 chars).
5. **Type and Enum Integrity**: Transaction amounts must be non-negative numbers, types must belong to `['expense', 'income', 'transfer']`, and months must be between 1 and 12.
6. **Query Enforcer Invariant**: Every `allow list` block evaluates `resource.data.userId == request.auth.uid` to prevent unauthorized cross-tenant collection scraping.
7. **Zero Blanket Invariant**: Default deny catch-all `match /{document=**} { allow read, write: if false; }` at root.

---

## 2. The "Dirty Dozen" Payloads

### Payload 1: Identity Spoofing (Impersonation on Transaction Create)
- Target: `/transactions/tx_spoof_1`
- Attempt: Authenticated user `alice_uid` submits a transaction with `userId: "bob_uid"`.
- Expected: `PERMISSION_DENIED`

### Payload 2: Cross-User Profile Read
- Target: `/users/bob_uid`
- Attempt: Authenticated user `alice_uid` attempts `get` or `list` on Bob's user profile.
- Expected: `PERMISSION_DENIED`

### Payload 3: Shadow Update (Ghost Field Injection)
- Target: `/transactions/tx_101`
- Attempt: User `alice_uid` tries to update her transaction but injects an unapproved administrative ghost field `{"role": "admin", "isSuperUser": true}`.
- Expected: `PERMISSION_DENIED`

### Payload 4: Resource Poisoning (1MB String Attack)
- Target: `/transactions/tx_102`
- Attempt: User `alice_uid` sends description containing 1,000,000 repetitive characters to exhaust bandwidth.
- Expected: `PERMISSION_DENIED` (fails max length <= 500 check)

### Payload 5: Path Variable ID Poisoning
- Target: `/transactions/../../../system/keys` or invalid characters `tx$$%##@@!!`
- Attempt: Malformed document ID injected in document path.
- Expected: `PERMISSION_DENIED` (fails `isValidId()` regex guard)

### Payload 6: Negative Transaction Amount Bypass
- Target: `/transactions/tx_103`
- Attempt: Sending negative amount `amount: -5000` to manipulate balance totals.
- Expected: `PERMISSION_DENIED` (fails `amount >= 0` check)

### Payload 7: Array Flooding (Unbounded Tags Array)
- Target: `/transactions/tx_104`
- Attempt: Submitting `tags` array with 5,000 elements.
- Expected: `PERMISSION_DENIED` (fails `tags.size() <= 20` check)

### Payload 8: Transaction Owner Modification (Tampering with Owner ID)
- Target: `/transactions/tx_105`
- Attempt: Existing transaction owned by Alice updated to change `userId: "eve_uid"`.
- Expected: `PERMISSION_DENIED` (immutability violated: `incoming().userId == existing().userId`)

### Payload 9: Creation Timestamp Forgery (Modifying Immutable createdAt)
- Target: `/transactions/tx_106`
- Attempt: User updates `createdAt` to falsify auditing history.
- Expected: `PERMISSION_DENIED`

### Payload 10: Unauthenticated Global Query / Anonymous Scraping
- Target: `/transactions`
- Attempt: Unauthenticated request attempting `list` or `get`.
- Expected: `PERMISSION_DENIED`

### Payload 11: Budget Month Out of Bounds
- Target: `/budgets/b_101`
- Attempt: Submitting budget with `month: 13` or `month: -1`.
- Expected: `PERMISSION_DENIED`

### Payload 12: Bank Batch Spoofing (Cross-Tenant Batch Creation)
- Target: `/bank_import_batches/batch_999`
- Attempt: Alice tries creating an import batch in Bob's name `userId: "bob_uid"`.
- Expected: `PERMISSION_DENIED`

---

## 3. The Test Runner: firestore.rules.test.ts
A test suite verifying all 12 payloads fail with PERMISSION_DENIED.

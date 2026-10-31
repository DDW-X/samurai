# Security Specification — KAMI NO WASHI: BLADE OF THE INK

## 1. Data Invariants & Master Source of Truth
1. **Master Gate & Relational Ownership**:
   - `/users/{userId}` is the Master Source of Truth for a player's profile. A `/users/{userId}` document can only be read, created, updated, or deleted by the authenticated, email-verified user whose `request.auth.uid == userId` and `data.ownerUid == request.auth.uid`.
   - `/users/{userId}/runs/{runId}` is a subcollection of `/users/{userId}`. Every operation on `/users/{userId}/runs/{runId}` requires verifying the parent `/users/{userId}` document exists and belongs to `request.auth.uid` via `get(/databases/$(database)/documents/users/$(userId)).data.ownerUid == request.auth.uid`.
2. **Strict Schema & Volumetric Bounds**:
   - All document IDs (`userId`, `runId`) must satisfy `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
   - All string fields must enforce explicit `.size()` bounds matching `firebase-blueprint.json`.
   - Shadow fields are strictly prohibited via `.keys().hasAll(...)` and `.keys().hasOnly(...)`.
3. **Temporal & Identity Immutability**:
   - `createdAt` must equal `request.time` on `create` and remain immutable (`incoming().createdAt == existing().createdAt`) on `update`.
   - `updatedAt` must equal `request.time` on both `create` and `update`.
   - `ownerUid` must equal `request.auth.uid` and remain immutable on `update`.
4. **Terminal State Locking**:
   - Once a `CombatRunRecord` reaches `status == 'completed'`, no further updates are permitted (`existing().status != 'completed'`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Identity Spoofing on Profile Create)**: Authenticated user `uid_attacker` creates `/users/uid_victim` or sets `ownerUid: "uid_victim"`. -> `PERMISSION_DENIED`
2. **Payload 2 (Unverified Email Write)**: Authenticated user with `email_verified: false` attempts to create `/users/uid_unverified`. -> `PERMISSION_DENIED`
3. **Payload 3 (Shadow Field Injection on Create)**: User sends valid `SamuraiProfile` plus `"isAdmin": true`. -> `PERMISSION_DENIED`
4. **Payload 4 (Shadow Field Injection on Update)**: User updates `/users/uid_1` with an unauthorized key `"hackedKoku": 999999`. -> `PERMISSION_DENIED`
5. **Payload 5 (Value Poisoning on Whitelisted Key)**: User updates `bestScore` with a string `"one_million"` or negative number `-50`. -> `PERMISSION_DENIED`
6. **Payload 6 (Resource Exhaustion / String Overflow)**: User sets `displayName` to a 5,000-character string (`> 64`). -> `PERMISSION_DENIED`
7. **Payload 7 (ID Poisoning Attack)**: User creates `/users/uid_1/runs/invalid$id!with@spaces`. -> `PERMISSION_DENIED`
8. **Payload 8 (Orphaned Subcollection Write)**: User creates `/users/uid_1/runs/run_1` when parent `/users/uid_1` does not exist. -> `PERMISSION_DENIED`
9. **Payload 9 (Cross-Tenant PII/Profile Read)**: Authenticated user `uid_attacker` attempts `get` or `list` on `/users/uid_victim`. -> `PERMISSION_DENIED`
10. **Payload 10 (Client Timestamp Forgery)**: User creates a profile with a forged past/future `createdAt` timestamp (`createdAt != request.time`). -> `PERMISSION_DENIED`
11. **Payload 11 (Immortal Field Mutation)**: User updates `/users/uid_1` and modifies `createdAt` or `ownerUid`. -> `PERMISSION_DENIED`
12. **Payload 12 (Terminal State Bypass)**: User attempts to update `/users/uid_1/runs/run_1` after `status` is already `'completed'`. -> `PERMISSION_DENIED`

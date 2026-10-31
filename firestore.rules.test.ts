import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesSource = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

test('Dirty Dozen Security Rules Audit: enforces all 8 pillars of hardened ABAC rules', () => {
  // 1. Rules version 2 & Default Deny safety net
  assert.ok(rulesSource.includes("rules_version = '2';"));
  assert.ok(rulesSource.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));

  // 2. Verified Email & Identity Spoofing Guard
  assert.ok(rulesSource.includes('request.auth.token.email_verified == true'));
  assert.ok(rulesSource.includes('data.ownerUid == request.auth.uid'));

  // 3. Anti-Update-Gap & Shadow Field Prevention (hasAll + hasOnly + affectedKeys)
  assert.ok(rulesSource.includes('data.keys().hasAll(['));
  assert.ok(rulesSource.includes('data.keys().hasOnly(['));
  assert.ok(rulesSource.includes('incoming().diff(existing()).affectedKeys().hasOnly(['));

  // 4. Update blocks begin with isSignedIn() && isValid[Entity](incoming())
  assert.ok(rulesSource.includes('allow update: if isSignedIn() &&\n        isValidSamuraiProfile(incoming())'));
  assert.ok(rulesSource.includes('allow update: if isSignedIn() &&\n          isValidCombatRunRecord(incoming())'));

  // 5. ID Poisoning & Volumetric String Size Guards
  assert.ok(rulesSource.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"));
  assert.ok(rulesSource.includes('data.displayName.size() <= 64'));

  // 6. Temporal & Immortal Field Immutability
  assert.ok(rulesSource.includes('incoming().createdAt == request.time'));
  assert.ok(rulesSource.includes('incoming().createdAt == existing().createdAt'));
  assert.ok(rulesSource.includes('incoming().ownerUid == existing().ownerUid'));

  // 7. Master Gate Relational Parent Check & Terminal State Locking
  assert.ok(rulesSource.includes('get(/databases/$(database)/documents/users/$(userId)).data.ownerUid == request.auth.uid'));
  assert.ok(rulesSource.includes("existing().status != 'completed'"));

  // 8. Query Enforcer on allow list without O(n) get()
  assert.ok(rulesSource.includes('allow list: if isOwner(userId) &&\n          resource.data.ownerUid == request.auth.uid;'));

  // 9. Non-existent document get safety for initial profile bootstrap
  assert.ok(
    rulesSource.includes(
      'allow get: if isOwner(userId) && isValidId(userId) && (resource == null || existing().ownerUid == request.auth.uid);'
    )
  );
});

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

function initFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

setLogLevel('silent');

export const db = initFirestoreInstance();
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isTransientOfflineError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes('client is offline') ||
    msg.includes('unavailable') ||
    msg.includes('could not reach cloud firestore backend') ||
    msg.includes('network-request-failed')
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot as required by firebase-integration-rpc
export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (isTransientOfflineError(error)) {
      console.warn('Firestore operating in offline fallback mode; check network or Firebase configuration.');
    }
  }
}

testFirestoreConnection();

export interface SamuraiProfileDoc {
  ownerUid: string;
  displayName: string;
  bestScore: number;
  koku: number;
  highestUnlockedStage: number;
  primaryWeaponId: string;
  secondaryWeaponId: string;
  rangedWeaponId: string;
  armorId: string;
  helmetId: string;
}

const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function sanitizeId(raw: string, fallback: string, maxLen = 64): string {
  const trimmed = (raw || fallback).trim().slice(0, maxLen);
  return SAFE_ID_REGEX.test(trimmed) ? trimmed : fallback;
}

function sanitizeDisplayName(raw: string): string {
  const cleaned = (raw || 'Wandering Ronin').trim().slice(0, 64);
  return cleaned.length > 0 ? cleaned : 'Wandering Ronin';
}

export async function signInSamuraiWithGoogle(): Promise<User | null> {
  try {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    return cred.user;
  } catch (err) {
    console.warn('Google Sign-In cancelled or unavailable:', err);
    return null;
  }
}

export async function signOutSamurai(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
export type { User };

export async function syncSamuraiProfileToCloud(
  user: User,
  profile: Omit<SamuraiProfileDoc, 'ownerUid' | 'displayName'>
): Promise<void> {
  if (!user.emailVerified) return;
  const uid = sanitizeId(user.uid, '', 128);
  if (!uid) return;

  const userPath = `users/${uid}`;
  const docRef = doc(db, 'users', uid);

  const sanitizedPayload = {
    ownerUid: uid,
    displayName: sanitizeDisplayName(user.displayName || user.email?.split('@')[0] || 'Ronin'),
    bestScore: Math.max(0, Math.min(100000000, Math.round(profile.bestScore || 0))),
    koku: Math.max(0, Math.min(100000000, Math.round(profile.koku || 0))),
    highestUnlockedStage: Math.max(0, Math.min(9, Math.round(profile.highestUnlockedStage || 0))),
    primaryWeaponId: sanitizeId(profile.primaryWeaponId, 'uchigatana', 64),
    secondaryWeaponId: sanitizeId(profile.secondaryWeaponId, 'naginata', 64),
    rangedWeaponId: sanitizeId(profile.rangedWeaponId, 'daikyu', 64),
    armorId: sanitizeId(profile.armorId, 'ronin_haori', 64),
    helmetId: sanitizeId(profile.helmetId, 'suji_kabuto', 64),
  };

  let existingSnap;
  try {
    existingSnap = await getDoc(docRef);
  } catch (error) {
    if (isTransientOfflineError(error)) return;
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  try {
    if (!existingSnap.exists()) {
      await setDoc(docRef, {
        ...sanitizedPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        displayName: sanitizedPayload.displayName,
        bestScore: Math.max(existingSnap.data().bestScore || 0, sanitizedPayload.bestScore),
        koku: sanitizedPayload.koku,
        highestUnlockedStage: Math.max(
          existingSnap.data().highestUnlockedStage || 0,
          sanitizedPayload.highestUnlockedStage
        ),
        primaryWeaponId: sanitizedPayload.primaryWeaponId,
        secondaryWeaponId: sanitizedPayload.secondaryWeaponId,
        rangedWeaponId: sanitizedPayload.rangedWeaponId,
        armorId: sanitizedPayload.armorId,
        helmetId: sanitizedPayload.helmetId,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (isTransientOfflineError(error)) return;
    handleFirestoreError(
      error,
      existingSnap.exists() ? OperationType.UPDATE : OperationType.CREATE,
      userPath
    );
  }
}

export async function recordCombatRunToCloud(
  user: User,
  run: {
    stageIndex: number;
    score: number;
    weaponUsed: string;
    aiStance: string;
    status: 'active' | 'completed';
  }
): Promise<void> {
  if (!user.emailVerified) return;
  const uid = sanitizeId(user.uid, '', 128);
  if (!uid) return;
  const runId = `run_${Date.now()}`;
  const runPath = `users/${uid}/runs/${runId}`;

  try {
    await setDoc(doc(db, 'users', uid, 'runs', runId), {
      ownerUid: uid,
      stageIndex: Math.max(0, Math.min(9, Math.round(run.stageIndex))),
      score: Math.max(0, Math.min(100000000, Math.round(run.score))),
      weaponUsed: sanitizeId(run.weaponUsed, 'uchigatana', 64),
      aiStance: (run.aiStance || 'Balanced Chudan-no-Kamae').slice(0, 80),
      status: run.status === 'completed' ? 'completed' : 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (isTransientOfflineError(error)) return;
    handleFirestoreError(error, OperationType.CREATE, runPath);
  }
}

export function subscribeToSamuraiProfile(
  user: User,
  onProfile: (data: SamuraiProfileDoc) => void,
  onRuns?: (runs: Array<{ id: string; score: number; weaponUsed: string; aiStance: string }>) => void
): () => void {
  if (!user.emailVerified) return () => {};
  const uid = sanitizeId(user.uid, '', 128);
  if (!uid) return () => {};
  const userPath = `users/${uid}`;
  const unsubProfile = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (snap.exists()) {
        onProfile(snap.data() as SamuraiProfileDoc);
      }
    },
    (error) => {
      if (isTransientOfflineError(error)) return;
      handleFirestoreError(error, OperationType.GET, userPath);
    }
  );

  let unsubRuns = () => {};
  if (onRuns) {
    const runsPath = `users/${uid}/runs`;
    const runsQuery = query(
      collection(db, 'users', uid, 'runs'),
      where('ownerUid', '==', uid),
      orderBy('score', 'desc'),
      limit(5)
    );
    unsubRuns = onSnapshot(
      runsQuery,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          score: Number(d.data().score || 0),
          weaponUsed: String(d.data().weaponUsed || 'uchigatana'),
          aiStance: String(d.data().aiStance || 'Balanced Chudan-no-Kamae'),
        }));
        onRuns(items);
      },
      (error) => {
        if (isTransientOfflineError(error)) return;
        handleFirestoreError(error, OperationType.LIST, runsPath);
      }
    );
  }

  return () => {
    unsubProfile();
    unsubRuns();
  };
}

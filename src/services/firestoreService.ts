import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase";

export interface FirestoreTransaction {
  id: string;
  userId: string;
  amount: number;
  type: "expense" | "income" | "transfer";
  category: string;
  date: string;
  description: string;
  merchant?: string;
  paymentMethod?: string;
  referenceNo?: string;
  tags?: string[];
  source?: string;
  importBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreBudget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  month: number;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreBatchRecord {
  id: string;
  userId: string;
  fileName: string;
  bankName?: string;
  importedCount: number;
  duplicatesSkipped?: number;
  totalAmount?: number;
  importedAt: string;
}

export interface FirestoreUserProfile {
  userId: string;
  displayName: string;
  email?: string;
  monthlyBudgetGoal?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

// 1. Transactions Service
export async function createFirestoreTransaction(tx: FirestoreTransaction): Promise<void> {
  const path = `transactions/${tx.id}`;
  try {
    const docRef = doc(db, "transactions", tx.id);
    await setDoc(docRef, tx);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function batchCreateFirestoreTransactions(
  transactions: FirestoreTransaction[],
  batchRecord?: FirestoreBatchRecord
): Promise<void> {
  const path = "transactions";
  try {
    const batch = writeBatch(db);

    if (batchRecord) {
      const batchDocRef = doc(db, "bank_import_batches", batchRecord.id);
      batch.set(batchDocRef, batchRecord);
    }

    for (const tx of transactions) {
      const txDocRef = doc(db, "transactions", tx.id);
      batch.set(txDocRef, tx);
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateFirestoreTransaction(
  id: string,
  updates: Partial<Omit<FirestoreTransaction, "id" | "userId" | "createdAt">>
): Promise<void> {
  const path = `transactions/${id}`;
  try {
    const docRef = doc(db, "transactions", id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFirestoreTransaction(id: string): Promise<void> {
  const path = `transactions/${id}`;
  try {
    const docRef = doc(db, "transactions", id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchUserTransactions(userId: string): Promise<FirestoreTransaction[]> {
  const path = "transactions";
  try {
    const q = query(collection(db, "transactions"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const list: FirestoreTransaction[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as FirestoreTransaction);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// 2. User Profile Service
export async function syncUserProfile(profile: FirestoreUserProfile): Promise<void> {
  const path = `users/${profile.userId}`;
  try {
    const docRef = doc(db, "users", profile.userId);
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 3. Budgets Service
export async function upsertBudget(budget: FirestoreBudget): Promise<void> {
  const path = `budgets/${budget.id}`;
  try {
    const docRef = doc(db, "budgets", budget.id);
    await setDoc(docRef, budget, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

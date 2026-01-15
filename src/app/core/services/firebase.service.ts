import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  DocumentReference,
  CollectionReference,
  QueryConstraint
} from '@angular/fire/firestore';
import {
  Storage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject
} from '@angular/fire/storage';
import { Observable, from, map } from 'rxjs';
import {
  Universe,
  Character,
  CharacterSkill,
  HistoryEntry
} from '../models';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

  // ==================== UNIVERSES ====================

  getUniversesCollection(): CollectionReference {
    return collection(this.firestore, 'universes');
  }

  async getPublicUniverses(): Promise<Universe[]> {
    const q = query(
      this.getUniversesCollection(),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Universe[];
  }

  async getUserUniverses(userId: string): Promise<Universe[]> {
    const q = query(
      this.getUniversesCollection(),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Universe[];
  }

  async getUniverse(universeId: string): Promise<Universe | null> {
    const docRef = doc(this.firestore, 'universes', universeId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Universe;
    }
    return null;
  }

  async createUniverse(universe: Omit<Universe, 'id'>): Promise<string> {
    const docRef = await addDoc(this.getUniversesCollection(), {
      ...universe,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  }

  async updateUniverse(universeId: string, data: Partial<Universe>): Promise<void> {
    const docRef = doc(this.firestore, 'universes', universeId);
    await updateDoc(docRef, data);
  }

  async deleteUniverse(universeId: string): Promise<void> {
    const docRef = doc(this.firestore, 'universes', universeId);
    await deleteDoc(docRef);
  }

  // ==================== CHARACTERS ====================

  getCharactersCollection(userId: string): CollectionReference {
    return collection(this.firestore, 'users', userId, 'characters');
  }

  async getUserCharacters(userId: string): Promise<Character[]> {
    const q = query(
      this.getCharactersCollection(userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Character[];
  }

  async getCharacter(userId: string, characterId: string): Promise<Character | null> {
    const docRef = doc(this.firestore, 'users', userId, 'characters', characterId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Character;
    }
    return null;
  }

  async createCharacter(userId: string, character: Omit<Character, 'id'>): Promise<string> {
    const docRef = await addDoc(this.getCharactersCollection(userId), {
      ...character,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  async updateCharacter(userId: string, characterId: string, data: Partial<Character>): Promise<void> {
    const docRef = doc(this.firestore, 'users', userId, 'characters', characterId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  async deleteCharacter(userId: string, characterId: string): Promise<void> {
    const docRef = doc(this.firestore, 'users', userId, 'characters', characterId);
    await deleteDoc(docRef);
  }

  // ==================== SKILLS ====================

  getSkillsCollection(userId: string, characterId: string): CollectionReference {
    return collection(this.firestore, 'users', userId, 'characters', characterId, 'skills');
  }

  async getCharacterSkills(userId: string, characterId: string): Promise<CharacterSkill[]> {
    const q = query(
      this.getSkillsCollection(userId, characterId),
      orderBy('acquiredAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CharacterSkill[];
  }

  async addSkill(userId: string, characterId: string, skill: Omit<CharacterSkill, 'id'>): Promise<string> {
    const docRef = await addDoc(this.getSkillsCollection(userId, characterId), {
      ...skill,
      acquiredAt: serverTimestamp()
    });
    return docRef.id;
  }

  async updateSkill(userId: string, characterId: string, skillId: string, data: Partial<CharacterSkill>): Promise<void> {
    const docRef = doc(this.firestore, 'users', userId, 'characters', characterId, 'skills', skillId);
    await updateDoc(docRef, data);
  }

  async deleteSkill(userId: string, characterId: string, skillId: string): Promise<void> {
    const docRef = doc(this.firestore, 'users', userId, 'characters', characterId, 'skills', skillId);
    await deleteDoc(docRef);
  }

  // ==================== HISTORY ====================

  getHistoryCollection(userId: string, characterId: string): CollectionReference {
    return collection(this.firestore, 'users', userId, 'characters', characterId, 'history');
  }

  async getCharacterHistory(userId: string, characterId: string, maxEntries: number = 50): Promise<HistoryEntry[]> {
    const q = query(
      this.getHistoryCollection(userId, characterId),
      orderBy('timestamp', 'desc'),
      limit(maxEntries)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as HistoryEntry[];
  }

  async addHistoryEntry(userId: string, characterId: string, entry: Omit<HistoryEntry, 'id'>): Promise<string> {
    const docRef = await addDoc(this.getHistoryCollection(userId, characterId), {
      ...entry,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  }

  // ==================== STORAGE ====================

  async uploadAvatar(userId: string, characterId: string, imageBase64: string): Promise<string> {
    const storagePath = `avatars/${userId}/${characterId}.png`;
    const storageRef = ref(this.storage, storagePath);
    await uploadString(storageRef, imageBase64, 'data_url');
    return await getDownloadURL(storageRef);
  }

  async deleteAvatar(userId: string, characterId: string): Promise<void> {
    const storagePath = `avatars/${userId}/${characterId}.png`;
    const storageRef = ref(this.storage, storagePath);
    try {
      await deleteObject(storageRef);
    } catch {
      // Ignore if avatar doesn't exist
    }
  }

  async uploadSharedCard(shareId: string, imageBase64: string): Promise<string> {
    const storagePath = `shared/${shareId}.png`;
    const storageRef = ref(this.storage, storagePath);
    await uploadString(storageRef, imageBase64, 'data_url');
    return await getDownloadURL(storageRef);
  }

  // ==================== SHARE TOKENS ====================

  async createShareToken(
    userId: string,
    characterId: string,
    downloadUrl: string,
    expirationMinutes: number = 60
  ): Promise<string> {
    const shareId = crypto.randomUUID();
    const shareTokensCollection = collection(this.firestore, 'shareTokens');

    await addDoc(shareTokensCollection, {
      shareId,
      characterId,
      createdBy: userId,
      downloadUrl,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000)
    });

    return shareId;
  }

  async getShareToken(shareId: string): Promise<{
    downloadUrl: string;
    expiresAt: Date;
  } | null> {
    const shareTokensCollection = collection(this.firestore, 'shareTokens');
    const q = query(shareTokensCollection, where('shareId', '==', shareId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const data = snapshot.docs[0].data();
    const expiresAt = data['expiresAt']?.toDate();

    if (expiresAt && expiresAt < new Date()) {
      return null; // Token expired
    }

    return {
      downloadUrl: data['downloadUrl'],
      expiresAt
    };
  }
}

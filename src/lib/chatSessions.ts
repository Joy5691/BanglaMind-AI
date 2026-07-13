import { collection, doc, setDoc, getDocs, deleteDoc, serverTimestamp, query, where, orderBy, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { Message } from "../types";

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  isShared?: boolean;
  createdAt: any;
  updatedAt: any;
}

export const fetchChatSessions = async (userId: string): Promise<ChatSession[]> => {
  try {
    const q = query(
      collection(db, "chatSessions"),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const sessions: ChatSession[] = [];
    querySnapshot.forEach((docSnap) => {
      sessions.push({ id: docSnap.id, ...docSnap.data() } as ChatSession);
    });
    // Sort manually as we don't have a composite index for userId + updatedAt desc yet, or we can just sort in memory
    return sessions.sort((a, b) => {
      const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
      const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Error fetching chat sessions", error);
    return [];
  }
};

export const saveChatSession = async (sessionId: string, title: string, messages: Message[]) => {
  if (!auth.currentUser) return;
  try {
    const sessionRef = doc(db, "chatSessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists()) {
      await setDoc(sessionRef, {
        title,
        messages,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      await setDoc(sessionRef, {
        userId: auth.currentUser.uid,
        title,
        messages,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error saving chat session", error);
  }
};

export const deleteChatSession = async (sessionId: string): Promise<boolean> => {
  if (!auth.currentUser) return false;
  try {
    await deleteDoc(doc(db, "chatSessions", sessionId));
    return true;
  } catch (error) {
    console.error("Error deleting chat session", error);
    return false;
  }
};

export const getChatSession = async (sessionId: string): Promise<ChatSession | null> => {
  try {
    const sessionRef = doc(db, "chatSessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists()) {
      return { id: sessionSnap.id, ...sessionSnap.data() } as ChatSession;
    }
  } catch (error) {
    console.error("Error getting chat session", error);
  }
  return null;
};

export const shareChatSession = async (sessionId: string): Promise<boolean> => {
  if (!auth.currentUser) return false;
  try {
    const sessionRef = doc(db, "chatSessions", sessionId);
    await setDoc(sessionRef, {
      isShared: true,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error sharing chat session", error);
    return false;
  }
};

export const updateMessageRating = async (sessionId: string, messageId: string, rating: "up" | "down" | null): Promise<boolean> => {
  if (!auth.currentUser) return false;
  try {
    const sessionRef = doc(db, "chatSessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists()) {
      const data = sessionSnap.data();
      const messages = (data.messages || []) as Message[];
      const updatedMessages = messages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            rating: rating === null ? undefined : rating
          };
        }
        return msg;
      });
      await setDoc(sessionRef, {
        messages: updatedMessages,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    }
  } catch (error) {
    console.error("Error updating message rating", error);
  }
  return false;
};

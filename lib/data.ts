// lib/data.ts
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, query, orderBy, limit } from 'firebase/firestore';

// ----------------------------------------------------
// 1. Fetching Settings (Visi/Misi, Gereja Induk, Hero Data)
// ----------------------------------------------------
export async function getHomePageSettings() {
  try {
    const docRef = doc(db, "settings", "homePage");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.error("No 'homePage' settings document found!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching home page settings:", error);
    return null;
  }
}

// ----------------------------------------------------
// 2. Fetching Service Schedules (Ordered by 'order' field)
// ----------------------------------------------------
export async function getServiceSchedules() {
  try {
    const schedulesCollection = collection(db, "schedules");
    // Create a query to order the documents by the 'order' field
    const q = query(schedulesCollection, orderBy("order", "asc"));
    
    const querySnapshot = await getDocs(q);
    const schedules = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return schedules;
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return [];
  }
}

// ----------------------------------------------------
// 3. Fetching Latest News (Ordered by 'date' field, limited to 3 for Home Page)
// ----------------------------------------------------
export async function getLatestNews() {
  try {
    const newsCollection = collection(db, "news");
    // Order by date descending and limit to 3 items
    const q = query(newsCollection, orderBy("date", "desc"), limit(3));

    const querySnapshot = await getDocs(q);
    const news = querySnapshot.docs.map(doc => ({
      id: doc.id,
      // Convert Firestore Timestamp to a readable string (optional but helpful)
      date: doc.data().date.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
      ...doc.data()
    }));
    return news;
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}
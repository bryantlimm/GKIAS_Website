// lib/data.ts
import { unstable_noStore } from 'next/cache';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, query, orderBy, limit, Timestamp } from 'firebase/firestore';

// ----------------------------------------------------
// 1. Fetching Settings (Visi/Misi, Gereja Induk, Hero Data)
// ----------------------------------------------------
export async function getHomePageSettings() {
  try {
    const docRef = doc(db, "settings", "homePage");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Explicitly define the return structure with safe fallbacks
      return {
        heroTitle: data.heroTitle || "Welcome to GKI Alam Sutera",
        heroImageUrl: data.heroImageUrl || "https://via.placeholder.com/1600x900?text=Background+Missing",
        visi: data.visi || "Visi data missing.",
        misi: data.misi || "Misi data missing.",
        gerejaIndukTitle: data.gerejaIndukTitle || "Gereja Induk",
        gerejaIndukDescription: data.gerejaIndukDescription || "Description missing.",
        gerejaIndukImageUrl: data.gerejaIndukImageUrl || "https://via.placeholder.com/800x600?text=Gereja+Induk+Image+Missing",
      };
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
  unstable_noStore();
  try {
    const schedulesCollection = collection(db, "schedules");
    const q = query(schedulesCollection, orderBy("order", "asc"));
    
    const querySnapshot = await getDocs(q);
    
    // Explicitly cast and map the data to ensure correct fields are present
    const schedules = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name as string,   // Explicitly cast
            time: data.time as string,   // Explicitly cast
            order: data.order as number, // Explicitly cast
        };
    });
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
    const q = query(newsCollection, orderBy("date", "desc"), limit(3));

    const querySnapshot = await getDocs(q);
    
    const news = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // FIX: Check if data.date is a Firestore Timestamp before calling toDate()
      // If it is, convert it to a simple, serializable string.
      const formattedDate = 
        data.date instanceof Timestamp
          ? data.date.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
          : data.date; // Fallback if it's already a string

      return {
        id: doc.id,
        title: data.title,
        imageUrl: data.imageUrl,
        date: formattedDate, // Pass the simple string date
        // Note: You must explicitly list all fields you want to pass
      };
    });
    return news;
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}
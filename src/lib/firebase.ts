import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, onSnapshot, setDoc, deleteDoc, serverTimestamp, getDocs, query, where, writeBatch, increment } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Course, Lesson } from '../types';
import { useState, useEffect } from 'react';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); // MUST USE firestoreDatabaseId
export const auth = getAuth(app);

// Check offline capabilities / basic connectivity
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      localStorage.setItem('google_drive_token', credential.accessToken);
      localStorage.setItem('google_drive_token_timestamp', Date.now().toString());
    }
  } catch (err) {
    console.error("Login failed", err);
  }
};

export const getDriveAccessToken = async (): Promise<string | null> => {
  let token = localStorage.getItem('google_drive_token');
  const timestamp = localStorage.getItem('google_drive_token_timestamp');
  
  if (token && timestamp) {
    const elapsed = Date.now() - parseInt(timestamp, 10);
    // Google tokens usually expire in 3600 seconds (1 hour). 
    if (elapsed < 50 * 60 * 1000) {
      return token;
    }
  }
  
  // Need to popup
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      localStorage.setItem('google_drive_token', credential.accessToken);
      localStorage.setItem('google_drive_token_timestamp', Date.now().toString());
      return credential.accessToken;
    }
  } catch (err) {
    console.error("Failed to get drive token", err);
  }
  return null;
}

export const logout = async () => {
  await signOut(auth);
};

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export let isQuotaExhausted = false;

function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) {
  if (operationType !== 'get' && operationType !== 'list') {
    if (error?.message && error.message.includes('size')) {
      alert('儲存失敗！單個課程內容超出容量限制 (1MB)。請嘗試縮減圖片數量或解析度。');
    } else if (error?.code === 'resource-exhausted' || (error?.message && error.message.includes('Quota'))) {
      isQuotaExhausted = true;
      console.error("Firestore quota exceeded:", error);
      // Let the application continue working offline/locally instead of spamming alerts.
      // We log it quietly since continuous editing shouldn't be blocked.
    } else {
      console.error("Firestore error:", error);
      if (!error?.message?.includes('offline')) {
        alert('儲存失敗！請檢查網路連線或操作權限。');
      }
    }
  }

  if (error?.code === 'permission-denied') {
    const errorInfo: FirestoreErrorInfo = {
      error: 'Missing or insufficient permissions.',
      operationType,
      path,
      authInfo: {
        userId: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || '',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || true,
        providerInfo: auth.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
}

const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date) && obj.constructor.name === 'Object') {
    const result: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        result[key] = removeUndefined(obj[key]);
      }
    }
    return result;
  }
  return obj;
};

export const syncToCloud = async (courses: Course[]) => {
  if (isQuotaExhausted) return;
  // Save every course and lesson to Firestore via batch to respect limits
  try {
    const batch = writeBatch(db);
    
    for (const c of courses) {
      const courseDoc = doc(db, 'courses', c.id);
      const coursePayload: any = {
        title: c.title,
        description: c.description || '',
        date: c.date || '',
        order: c.order ?? 0,
        isPublished: c.isVisible !== false,
        updatedAt: serverTimestamp()
      };
      if (c.practiceMaterialUrl !== undefined) {
        coursePayload.practiceMaterialUrl = c.practiceMaterialUrl;
      }
      const cleanedCourse = removeUndefined(coursePayload);
      cleanedCourse.updatedAt = serverTimestamp();
      batch.set(courseDoc, cleanedCourse, { merge: true });

      for (const l of c.lessons) {
        const compressedSlides = await Promise.all((l.slides || []).map(async (slide) => {
          return {
            ...slide,
            imageUrl: slide.imageUrl ? await compressImage(slide.imageUrl) : slide.imageUrl
          };
        }));
        
        const compressedSteps = await Promise.all((l.steps || []).map(async (step) => {
          return {
            ...step,
            slides: await Promise.all((step.slides || []).map(async (slide) => ({
              ...slide,
              imageUrl: slide.imageUrl ? await compressImage(slide.imageUrl) : slide.imageUrl
            })))
          };
        }));

        const lessonDoc = doc(db, 'lessons', l.id);
        const lessonPayload: any = {
          courseId: c.id,
          title: l.title,
          description: l.description || '',
          date: l.date || '',
          order: l.order ?? 0,
          isFeatured: l.isFeatured || false,
          isPublished: l.isVisible !== false,
          slides: compressedSlides,
          commands: l.commands || [],
          prompts: l.prompts || [],
          urls: l.urls || [],
          flowNodes: l.flowNodes || [],
          flowEdges: l.flowEdges || [],
          flowMarkdown: l.flowMarkdown || '',
          flowTitle: l.flowTitle || '',
          enabledTabs: l.enabledTabs || ['slides', 'urls', 'commands', 'prompts', 'flow'],
          tabOrder: l.tabOrder || ['slides', 'urls', 'commands', 'prompts', 'flow'],
          steps: compressedSteps,
          updatedAt: serverTimestamp()
        };
        if (l.practiceMaterialUrl !== undefined) {
          lessonPayload.practiceMaterialUrl = l.practiceMaterialUrl;
        }
        
        const cleanedLesson = removeUndefined(lessonPayload);
        cleanedLesson.updatedAt = serverTimestamp();
        batch.set(lessonDoc, cleanedLesson, { merge: true });
      }
    }

    await batch.commit();
    console.log("Synced to cloud!");
  } catch (error) {
    handleFirestoreError(error, 'write', 'courses_lessons_batch');
  }
};

export const fixDriveThumbnailUrl = (url?: string) => {
  if (!url) return url;
  if (url.includes('drive.google.com/uc') && url.includes('id=')) {
    const match = url.match(/id=([^&]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w2560`;
    }
  }
  return url;
};

export const fetchFromCloud = async (isAdmin: boolean = false): Promise<Course[]> => {
  try {
    let coursesSnap, lessonsSnap;
    
    coursesSnap = await getDocs(collection(db, 'courses'));
    lessonsSnap = await getDocs(collection(db, 'lessons'));
    
    if (isAdmin) {
       // Process automatic migration for old missing isPublished fields
       try {
         const migrationBatch = writeBatch(db);
         let needsMigration = false;
         
         coursesSnap.docs.forEach(docSnap => {
           const data = docSnap.data();
           if (data.isPublished === undefined) {
             migrationBatch.update(docSnap.ref, { 
               isPublished: data.isVisible !== false,
               updatedAt: serverTimestamp(),
               title: data.title || '未命名課程'
             });
             needsMigration = true;
           }
         });
         
         lessonsSnap.docs.forEach(docSnap => {
           const data = docSnap.data();
           if (data.isPublished === undefined) {
             migrationBatch.update(docSnap.ref, { 
               isPublished: data.isVisible !== false,
               updatedAt: serverTimestamp(),
               title: data.title || '未命名章節',
               slides: data.slides || [],
               commands: data.commands || [],
               prompts: data.prompts || [],
               urls: data.urls || [],
               flowNodes: data.flowNodes || [],
               flowEdges: data.flowEdges || [],
               flowMarkdown: data.flowMarkdown || '',
               flowTitle: data.flowTitle || '',
               enabledTabs: data.enabledTabs || ['slides', 'urls', 'commands', 'prompts', 'flow'],
               tabOrder: data.tabOrder || ['slides', 'urls', 'commands', 'prompts', 'flow'],
               steps: data.steps || []
             });
             needsMigration = true;
           }
         });
         
         if (needsMigration) {
           await migrationBatch.commit();
           console.log('Migrated legacy documents to use isPublished field.');
         }
       } catch (migrationError) {
         console.error('Migration failed:', migrationError);
       }
    }

    const fetchedCourses: Course[] = coursesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        date: data.date,
        practiceMaterialUrl: data.practiceMaterialUrl,
        order: data.order ?? 0,
        isVisible: data.isPublished !== false,
        lessons: []
      };
    });

    const fetchedLessons = lessonsSnap.docs.map(doc => {
      const data = doc.data();
      if (data.slides) {
        data.slides = data.slides.map((s: any) => ({ ...s, imageUrl: fixDriveThumbnailUrl(s.imageUrl) }));
      }
      if (data.steps) {
        data.steps = data.steps.map((step: any) => {
          if (step.slides) {
            step.slides = step.slides.map((s: any) => ({ ...s, imageUrl: fixDriveThumbnailUrl(s.imageUrl) }));
          }
          return step;
        });
      }
      return { id: doc.id, ...data };
    });

    fetchedCourses.forEach(course => {
      course.lessons = fetchedLessons.filter((l: any) => l.courseId === course.id).map((l: any) => {
        // --- DATA RECOVERY LOGIC ---
        // If there's a step with id 'legacy-step' (or it's the only step) and it's missing data, but legacy fields have data, restore it.
        let recoveredSteps = l.steps || [];
        const legacyIndex = recoveredSteps.findIndex((s: any) => s.id === 'legacy-step' || recoveredSteps.length === 1);
        if (legacyIndex !== -1) {
           const step = recoveredSteps[legacyIndex];
           const hasLegacyData = (l.slides?.length > 0 || l.commands?.length > 0 || l.urls?.length > 0 || l.prompts?.length > 0);
           const isStepEmpty = (!step.slides?.length && !step.commands?.length && !step.urls?.length && !step.prompts?.length);
           if (hasLegacyData && isStepEmpty) {
               console.log(`Recovering data for lesson: ${l.title}`);
               recoveredSteps[legacyIndex] = {
                   ...step,
                   slides: l.slides || [],
                   commands: l.commands || [],
                   prompts: l.prompts || [],
                   urls: l.urls || [],
                   flowMarkdown: l.flowMarkdown || '',
                   flowTitle: l.flowTitle || '',
                   enabledTabs: l.enabledTabs || ['slides', 'urls', 'commands', 'prompts', 'flow'],
                   tabOrder: l.tabOrder || ['slides', 'urls', 'commands', 'prompts', 'flow']
               };
           }
        }
        
        return {
          id: l.id,
          title: l.title,
          description: l.description,
          date: l.date,
          isFeatured: l.isFeatured,
          isVisible: l.isPublished !== false,
          order: l.order ?? 0,
          practiceMaterialUrl: l.practiceMaterialUrl,
          slides: l.slides,
          commands: l.commands,
          prompts: l.prompts,
          urls: l.urls,
          flowNodes: l.flowNodes,
          flowEdges: l.flowEdges,
          flowMarkdown: l.flowMarkdown,
          flowTitle: l.flowTitle,
          enabledTabs: l.enabledTabs,
          tabOrder: l.tabOrder,
          steps: recoveredSteps
        };
      }).sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    // Sort courses initially
    fetchedCourses.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return fetchedCourses;
  } catch (error: any) {
    handleFirestoreError(error, 'list');
    return [];
  }
};

export const saveCourseToCloud = async (course: Course) => {
  if (isQuotaExhausted) return;
  try {
    const courseDoc = doc(db, 'courses', course.id);
    const savePayload: any = {
      title: course.title,
      description: course.description || '',
      date: course.date || '',
      order: course.order ?? 0,
      isPublished: course.isVisible !== false,
      updatedAt: serverTimestamp()
    };
    if (course.practiceMaterialUrl !== undefined) {
      savePayload.practiceMaterialUrl = course.practiceMaterialUrl;
    }
    const cleanedPayload = removeUndefined(savePayload);
    cleanedPayload.updatedAt = serverTimestamp();
    await setDoc(courseDoc, cleanedPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'update', `courses/${course.id}`);
  }
};

export const compressImage = async (base64Str: string): Promise<string> => {
  if (!base64Str || !base64Str.startsWith('data:image/')) return base64Str;
  if (base64Str.startsWith('data:image/webp')) return base64Str;
  
  // Always compress if it's an image
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Adjust size to maintain clarity while compressing
      const MAX_WIDTH = 1280;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Use quality 0.82 and WebP for balanced compression (~80-90KB)
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.82));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

  export const saveLessonToCloud = async (lesson: Lesson, courseId: string) => {
  if (isQuotaExhausted) return;
  try {
    const compressedSlides = await Promise.all((lesson.slides || []).map(async (slide) => {
      return {
        ...slide,
        imageUrl: slide.imageUrl ? await compressImage(slide.imageUrl) : slide.imageUrl
      };
    }));

    const compressedSteps = await Promise.all((lesson.steps || []).map(async (step) => {
      return {
        ...step,
        slides: await Promise.all((step.slides || []).map(async (slide) => ({
          ...slide,
          imageUrl: slide.imageUrl ? await compressImage(slide.imageUrl) : slide.imageUrl
        })))
      };
    }));

    const lessonDoc = doc(db, 'lessons', lesson.id);
    const savePayload: any = {
      courseId,
      title: lesson.title,
      description: lesson.description || '',
      date: lesson.date || '',
      order: lesson.order ?? 0,
      isFeatured: lesson.isFeatured || false,
      isPublished: lesson.isVisible !== false,
      slides: compressedSlides,
      commands: lesson.commands || [],
      prompts: lesson.prompts || [],
      urls: lesson.urls || [],
      flowNodes: lesson.flowNodes || [],
      flowEdges: lesson.flowEdges || [],
      flowMarkdown: lesson.flowMarkdown || '',
      flowTitle: lesson.flowTitle || '',
      enabledTabs: lesson.enabledTabs || ['slides', 'urls', 'commands', 'prompts', 'flow'],
      tabOrder: lesson.tabOrder || ['slides', 'urls', 'commands', 'prompts', 'flow'],
      steps: compressedSteps,
      updatedAt: serverTimestamp()
    };
    if (lesson.practiceMaterialUrl !== undefined) {
      savePayload.practiceMaterialUrl = lesson.practiceMaterialUrl;
    }
    
    // Firestore does not like `undefined`
    const cleanedPayload = removeUndefined(savePayload);
    cleanedPayload.updatedAt = serverTimestamp(); // Restore timestamp because removeUndefined might mangle or flatten custom objects if not careful, though it handles objects fine, it's safer. Wait, Firebase FieldValue isn't a plain Object.
    // wait, our removeUndefined ignores non-plain objects `obj.constructor.name === 'Object'`, but FieldValue constructor name is `FieldValue`. Yes, it should be safe.
    
    await setDoc(lessonDoc, cleanedPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'update', `lessons/${lesson.id}`);
  }
};

export const deleteCourseFromCloud = async (courseId: string) => {
  if (isQuotaExhausted) return;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'courses', courseId));
    
    // Also delete associated lessons
    const lessonsSnap = await getDocs(query(collection(db, 'lessons'), where('courseId', '==', courseId)));
    lessonsSnap.forEach(snap => {
      batch.delete(doc(db, 'lessons', snap.id));
    });
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, 'delete', `courses/${courseId}`);
  }
};

export const deleteLessonFromCloud = async (lessonId: string) => {
  if (isQuotaExhausted) return;
  try {
    await deleteDoc(doc(db, 'lessons', lessonId));
  } catch (error) {
    handleFirestoreError(error, 'delete', `lessons/${lessonId}`);
  }
};

export const recordVisit = async () => {
  if (!sessionStorage.getItem('visited')) {
    sessionStorage.setItem('visited', '1');
    try {
      await setDoc(doc(db, 'system', 'stats'), { totalVisits: increment(1) }, { merge: true });
    } catch (e) {
      // silently fail if permission denied or offline
    }
  }
};

export const useVisitorStats = () => {
  const [totalVisits, setTotalVisits] = useState(0);

  useEffect(() => {
    recordVisit();

    const unsubStats = onSnapshot(doc(db, 'system', 'stats'), (doc) => {
      if (doc.exists()) {
        setTotalVisits(doc.data().totalVisits || 0);
      }
    });

    return () => {
      unsubStats();
    }
  }, []);

  return { totalVisits };
};
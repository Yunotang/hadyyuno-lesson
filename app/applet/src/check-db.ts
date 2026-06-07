import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync('./src/lib/firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function check() {
  const coursesSnap = await getDocs(collection(db, 'courses'));
  const lessonsSnap = await getDocs(collection(db, 'lessons'));
  console.log('Courses:', coursesSnap.size);
  console.log('Lessons:', lessonsSnap.size);
  process.exit(0);
}
check();

import { getApps, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Same public Firebase config as the web app (frontend/src/lib/firebase.js).
// These identifiers are not secrets; access is controlled by firestore.rules.
const firebaseConfig = {
  apiKey: 'AIzaSyB3fzsBS9m5dqrk20wHig35lPxxnKny5mE',
  authDomain: 'holeta-c22fc.firebaseapp.com',
  projectId: 'holeta-c22fc',
  storageBucket: 'holeta-c22fc.firebasestorage.app',
  messagingSenderId: '747642466720',
  appId: '1:747642466720:web:0be7ee1e33e7d1668774c5',
  measurementId: 'G-THX2TJHHR3',
};

// Same Render backend the web app uses (see README.md).
export const BACKEND_URL = 'https://holeta-gebeya.onrender.com';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// React Native has no IndexedDB, so the signed-in session is persisted
// with AsyncStorage. Without this the user would be logged out on every
// app restart.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore for the public listing feed. Default in-memory cache; the
// web app's IndexedDB persistence is not used on native.
export const db = getFirestore(app);

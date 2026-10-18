import { Platform } from 'react-native';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from '@firebase/auth';
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

// Native keeps the signed-in session in AsyncStorage so it survives app
// restarts. On the web, the browser's own storage is used instead.
export const auth =
  Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

// Firestore for the public listing feed.
export const db = getFirestore(app);

import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Firestore for the public listing feed (login is not wired up yet).
export const db = getFirestore(app);

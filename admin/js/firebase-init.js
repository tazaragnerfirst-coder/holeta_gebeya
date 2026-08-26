// Same Firebase project as the main Mini App — these are public
// client identifiers, not secrets (see frontend/src/lib/firebase.js
// for the same values). Access is controlled by firestore.rules'
// isAdmin() check plus each admin user's custom claim, not by
// keeping this config private.
const firebaseConfig = {
  apiKey: 'AIzaSyB3fzsBS9m5dqrk20wHig35lPxxnKny5mE',
  authDomain: 'holeta-c22fc.firebaseapp.com',
  projectId: 'holeta-c22fc',
  storageBucket: 'holeta-c22fc.firebasestorage.app',
  messagingSenderId: '747642466720',
  appId: '1:747642466720:web:0be7ee1e33e7d1668774c5',
  measurementId: 'G-THX2TJHHR3',
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
// Only dashboard.html also loads firebase-firestore-compat.js —
// index.html (login) doesn't need Firestore at all.
const db = firebase.firestore ? firebase.firestore() : null;

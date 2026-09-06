import { collection, addDoc, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { db, ensureLoggedIn } from './firebase';

// Manual receipt-review flow (same model as equb_bot): the client
// only ever creates a 'pending' doc — approving/rejecting and
// writing subscriptionActive back onto the user's profile is done
// by the admin panel (isAdmin() in firestore.rules), never the client.
export async function submitSubscriptionPayment(uid, { name, phone, paymentMethod, receiptImage }) {
  await ensureLoggedIn();
  await addDoc(collection(db, 'subscriptionPayments'), {
    uid,
    name: name || '',
    phone: phone || '',
    paymentMethod,
    receiptImage,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

// So the UI can show "under review" instead of the upgrade form
// again if the person already submitted one that's awaiting review.
export async function getPendingSubscriptionPayment(uid) {
  await ensureLoggedIn();
  const snap = await getDocs(query(
    collection(db, 'subscriptionPayments'),
    where('uid', '==', uid),
    where('status', '==', 'pending'),
    limit(1),
  ));
  return snap.empty ? null : snap.docs[0].data();
}

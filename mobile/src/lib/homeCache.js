// In-memory cache that outlives HomeScreen mounts. Web keeps the same data
// in AppDataProvider (with its own cache), so coming back to Home shows the
// feed instantly; here HomeScreen is unmounted on every tab switch / listing
// open, so without this each return was a fresh skeleton + refetch.
export const homeCache = {
  listings: null, // null = never loaded this app session
  categories: [],
  lastDoc: null, // Firestore cursor for the next page
  hasMore: true,
};

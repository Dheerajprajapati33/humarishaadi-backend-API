const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("path");
const fs = require("fs");

let firebaseApp = null;
let messagingInstance = null;

function initFirebase() {
  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    messagingInstance = getMessaging(firebaseApp);
    return { app: firebaseApp, messaging: messagingInstance };
  }

  const possiblePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.join(process.cwd(), "humarishaadi.json"),
    path.join(process.cwd(), "humarishaadi-1488e-firebase-adminsdk-fbsvc-511144d2f9.json"),
    path.join(__dirname, "../../humarishaadi.json"),
    path.join(__dirname, "../../humarishaadi-1488e-firebase-adminsdk-fbsvc-511144d2f9.json"),
  ].filter(Boolean);

  let serviceAccount = null;
  let resolvedPath = null;

  for (const p of possiblePaths) {
    const fullPath = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    if (fs.existsSync(fullPath)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
        resolvedPath = fullPath;
        break;
      } catch (err) {
        console.error(`[Firebase] Error reading JSON at ${fullPath}:`, err.message);
      }
    }
  }

  if (serviceAccount) {
    try {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
      });
      messagingInstance = getMessaging(firebaseApp);
      console.log(`[Firebase] Admin SDK initialized successfully with file: ${path.basename(resolvedPath)}`);
    } catch (err) {
      console.error("[Firebase] Admin SDK initialization failed:", err.message);
    }
  } else {
    console.warn(
      "[Firebase] No service account JSON found. Push notifications will be disabled until valid credentials are provided.",
    );
  }

  return { app: firebaseApp, messaging: messagingInstance };
}

const { app, messaging } = initFirebase();

module.exports = {
  app,
  messaging,
  isFirebaseReady: () => getApps().length > 0 && !!messagingInstance,
  getMessagingInstance: () => messagingInstance,
};

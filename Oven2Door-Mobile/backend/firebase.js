const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("./firebase-service-account.json");

initializeApp({
  credential: cert(serviceAccount),   // ✅ proper credential
});

module.exports = { getAuth };

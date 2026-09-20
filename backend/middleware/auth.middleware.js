const { getAuth } = require("../firebase-admin");

async function authenticateFirebase(req, res, next) {

  console.log("[AUTH] Middleware started");

  try {

    const authorization = req.headers.authorization;

    if (!authorization) {

      console.log("[AUTH] No authorization header");

      return res.status(401).json({
        message: "Authorization token is required."
      });

    }

    if (!authorization.startsWith("Bearer ")) {

      console.log("[AUTH] Invalid authorization format");

      return res.status(401).json({
        message: "Invalid authorization format."
      });

    }

    console.log("[AUTH] Authorization header received");

    const idToken = authorization.substring(7);

    console.log("[AUTH] Verifying Firebase token...");

    const decodedToken =
      await getAuth().verifyIdToken(idToken);

    console.log("[AUTH] Firebase token verified");
    console.log("[AUTH] UID:", decodedToken.uid);
    console.log("[AUTH] Email:", decodedToken.email);

    // Store Firebase user information
    req.user = decodedToken;

    console.log("[AUTH] Passing request to auth route...");

    next();

  } catch (error) {

    console.error("[AUTH] Firebase token verification failed:", error);

    return res.status(401).json({
      message: "Invalid or expired Firebase token."
    });

  }

}

module.exports = authenticateFirebase;
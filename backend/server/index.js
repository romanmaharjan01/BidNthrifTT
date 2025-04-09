const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "bidnthrift-adcd0.firebaseapp.com"
});

const db = admin.firestore();
module.exports = db;

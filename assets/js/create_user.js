// create_user.js
// Helper to create a Firebase Auth user with email/password.
// Usage: import './create_user.js' and call createUser(email, password);

function createUser(email, password) {
  if (!window.auth) {
    console.error('Firebase Auth not initialized.');
    return;
  }
  return window.auth.createUserWithEmailAndPassword(email, password)
    .then((cred) => {
      console.log('User created:', cred.user.uid);
      return cred.user;
    })
    .catch((err) => {
      console.error('Error creating user:', err);
      throw err;
    });
}

// Expose globally for convenience (optional)
window.createUser = createUser;

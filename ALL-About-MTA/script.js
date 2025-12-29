// ==============================================
// LOGIN PAGE - FIXED USER CREATION
// ==============================================

import { auth, googleProvider, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// DOM Elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailLoginBtn = document.getElementById('emailLogin');
const googleLoginBtn = document.getElementById('googleLogin');
const showRegister = document.getElementById('showRegister');
const registerModal = document.getElementById('registerModal');
const closeRegister = document.getElementById('closeRegister');
const doRegister = document.getElementById('doRegister');
const scriptCountSpan = document.getElementById('scriptCount');

// ========== NOTIFICATION SYSTEM ==========
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => {
            notification.style.display = 'none';
            notification.style.animation = 'slideIn 0.3s';
        }, 300);
    }, 5000);
}

// ========== LOAD STATISTICS ==========
async function loadRealStats() {
  try {
    const filesSnapshot = await getDocs(collection(db, 'uploads'));
    scriptCountSpan.textContent = filesSnapshot.size;
  } catch (error) {
    console.log("Stats error:", error);
    scriptCountSpan.textContent = "0";
  }
}

// ========== CREATE/UPDATE USER IN FIRESTORE ==========
async function createOrUpdateUser(user, username, provider = "email") {
    const userRef = doc(db, 'users', user.uid);
    
    try {
        const userDoc = await getDoc(userRef);
        
        // Determine role - ONLY zaid.louay560@gmail.com is owner
        const isOwner = user.email === "zaid.louay560@gmail.com";
        const userRole = isOwner ? 'owner' : 'user';
        
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || username,
            username: username,
            photoURL: user.photoURL || 'assets/avatar.png',
            role: userRole,
            provider: provider,
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        // Only add createdAt if creating new user
        if (!userDoc.exists()) {
            userData.createdAt = serverTimestamp();
        } else {
            // Preserve existing createdAt
            const existingData = userDoc.data();
            userData.createdAt = existingData.createdAt || serverTimestamp();
            
            // NEVER overwrite owner role
            if (existingData.role === 'owner') {
                userData.role = 'owner';
            }
        }
        
        // Save to Firestore
        await setDoc(userRef, userData, { merge: true });
        console.log(`✅ User ${user.email} saved with role: ${userData.role}`);
        
        return userData;
        
    } catch (error) {
        console.error("Error creating/updating user:", error);
        throw error;
    }
}

// ========== EMAIL LOGIN ==========
emailLoginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showNotification('📝 Please enter both email and password.', 'info');
    return;
  }

  try {
    emailLoginBtn.disabled = true;
    emailLoginBtn.innerHTML = '<div class="loading"></div> Verifying...';
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log("Email login successful:", user.email);
    
    // Get or create user in Firestore
    const username = localStorage.getItem(`username_${user.uid}`) || user.email.split('@')[0];
    await createOrUpdateUser(user, username, "email");
    
    showNotification('✅ Login successful! Redirecting...', 'success');
    
    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 1000);
    
  } catch (error) {
    console.error("Login error:", error.code);
    
    let errorMessage = 'Login failed. Please try again.';
    switch(error.code) {
        case 'auth/invalid-email': errorMessage = '❌ Invalid email format.'; break;
        case 'auth/user-not-found': errorMessage = '🔍 No account found. Please register.'; break;
        case 'auth/wrong-password': errorMessage = '🔐 Incorrect password.'; break;
        case 'auth/too-many-requests': errorMessage = '⚠️ Too many attempts. Try later.'; break;
        case 'auth/network-request-failed': errorMessage = '📡 Network error.'; break;
    }
    
    showNotification(errorMessage, 'error');
    emailLoginBtn.disabled = false;
    emailLoginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login with Email';
  }
});

// ========== GOOGLE LOGIN ==========
googleLoginBtn.addEventListener('click', async () => {
  try {
    googleLoginBtn.disabled = true;
    googleLoginBtn.innerHTML = '<div class="loading"></div> Connecting...';
    
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Get username
    let username = user.displayName || user.email.split('@')[0];
    const usernameKey = `username_${user.uid}`;
    
    if (!localStorage.getItem(usernameKey)) {
        // Check if username exists
        const usernameQuery = query(collection(db, 'users'), where('username', '==', username));
        const usernameSnapshot = await getDocs(usernameQuery);
        
        if (!usernameSnapshot.empty) {
            username = username + '_' + Math.floor(Math.random() * 1000);
        }
        localStorage.setItem(usernameKey, username);
    } else {
        username = localStorage.getItem(usernameKey);
    }
    
    // Create/update user in Firestore
    await createOrUpdateUser(user, username, "google");
    
    showNotification('✅ Google login successful!', 'success');
    
    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 1000);
    
  } catch (error) {
    console.error("Google login error:", error);
    
    let errorMessage = 'Google login failed.';
    if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = '📱 Login popup was closed.';
    } else if (error.code === 'auth/network-request-failed') {
        errorMessage = '📡 Network error.';
    }
    
    showNotification(errorMessage, 'error');
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> Sign in with Google';
  }
});

// ========== REGISTRATION ==========
showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    registerModal.style.display = 'flex';
});

closeRegister.addEventListener('click', (e) => {
    e.preventDefault();
    registerModal.style.display = 'none';
    document.getElementById('regName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
});

doRegister.addEventListener('click', async () => {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!name || !email || !password) {
        showNotification('📝 Please fill all fields.', 'info');
        return;
    }

    if (password.length < 6) {
        showNotification('🔐 Password must be at least 6 characters.', 'error');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showNotification('📧 Please enter a valid email.', 'error');
        return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(name)) {
        showNotification('👤 Username: 3-20 characters, letters/numbers/underscores only.', 'error');
        return;
    }

    try {
        doRegister.disabled = true;
        doRegister.innerHTML = '<div class="loading"></div> Checking...';
        
        // Check username
        const usernameQuery = query(collection(db, 'users'), where('username', '==', name));
        const usernameSnapshot = await getDocs(usernameQuery);
        
        if (!usernameSnapshot.empty) {
            throw new Error('USERNAME_TAKEN');
        }
        
        // Check email
        const emailQuery = query(collection(db, 'users'), where('email', '==', email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
            throw new Error('EMAIL_TAKEN');
        }
        
        // Create user
        doRegister.innerHTML = '<div class="loading"></div> Creating...';
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCred.user;
        
        // Save username
        localStorage.setItem(`username_${user.uid}`, name);
        
        // Create user document
        const userRef = doc(db, 'users', user.uid);
        const isOwner = email === "zaid.louay560@gmail.com";
        
        await setDoc(userRef, {
            uid: user.uid,
            email: email,
            displayName: name,
            username: name,
            photoURL: "",
            role: isOwner ? "owner" : "user",
            provider: "email",
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        });
        
        showNotification('🎉 Account created! Redirecting...', 'success');
        
        setTimeout(() => {
            registerModal.style.display = 'none';
            window.location.href = "dashboard.html";
        }, 1500);
        
    } catch (error) {
        console.error("Registration error:", error.message);
        
        let errorMessage = 'Registration failed.';
        if (error.message === 'USERNAME_TAKEN') {
            errorMessage = '👤 Username is taken.';
        } else if (error.message === 'EMAIL_TAKEN' || error.code === 'auth/email-already-in-use') {
            errorMessage = '📧 Email is already registered.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = '🔐 Password is too weak.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = '📡 Network error.';
        }
        
        showNotification(errorMessage, 'error');
        doRegister.disabled = false;
        doRegister.innerHTML = 'Create Account';
    }
});

// ========== ENTER KEY SUPPORT ==========
emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') emailLoginBtn.click();
});
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') emailLoginBtn.click();
});

// ========== INITIALIZE ==========
window.addEventListener('DOMContentLoaded', () => {
    console.log("Login page loaded");
    loadRealStats();
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Already logged in, redirecting...");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 500);
        }
    });
});
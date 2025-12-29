// ==============================================
// DASHBOARD - COMPLETE WORKING VERSION WITH TABS
// ==============================================

import { 
  auth,
  db,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  setDoc
} from './firebase-unified.js';

// DOM Elements
const userNameEl = document.getElementById('userName');
const userAvatarEl = document.getElementById('userAvatar');
const userRoleEl = document.getElementById('userRole');
const logoutBtn = document.getElementById('logoutBtn');
const liveUsersEl = document.getElementById('liveUsers');
const totalFilesEl = document.getElementById('totalFiles');
const submitUploadBtn = document.getElementById('submitUpload');
const searchInput = document.getElementById('searchInput');
const favoritesCountEl = document.getElementById('favoritesCount');

// Variables
let currentUser = null;
let userRole = 'user';
let userEmail = '';
let allFilesCache = [];
let userFavorites = [];

// Browse Filters
let currentBrowseCategory = 'all';
let currentSearchTerm = '';
let currentSort = 'newest';

// ========== FAVORITES SYSTEM ==========
function initFavorites() {
    if (!currentUser) return;
    
    const favoritesStr = localStorage.getItem(`favorites_${currentUser.uid}`);
    if (favoritesStr) {
        try {
            userFavorites = JSON.parse(favoritesStr);
        } catch (e) {
            userFavorites = [];
            localStorage.setItem(`favorites_${currentUser.uid}`, JSON.stringify(userFavorites));
        }
    } else {
        userFavorites = [];
        localStorage.setItem(`favorites_${currentUser.uid}`, JSON.stringify(userFavorites));
    }
    updateFavoritesCount();
}

function updateFavoritesCount() {
    if (favoritesCountEl) {
        favoritesCountEl.textContent = userFavorites.length;
    }
}

function isFileFavorited(fileId) {
    return userFavorites.includes(fileId);
}

function toggleFavorite(fileId) {
    const index = userFavorites.indexOf(fileId);
    let isNowFavorited = false;
    
    if (index === -1) {
        userFavorites.push(fileId);
        isNowFavorited = true;
        showToast('⭐ Added to favorites', 'success');
    } else {
        userFavorites.splice(index, 1);
        showToast('⭐ Removed from favorites', 'info');
    }
    
    // Save to localStorage
    localStorage.setItem(`favorites_${currentUser?.uid}`, JSON.stringify(userFavorites));
    updateFavoritesCount();
    
    // Update favorites section if open
    if (document.getElementById('favoritesSection')?.classList.contains('active')) {
        loadFavorites();
    }
    
    return isNowFavorited;
}

// ========== LOAD FAVORITES SECTION ==========
async function loadFavorites() {
    const container = document.getElementById('favoritesList');
    if (!container) return;
    
    if (!currentUser) {
        container.innerHTML = '<p class="no-files">Please log in to view favorites</p>';
        return;
    }
    
    if (userFavorites.length === 0) {
        container.innerHTML = '<p class="no-files">No favorites yet. Click the star icon on any file to add it here!</p>';
        return;
    }
    
    container.innerHTML = '<div class="loading-files"><div class="loading"></div><p>Loading favorites...</p></div>';
    
    try {
        // If we don't have all files cached, load them
        if (allFilesCache.length === 0) {
            await preloadAllFiles();
        }
        
        // Filter files that are in favorites
        const favoriteFiles = allFilesCache.filter(file => userFavorites.includes(file.id));
        
        if (favoriteFiles.length === 0) {
            container.innerHTML = '<p class="no-files">No favorites found. Try refreshing the page.</p>';
            return;
        }
        
        displayFiles(favoriteFiles, container, true);
        
    } catch (error) {
        console.error("Error loading favorites:", error);
        container.innerHTML = '<p class="no-files">Error loading favorites</p>';
    }
}

// ========== SIMPLE TOAST ==========
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 4000);
}

// ========== PERMISSIONS ==========
function canUploadToCategory(category) {
    if (category === 'people') return true;
    return userRole === 'admin' || userRole === 'superadmin' || userRole === 'owner';
}

function canDeleteFile(fileUserId) {
    if (userRole === 'owner' || userRole === 'superadmin') return true;
    return fileUserId === currentUser?.uid;
}

// ========== LOAD USER DATA ==========
async function loadUserData(uid) {
    try {
        console.log("Loading user data for:", uid);
        
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User data found:", userData);
            
            // Set role
            userRole = userData.role || 'user';
            userEmail = userData.email;
            
            // Update UI IMMEDIATELY
            userNameEl.textContent = userData.displayName || userData.username || 'User';
            userRoleEl.textContent = userRole === 'owner' ? 'Owner' : 
                                  userRole === 'superadmin' ? 'Super Admin' :
                                  userRole === 'admin' ? 'Admin' : 'User';
            userRoleEl.className = `role-badge ${userRole}`;
            
            if (userData.photoURL) {
                userAvatarEl.src = userData.photoURL;
            }
            
            // Show admin panel if admin+
            if (userRole === 'owner' || userRole === 'superadmin' || userRole === 'admin') {
                document.querySelectorAll('.admin-only').forEach(el => {
                    el.style.display = 'flex';
                });
            }
            
        } else {
            console.log("User document doesn't exist, creating...");
            // Create user document
            const username = localStorage.getItem(`username_${uid}`) || userEmail.split('@')[0];
            const isOwner = userEmail === "zaid.louay560@gmail.com";
            
            const userData = {
                uid: uid,
                email: userEmail,
                displayName: currentUser.displayName || username,
                username: username,
                photoURL: currentUser.photoURL || 'assets/avatar.png',
                role: isOwner ? 'owner' : 'user',
                provider: "firebase",
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            };
            
            await setDoc(userRef, userData);
            
            userNameEl.textContent = username;
            userRole = isOwner ? 'owner' : 'user';
            userRoleEl.textContent = isOwner ? 'Owner' : 'User';
            userRoleEl.className = `role-badge ${userRole}`;
        }
        
        // Initialize favorites
        initFavorites();
        
        // Load dashboard data
        loadDashboardData();
        setupEventListeners();
        
    } catch (error) {
        console.error("Error loading user:", error);
        userNameEl.textContent = "User";
        userRoleEl.textContent = "User";
    }
}

// ========== ENHANCED BROWSE FUNCTIONALITY ==========

// Initialize browse section with tabs
function initBrowseSection() {
    console.log("Initializing browse section with tabs");
    
    // Category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active tab
            document.querySelectorAll('.category-tab').forEach(t => {
                t.classList.remove('active');
            });
            this.classList.add('active');
            
            // Set category filter
            currentBrowseCategory = this.getAttribute('data-category');
            document.getElementById('currentFilter').textContent = 
                currentBrowseCategory === 'all' ? 'All' : this.textContent.trim();
            
            // Apply filters
            applyBrowseFilters();
        });
    });
    
    // Search input
    const browseSearchInput = document.getElementById('browseSearchInput');
    if (browseSearchInput) {
        let searchTimeout;
        browseSearchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchTerm = this.value.trim().toLowerCase();
                applyBrowseFilters();
            }, 300);
        });
    }
    
    // Sort dropdown
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentSort = this.value;
            applyBrowseFilters();
        });
    }
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            // Reset all filters
            currentBrowseCategory = 'all';
            currentSearchTerm = '';
            currentSort = 'newest';
            
            // Reset UI
            document.querySelectorAll('.category-tab').forEach(t => {
                t.classList.remove('active');
            });
            document.querySelector('.category-tab[data-category="all"]').classList.add('active');
            
            if (browseSearchInput) browseSearchInput.value = '';
            if (sortSelect) sortSelect.value = 'newest';
            document.getElementById('currentFilter').textContent = 'All';
            
            // Apply filters
            applyBrowseFilters();
            
            showToast('🔄 Filters cleared', 'info');
        });
    }
}

// Apply all browse filters
function applyBrowseFilters() {
    console.log("Applying filters:", {
        category: currentBrowseCategory,
        search: currentSearchTerm,
        sort: currentSort
    });
    
    let filteredFiles = [...allFilesCache];
    
    // Apply category filter
    if (currentBrowseCategory !== 'all') {
        filteredFiles = filteredFiles.filter(file => file.category === currentBrowseCategory);
    }
    
    // Apply search filter
    if (currentSearchTerm) {
        filteredFiles = filteredFiles.filter(file => 
            (file.fileName && file.fileName.toLowerCase().includes(currentSearchTerm)) ||
            (file.description && file.description.toLowerCase().includes(currentSearchTerm)) ||
            (file.uploaderName && file.uploaderName.toLowerCase().includes(currentSearchTerm)) ||
            (file.category && file.category.toLowerCase().includes(currentSearchTerm))
        );
    }
    
    // Apply sorting
    filteredFiles = sortFiles(filteredFiles, currentSort);
    
    // Display results
    displayBrowseResults(filteredFiles);
    
    // Update stats
    updateBrowseStats(filteredFiles.length);
}

// Sort files based on criteria
function sortFiles(files, sortBy) {
    const sorted = [...files];
    
    switch(sortBy) {
        case 'newest':
            return sorted.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });
            
        case 'oldest':
            return sorted.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateA - dateB;
            });
            
        case 'popular':
            return sorted.sort((a, b) => {
                const downloadsA = a.downloads || 0;
                const downloadsB = b.downloads || 0;
                return downloadsB - downloadsA;
            });
            
        case 'name_asc':
            return sorted.sort((a, b) => {
                const nameA = a.fileName?.toLowerCase() || '';
                const nameB = b.fileName?.toLowerCase() || '';
                return nameA.localeCompare(nameB);
            });
            
        case 'name_desc':
            return sorted.sort((a, b) => {
                const nameA = a.fileName?.toLowerCase() || '';
                const nameB = b.fileName?.toLowerCase() || '';
                return nameB.localeCompare(nameA);
            });
            
        default:
            return sorted;
    }
}

// Display browse results
function displayBrowseResults(files) {
    const container = document.getElementById('browseResults');
    if (!container) return;
    
    if (files.length === 0) {
        const noResultsMsg = currentSearchTerm 
            ? `No files found for "${currentSearchTerm}"`
            : 'No files found in this category';
        
        container.innerHTML = `
            <div class="no-results" style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; color: #404090; margin-bottom: 20px;">
                    <i class="fas fa-search"></i>
                </div>
                <h3 style="color: white; margin-bottom: 10px;">${noResultsMsg}</h3>
                <p style="color: #a0a0d0; margin-bottom: 20px;">
                    Try a different search term or select another category
                </p>
                <button id="resetBrowseFilters" class="btn" style="background: #6a11cb; color: white; padding: 10px 20px; border-radius: 8px;">
                    <i class="fas fa-redo"></i> Reset Filters
                </button>
            </div>
        `;
        
        // Add reset button event
        const resetBtn = document.getElementById('resetBrowseFilters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                document.getElementById('clearFilters').click();
            });
        }
        
        return;
    }
    
    container.innerHTML = '';
    
    const filesGrid = document.createElement('div');
    filesGrid.className = 'files-grid';
    
    files.forEach(file => {
        filesGrid.appendChild(createFileCard(file, file.id, false));
    });
    
    container.appendChild(filesGrid);
}

// Update browse statistics
function updateBrowseStats(viewingCount) {
    // Update counts
    const totalCountEl = document.getElementById('browseTotalCount');
    const viewingCountEl = document.getElementById('browseViewingCount');
    const currentFilterEl = document.getElementById('currentFilter');
    
    if (totalCountEl) totalCountEl.textContent = allFilesCache.length;
    if (viewingCountEl) viewingCountEl.textContent = viewingCount;
    
    // Update filter indicator
    if (currentFilterEl) {
        let filterText = 'All';
        if (currentBrowseCategory !== 'all') {
            const activeTab = document.querySelector('.category-tab.active');
            filterText = activeTab ? activeTab.textContent.trim() : currentBrowseCategory;
        }
        currentFilterEl.textContent = filterText;
    }
}

// Enhanced loadAllFiles function
async function loadAllFiles() {
    const container = document.getElementById('browseResults');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-files"><div class="loading"></div><p>Loading resources...</p></div>';
    
    try {
        if (allFilesCache.length === 0) {
            await preloadAllFiles();
        }
        
        // Apply current filters
        applyBrowseFilters();
        
        // Initialize tab system if not already done
        const firstTab = document.querySelector('.category-tab');
        if (firstTab && !firstTab.hasEventListener) {
            initBrowseSection();
            firstTab.hasEventListener = true;
        }
        
    } catch (error) {
        console.error("Error loading files:", error);
        container.innerHTML = '<p class="no-files">Error loading files. Please try again.</p>';
    }
}

// ========== ENHANCED ADMIN PANEL ==========
async function loadAdminPanel() {
    console.log("Loading admin panel for role:", userRole);
    
    const adminSection = document.getElementById('adminSection');
    if (!adminSection) return;
    
    // Check permissions
    if (userRole !== 'owner' && userRole !== 'superadmin' && userRole !== 'admin') {
        adminSection.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h2 style="color: #ff4757;"><i class="fas fa-shield-alt"></i> Admin Access Required</h2>
                <p style="color: #a0a0d0;">This panel is available only to Admins and above.</p>
                <p style="color: #a0a0d0; margin-top: 20px;">Your role: <strong>${userRole}</strong></p>
            </div>
        `;
        return;
    }
    
    // Load admin components
    try {
        // Load user management (only owner can manage users)
        if (userRole === 'owner') {
            await loadUserManagement();
        } else {
            // Show restricted view for non-owners
            document.getElementById('adminUsersList').innerHTML = `
                <div style="text-align: center; padding: 30px; color: #a0a0d0;">
                    <i class="fas fa-lock" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <h3 style="color: white;">Owner Access Required</h3>
                    <p>Only the site owner can manage user roles.</p>
                    <p style="font-size: 12px; margin-top: 10px;">Your role: ${userRole}</p>
                </div>
            `;
        }
        
        // Load statistics (all admins can see)
        await loadRealStatistics();
        
        // Load super admin delete panel (superadmin+ can see)
        if (userRole === 'superadmin' || userRole === 'owner') {
            await loadSuperAdminDeletePanel();
        } else {
            // Hide delete panel for regular admins
            const deletePanelCard = document.querySelector('.admin-card:nth-child(4)');
            if (deletePanelCard) {
                deletePanelCard.innerHTML = `
                    <h3><i class="fas fa-trash-alt"></i> Super Admin Delete Panel</h3>
                    <div style="text-align: center; padding: 40px 20px; color: #a0a0d0;">
                        <i class="fas fa-shield-alt" style="font-size: 48px; margin-bottom: 15px; color: #6a11cb;"></i>
                        <h4 style="color: white;">Super Admin Access Required</h4>
                        <p>This panel requires Super Admin or Owner privileges.</p>
                        <p style="font-size: 12px; margin-top: 10px;">Your role: ${userRole}</p>
                    </div>
                `;
            }
        }
        
        // Setup event listeners
        setupAdminEventListeners();
        
        console.log("✅ Admin panel loaded successfully");
        
    } catch (error) {
        console.error("❌ Error loading admin panel:", error);
        adminSection.innerHTML = `
            <div style="color: #ff4757; padding: 40px; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3>Admin Panel Error</h3>
                <p>${error.message}</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #ff4757; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

// Load user management (Owner only)
async function loadUserManagement() {
    const usersList = document.getElementById('adminUsersList');
    if (!usersList) return;
    
    console.log("Loading user management...");
    
    usersList.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <div class="loading" style="width: 30px; height: 30px; margin: 0 auto 15px;"></div>
            <p style="color: #a0a0d0;">Loading users...</p>
        </div>
    `;
    
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = [];
        let adminCount = 0;
        let superAdminCount = 0;
        let ownerCount = 0;
        
        usersSnapshot.forEach(doc => {
            const user = { id: doc.id, ...doc.data() };
            users.push(user);
            if (user.role === 'admin') adminCount++;
            if (user.role === 'superadmin') superAdminCount++;
            if (user.role === 'owner') ownerCount++;
        });
        
        console.log(`Found ${users.length} users`);
        
        // Update mini stats
        const totalUsersEl = document.getElementById('totalUsersMini');
        const adminCountEl = document.getElementById('adminCountMini');
        const superAdminCountEl = document.getElementById('superAdminCountMini');
        
        if (totalUsersEl) totalUsersEl.textContent = users.length;
        if (adminCountEl) adminCountEl.textContent = adminCount;
        if (superAdminCountEl) superAdminCountEl.textContent = superAdminCount;
        
        if (users.length === 0) {
            usersList.innerHTML = '<p style="text-align: center; color: #a0a0d0; padding: 20px;">No users found.</p>';
            return;
        }
        
        let html = '';
        users.forEach(user => {
            const isCurrentUser = user.uid === currentUser.uid;
            const isOwner = user.role === 'owner';
            
            html += `
                <div class="user-management-item" data-email="${user.email.toLowerCase()}" data-name="${user.displayName?.toLowerCase() || ''}">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(40,40,70,0.3); border-radius: 8px; margin-bottom: 10px; border: 1px solid #404090;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${user.photoURL || 'assets/avatar.png'}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${user.role === 'owner' ? '#ff8c00' : user.role === 'superadmin' ? '#ff0080' : user.role === 'admin' ? '#6a11cb' : '#404090'};">
                            <div>
                                <strong>${user.displayName || user.username || 'No name'}</strong>
                                ${isCurrentUser ? ' <span style="background: #6a11cb; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">You</span>' : ''}
                                <div style="font-size: 12px; color: #a0a0d0;">${user.email}</div>
                                <div style="font-size: 11px; color: ${user.role === 'owner' ? '#ff8c00' : user.role === 'superadmin' ? '#ff0080' : user.role === 'admin' ? '#6a11cb' : '#a0a0d0'}">
                                    ${user.provider || 'email'} • ${user.role}
                                </div>
                            </div>
                        </div>
                        <div>
                            ${!isOwner ? `
                                <select class="user-role-select" data-uid="${user.uid}" 
                                        style="background: #1a1a2e; color: white; border: 1px solid #404090; padding: 8px; border-radius: 6px; min-width: 120px;">
                                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                    <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>Super Admin</option>
                                </select>
                            ` : `
                                <span style="color: #ff8c00; font-weight: bold; font-size: 14px;">OWNER</span>
                            `}
                        </div>
                    </div>
                </div>
            `;
        });
        
        usersList.innerHTML = html;
        
        // Add event listeners for role selects
        document.querySelectorAll('.user-role-select').forEach(select => {
            select.addEventListener('change', async function() {
                const uid = this.getAttribute('data-uid');
                const newRole = this.value;
                
                if (!confirm(`Change role to ${newRole}?`)) {
                    // Reset to original value
                    const userItem = this.closest('.user-management-item');
                    const originalRole = userItem.querySelector('.user-role-select option:checked')?.value || 'user';
                    this.value = originalRole;
                    return;
                }
                
                try {
                    const originalHTML = this.innerHTML;
                    this.innerHTML = '<div class="loading" style="width: 16px; height: 16px; border-width: 2px;"></div>';
                    this.disabled = true;
                    
                    await updateDoc(doc(db, 'users', uid), {
                        role: newRole,
                        updatedAt: serverTimestamp()
                    });
                    
                    showToast(`✅ Role updated to ${newRole}`, 'success');
                    
                    // Update UI
                    const userItem = this.closest('.user-management-item');
                    const userImg = userItem.querySelector('img');
                    if (userImg) {
                        userImg.style.borderColor = newRole === 'superadmin' ? '#ff0080' : 
                                                   newRole === 'admin' ? '#6a11cb' : '#404090';
                    }
                    
                    // Update mini stats
                    await loadUserManagement();
                    
                } catch (error) {
                    console.error("Role update error:", error);
                    showToast('❌ Failed to update role', 'error');
                    this.value = 'user';
                    this.disabled = false;
                }
            });
        });
        
    } catch (error) {
        console.error("Error loading users:", error);
        usersList.innerHTML = '<p style="color: #ff4757;">Error loading users</p>';
    }
}

// Load real statistics
async function loadRealStatistics() {
    try {
        // Total users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const totalUsersStat = document.getElementById('totalUsersStat');
        if (totalUsersStat) totalUsersStat.textContent = usersSnapshot.size;
        
        // Total files and downloads
        const filesSnapshot = await getDocs(collection(db, 'uploads'));
        let totalDownloads = 0;
        const categoryCounts = {
            mods: 0, scripts: 0, hud: 0, backups: 0, maps: 0, people: 0
        };
        
        filesSnapshot.forEach(doc => {
            const file = doc.data();
            totalDownloads += (file.downloads || 0);
            
            if (file.category && categoryCounts.hasOwnProperty(file.category)) {
                categoryCounts[file.category]++;
            }
        });
        
        const totalFilesStat = document.getElementById('totalFilesStat');
        const totalDownloadsStat = document.getElementById('totalDownloadsStat');
        
        if (totalFilesStat) totalFilesStat.textContent = filesSnapshot.size;
        if (totalDownloadsStat) totalDownloadsStat.textContent = totalDownloads;
        
        // Category statistics
        const categoryStatsEl = document.getElementById('categoryStats');
        if (categoryStatsEl) {
            let categoryHtml = '';
            for (const [category, count] of Object.entries(categoryCounts)) {
                const color = category === 'mods' ? '#ff0080' :
                            category === 'scripts' ? '#6a11cb' :
                            category === 'hud' ? '#00b894' :
                            category === 'backups' ? '#fdcb6e' :
                            category === 'maps' ? '#74b9ff' : '#55efc4';
                
                categoryHtml += `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(64,64,144,0.3);">
                        <span style="text-transform: capitalize; color: ${color};">${category}</span>
                        <span style="font-weight: bold; color: white;">${count}</span>
                    </div>
                `;
            }
            categoryStatsEl.innerHTML = categoryHtml;
        }
        
    } catch (error) {
        console.error("Error loading statistics:", error);
    }
}

// Load super admin delete panel
async function loadSuperAdminDeletePanel() {
    const deletePanel = document.getElementById('superAdminDeletePanel');
    if (!deletePanel) return;
    
    try {
        const q = query(collection(db, 'uploads'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            deletePanel.innerHTML = '<p style="text-align: center; color: #a0a0d0; padding: 20px;">No files to delete.</p>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const file = doc.data();
            const date = file.createdAt?.toDate ? file.createdAt.toDate().toLocaleDateString() : 'Recently';
            
            html += `
                <div class="delete-file-item" data-category="${file.category}" data-name="${file.fileName.toLowerCase()}">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(40,40,70,0.3); border-radius: 6px; margin-bottom: 8px; border: 1px solid #404090;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <span class="category-badge ${file.category}" style="font-size: 10px;">${file.category}</span>
                                <strong style="color: white; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.fileName}</strong>
                            </div>
                            <div style="font-size: 11px; color: #a0a0d0;">
                                By: ${file.uploaderName || 'Anonymous'} • ${date} • ${file.downloads || 0} downloads
                            </div>
                        </div>
                        <button class="btn admin-delete-btn" data-id="${doc.id}" data-name="${file.fileName}"
                                style="background: #ff4757; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-size: 12px; cursor: pointer; margin-left: 10px; white-space: nowrap;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        });
        
        deletePanel.innerHTML = html;
        
        // Add delete event listeners
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const fileId = btn.getAttribute('data-id');
                const fileName = btn.getAttribute('data-name');
                
                if (!confirm(`⚠️ Permanently delete "${fileName}"?\nThis action cannot be undone!`)) {
                    return;
                }
                
                try {
                    btn.innerHTML = '<div class="loading" style="width: 16px; height: 16px; border-width: 2px;"></div>';
                    btn.disabled = true;
                    
                    await deleteDoc(doc(db, 'uploads', fileId));
                    
                    // Remove from cache
                    allFilesCache = allFilesCache.filter(f => f.id !== fileId);
                    
                    // Remove from favorites if present
                    const favIndex = userFavorites.indexOf(fileId);
                    if (favIndex !== -1) {
                        userFavorites.splice(favIndex, 1);
                        localStorage.setItem(`favorites_${currentUser?.uid}`, JSON.stringify(userFavorites));
                        updateFavoritesCount();
                    }
                    
                    // Remove from UI
                    btn.closest('.delete-file-item').remove();
                    
                    showToast(`🗑️ "${fileName}" deleted permanently`, 'success');
                    
                    // Update statistics
                    await loadRealStatistics();
                    await updateCategoryCounts();
                    
                } catch (error) {
                    console.error("Delete error:", error);
                    showToast('❌ Delete failed', 'error');
                    btn.innerHTML = '<i class="fas fa-trash"></i> Delete';
                    btn.disabled = false;
                }
            });
        });
        
    } catch (error) {
        console.error("Error loading delete panel:", error);
        deletePanel.innerHTML = '<p style="color: #ff4757;">Error loading files</p>';
    }
}

// Setup admin event listeners
function setupAdminEventListeners() {
    // User search
    const searchInput = document.getElementById('searchUsers');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            document.querySelectorAll('.user-management-item').forEach(item => {
                const email = item.getAttribute('data-email');
                const name = item.getAttribute('data-name');
                const matches = email.includes(searchTerm) || name.includes(searchTerm);
                item.style.display = matches ? 'block' : 'none';
            });
        });
    }
    
    // Add admin by email (Owner only)
    const addAdminBtn = document.getElementById('addAdminBtn');
    if (addAdminBtn && userRole === 'owner') {
        addAdminBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('addAdminEmail');
            const email = emailInput.value.trim();
            
            if (!email) {
                showToast('❌ Please enter an email address', 'error');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast('❌ Invalid email format', 'error');
                return;
            }
            
            // Get selected role
            const roleOption = document.querySelector('input[name="adminRole"]:checked');
            const role = roleOption ? roleOption.value : 'admin';
            
            try {
                addAdminBtn.innerHTML = '<div class="loading"></div> Assigning...';
                addAdminBtn.disabled = true;
                
                // Find user by email
                console.log(`Searching for user with email: ${email}`);
                const q = query(collection(db, 'users'), where('email', '==', email));
                const querySnapshot = await getDocs(q);
                
                if (querySnapshot.empty) {
                    showToast('❌ User not found with that email', 'error');
                    addAdminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Assign Role';
                    addAdminBtn.disabled = false;
                    return;
                }
                
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                console.log("Found user:", userData);
                
                // Prevent modifying owner
                if (userData.role === 'owner') {
                    showToast('❌ Cannot modify owner role', 'error');
                    addAdminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Assign Role';
                    addAdminBtn.disabled = false;
                    return;
                }
                
                // Prevent self-modification
                if (userData.uid === currentUser.uid) {
                    showToast('❌ Cannot modify your own role', 'error');
                    addAdminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Assign Role';
                    addAdminBtn.disabled = false;
                    return;
                }
                
                // Update the user's role
                await updateDoc(doc(db, 'users', userDoc.id), {
                    role: role,
                    updatedAt: serverTimestamp()
                });
                
                showToast(`✅ ${email} promoted to ${role}`, 'success');
                emailInput.value = '';
                
                // Refresh user list
                await loadUserManagement();
                
            } catch (error) {
                console.error("Add admin error:", error.code, error.message);
                
                let errorMessage = '❌ Failed to assign role';
                if (error.code === 'permission-denied') {
                    errorMessage = '⛔ Permission denied. Firestore rules may be blocking this.';
                } else if (error.code === 'not-found') {
                    errorMessage = '🔍 User document not found in database.';
                } else if (error.message.includes('index')) {
                    errorMessage = '⚠️ Firestore index required. Check console for link.';
                }
                
                showToast(errorMessage, 'error');
            } finally {
                addAdminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Assign Role';
                addAdminBtn.disabled = false;
            }
        });
    }
    
    // Role option styling
    const roleOptions = document.querySelectorAll('.role-option');
    if (roleOptions.length > 0) {
        roleOptions.forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.role-option').forEach(opt => {
                    opt.style.background = 'rgba(40,40,70,0.3)';
                    opt.style.borderColor = '#404090';
                });
                
                this.style.background = this.querySelector('input').value === 'admin' 
                    ? 'rgba(106,17,203,0.2)' 
                    : 'rgba(255,0,128,0.2)';
                this.style.borderColor = this.querySelector('input').value === 'admin' 
                    ? '#6a11cb' 
                    : '#ff0080';
                
                // Check the radio
                this.querySelector('input').checked = true;
            });
            
            // Set initial selection
            if (option.querySelector('input').checked) {
                option.style.background = option.querySelector('input').value === 'admin' 
                    ? 'rgba(106,17,203,0.2)' 
                    : 'rgba(255,0,128,0.2)';
                option.style.borderColor = option.querySelector('input').value === 'admin' 
                    ? '#6a11cb' 
                    : '#ff0080';
            }
        });
    }
    
    // Delete panel filters
    const deleteCategoryFilter = document.getElementById('deleteCategoryFilter');
    const deleteSearch = document.getElementById('deleteSearch');
    
    if (deleteCategoryFilter) {
        deleteCategoryFilter.addEventListener('change', filterDeletePanel);
    }
    
    if (deleteSearch) {
        deleteSearch.addEventListener('input', filterDeletePanel);
    }
}

// Filter delete panel
function filterDeletePanel() {
    const categoryFilter = document.getElementById('deleteCategoryFilter')?.value || 'all';
    const searchTerm = document.getElementById('deleteSearch')?.value.toLowerCase() || '';
    
    const deleteItems = document.querySelectorAll('.delete-file-item');
    if (deleteItems.length === 0) return;
    
    deleteItems.forEach(item => {
        const category = item.getAttribute('data-category');
        const name = item.getAttribute('data-name');
        
        const categoryMatch = categoryFilter === 'all' || category === categoryFilter;
        const nameMatch = !searchTerm || name.includes(searchTerm);
        
        item.style.display = categoryMatch && nameMatch ? 'block' : 'none';
    });
}

// ========== AUTH STATE ==========
onAuthStateChanged(auth, async (firebaseUser) => {
    console.log("Auth state changed:", firebaseUser ? "User found" : "No user");
    
    if (!firebaseUser) {
        console.log("Redirecting to login...");
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = firebaseUser;
    userEmail = firebaseUser.email;
    console.log("Current user email:", userEmail);
    
    // Set temporary UI while loading
    if (userNameEl) {
        userNameEl.textContent = firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'User';
    }
    
    // Load user data (this will setup everything else)
    await loadUserData(firebaseUser.uid);
});

// ========== LOAD DASHBOARD DATA ==========
async function loadDashboardData() {
    try {
        console.log("Loading dashboard data...");
        
        // Load files count
        if (totalFilesEl) {
            const filesSnap = await getDocs(collection(db, 'uploads'));
            totalFilesEl.textContent = filesSnap.size;
        }
        
        // Random live users
        if (liveUsersEl) {
            liveUsersEl.textContent = Math.floor(Math.random() * 50) + 20;
        }
        
        // Load category counts
        await updateCategoryCounts();
        
        // Load recent files
        await loadRecentFiles();
        
        // Preload all files for browsing
        await preloadAllFiles();
        
    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
}

// ========== UPDATE CATEGORY COUNTS ==========
async function updateCategoryCounts() {
    const categories = ['mods', 'scripts', 'hud', 'backups', 'maps', 'people'];
    
    for (const category of categories) {
        try {
            const q = query(collection(db, 'uploads'), where('category', '==', category));
            const snapshot = await getDocs(q);
            const countEl = document.getElementById(`${category}Count`);
            if (countEl) {
                countEl.textContent = `${snapshot.size} files`;
            }
        } catch (error) {
            console.error(`Error counting ${category}:`, error);
        }
    }
}

// ========== LOAD RECENT FILES ==========
async function loadRecentFiles() {
    try {
        const q = query(collection(db, 'uploads'), orderBy('createdAt', 'desc'), limit(6));
        const snapshot = await getDocs(q);
        const container = document.getElementById('recentFilesList');
        
        if (!container) return;
        
        if (!snapshot.empty) {
            container.innerHTML = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                container.appendChild(createFileCard(data, doc.id, false));
            });
        }
        
    } catch (error) {
        console.error("Error loading recent files:", error);
    }
}

// ========== PRELOAD ALL FILES ==========
async function preloadAllFiles() {
    try {
        const q = query(collection(db, 'uploads'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        allFilesCache = [];
        
        snapshot.forEach(doc => {
            allFilesCache.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Preloaded ${allFilesCache.length} files`);
        
    } catch (error) {
        console.error("Error preloading files:", error);
    }
}

// ========== HANDLE FILE UPLOAD ==========
async function handleFileUpload() {
    const fileName = document.getElementById('fileName')?.value.trim();
    const category = document.getElementById('fileCategory')?.value;
    const downloadUrl = document.getElementById('fileDownloadUrl')?.value.trim();
    const imageUrl = document.getElementById('fileImageUrl')?.value.trim();
    
    if (!fileName || !downloadUrl || !imageUrl) {
        showToast('❌ All fields are required.', 'error');
        return;
    }
    
    if (!canUploadToCategory(category)) {
        showToast(`⛔ You cannot upload to ${category}. Users can only upload to "People's Uploads".`, 'error');
        return;
    }
    
    if (submitUploadBtn) {
        submitUploadBtn.disabled = true;
        submitUploadBtn.innerHTML = '<div class="loading"></div> Uploading...';
    }
    
    try {
        const fileData = {
            uid: currentUser.uid,
            fileName: fileName,
            fileURL: downloadUrl,
            imageUrl: imageUrl,
            category: category,
            description: document.getElementById('fileDescription')?.value.trim() || '',
            version: document.getElementById('fileVersion')?.value.trim() || '1.0',
            uploaderName: userNameEl?.textContent || 'Anonymous',
            uploaderEmail: userEmail,
            uploaderAvatar: userAvatarEl?.src || '',
            downloads: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, 'uploads'), fileData);
        
        // Add to cache
        allFilesCache.unshift({
            id: docRef.id,
            ...fileData
        });
        
        // Clear form
        document.getElementById('fileName').value = '';
        document.getElementById('fileDownloadUrl').value = '';
        document.getElementById('fileImageUrl').value = '';
        document.getElementById('fileDescription').value = '';
        document.getElementById('fileVersion').value = '';
        
        // Update UI
        await updateCategoryCounts();
        await loadRecentFiles();
        
        showToast('✅ File uploaded successfully!', 'success');
        
        // Switch to My Files
        setTimeout(() => {
            const myFilesNav = document.querySelector('[data-section="myfiles"]');
            if (myFilesNav) myFilesNav.click();
        }, 1000);
        
    } catch (error) {
        console.error("Upload error:", error);
        showToast('❌ Upload failed: ' + error.message, 'error');
    } finally {
        if (submitUploadBtn) {
            submitUploadBtn.disabled = false;
            submitUploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Publish Resource';
        }
    }
}

// ========== CREATE FILE CARD ==========
function createFileCard(data, docId, showDelete = false) {
    const fileCard = document.createElement('div');
    fileCard.className = 'file-card';
    
    const categoryClass = data.category || 'people';
    const icon = getFileIcon(data.category);
    const isFavorited = isFileFavorited(docId);
    
    // Format date
    let date = 'Recently';
    if (data.createdAt) {
        if (data.createdAt.toDate) {
            date = data.createdAt.toDate().toLocaleDateString();
        } else if (data.createdAt.seconds) {
            date = new Date(data.createdAt.seconds * 1000).toLocaleDateString();
        }
    }
    
    // Delete button
    const canDelete = canDeleteFile(data.uid);
    
    fileCard.innerHTML = `
        <div class="file-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="file-info">
            <div class="file-title">${data.fileName || 'Unnamed Resource'}</div>
            <div class="file-meta">
                <span class="category-badge ${categoryClass}">${data.category || 'people'}</span>
                <span><i class="fas fa-user"></i> ${data.uploaderName || 'Anonymous'}</span>
                <span><i class="fas fa-calendar"></i> ${date}</span>
                <span><i class="fas fa-download"></i> ${data.downloads || 0}</span>
                ${isFavorited ? '<span><i class="fas fa-star" style="color: #ffd700;"></i> Favorited</span>' : ''}
            </div>
            ${data.description ? `<div class="file-description">${data.description}</div>` : ''}
            ${data.version ? `<div class="file-version"><strong>Version:</strong> ${data.version}</div>` : ''}
            ${data.imageUrl ? `<img src="${data.imageUrl}" class="preview-img" alt="Preview" onerror="this.src='assets/logo.png'">` : ''}
        </div>
        <div class="file-actions">
            <button class="btn favorite-btn" data-id="${docId}" title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                <i class="fas ${isFavorited ? 'fa-star' : 'fa-star'}"></i>
            </button>
            <button class="btn download-btn" data-url="${data.fileURL}" title="Download ${data.fileName}">
                <i class="fas fa-download"></i> Download
            </button>
            ${canDelete && showDelete ? `
                <button class="btn delete-btn" data-id="${docId}" title="Delete this file">
                    <i class="fas fa-trash"></i> Delete
                </button>
            ` : ''}
        </div>
    `;
    
    // Add favorite button event listener
    const favoriteBtn = fileCard.querySelector('.favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', () => {
            const fileId = favoriteBtn.getAttribute('data-id');
            const isNowFavorited = toggleFavorite(fileId);
            
            // Update button icon
            const icon = favoriteBtn.querySelector('i');
            if (isNowFavorited) {
                icon.className = 'fas fa-star';
                icon.style.color = '#ffd700';
                favoriteBtn.title = 'Remove from favorites';
                
                // Add favorited badge to meta
                const meta = fileCard.querySelector('.file-meta');
                if (!meta.innerHTML.includes('fa-star')) {
                    const starSpan = document.createElement('span');
                    starSpan.innerHTML = '<i class="fas fa-star" style="color: #ffd700;"></i> Favorited';
                    meta.appendChild(starSpan);
                }
            } else {
                icon.className = 'fas fa-star';
                icon.style.color = '#a0a0d0';
                favoriteBtn.title = 'Add to favorites';
                
                // Remove favorited badge
                const meta = fileCard.querySelector('.file-meta');
                const starSpan = meta.querySelector('span:has(.fa-star)');
                if (starSpan) {
                    starSpan.remove();
                }
            }
        });
        
        // Style favorite button
        if (isFavorited) {
            favoriteBtn.querySelector('i').style.color = '#ffd700';
        }
    }
    
    // Download button
    const downloadBtn = fileCard.querySelector('.download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            window.open(data.fileURL, '_blank');
            incrementDownloadCount(docId);
        });
    }
    
    // Delete button
    const deleteBtn = fileCard.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!confirm('Delete this file?')) return;
            
            try {
                deleteBtn.innerHTML = '<div class="loading"></div>';
                deleteBtn.disabled = true;
                
                await deleteDoc(doc(db, 'uploads', docId));
                
                // Remove from cache
                allFilesCache = allFilesCache.filter(f => f.id !== docId);
                
                // Remove from favorites
                const favIndex = userFavorites.indexOf(docId);
                if (favIndex !== -1) {
                    userFavorites.splice(favIndex, 1);
                    localStorage.setItem(`favorites_${currentUser?.uid}`, JSON.stringify(userFavorites));
                    updateFavoritesCount();
                }
                
                // Remove from UI
                fileCard.remove();
                
                showToast('✅ File deleted', 'success');
                updateCategoryCounts();
                
            } catch (error) {
                console.error("Delete error:", error);
                showToast('❌ Delete failed', 'error');
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.disabled = false;
            }
        });
    }
    
    return fileCard;
}

// ========== SETUP EVENT LISTENERS ==========
function setupEventListeners() {
    console.log("Setting up event listeners");
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.content-section').forEach(sec => {
                sec.classList.remove('active');
            });
            
            const sectionElement = document.getElementById(`${section}Section`);
            if (sectionElement) {
                sectionElement.classList.add('active');
            }
            
            // Update page title
            const pageTitle = document.getElementById('pageTitle');
            if (pageTitle) {
                const iconText = item.querySelector('i').nextSibling.textContent.trim();
                pageTitle.textContent = iconText;
            }
            
            // Load section-specific content
            if (section === 'browse') {
                setTimeout(() => {
                    loadAllFiles();
                    initBrowseSection();
                }, 100);
            } else if (section === 'myfiles') {
                loadMyFiles();
            } else if (section === 'favorites') {
                loadFavorites();
            } else if (section === 'admin') {
                if (userRole === 'owner' || userRole === 'superadmin' || userRole === 'admin') {
                    loadAdminPanel();
                } else {
                    showToast('⛔ Admin access required', 'error');
                    // Switch back to home
                    document.querySelector('[data-section="home"]').click();
                }
            }
        });
    });
    
    // Upload button
    if (submitUploadBtn) {
        submitUploadBtn.addEventListener('click', handleFileUpload);
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Logout error:", error);
                showToast('Logout failed', 'error');
            }
        });
    }
    
    // Cancel upload
    const cancelBtn = document.getElementById('cancelUpload');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('fileName').value = '';
            document.getElementById('fileDownloadUrl').value = '';
            document.getElementById('fileImageUrl').value = '';
            document.getElementById('fileDescription').value = '';
            document.getElementById('fileVersion').value = '';
        });
    }
    
    // Search (top bar)
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(e.target.value);
            }, 500);
        });
    }
    
    // Category buttons on home page
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            const browseNav = document.querySelector('[data-section="browse"]');
            if (browseNav) {
                browseNav.click();
                setTimeout(() => {
                    filterByCategory(category);
                }, 200);
            }
        });
    });
}

// ========== LOAD MY FILES ==========
async function loadMyFiles() {
    const container = document.getElementById('myFilesList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-files"><div class="loading"></div><p>Loading your files...</p></div>';
    
    try {
        if (!currentUser) return;
        
        let myFiles = [];
        
        if (allFilesCache.length === 0) {
            await preloadAllFiles();
        }
        
        myFiles = allFilesCache.filter(file => file.uid === currentUser.uid);
        
        if (myFiles.length > 0) {
            container.innerHTML = '';
            myFiles.forEach(file => {
                container.appendChild(createFileCard(file, file.id, true));
            });
        } else {
            container.innerHTML = '<p class="no-files">You haven\'t uploaded any files yet.</p>';
        }
        
    } catch (error) {
        console.error("Error loading my files:", error);
        container.innerHTML = '<p class="no-files">Error loading files</p>';
    }
}

// ========== HELPER FUNCTIONS ==========
function getFileIcon(category) {
    const icons = {
        'mods': 'tools',
        'scripts': 'code',
        'hud': 'layer-group',
        'backups': 'archive',
        'maps': 'map',
        'people': 'users'
    };
    return icons[category] || 'file';
}

async function incrementDownloadCount(docId) {
    try {
        await updateDoc(doc(db, 'uploads', docId), {
            downloads: increment(1)
        });
        
        // Update cache
        const fileIndex = allFilesCache.findIndex(f => f.id === docId);
        if (fileIndex !== -1) {
            allFilesCache[fileIndex].downloads = (allFilesCache[fileIndex].downloads || 0) + 1;
        }
    } catch (error) {
        console.error("Download count error:", error);
    }
}

// ========== SEARCH & FILTER ==========
window.performSearch = function(searchTerm) {
    // If we're in browse section, use the new search input
    if (document.getElementById('browseSection')?.classList.contains('active')) {
        const browseSearchInput = document.getElementById('browseSearchInput');
        if (browseSearchInput) {
            browseSearchInput.value = searchTerm;
            browseSearchInput.dispatchEvent(new Event('input'));
        }
        return;
    }
    
    // Fallback to old search for other sections
    const container = document.getElementById('browseResults');
    if (!container) return;
    
    if (!searchTerm || searchTerm.trim() === '') {
        displayFiles(allFilesCache, container, false);
        return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const filteredFiles = allFilesCache.filter(file => 
        (file.fileName && file.fileName.toLowerCase().includes(term)) ||
        (file.description && file.description.toLowerCase().includes(term)) ||
        (file.category && file.category.toLowerCase().includes(term)) ||
        (file.uploaderName && file.uploaderName.toLowerCase().includes(term))
    );
    
    displayFiles(filteredFiles, container, false);
};

// Keep the old displayFiles function for compatibility
function displayFiles(files, container, isFavoritesSection = false) {
    if (!container) return;
    
    if (files.length === 0) {
        container.innerHTML = '<p class="no-files">No files found</p>';
        return;
    }
    
    container.innerHTML = '';
    
    const filesGrid = document.createElement('div');
    filesGrid.className = 'files-grid';
    
    files.forEach(file => {
        filesGrid.appendChild(createFileCard(file, file.id, !isFavoritesSection));
    });
    
    container.appendChild(filesGrid);
}

// Category filter function (backward compatible)
window.filterByCategory = function(category) {
    // If we're in browse section, click the appropriate tab
    if (document.getElementById('browseSection')?.classList.contains('active')) {
        const tab = document.querySelector(`.category-tab[data-category="${category}"]`);
        if (tab) {
            tab.click();
        } else {
            // If category doesn't have a tab, filter directly
            const filtered = allFilesCache.filter(file => file.category === category);
            const container = document.getElementById('browseResults');
            if (container) {
                displayFiles(filtered, container, false);
            }
        }
    } else {
        // If not in browse section, switch to browse and then filter
        const browseNav = document.querySelector('[data-section="browse"]');
        if (browseNav) {
            browseNav.click();
            setTimeout(() => {
                const tab = document.querySelector(`.category-tab[data-category="${category}"]`);
                if (tab) {
                    tab.click();
                } else {
                    // Fallback to direct filtering
                    currentBrowseCategory = category;
                    applyBrowseFilters();
                }
            }, 300);
        }
    }
};

// ========== INITIALIZE ==========
window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard initialized");
});
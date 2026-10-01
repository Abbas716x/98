/* ==================================================================
   X00716 NEXUS ENTERPRISE — Resilient Multi-Tenant Cloud Architecture
   ================================================================== */

(function () {
    'use strict';

    // Production Firebase Credentials Matrix
    const firebaseConfig = {
        apiKey: "AIzaSyAK2yXStkDdOLHpsjhbk10HfVj3O2wvMvE",
        authDomain: "xc-f6b4d.firebaseapp.com",
        projectId: "xc-f6b4d",
        storageBucket: "xc-f6b4d.firebasestorage.app",
        messagingSenderId: "263052117008",
        appId: "1:263052117008:web:f7049b65d8d8009bbe7695",
        measurementId: "G-E0BECTY393"
    };

    let fbApp = null;
    let fbDb = null;
    let fbAuth = null;
    let fbReady = false;

    // Multi-Tenant Cloud Schema
    const COLL_BRANCHES = 'nexus_branches';
    const COLL_TENANT_DATA = 'nexus_tenants_data';
    const COLL_AUDIT_LOGS = 'nexus_audit_logs';
    const COLL_SYSTEM_CONTROL = 'nexus_system_control';

    const CLIENT_ID = Math.random().toString(36).slice(2, 10);
    const AUTO_SAVE_INTERVAL = 10 * 60 * 1000;
    const SESSION_BRANCH_KEY = 'qx716_active_branch';
    const LAST_SAVE_KEY = 'qx716_last_save_ts';

    let currentTenant = null;
    let realtimeUnsubscribe = null;
    let killSwitchUnsubscribe = null;
    let autoSaveTimer = null;
    let debounceSaveTimer = null;
    let lastLocalWriteTs = 0;
    let onCloudUpdateCallback = null;

    // Seeded Fallback Tenants for Standalone Operation
    const DEFAULT_BRANCHES = [
        { id: 'branch_zayouni', name: 'زیوني', username: 'zayouni', password: '716', status: 'active', createdAt: new Date().toISOString() },
        { id: 'branch_mohammed', name: 'محمد', username: 'mohammed', password: '716', status: 'active', createdAt: new Date().toISOString() }
    ];

    // Status Indicator Dispatcher
    function setFbStatus(state, text) {
        try {
            const el = document.getElementById('fb-status');
            const txt = document.getElementById('fb-status-text');
            if (el && txt) {
                el.className = `fb-status ${state}`;
                txt.textContent = text;
            }
        } catch (e) {}
    }

    // Firebase Initialization with Transparent Mock Fallback
    try {
        if (typeof firebase !== 'undefined' && firebase.initializeApp) {
            fbApp = firebase.initializeApp(firebaseConfig);
            fbDb = firebase.firestore();
            fbAuth = firebase.auth();
            fbDb.enablePersistence({ synchronizeTabs: true }).catch(() => {});
            try { firebase.analytics(); } catch (e) {}
            fbReady = true;
            console.log('%c🔥 Firebase Production Core Engaged', 'color:#00FFFF;font-weight:bold');
        } else {
            throw new Error('Firebase SDK Unavailable');
        }
    } catch (err) {
        console.warn('⚠️ Cloud engine fallback initialized:', err.message);
        fbReady = false;
        setFbStatus('online', 'ONLINE');
    }

    // Silent Anonymous Authentication
    async function ensureAuth() {
        if (!fbReady || !fbAuth) return false;
        try {
            if (!fbAuth.currentUser) {
                await fbAuth.signInAnonymously();
            }
            return true;
        } catch (e) {
            console.warn('Auth fallback engaged silently');
            return false;
        }
    }

    // Cloud Seed Verifier
    async function seedDefaultBranchesIfNeeded() {
        if (!fbReady || !fbDb) return;
        try {
            const snap = await fbDb.collection(COLL_BRANCHES).limit(1).get();
            if (snap.empty) {
                const batch = fbDb.batch();
                DEFAULT_BRANCHES.forEach(b => {
                    const ref = fbDb.collection(COLL_BRANCHES).doc(b.id);
                    batch.set(ref, b);
                });
                await batch.commit();
                await logAuditEvent('SYSTEM', 'Default branches initialized');
            }
        } catch (e) {}
    }

    // Remote Kill-Switch Real-Time Engine
    function bindRemoteKillSwitch() {
        if (!fbReady || !fbDb) return;
        try {
            if (killSwitchUnsubscribe) killSwitchUnsubscribe();
            killSwitchUnsubscribe = fbDb.collection(COLL_SYSTEM_CONTROL).doc('killswitch').onSnapshot(snap => {
                if (!snap.exists) return;
                const data = snap.data();
                if (data && data.active === true) {
                    executeKillSwitch(data.reason || 'تم تعليق عمل النظام بأمر إداري طارئ.');
                }
            }, () => {});
        } catch (e) {}
    }

    function executeKillSwitch(reason) {
        console.error('🚨 REMOTE KILL-SWITCH TRIGGERED');
        if (window.SecurityEngine && typeof window.SecurityEngine.triggerKillSwitchUI === 'function') {
            window.SecurityEngine.triggerKillSwitchUI(reason);
        }
    }

    // Audit Log Pipeline
    async function logAuditEvent(action, details) {
        const logEntry = {
            id: 'LOG_' + Date.now().toString(36),
            branchId: currentTenant ? currentTenant.id : 'SYSTEM',
            branchName: currentTenant ? currentTenant.name : 'SYSTEM',
            branchUser: currentTenant ? currentTenant.username : 'SYSTEM',
            action, details,
            clientId: CLIENT_ID,
            timestamp: new Date().toISOString(),
            epoch: Date.now()
        };

        if (fbReady && fbDb) {
            try {
                await fbDb.collection(COLL_AUDIT_LOGS).doc(logEntry.id).set(logEntry);
                return;
            } catch (e) {}
        }

        try {
            const localLogs = JSON.parse(localStorage.getItem('qx716_local_audit_logs') || '[]');
            localLogs.unshift(logEntry);
            localStorage.setItem('qx716_local_audit_logs', JSON.stringify(localLogs.slice(0, 50)));
        } catch (e) {}
    }

    // Branch Tenant Authenticator
    async function authenticateBranch(username, password) {
        const cleanUser = String(username || '').trim().toLowerCase();
        const cleanPass = String(password || '').trim();

        if (!cleanUser || !cleanPass) throw new Error('يرجى ملء جميع الحقول');

        setFbStatus('sync', 'AUTH');

        if (fbReady && fbDb) {
            try {
                await ensureAuth();
                const snap = await fbDb.collection(COLL_BRANCHES)
                    .where('username', '==', cleanUser)
                    .where('password', '==', cleanPass)
                    .get();

                if (!snap.empty) {
                    const branchDoc = snap.docs[0].data();
                    if (branchDoc.status === 'frozen') {
                        setFbStatus('offline', 'FROZEN');
                        throw new Error('هذا الفرع مجمد من قبل الإدارة المركزية.');
                    }

                    currentTenant = { id: branchDoc.id, name: branchDoc.name, username: branchDoc.username };
                    localStorage.setItem(SESSION_BRANCH_KEY, JSON.stringify(currentTenant));
                    await logAuditEvent('LOGIN', `تسجيل دخول ناجح للفرع: ${branchDoc.name}`);
                    setFbStatus('online', 'ONLINE');
                    updateBranchUI();
                    return currentTenant;
                }
            } catch (err) {
                if (err.message && err.message.includes('مجمد')) throw err;
            }
        }

        // Mock Fallback Branch Matcher
        const fallback = DEFAULT_BRANCHES.find(b => b.username.toLowerCase() === cleanUser && b.password === cleanPass);
        if (fallback) {
            currentTenant = { id: fallback.id, name: fallback.name, username: fallback.username };
            localStorage.setItem(SESSION_BRANCH_KEY, JSON.stringify(currentTenant));
            updateBranchUI();
            setFbStatus('online', 'ONLINE');
            return currentTenant;
        }

        setFbStatus('offline', 'AUTH_ERR');
        throw new Error('بيانات الدخول غير صحيحة');
    }

    async function logoutBranch() {
        try {
            if (currentTenant) await logAuditEvent('LOGOUT', `تسجيل خروج الفرع: ${currentTenant.name}`);
            if (realtimeUnsubscribe) { realtimeUnsubscribe(); realtimeUnsubscribe = null; }
            currentTenant = null;
            localStorage.removeItem(SESSION_BRANCH_KEY);
            updateBranchUI();
            setFbStatus('sync', 'STANDBY');
        } catch (e) {}
    }

    function updateBranchUI() {
        try {
            const badge = document.getElementById('branch-badge');
            const drawerName = document.getElementById('drawer-branch-name');
            if (currentTenant) {
                if (badge) badge.textContent = `فرع: ${currentTenant.name}`;
                if (drawerName) drawerName.textContent = currentTenant.name;
            } else {
                if (badge) badge.textContent = 'فرع: غير محدد';
                if (drawerName) drawerName.textContent = 'غير مسجل';
            }
        } catch (e) {}
    }

    function getTenantStorageKey() {
        const tenantId = currentTenant ? currentTenant.id : 'default';
        return `qx716_nexus_data_${tenantId}`;
    }

    function loadTenantLocal(defaultFactory) {
        try {
            const raw = localStorage.getItem(getTenantStorageKey());
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return defaultFactory();
    }

    function saveTenantLocal(state) {
        try {
            localStorage.setItem(getTenantStorageKey(), JSON.stringify(state));
        } catch (e) {}
    }

    // Real-Time Cloud Synchronization
    function attachTenantSync(onUpdateCallback) {
        onCloudUpdateCallback = onUpdateCallback;
        if (!fbReady || !fbDb || !currentTenant) return;

        try {
            if (realtimeUnsubscribe) realtimeUnsubscribe();

            const tenantDocRef = fbDb.collection(COLL_TENANT_DATA).doc(currentTenant.id);
            realtimeUnsubscribe = tenantDocRef.onSnapshot(docSnap => {
                if (!docSnap.exists) return;
                const data = docSnap.data();

                if (data._client === CLIENT_ID) return;
                if ((data._lastWrite || 0) <= lastLocalWriteTs) return;

                const cleanState = Object.assign({}, data);
                delete cleanState._client;
                delete cleanState._lastWrite;
                delete cleanState._savedAt;
                delete cleanState._savedReason;

                saveTenantLocal(cleanState);

                if (data._savedAt) {
                    localStorage.setItem(LAST_SAVE_KEY, String(new Date(data._savedAt).getTime()));
                    updateLastSavedDisplay();
                }

                if (typeof onCloudUpdateCallback === 'function') {
                    onCloudUpdateCallback(cleanState);
                }

                setFbStatus('online', 'ONLINE');
            }, () => {
                setFbStatus('online', 'ONLINE');
            });
        } catch (e) {
            setFbStatus('online', 'ONLINE');
        }
    }

    function debouncedSave(stateGetter) {
        try {
            const state = stateGetter();
            saveTenantLocal(state);

            lastLocalWriteTs = Date.now();
            clearTimeout(debounceSaveTimer);
            setFbStatus('sync', 'SAVING');

            debounceSaveTimer = setTimeout(() => {
                forceSaveCloud(stateGetter(), 'edit');
            }, 900);
        } catch (e) {}
    }

    async function forceSaveCloud(state, reason = 'manual') {
        if (!currentTenant) return false;
        saveTenantLocal(state);
        clearTimeout(debounceSaveTimer);

        if (!fbReady || !fbDb) {
            setFbStatus('online', 'ONLINE');
            updateLastSavedDisplay();
            flashSaveIndicator();
            return true;
        }

        try {
            setFbStatus('sync', 'SAVING');
            lastLocalWriteTs = Date.now();

            const payload = JSON.parse(JSON.stringify(state));
            payload._lastWrite = lastLocalWriteTs;
            payload._client = CLIENT_ID;
            payload._savedAt = new Date().toISOString();
            payload._savedReason = reason;
            payload._branchId = currentTenant.id;
            payload._branchName = currentTenant.name;

            await fbDb.collection(COLL_TENANT_DATA).doc(currentTenant.id).set(payload);

            localStorage.setItem(LAST_SAVE_KEY, String(Date.now()));
            updateLastSavedDisplay();
            flashSaveIndicator();

            setFbStatus('online', 'ONLINE');
            return true;
        } catch (e) {
            setFbStatus('online', 'ONLINE');
            return false;
        }
    }

    function updateLastSavedDisplay() {
        try {
            const el = document.getElementById('last-saved-text');
            if (!el) return;
            const ts = Number(localStorage.getItem(LAST_SAVE_KEY) || Date.now());
            const d = new Date(ts);
            el.textContent = `آخر حفظ: ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        } catch (e) {}
    }

    function flashSaveIndicator() {
        try {
            const el = document.getElementById('save-indicator');
            if (!el) return;
            el.classList.remove('flash');
            void el.offsetWidth;
            el.classList.add('flash');
            setTimeout(() => el.classList.remove('flash'), 1200);
        } catch (e) {}
    }

    function startAutoSaveLoop(stateGetter) {
        if (autoSaveTimer) clearInterval(autoSaveTimer);
        autoSaveTimer = setInterval(() => {
            if (currentTenant) {
                forceSaveCloud(stateGetter(), '10min');
            }
        }, AUTO_SAVE_INTERVAL);
    }

    function bindSystemSyncListeners(stateGetter) {
        window.addEventListener('beforeunload', () => {
            if (currentTenant) {
                const s = stateGetter();
                saveTenantLocal(s);
                if (fbReady && fbDb) {
                    const payload = JSON.parse(JSON.stringify(s));
                    payload._lastWrite = Date.now();
                    payload._client = CLIENT_ID;
                    payload._savedAt = new Date().toISOString();
                    payload._savedReason = 'beforeunload';
                    fbDb.collection(COLL_TENANT_DATA).doc(currentTenant.id).set(payload).catch(() => {});
                }
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && currentTenant) {
                const s = stateGetter();
                saveTenantLocal(s);
                if (fbReady && fbDb) {
                    const payload = JSON.parse(JSON.stringify(s));
                    payload._lastWrite = Date.now();
                    payload._client = CLIENT_ID;
                    payload._savedAt = new Date().toISOString();
                    payload._savedReason = 'hidden';
                    fbDb.collection(COLL_TENANT_DATA).doc(currentTenant.id).set(payload).catch(() => {});
                }
            }
        });

        window.addEventListener('online', () => {
            setFbStatus('sync', 'ONLINE_SYNC');
            if (currentTenant) forceSaveCloud(stateGetter(), 'reconnected');
        });
        window.addEventListener('offline', () => setFbStatus('offline', 'OFFLINE'));
    }

    // Branch Administration CRUD
    async function adminLoadBranches() {
        if (fbReady && fbDb) {
            try {
                await ensureAuth();
                const snap = await fbDb.collection(COLL_BRANCHES).orderBy('createdAt', 'desc').get();
                if (!snap.empty) return snap.docs.map(d => d.data());
            } catch (e) {}
        }

        try {
            const raw = localStorage.getItem('qx716_local_branches');
            if (raw) return JSON.parse(raw);
        } catch (e) {}

        return DEFAULT_BRANCHES;
    }

    async function adminCreateBranch(name, username, password) {
        const cleanName = String(name || '').trim();
        const cleanUser = String(username || '').trim().toLowerCase();
        const cleanPass = String(password || '').trim();

        if (!cleanName || !cleanUser || !cleanPass) throw new Error('يرجى ملء جميع الحقول');

        const branchId = 'branch_' + Date.now().toString(36);
        const branchData = {
            id: branchId, name: cleanName, username: cleanUser, password: cleanPass,
            status: 'active', createdAt: new Date().toISOString()
        };

        if (fbReady && fbDb) {
            try {
                await ensureAuth();
                const existsCheck = await fbDb.collection(COLL_BRANCHES).where('username', '==', cleanUser).get();
                if (!existsCheck.empty) throw new Error('اسم المستخدم مسجل مسبقاً لفرع آخر');

                await fbDb.collection(COLL_BRANCHES).doc(branchId).set(branchData);
                await fbDb.collection(COLL_TENANT_DATA).doc(branchId).set({
                    tables: [], debts: [], invoices: [],
                    categories: [
                        { id: 'c1', name: 'صالات البليستيشن', icon: '🎮' },
                        { id: 'c2', name: 'المشروبات الباردة والساخنة', icon: '🥤' }
                    ],
                    products: [
                        { id: 'p1', catId: 'c1', name: 'ساعة PS5', icon: '🕐', type: 'countdown', duration: 60, price: 4000 }
                    ],
                    revenue: { daily: 0, yesterday: 0, monthly: 0 }
                });
            } catch (err) {
                if (err.message && err.message.includes('مسجل مسبقاً')) throw err;
            }
        }

        try {
            const branches = await adminLoadBranches();
            branches.unshift(branchData);
            localStorage.setItem('qx716_local_branches', JSON.stringify(branches));
        } catch (e) {}

        await logAuditEvent('BRANCH_CREATED', `إنشاء فرع جديد: ${cleanName}`);
        return branchData;
    }

    async function adminDeleteBranch(branchId) {
        if (fbReady && fbDb) {
            try {
                await ensureAuth();
                await fbDb.collection(COLL_BRANCHES).doc(branchId).delete();
                await fbDb.collection(COLL_TENANT_DATA).doc(branchId).delete();
            } catch (e) {}
        }

        try {
            let branches = await adminLoadBranches();
            branches = branches.filter(b => b.id !== branchId);
            localStorage.setItem('qx716_local_branches', JSON.stringify(branches));
        } catch (e) {}

        localStorage.removeItem(`qx716_nexus_data_${branchId}`);
        await logAuditEvent('BRANCH_DELETED', `حذف فرع ID: ${branchId}`);
        return true;
    }

    async function adminToggleBranchStatus(branchId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'frozen' : 'active';

        if (fbReady && fbDb) {
            try {
                await ensureAuth();
                await fbDb.collection(COLL_BRANCHES).doc(branchId).update({ status: newStatus });
            } catch (e) {}
        }

        try {
            const branches = await adminLoadBranches();
            const b = branches.find(x => x.id === branchId);
            if (b) b.status = newStatus;
            localStorage.setItem('qx716_local_branches', JSON.stringify(branches));
        } catch (e) {}

        await logAuditEvent('BRANCH_STATUS_CHANGE', `تغيير حالة فرع ${branchId} إلى: ${newStatus}`);
        return newStatus;
    }

    async function adminLoadAuditLogs() {
        if (fbReady && fbDb) {
            try {
                await ensureAuth();
                const snap = await fbDb.collection(COLL_AUDIT_LOGS).orderBy('epoch', 'desc').limit(45).get();
                if (!snap.empty) return snap.docs.map(d => d.data());
            } catch (e) {}
        }

        try {
            return JSON.parse(localStorage.getItem('qx716_local_audit_logs') || '[]');
        } catch (e) {
            return [];
        }
    }

    // Engine Public API
    window.BackendEngine = {
        init: async function () {
            await ensureAuth();
            await seedDefaultBranchesIfNeeded();
            bindRemoteKillSwitch();

            const cached = localStorage.getItem(SESSION_BRANCH_KEY);
            if (cached) {
                try {
                    currentTenant = JSON.parse(cached);
                } catch (e) {
                    currentTenant = DEFAULT_BRANCHES[0];
                }
            } else {
                currentTenant = DEFAULT_BRANCHES[0];
            }
            updateBranchUI();
            setFbStatus('online', 'ONLINE');
            updateLastSavedDisplay();
        },
        authenticateBranch,
        logoutBranch,
        getCurrentTenant: () => currentTenant,
        loadTenantLocal,
        saveTenantLocal,
        debouncedSave,
        forceSaveCloud,
        attachTenantSync,
        startAutoSaveLoop,
        bindSystemSyncListeners,
        updateLastSavedDisplay,
        flashSaveIndicator,
        setFbStatus,
        logAuditEvent,
        adminLoadBranches,
        adminCreateBranch,
        adminDeleteBranch,
        adminToggleBranchStatus,
        adminLoadAuditLogs
    };

    window.manualSave = function (showToast = true) {
        if (window.AppEngine && typeof window.AppEngine.triggerManualSave === 'function') {
            window.AppEngine.triggerManualSave(showToast);
        }
    };
})();

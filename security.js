/* ==================================================================
   XQD716 NEXUS 6.0 — Enterprise Security & Kill-Switch Enforcer
   ================================================================== */

(function () {
    'use strict';

    const ADMIN_SECRET_PASS = '19682008';
    const overlay = document.getElementById('security-breach-overlay');
    const killswitchOverlay = document.getElementById('killswitch-overlay');
    const killswitchMsg = document.getElementById('killswitch-msg');
    let breachActive = false;
    let killSwitchActive = false;

    // Trigger Screen Blur & Security Overlay
    function triggerBreach(reason) {
        if (breachActive || killSwitchActive) return;
        breachActive = true;
        console.warn('🚨 SECURITY BREACH DETECTED:', reason);

        try {
            if (overlay) {
                overlay.classList.remove('hidden');
            }
            if (window.BackendEngine && typeof window.BackendEngine.logAuditEvent === 'function') {
                window.BackendEngine.logAuditEvent('SECURITY_BREACH_DETECTED', `محاولة فحص أمني: ${reason}`);
            }
        } catch (e) {}
    }

    // Dismiss Security Overlay
    function dismissWarning() {
        if (overlay) {
            overlay.classList.add('hidden');
        }
        breachActive = false;
    }

    // 🔒 Remote Kill-Switch Enforcer (Freezes App Instantly)
    function triggerKillSwitchUI(reasonText) {
        killSwitchActive = true;
        try {
            if (killswitchMsg) {
                killswitchMsg.textContent = reasonText || 'تم تعليق عمل النظام أو إيقاف ترخيص هذا الفرع بأمر سحابي مركزي طارئ.';
            }
            if (killswitchOverlay) {
                killswitchOverlay.classList.remove('hidden');
            }
            // Close all active open modals
            document.querySelectorAll('.modal-bd').forEach(m => m.style.display = 'none');
            const drawer = document.getElementById('drawer');
            if (drawer) drawer.classList.remove('open');
        } catch (e) {}
    }

    // Block Context Menu (Right Click)
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        triggerBreach('Right-click / Context Menu Attempt');
        return false;
    }, { capture: true });

    // Block DevTools & Inspection Shortcuts
    document.addEventListener('keydown', function (e) {
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        const key = e.key ? e.key.toUpperCase() : '';
        const keyCode = e.keyCode || e.which;

        // F12 Key
        if (keyCode === 123 || key === 'F12') {
            e.preventDefault();
            e.stopPropagation();
            triggerBreach('F12 DevTools Attempt');
            return false;
        }

        // Ctrl + Shift + I/J/C (Inspect / Console / Selector)
        if (isCtrlOrCmd && e.shiftKey && (key === 'I' || key === 'J' || key === 'C' || keyCode === 73 || keyCode === 74 || keyCode === 67)) {
            e.preventDefault();
            e.stopPropagation();
            triggerBreach('Ctrl+Shift+I/J/C Inspect Attempt');
            return false;
        }

        // Ctrl + U (View Source)
        if (isCtrlOrCmd && (key === 'U' || keyCode === 85)) {
            e.preventDefault();
            e.stopPropagation();
            triggerBreach('Ctrl+U View Source Attempt');
            return false;
        }

        // Ctrl + S (Save Page)
        if (isCtrlOrCmd && (key === 'S' || keyCode === 83)) {
            e.preventDefault();
            e.stopPropagation();
            triggerBreach('Ctrl+S Save Page Attempt');
            return false;
        }
    }, { capture: true });

    // DevTools Dimension Expansion Check
    function checkDevToolsDimensions() {
        if (killSwitchActive) return;
        const threshold = 175;
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;

        if (widthDiff || heightDiff) {
            triggerBreach('DevTools Dimension Expansion');
        }
    }

    window.addEventListener('resize', checkDevToolsDimensions);

    // ==================== STEALTH MASTER ADMIN OPERATIONS ====================

    // Secret Password Verification Prompt
    async function promptAdminPassword() {
        try {
            if (!window.DialogEngine || typeof window.DialogEngine.prompt !== 'function') {
                const pass = prompt('🔐 أدخل رمز التحقق السري للأدمن:');
                if (pass === ADMIN_SECRET_PASS) {
                    await openMasterAdminPanel();
                    return true;
                }
                alert('رمز الحماية غير صحيح!');
                return false;
            }

            const inputKey = await window.DialogEngine.prompt(
                'أدخل رمز التحقق السري للدخول إلى لوحة المدير العام (Master Admin):',
                'التحقق الأمني المركزي'
            );

            if (inputKey === ADMIN_SECRET_PASS) {
                await openMasterAdminPanel();
                return true;
            } else if (inputKey !== null) {
                window.DialogEngine.alert('رمز الحماية غير صحيح! تم رفض الوصول وتسجيل المحاولة في سجل الأمان.', 'خطأ أمني');
                if (window.BackendEngine && typeof window.BackendEngine.logAuditEvent === 'function') {
                    window.BackendEngine.logAuditEvent('FAILED_ADMIN_LOGIN', 'محاولة فاشلة لدخول الأدمن برمز خاطئ');
                }
                return false;
            }
        } catch (e) {
            console.warn('Silent error in admin password prompt:', e);
        }
        return false;
    }

    // Open & Populate Master Admin Panel
    async function openMasterAdminPanel() {
        try {
            const modal = document.getElementById('modal-stealth-admin');
            if (!modal) return;

            modal.style.display = 'flex';
            await renderAdminBranches();
            await renderAdminAuditLogs();
        } catch (e) {}
    }

    // Render Branches with Live Status, Freeze, and Delete Actions
    async function renderAdminBranches() {
        const container = document.getElementById('admin-branches-list');
        if (!container || !window.BackendEngine) return;

        container.innerHTML = `<div class="text-xs text-gray-400 text-center py-4 font-tajawal">جاري تحميل الفروع السحابية...</div>`;

        try {
            const branches = await window.BackendEngine.adminLoadBranches();
            if (branches.length === 0) {
                container.innerHTML = `<div class="text-xs text-gray-500 text-center py-4 font-tajawal">لا توجد فروع مسجلة</div>`;
                return;
            }

            container.innerHTML = branches.map(b => {
                const isFrozen = b.status === 'frozen';
                return `
                    <div class="glass p-3 flex items-center justify-between gap-3 text-xs font-tajawal">
                        <div>
                            <div class="font-bold text-white flex items-center gap-2">
                                <span>${escapeHtml(b.name)}</span>
                                <span class="badge ${isFrozen ? 'badge-expired' : 'badge-live'} text-[9px]">
                                    ${isFrozen ? 'مجمد ❄️' : 'نشط ●'}
                                </span>
                            </div>
                            <div class="text-[10px] text-cyan-400 font-mono mt-0.5">user: ${escapeHtml(b.username)}</div>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button class="btn btn-ghost py-1 px-2.5 text-[10px] ${isFrozen ? 'text-emerald-400 border-emerald-500/40' : 'text-yellow-400 border-yellow-500/40'}"
                                    title="${isFrozen ? 'إلغاء التجميد' : 'تجميد الفرع'}"
                                    onclick="window.SecurityEngine.toggleBranchFreeze('${b.id}', '${b.status}')">
                                ${isFrozen ? '▶ تفعيل' : '❄️ تجميد'}
                            </button>
                            <button class="btn btn-danger py-1 px-2.5 text-[10px]"
                                    title="حذف الفرع وبياناته نهائياً"
                                    onclick="window.SecurityEngine.handleDeleteBranch('${b.id}', '${escapeHtml(b.name)}')">
                                🗑️ حذف
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            container.innerHTML = `<div class="text-xs text-red-400 text-center py-2 font-tajawal">تعذر جلب الفروع</div>`;
        }
    }

    // Render Audit Logs
    async function renderAdminAuditLogs() {
        const container = document.getElementById('admin-audit-logs');
        if (!container || !window.BackendEngine) return;

        container.innerHTML = `<div class="text-[10px] text-gray-400 text-center py-3 font-tajawal">جاري تحميل سجل المراقبة...</div>`;

        try {
            const logs = await window.BackendEngine.adminLoadAuditLogs();
            if (logs.length === 0) {
                container.innerHTML = `<div class="text-[10px] text-gray-500 text-center py-3 font-tajawal">لا توجد سجلات بعد</div>`;
                return;
            }

            container.innerHTML = logs.map(l => {
                const time = l.timestamp ? new Date(l.timestamp).toLocaleTimeString('en-GB') : '--:--:--';
                const date = l.timestamp ? new Date(l.timestamp).toISOString().slice(0, 10) : '';
                return `
                    <div class="p-2 rounded bg-black/40 border border-white/5 flex items-start justify-between gap-2">
                        <div>
                            <span class="text-cyan-400 font-bold">[${escapeHtml(l.action)}]</span>
                            <span class="text-gray-300 ml-1 font-tajawal">${escapeHtml(l.details || '')}</span>
                            <span class="text-fuchsia-400 block text-[9px]">الفرع: ${escapeHtml(l.branchName || 'النظام')} (${escapeHtml(l.branchUser || '-')})</span>
                        </div>
                        <div class="text-right text-[9px] text-gray-500 whitespace-nowrap font-mono">
                            <div>${time}</div>
                            <div>${date}</div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            container.innerHTML = `<div class="text-[10px] text-red-400 text-center py-2 font-tajawal">تعذر جلب سجلات المراقبة</div>`;
        }
    }

    // Create New Branch Handler
    async function handleAdminCreateBranch() {
        const nameEl = document.getElementById('admin-new-branch-name');
        const userEl = document.getElementById('admin-new-branch-user');
        const passEl = document.getElementById('admin-new-branch-pass');

        const name = nameEl.value.trim();
        const user = userEl.value.trim();
        const pass = passEl.value.trim();

        if (!name || !user || !pass) {
            if (window.DialogEngine) window.DialogEngine.alert('يرجى ملء جميع حقول الفرع الجديد', 'تنبيه');
            return;
        }

        try {
            await window.BackendEngine.adminCreateBranch(name, user, pass);
            nameEl.value = '';
            userEl.value = '';
            passEl.value = '';
            if (window.DialogEngine) {
                await window.DialogEngine.alert(`تم إنشاء وتفعيل الفرع بنجاح:\nالاسم: ${name}\nالمستخدم: ${user}\nالبيانات معزولة في وثيقة سحابية مستقلة.`, 'نجاح الإنشاء');
            }
            await renderAdminBranches();
            await renderAdminAuditLogs();
        } catch (err) {
            if (window.DialogEngine) window.DialogEngine.alert(err.message, 'خطأ في الإنشاء');
        }
    }

    // Delete Branch Handler (With Strict Confirmation)
    async function handleDeleteBranch(branchId, branchName) {
        if (!window.DialogEngine || !window.BackendEngine) return;

        const ok = await window.DialogEngine.confirm(
            `⚠️ تحذير نهائي: هل أنت متأكد من حذف فرع "${branchName}" بالكامل؟\n\nسيتم مسح وثيقة الفرع السحابية، وجميع الطاولات والديون والفواتير التابعة له نهائياً بدون إمكانية التراجع!`,
            'حذف فرع نهائياً'
        );

        if (!ok) return;

        try {
            await window.BackendEngine.adminDeleteBranch(branchId);
            await renderAdminBranches();
            await renderAdminAuditLogs();
            window.DialogEngine.alert(`تم حذف فرع "${branchName}" وكافة بياناته المعزولة بنجاح.`, 'تأكيد الحذف');
        } catch (err) {
            window.DialogEngine.alert(err.message, 'خطأ في الحذف');
        }
    }

    // Toggle Freeze on Branch
    async function toggleBranchFreeze(branchId, currentStatus) {
        if (!window.BackendEngine) return;
        try {
            await window.BackendEngine.adminToggleBranchStatus(branchId, currentStatus);
            await renderAdminBranches();
            await renderAdminAuditLogs();
        } catch (e) {
            console.error('Failed to toggle branch status:', e);
        }
    }

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }

    // Expose Security Engine Globally
    window.SecurityEngine = {
        dismissWarning,
        triggerKillSwitchUI,
        promptAdminPassword,
        openMasterAdminPanel,
        renderAdminBranches,
        renderAdminAuditLogs,
        handleAdminCreateBranch,
        handleDeleteBranch,
        toggleBranchFreeze
    };
})();

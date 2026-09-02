// ============================================================
// FUSION EDUCATION BD — DATA ACCESS OBJECT (DAO)
// Production API-driven with LocalStorage fallback resilience
// ============================================================

(function (global) {
    'use strict';

    const STORAGE_PREFIX = 'fusion_edu_';

    function getLocal(key, defaultValue = []) {
        try {
            const val = localStorage.getItem(STORAGE_PREFIX + key);
            return val ? JSON.parse(val) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    function setLocal(key, val) {
        try {
            localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
        } catch (e) {
            console.warn('[DAO] LocalStorage write failed:', e.message);
        }
    }

    // Helper to resolve backend port across Live Server (5500) and Node server (3000)
    function getApiUrl(endpoint) {
        if (!endpoint || !endpoint.startsWith('/')) return endpoint;
        if (window.location.port === '3000') return endpoint;
        return 'http://localhost:3000' + endpoint;
    }

    // Universal API Caller
    async function apiFetch(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        };
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const url = getApiUrl(endpoint);
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                return { 
                    success: false, 
                    error: errData.error || errData.message || `HTTP ${response.status}: ${response.statusText}` 
                };
            }
            return await response.json();
        } catch (error) {
            console.warn(`[DAO] ${method} ${url} network note:`, error.message);
            return null; // Signals to use LocalStorage fallback
        }
    }

    // Generic Resource Helper
    function createResource(resourceKey, endpoint) {
        return {
            async getAll() {
                let res = await apiFetch(endpoint);
                if ((!res || !res.success) && endpoint === '/api/admissions') {
                    res = await apiFetch('/api/admission');
                }
                if (res && res.success && Array.isArray(res[resourceKey])) {
                    setLocal(resourceKey, res[resourceKey]);
                    return res[resourceKey];
                }
                // Static file fallback for Live Server / offline mode
                try {
                    const directRes = await fetch(`../data/${resourceKey}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
                    if (Array.isArray(directRes)) {
                        if (resourceKey === 'admissions') {
                            const studentsData = await fetch('../data/students.json').then(r => r.ok ? r.json() : null).catch(() => null);
                            if (Array.isArray(studentsData)) {
                                const existingIds = new Set(directRes.map(a => String(a.applicationNumber || a.id).toLowerCase()));
                                studentsData.forEach(s => {
                                    const safeAppNo = s.applicationNumber || s.identifier || s.id;
                                    if (!existingIds.has(String(safeAppNo).toLowerCase())) {
                                        existingIds.add(String(safeAppNo).toLowerCase());
                                        directRes.push({
                                            id: s.id || safeAppNo,
                                            applicationId: safeAppNo,
                                            applicationNumber: safeAppNo,
                                            fullName: s.fullName || s.name || s.studentName || 'Student Name',
                                            email: s.email || '',
                                            phone: s.phone || '',
                                            dateOfBirth: s.dateOfBirth || '',
                                            gender: s.gender || 'male',
                                            address: s.address || '',
                                            city: s.city || (s.branch ? `${s.branch} City` : 'Dinajpur'),
                                            district: s.district || s.branch || 'Dinajpur',
                                            highestEducation: s.highestEducation || 'HSC',
                                            course: s.course || s.courseName || 'JLPT N5',
                                            courseLevel: s.courseLevel || 'N5',
                                            branch: (s.branch || 'dinajpur').toLowerCase(),
                                            batch: s.batch || 'Batch 01',
                                            status: s.status || 'admitted',
                                            photoUrl: s.photoUrl || s.photo || s.avatar || '../assets/images/student-placeholder.jpg',
                                            submittedAt: s.enrollmentDate || s.submittedAt || new Date().toISOString(),
                                            documents: s.documents || [],
                                            payments: s.payments || []
                                        });
                                    }
                                });
                            }
                        }

                        // Preserving locally created items so static file read doesn't wipe them!
                        const localItems = getLocal(resourceKey, []);
                        if (Array.isArray(localItems) && localItems.length > 0) {
                            const directKeys = new Set(directRes.map(x => String(x.id || x.applicationNumber || x.email || '').toLowerCase()));
                            localItems.forEach(item => {
                                const key = String(item.id || item.applicationNumber || item.email || '').toLowerCase();
                                if (key && !directKeys.has(key)) {
                                    directRes.unshift(item);
                                }
                            });
                        }

                        setLocal(resourceKey, directRes);
                        return directRes;
                    }
                } catch (_) {}
                return getLocal(resourceKey, []);
            },
            async add(item) {
                const res = await apiFetch(endpoint, 'POST', item);
                if (res && res.success) {
                    const list = getLocal(resourceKey, []);
                    const createdItem = res[resourceKey.slice(0, -1)] || res.user || res.student || res.item || { ...item, id: res.id || ('id_' + Date.now()) };
                    list.unshift(createdItem);
                    setLocal(resourceKey, list);
                    return res;
                }
                if (res && res.error) {
                    // Return actual server error message to caller
                    return res;
                }
                // Local fallback
                const list = getLocal(resourceKey, []);
                const newItem = { ...item, id: item.id || ('local_' + Date.now()), createdAt: new Date().toISOString() };
                list.unshift(newItem);
                setLocal(resourceKey, list);
                return { success: true, message: 'Saved locally', [resourceKey.slice(0, -1)]: newItem, id: newItem.id };
            },
            async create(item) {
                return this.add(item);
            },
            async update(id, updatedFields) {
                const res = await apiFetch(`${endpoint}/${id}`, 'PUT', updatedFields);
                const list = getLocal(resourceKey, []);
                const index = list.findIndex(item => String(item.id) === String(id));
                if (index !== -1) {
                    list[index] = { ...list[index], ...updatedFields, id };
                    setLocal(resourceKey, list);
                }
                if (res && res.success) return res;
                if (res && res.error) return res;
                return { success: true, message: 'Updated locally' };
            },
            async delete(id) {
                const res = await apiFetch(`${endpoint}/${id}`, 'DELETE');
                let list = getLocal(resourceKey, []);
                list = list.filter(item => 
                    String(item.id) !== String(id) && 
                    String(item.applicationNumber) !== String(id) && 
                    String(item.applicationId) !== String(id)
                );
                setLocal(resourceKey, list);
                if (res && res.success) return res;
                if (res && res.error) return res;
                return { success: true, message: 'Deleted locally' };
            }
        };
    }

    const Courses         = createResource('courses', '/api/courses');
    const Posts           = createResource('posts', '/api/posts');
    const Testimonials    = createResource('testimonials', '/api/testimonials');
    const Faqs            = createResource('faqs', '/api/faqs');
    const Gallery         = createResource('gallery', '/api/gallery');
    const ContactMessages = createResource('contactMessages', '/api/contactMessages');
    const Admissions      = createResource('admissions', '/api/admissions');
    const Users           = createResource('users', '/api/admin/users');
    const Branches        = createResource('branches', '/api/branches');

    const AuditLogs = {
        async getAll(params = {}) {
            const qs = new URLSearchParams(params).toString();
            const res = await apiFetch('/api/admin/audit-logs' + (qs ? `?${qs}` : ''));
            if (res && res.success && Array.isArray(res.logs)) {
                return res.logs;
            }
            try {
                const direct = await fetch('../data/auditLogs.json').then(r => r.ok ? r.json() : null).catch(() => null);
                if (Array.isArray(direct)) return direct;
            } catch (_) {}
            return [];
        }
    };

    const Permissions = {
        async getCatalog() {
            const res = await apiFetch('/api/permissions');
            if (res && res.success && res.categories) {
                return res.categories;
            }
            try {
                const direct = await fetch('../data/permissions.json').then(r => r.ok ? r.json() : null).catch(() => null);
                if (direct && direct.categories) return direct.categories;
            } catch (_) {}
            return [];
        }
    };

    function applyBrandColors(brandColors) {
        if (!brandColors) return;
        const fusionColor = brandColors.fusionColor || '#FFFFFF';
        const educationColor = brandColors.educationColor || '#00AEEF';

        document.documentElement.style.setProperty('--logo-fusion-color', fusionColor);
        document.documentElement.style.setProperty('--logo-education-color', educationColor);

        document.querySelectorAll('.logo-fusion').forEach(el => el.style.color = fusionColor);
        document.querySelectorAll('.logo-education').forEach(el => el.style.color = educationColor);
    }

    const Settings = {
        async get() {
            const res = await apiFetch('/api/settings');
            if (res && res.success && res.settings) {
                setLocal('settings', res.settings);
                applyBrandColors(res.settings.brandColors);
                return res.settings;
            }
            const local = getLocal('settings', {});
            applyBrandColors(local.brandColors);
            return local;
        },
        async save(data) {
            const current = getLocal('settings', {});
            const merged = { ...current, ...data };
            setLocal('settings', merged);
            applyBrandColors(merged.brandColors);
            const res = await apiFetch('/api/settings', 'POST', data);
            if (res && res.success) return res;
            return { success: true, message: 'Settings saved locally', settings: merged };
        }
    };

    const Storage = {
        async upload(file, folder = 'uploads') {
            if (!file) return null;
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        }
    };

    global.DAO = {
        Settings,
        Courses,
        Posts,
        Testimonials,
        Faqs,
        ContactMessages,
        Admissions,
        Users,
        Branches,
        AuditLogs,
        Permissions,
        Storage,
        applyBrandColors
    };

    // Auto-apply cached brand colors on instant load
    try {
        const cachedSettings = getLocal('settings', {});
        if (cachedSettings.brandColors) {
            applyBrandColors(cachedSettings.brandColors);
        }
    } catch (_) {}

    console.log('[DAO] Fusion Education BD Data Access Object initialized ✅');

}(window));

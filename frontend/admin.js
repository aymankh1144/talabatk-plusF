/* ============================================
   admin.js - النسخة النهائية مع JWT وإصلاح الحذف
   ============================================ */

const isLocalAdmin = window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.startsWith('192.168.')||
                      window.location.hostname.startsWith('26.');   //
const API_BASE = isLocalAdmin
    ? `http://${window.location.hostname}:3000/api`
    : 'https://drivers.talabatukplus.com/api';

let adminToken = localStorage.getItem('admin_token') || '';
let currentSettings = {};

// ======================== دوال تسجيل الدخول ========================

async function checkAuth() {
    console.log('🔑 checkAuth called');
    const passInput = document.getElementById('adminPassword').value.trim();
    if (!passInput) {
        alert('❌ يرجى إدخال كلمة المرور');
        return;
    }
    await login(passInput);
}

async function login(password) {
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await response.json();
        if (data.ok) {
            adminToken = data.token;
            localStorage.setItem('admin_token', adminToken);
            await loadSettingsAfterAuth();
        } else {
            alert('❌ كلمة المرور غير صحيحة');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('❌ فشل الاتصال بالخادم');
    }
}

async function loadSettingsAfterAuth() {
    try {
        console.log('📥 loading settings...');
        const response = await fetch(`${API_BASE}/settings`);
        if (!response.ok) throw new Error('فشل جلب الإعدادات');

        currentSettings = await response.json();

        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('adminContent').classList.remove('hidden');

        // تعبئة جميع الحقول
        document.getElementById('whatsappNumber').value = currentSettings.whatsappNumber || '';
        document.getElementById('facebookUrl').value = currentSettings.facebookUrl || '';
        document.getElementById('instagramUrl').value = currentSettings.instagramUrl || '';
        document.getElementById('appStoreUrl').value = currentSettings.appStoreUrl || '';
        document.getElementById('googlePlayUrl').value = currentSettings.googlePlayUrl || '';
        document.getElementById('apkUrl').value = currentSettings.apkUrl || '';

        // تعبئة معرفات التلغرام
        if (currentSettings.telegramChatIds) {
            document.getElementById('telegramChatIds').value = currentSettings.telegramChatIds.join('\n');
        }

        renderVideos();
    } catch (error) {
        console.error('loadSettingsAfterAuth error:', error);
        alert('⚠️ تعذر الاتصال بالخادم. تحقق من تشغيل السيرفر المحلي.');
    }
}

function logout() {
    console.log('🚪 logout called');
    localStorage.removeItem('admin_token');
    location.reload();
}

async function autoLogin() {
    if (!adminToken) return;
    try {
        console.log('🔄 autoLogin attempt...');
        const response = await fetch(`${API_BASE}/admin/verify`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        if (response.ok) {
            await loadSettingsAfterAuth();
        } else {
            console.log('⛔ Token invalid, removing...');
            localStorage.removeItem('admin_token');
            adminToken = '';
        }
    } catch (error) {
        console.log('Auto-login failed: server not reachable', error);
    }
}

// ======================== إدارة الفيديوهات ========================

function renderVideos() {
    const list = document.getElementById('videosList');
    if (!currentSettings.videos || currentSettings.videos.length === 0) {
        list.innerHTML = '<p class="text-zinc-400 text-center col-span-2">لا توجد فيديوهات مضافة بعد</p>';
        return;
    }

    // إنشاء HTML مع الحفاظ على onclick
    let html = currentSettings.videos.map((video, index) => {
        const safeVideo = DOMPurify.sanitize(video); // تنظيف الرابط فقط
        return `
            <div class="bg-zinc-50 p-4 rounded-2xl border flex flex-col gap-4">
                <div class="h-32 bg-zinc-200 rounded-xl overflow-hidden flex items-center justify-center text-zinc-400">
                    فيديو ${index + 1}
                </div>
                <div class="flex-1 text-sm truncate font-mono text-zinc-500">${safeVideo}</div>
                <button onclick="deleteVideo(${index})" class="text-red-500 font-bold hover:text-red-700 transition-colors">حذف</button>
            </div>
        `;
    }).join('');

    // السماح ببقاء خاصية onclick أثناء التنظيف
    list.innerHTML = DOMPurify.sanitize(html, { ADD_ATTR: ['onclick'] });
}

async function addVideo() {
    console.log('➕ addVideo called');
    const url = document.getElementById('newVideoUrl').value.trim();
    if (!url) return alert('📹 يرجى وضع رابط الفيديو');
    if (!currentSettings.videos) currentSettings.videos = [];
    currentSettings.videos.push(url);
    await saveSettings();
    document.getElementById('newVideoUrl').value = '';
    renderVideos();
    alert('✅ تمت إضافة الفيديو بنجاح');
}

async function deleteVideo(index) {
    console.log('🗑️ deleteVideo called', index);
    if (!confirm('هل أنت متأكد من حذف هذا الفيديو؟')) return;
    if (!currentSettings.videos || index < 0 || index >= currentSettings.videos.length) return;
    currentSettings.videos.splice(index, 1);
    await saveSettings();
    renderVideos();
    alert('✅ تم حذف الفيديو');
}

// ======================== دوال الحفظ ========================

async function saveSettings() {
    try {
        console.log('💾 saving settings...');
        const response = await fetch(`${API_BASE}/admin/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(currentSettings)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.description || 'غير مصرح');
        }
        console.log('✅ settings saved');
    } catch (error) {
        console.error('Save error:', error);
        alert(`⚠️ فشل الحفظ: ${error.message}. قد تحتاج لتسجيل الدخول مجدداً.`);
        if (error.message.includes('غير مصرح') || error.message.includes('Unauthorized')) {
            logout();
        }
    }
}

async function updateWhatsApp() {
    console.log('📞 updateWhatsApp called');
    const num = document.getElementById('whatsappNumber').value.trim();
    if (!num) return alert('📞 يرجى وضع الرقم');
    currentSettings.whatsappNumber = num;
    await saveSettings();
    alert('✅ تم حفظ رقم الواتساب بنجاح');
}

async function updateFacebook() {
    console.log('📘 updateFacebook called');
    const url = document.getElementById('facebookUrl').value.trim();
    currentSettings.facebookUrl = url;
    await saveSettings();
    alert('✅ تم حفظ رابط فيسبوك');
}

async function updateInstagram() {
    console.log('📷 updateInstagram called');
    const url = document.getElementById('instagramUrl').value.trim();
    currentSettings.instagramUrl = url;
    await saveSettings();
    alert('✅ تم حفظ رابط إنستغرام');
}

async function updateAppStore() {
    console.log('🍏 updateAppStore called');
    const url = document.getElementById('appStoreUrl').value.trim();
    currentSettings.appStoreUrl = url;
    await saveSettings();
    alert('✅ تم حفظ رابط App Store');
}

async function updateGooglePlay() {
    console.log('📱 updateGooglePlay called');
    const url = document.getElementById('googlePlayUrl').value.trim();
    currentSettings.googlePlayUrl = url;
    await saveSettings();
    alert('✅ تم حفظ رابط Google Play');
}

async function updateApk() {
    console.log('📦 updateApk called');
    const url = document.getElementById('apkUrl').value.trim();
    currentSettings.apkUrl = url;
    await saveSettings();
    alert('✅ تم حفظ رابط APK');
}

async function updateTelegramChatIds() {
    console.log('📋 updateTelegramChatIds called');
    const textarea = document.getElementById('telegramChatIds');
    const lines = textarea.value.trim().split('\n').map(line => line.trim()).filter(line => line !== '');
    if (lines.length === 0) {
        return alert('❌ يرجى إدخال معرف واحد على الأقل');
    }
    currentSettings.telegramChatIds = lines;
    await saveSettings();
    alert('✅ تم حفظ معرفات الدردشات بنجاح');
}

// ربط الدوال بالنطاق العام
window.checkAuth = checkAuth;
window.logout = logout;
window.addVideo = addVideo;
window.deleteVideo = deleteVideo;
window.updateWhatsApp = updateWhatsApp;
window.updateFacebook = updateFacebook;
window.updateInstagram = updateInstagram;
window.updateAppStore = updateAppStore;
window.updateGooglePlay = updateGooglePlay;
window.updateApk = updateApk;
window.updateTelegramChatIds = updateTelegramChatIds;

// بدء المحاولة التلقائية
autoLogin();

console.log('✅ admin.js loaded with JWT support and fixed delete');
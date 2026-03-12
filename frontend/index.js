/* ============================================
   index.js - طلباتك بلس - الصفحة الرئيسية
   ============================================ */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api' 
    : 'https://drivers.talabatukplus.com/api';

// ---- تأثير العداد (Counter Animation) ----
function animateCounter(id, target, duration = 2000, suffix = '') {
    let start = 0;
    const increment = target / (duration / 16);
    const el = document.getElementById(id);
    if (!el) return;

    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            clearInterval(timer);
            el.textContent = Math.floor(target) + suffix;
        } else {
            el.textContent = Math.floor(start) + suffix;
        }
    }, 16);
}

// ---- مراقب التمرير للـ Fade-in والعدادات ----
function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                if (entry.target.id === 'stats') {
                    animateCounter('stat1', 35);
                    animateCounter('stat2', 2800, 1800);
                    animateCounter('stat3', 136);
                    animateCounter('stat4', 93, 1200, '%');
                }
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('section').forEach(section => {
        section.classList.add('fade-in');
        observer.observe(section);
    });

    const statsEl = document.getElementById('stats');
    if (statsEl) observer.observe(statsEl);
}

// ---- جلب الإعدادات الديناميكية ----
// داخل دالة loadDynamicSettings بعد تحديث الواتساب والفيديوهات
async function loadDynamicSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        const settings = await response.json();

        // 1. تحديث روابط الواتساب
        if (settings.whatsappNumber) {
            const waLinks = document.querySelectorAll('a[href="#whatsappLink"]');
            waLinks.forEach(link => {
                link.href = `https://wa.me/${settings.whatsappNumber}`;
            });
        }

        // 2. تحديث روابط فيسبوك
        const fbLinks = document.querySelectorAll('a[href*="facebook.com"]'); // قد تحتاج إلى تحديد أكثر دقة
        fbLinks.forEach(link => {
            link.href = settings.facebookUrl || link.href;
        });

        // 3. تحديث روابط إنستغرام
        const igLinks = document.querySelectorAll('a[href*="instagram.com"]');
        igLinks.forEach(link => {
            link.href = settings.instagramUrl || link.href;
        });

        // 4. تحديث روابط التحميل
        const appStoreLink = document.querySelector('a[href*="apps.apple.com"]');
        if (appStoreLink) appStoreLink.href = settings.appStoreUrl || appStoreLink.href;

        const googlePlayLink = document.querySelector('a[href*="play.google.com"]');
        if (googlePlayLink) googlePlayLink.href = settings.googlePlayUrl || googlePlayLink.href;

        const apkLink = document.querySelector('a[href*="talabatukplus.com/downloads"]');
        if (apkLink) apkLink.href = settings.apkUrl || apkLink.href;

       // 5. عرض الفيديوهات
       if (settings.videos && settings.videos.length > 0) {
           const videoSection = document.getElementById('videoSection');
           const container = document.getElementById('videosContainer');

           if (videoSection && container) {
               videoSection.classList.remove('hidden');

               // إنشاء HTML
               let videosHtml = settings.videos.map(url => {
                   const embedUrl = getEmbedUrl(url);
                   // تنظيف الروابط (لكن embedUrl قد يكون آمناً)
                   const safeEmbedUrl = DOMPurify.sanitize(embedUrl);
                   return `
                       <div class="bg-zinc-50 rounded-3xl overflow-hidden shadow-lg border border-zinc-100">
                           <div class="aspect-video w-full">
                               <iframe class="w-full h-full" src="${safeEmbedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                           </div>
                       </div>
                   `;
               }).join('');

               // تنظيف HTML قبل الإدراج
               container.innerHTML = DOMPurify.sanitize(videosHtml);
           }
       }
    } catch (error) {
        console.error('Failed to load dynamic settings', error);
    }
}

// وظيفة لتحويل روابط يوتيوب العادية إلى روابط Embed
function getEmbedUrl(url) {
    if (url.includes('youtube.com/watch?v=')) {
        const id = url.split('v=')[1].split('&')[0];
        return `https://www.youtube.com/embed/${id}`;
    } else if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${id}`;
    }
    return url;
}

// ---- تهيئة كل شيء عند تحميل الصفحة ----
window.onload = function () {
    setupScrollAnimations();
    loadDynamicSettings();
    console.log('%c✅ موقع طلباتك بلس جاهز للاستخدام!', 'color:#ff661c; font-size:13px; font-weight:bold');
};

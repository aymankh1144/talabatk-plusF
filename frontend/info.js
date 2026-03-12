// info.js - نسخة محدثة لدعم جميع روابط يوتيوب مع API ديناميكي

// تحديد ما إذا كنا في بيئة تطوير محلية (localhost أو IP محلي)
const isLocal = window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.startsWith('192.168.');
const API_BASE = isLocal
    ? `http://${window.location.hostname}:3000/api`
    : 'https://drivers.talabatukplus.com/api';
// --- وظيفة جلب وعرض الفيديوهات ---
async function loadVideos() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        if (!response.ok) throw new Error('فشل تحميل البيانات');
        const settings = await response.json();
        displayVideos(settings.videos || []);
    } catch (error) {
        console.error('Error loading videos:', error);
        showVideosError('تعذر تحميل الفيديوهات حالياً');
    }
}

function displayVideos(videos) {
    const container = document.getElementById('videosContainer');
    if (!container) {
        console.warn('⚠️ عنصر videosContainer غير موجود في الصفحة');
        return;
    }

    if (videos.length === 0) {
        container.innerHTML = '<p class="text-zinc-400 text-center">📭 لا توجد فيديوهات متاحة حالياً</p>';
        return;
    }

    // نبني كل بطاقة فيديو بشكل آمن عبر DOM API (عمود واحد، حجم كبير)
    container.innerHTML = '';

    videos.forEach((url, index) => {
        const embedUrl = getEmbedUrl(url);
        const card = document.createElement('div');
        card.className = 'bg-zinc-50 p-3 rounded-2xl border shadow-sm w-full';

        if (embedUrl) {
            const iframe = document.createElement('iframe');
            iframe.className = 'w-full rounded-xl';
            iframe.style.height = '420px';
            iframe.src = embedUrl;
            iframe.frameBorder = '0';
            iframe.allowFullscreen = true;
            iframe.loading = 'lazy';
            iframe.title = `فيديو تعريفي ${index + 1}`;
            card.appendChild(iframe);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'bg-zinc-200 rounded-xl flex items-center justify-center text-zinc-400';
            placeholder.style.height = '420px';
            placeholder.textContent = 'لا يمكن عرض الفيديو';
            card.appendChild(placeholder);
        }

        const linkDiv = document.createElement('div');
        linkDiv.className = 'p-2 text-center mt-2';
        const link = document.createElement('a');
        link.href = DOMPurify.sanitize(url);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'text-[#ff661c] text-sm hover:underline font-medium';
        link.textContent = embedUrl ? 'فتح على يوتيوب' : 'مشاهدة الفيديو';
        linkDiv.appendChild(link);
        card.appendChild(linkDiv);

        container.appendChild(card);
    });
}

// وظيفة محسنة لتحويل أي رابط يوتيوب إلى رابط Embed
function getEmbedUrl(url) {
    if (!url) return null;
    url = url.trim();

    // استخراج معرف الفيديو من أي رابط يوتيوب
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);

    if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
    }

    console.log('⚠️ لم يتم التعرف على الرابط:', url);
    return null;
}

function showVideosError(message) {
    const container = document.getElementById('videosContainer');
    if (container) {
        container.innerHTML = `<p class="text-zinc-400 text-center col-span-2">⚠️ ${message}</p>`;
    }
}

// --- وظيفة السلايدر الديناميكي للهيدر ---
function initHeaderSlider() {
    const s1 = document.getElementById('slide1');
    const s2 = document.getElementById('slide2');

    if (!s1 || !s2) return;

    let showFirst = true;

    setInterval(() => {
        if (showFirst) {
            s1.classList.replace('opacity-100', 'opacity-0');
            s2.classList.replace('opacity-0', 'opacity-100');
        } else {
            s1.classList.replace('opacity-0', 'opacity-100');
            s2.classList.replace('opacity-100', 'opacity-0');
        }
        showFirst = !showFirst;
    }, 5000);
}

// تشغيل الوظائف عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    loadVideos();
    initHeaderSlider();
});
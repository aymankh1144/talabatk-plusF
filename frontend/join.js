/* ============================================
   join.js - طلباتك بلس - صفحة تسجيل السائق
   ============================================ */

// --- إعدادات الـ Backend الذكية ---
// الكود سيتعرف تلقائياً إذا كنت تعمل محلياً (Localhost) أو على السيرفر الحقيقي
const isLocal = window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.startsWith('192.168.');
const API_URL = isLocal
    ? `http://${window.location.hostname}:3000/api/join`
    : 'https://drivers.talabatukplus.com/api/join';

const form       = document.getElementById('driverForm');
const btn        = document.getElementById('submitBtn');
const photoInput = document.getElementById('photoInput');

// --- عرض معاينة الصورة عند اختيارها ---
photoInput.addEventListener('change', () => {
    const preview = document.getElementById('fileNamePreview');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    
    const file = photoInput.files[0];
    if (file) {
        preview.innerText = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerText = '';
        previewContainer.classList.add('hidden');
    }
});

// --- إرسال النموذج عبر Telegram Bot ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled  = true;
    btn.innerText = 'جاري إرسال طلبك...';

    const formData  = new FormData(form);
    const photoFile = photoInput.files[0];

    const message =
        `🚀 *طلب انضمام جديد (طلباتك بلس)* \n\n` +
        `👤 *الاسم:* ${formData.get('name')}\n` +
        `📱 *الجوال:* ${formData.get('phone')}\n` +
        `🆔 *الرقم الوطني:* ${formData.get('nationalId')}\n` +
        `📍 *العنوان:* ${formData.get('address')}\n` +
        `🛵 *نوع المركبة:* ${formData.get('vehicleType')}\n` +
        `🔢 *هل منمرة:* ${formData.get('isNumbered')}\n` +
        `📄 *رقم اللوحة:* ${formData.get('plateNumber') || 'لا يوجد'}\n` +
        `💡 *عمل سابقاً في التوصيل:* ${formData.get('previousExperience')}\n\n` +
        `✅ *موافق على الشروط والتأمين*`;

    try {
        const backendFormData = new FormData();
        backendFormData.append('photo', photoFile);
        backendFormData.append('message', message);

        const response = await fetch(API_URL, {
            method: 'POST',
            body: backendFormData
        });

        const result = await response.json();

        if (result.ok) {
            // التحويل لصفحة النجاح مع دعم الروابط النظيفة والعادية
            window.location.href = window.location.pathname.includes('.html') ? 'success.html' : 'success';
        } else {
            alert('حدث خطأ في الإرسال: ' + (result.description || 'فشل إرسال الطلب.'));
        }
    } catch (error) {
        alert('فشل الاتصال بالخادم. تأكد من تشغيل الباكيند.');
    } finally {
        btn.disabled  = false;
        btn.innerText = 'إرسال طلب الانضمام';
    }
});

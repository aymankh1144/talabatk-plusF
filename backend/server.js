require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

// ================== الإعدادات الأساسية ==================
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const BOT_TOKEN_ENV = process.env.BOT_TOKEN;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!ADMIN_PASSWORD || !JWT_SECRET) {
  console.warn('⚠️  تأكد من تعيين ADMIN_PASSWORD و JWT_SECRET في ملف .env');
}

// ================== إعدادات الأمان ==================
//app.use(
//  helmet({
//    crossOriginEmbedderPolicy: false,
//    crossOriginResourcePolicy: { policy: "cross-origin" }
//  })
//);

// قائمة النطاقات المسموح بها (للإنتاج)
const allowedOrigins = [
  'https://drivers.talabatukplus.com',
  'http://drivers.talabatukplus.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',  // لمن يستخدم Live Server
  'http://127.0.0.1:5500',
  'http://localhost:8080',  // لمن يستخدم http-server على المنفذ 8080
  'http://127.0.0.1:8080',
  'http://192.168.56.1:8080',
  'http://192.168.1.108:8080'
];

const corsOptions = {
  origin: function (origin, callback) {
    // في بيئة التطوير، نسمح بكل الأصول لتسهيل العمل
    if (NODE_ENV === 'development') {
      return callback(null, true);
    }

    // إذا كان الطلب بدون origin (مثل Postman) نسمح به
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('غير مسموح بواسطة CORS'));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true,
};

app.use(cors(corsOptions));

// معالج أخطاء CORS
app.use((err, req, res, next) => {
  if (err.message === 'غير مسموح بواسطة CORS') {
    return res.status(403).json({ ok: false, description: 'طلب غير مصرح به من هذا المصدر' });
  }
  next(err);
});

app.use(express.json());

// ================== إعداد Multer لرفع الصور ==================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 ميجابايت
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('يُسمح فقط بملفات الصور (jpeg, jpg, png, gif, webp)'));
  }
});

// ================== Rate Limiting لتسجيل الدخول ==================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // 5 محاولات كحد أقصى لكل IP
  message: { ok: false, description: 'محاولات كثيرة، الرجاء المحاولة بعد 15 دقيقة' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ================== دوال مساعدة للإعدادات ==================
const SETTINGS_PATH = path.join(__dirname, 'settings.json');

const getSettings = () => {
  try {
    const data = fs.readFileSync(SETTINGS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // الإعدادات الافتراضية إذا لم يوجد الملف
    return {
      whatsappNumber: '963985377283',
      facebookUrl: 'https://www.facebook.com/profile.php?id=61585790864059&locale=ar_AR',
      instagramUrl: 'https://www.instagram.com/talabatuk.plus?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
      appStoreUrl: 'https://apps.apple.com/us/app/talabatuk-plus/id6759189465',
      googlePlayUrl: 'https://play.google.com/store/apps/details?id=com.talabatukplus.user',
      apkUrl: 'https://talabatukplus.com/downloads/talapatuk-plus-user.apk',
      botToken: '',
      videos: [],
      telegramChatIds: ['2024001342', '1927352258', '-1003849324453']
    };
  }
};

const saveSettings = (settings) => {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
};

// ================== Middleware للتحقق من JWT ==================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ================== المسارات العامة ==================

// جلب الإعدادات (للاستخدام العام) - لا يُعاد botToken أبداً
app.get('/api/settings', (req, res) => {
  const settings = getSettings();
  const { botToken, ...publicSettings } = settings; // نخفي التوكن عن العموم
  res.json(publicSettings);
});

// استقبال طلبات الانضمام
app.post('/api/join', upload.single('photo'), async (req, res) => {
  try {
    const { message } = req.body;
    const photoFile = req.file;

    // التحقق من صحة المدخلات
    if (!message || message.trim() === '') {
      return res.status(400).json({ ok: false, description: 'الرسالة مطلوبة' });
    }
    if (!photoFile) {
      return res.status(400).json({ ok: false, description: 'الصورة الشخصية مطلوبة' });
    }

    // استخدام التوكن من الإعدادات أو من البيئة
    const settings = getSettings();
    const botToken = settings.botToken || BOT_TOKEN_ENV;
    if (!botToken) {
      return res.status(500).json({ ok: false, description: 'لم يتم تكوين توكن البوت بعد' });
    }

    // قراءة معرفات الدردشات من الإعدادات (مع fallback)
    const CHAT_IDS = settings.telegramChatIds || ['2024001342', '1927352258', '-1003849324453'];

    const sendPromises = CHAT_IDS.map(async (id) => {
      const telegramFormData = new FormData();
      telegramFormData.append('chat_id', id);
      telegramFormData.append('photo', photoFile.buffer, {
        filename: photoFile.originalname,
        contentType: photoFile.mimetype,
      });
      telegramFormData.append('caption', message);
      telegramFormData.append('parse_mode', 'Markdown');

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: telegramFormData,
      });
      return response.json();
    });

    const results = await Promise.all(sendPromises);

    if (results.every(r => r.ok)) {
      res.json({ ok: true });
    } else {
      res.status(500).json({ ok: false, description: 'فشل الإرسال لبعض المستلمين', details: results });
    }
  } catch (error) {
    console.error('Backend Error:', error);
    res.status(500).json({ ok: false, description: 'خطأ داخلي في الخادم' });
  }
});

// ================== مسارات لوحة التحكم (محمية) ==================

// تسجيل الدخول وإصدار JWT
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ ok: false, description: 'كلمة المرور مطلوبة' });
  }
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ ok: true, token });
  }
  res.status(401).json({ ok: false, description: 'كلمة المرور غير صحيحة' });
});

// التحقق من صحة التوكن (يستخدمه الـ admin للتحقق التلقائي)
app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ ok: true });
});

// تحديث الإعدادات (يتطلب JWT)
app.post('/api/admin/update', authenticateToken, (req, res) => {
  const { password, botToken, ...newSettings } = req.body; // نتجاهل password و botToken دائماً

  // تحقق بسيط من صحة بعض الحقول
  if (newSettings.whatsappNumber && !/^\d+$/.test(newSettings.whatsappNumber)) {
    return res.status(400).json({ ok: false, description: 'رقم واتساب غير صالح (يجب أن يكون أرقام فقط)' });
  }

  const currentSettings = getSettings();
  // نحتفظ بالـ botToken الأصلي ولا نسمح بتغييره من الواجهة
  const updatedSettings = { ...currentSettings, ...newSettings, botToken: currentSettings.botToken };
  saveSettings(updatedSettings);
  res.json({ ok: true });
});

// ================== تشغيل الخادم ==================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT} في بيئة ${NODE_ENV}`);
});
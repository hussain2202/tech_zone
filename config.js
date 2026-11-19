// ============================================================
// 🔧 ضع هنا إعدادات مشروع Firebase الخاص بك (Project settings > Your apps > Web app)
// PUT YOUR FIREBASE WEB CONFIG HERE. These values are public by design; security comes from Firestore Rules.
// ============================================================
export const firebaseConfig = {
  apiKey: "AIzaSyBfOWJaDdyWpxY3MIBAkAtNbhCTfK_6NSM",
  authDomain: "tech-zone-384a3.firebaseapp.com",
  projectId: "tech-zone-384a3",
  storageBucket: "tech-zone-384a3.firebasestorage.app",
  messagingSenderId: "652518276422",
  appId: "1:652518276422:web:aeaefbe20314008c81f947",
  measurementId: "G-V1MC4R9CM8"
};
// ============================================================
// 📞 بيانات المتجر (تظهر في الهيدر والفوتر) — STORE CONTACT INFO (also editable from admin > settings)
// ============================================================
export const storeDefaults = {
  phone: "01100984141",              // رقم الدعم
  whatsapp: "201100984141",          // واتساب بدون +
  email: "2hussa2021@gmail.com",     // الإيميل
  cashNumber: "01065630974",         // رقم فودافون كاش
  social: { tiktok: "https://www.tiktok.com/@3ashik_1", instagram: "https://www.instagram.com/hussain_20_266", facebook: "https://www.facebook.com/share/1A7tXbHZ7z/" },
  shippingFee: 80,                   // الشحن بالجنيه (التوصيل العادي)
  freeShippingOver: 15000,           // شحن مجاني فوق هذا المبلغ (للتوصيل العادي فقط)
  instapay: "01065630974",           // ⚠ غيّر: رقم/عنوان إنستا باي (مثال: name@instapay)
  bankName: "اسم البنك",             // ⚠ غيّر: بيانات التحويل البنكي
  bankHolder: "اسم صاحب الحساب",
  bankAccount: "رقم الحساب / IBAN",
  pickupAddress: "المعهد العالي لنظم التجارة الإلكترونية – الاستلام من نقطة التسليم" // ⚠ غيّر لعنوان الاستلام
};
// ============================================================
// 🚚 طرق التوصيل — SHIPPING METHODS (نفس الأرقام موجودة في functions/index.js، غيّرهم في الاثنين)
// ============================================================
export const shippingMethods = [
  { id: "standard", fee: 80,  days_ar: "2-5 أيام عمل",           days_en: "2-5 business days",        name_ar: "توصيل عادي لكل المحافظات", name_en: "Standard delivery (all governorates)", freeOver: true },
  { id: "express",  fee: 150, days_ar: "خلال 24-48 ساعة",        days_en: "Within 24-48 hours",       name_ar: "توصيل سريع",               name_en: "Express delivery" },
  { id: "sameday",  fee: 200, days_ar: "نفس اليوم (سوهاج وأسيوط فقط)", days_en: "Same day (Sohag & Assiut only)", name_ar: "توصيل في نفس اليوم", name_en: "Same-day delivery", govs: ["سوهاج", "أسيوط"] },
  { id: "pickup",   fee: 0,   days_ar: "جاهز خلال 24 ساعة",      days_en: "Ready within 24 hours",    name_ar: "استلام من الفرع / نقطة التسليم", name_en: "Pickup from branch" }
];
// ============================================================
// 👥 من نحن — ABOUT US (المجموعة / الكلية / الفريق / الدكتور)
// الصور في  — لو الاسم لا يطابق الصورة بدّل قيمة img بين الأعضاء.
// ============================================================
export const about = {
  groupNo: "55",
  year: "2025 - 2026",
  college_ar: "المعهد العالي لنظم التجارة الإلكترونية", college_en: "Higher Institute of E-Commerce Systems",
  type_ar: "مشروع تخرج", type_en: "Graduation project",
  project_ar: "متجر TECH ZONE لمنتجات الجيمنج ومكونات الكمبيوتر", project_en: "TECH ZONE – Gaming & PC Hardware Store"
};
export const team = [
  { name_ar: "حسين أحمد محمود",       name_en: "Hussein Ahmed Mahmoud",     img: "member1.jpg" },
  { name_ar: "يوسف حسن محمد",         name_en: "Youssef Hassan Mohamed",    img: "member2.jpg" },
  { name_ar: "يوسف حشمت أبو الحسن",   name_en: "Youssef Hashmat Abu El-Hassan", img: "member3.jpg" },
  { name_ar: "محمد عمر محمد",         name_en: "Mohamed Omar Mohamed",      img: "member4.jpg" },
  { name_ar: "راضي عاطف حسب",         name_en: "Radi Atef Hasab",           img: "member5.jpg" }
];
export const doctor = { name_ar: "الدكتور / سعيد نظمي", name_en: "Dr. Saeed Nazmy", title_ar: "مدرس إدارة الأعمال - المشرف الأكاديمي", title_en: "Lecturer in Business Administration - Academic Supervisor", img: "doctor.jpg" };


// حساب الأدمن (يفتح لوحة إضافة المنتجات)
export const adminAuth = { email: "2hussa2021@gmail.com", password: "132005Hussain@@&&$h" };

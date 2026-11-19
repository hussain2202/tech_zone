# TECH ZONE
كل الملفات في فولدر واحد (index.html, style.css, config.js, i18n.js, script.js, catalog.json + الصور). فولدر functions للسيرفر (الطلبات) بس.

تشغيل تجريبي: `python3 -m http.server 8000` ثم http://localhost:8000
الأدمن: سجّل حساب بإيميل 2hussa2021@gmail.com من صفحة التسجيل، وبعدها أي دخول بيه بيفتح لوحة الأدمن.
القواعد: انشر firestore.rules و storage.rules (فيها شرط الأدمن بالإيميل): `firebase deploy --only firestore:rules,storage,functions,hosting`
من نحن: بتظهر للأدمن بس. بياناتها في config.js.

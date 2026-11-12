# ज्योतिष सारथी — मोबाइल वेब ऐप

मोबाइल ब्राउज़र में खुलने वाली मुफ़्त ज्योतिष, अंक ज्योतिष और उपाय वेबसाइट। सारे नतीजे फ़ोन में ही गणना होते हैं, इसलिए इनके लिए सर्वर नहीं चाहिए।

## फ़ाइलें
- `index.html` — पूरी ऐप (onboarding, आज, अंक, उपाय, चैट, प्रोफ़ाइल)
- `manifest.webmanifest`, `icon.svg`, `sw.js` — "होम स्क्रीन पर जोड़ें" और offline सपोर्ट
- `worker/chat-worker.js` — AI चैट के लिए वैकल्पिक सुरक्षित प्रॉक्सी (Cloudflare Worker)
- `.nojekyll` — GitHub Pages को फ़ाइलें जैसी हैं वैसी परोसने के लिए

## GitHub Pages पर चलाना (मुफ़्त)
1. GitHub पर नया repository बनाएँ, जैसे `jyotish-saarthi`।
2. इस फ़ोल्डर को push करें:
   ```bash
   git init -b main
   git add .
   git commit -m "Initial mobile web app"
   git remote add origin https://github.com/YOUR-USERNAME/jyotish-saarthi.git
   git push -u origin main
   ```
3. GitHub पर **Settings → Pages** में Source को **Deploy from a branch**, branch `main`, folder `/ (root)` चुनें।
4. कुछ मिनट बाद साइट `https://YOUR-USERNAME.github.io/jyotish-saarthi/` पर खुलेगी।
5. फ़ोन के Chrome या Safari में यह URL खोलें।

## डोमेन नाम जोड़ना (बाद में)
1. डोमेन खरीदें (जैसे Namecheap, Cloudflare Registrar)।
2. Repository की Settings → Pages → Custom domain में अपना डोमेन लिखें।
3. DNS में CNAME रिकॉर्ड `www` → `YOUR-USERNAME.github.io` डालें और "Enforce HTTPS" चालू करें।
4. `worker/chat-worker.js` में `ALLOWED_ORIGIN` को अपने नए डोमेन पर सेट करें।

## AI चैट चालू करना (वैकल्पिक)
- API key कभी HTML में न डालें, वह सार्वजनिक हो जाएगी।
- `worker/chat-worker.js` को Cloudflare Worker के रूप में deploy करें, KV namespace `LIMITS` को binding के रूप में जोड़ें, और `GROQ_API_KEY` को Secret में रखें (मुफ़्त चैट, प्रति IP दिन में 5 सवाल)।
- मिले URL को `index.html` में `CONFIG.chatEndpoint` में लिखें, फिर commit और push करें।
- चैट में सवाल भेजते समय राशि और जन्म-विवरण AI सेवा को भेजे जाते हैं। Privacy policy में यह लिखें।

## अपडेट कैसे करें
फ़ाइल बदलकर `git commit` और `git push` करें। Service worker अब पहले नेटवर्क से नया कोड लेता है, इसलिए पुराना cache बार-बार दिक्कत नहीं देगा।

## ज़रूरी नोट
- राशि चंद्र राशि (Lahiri अयनांश) पर आधारित है। जन्म तिथि या समय न होने पर नाम के पहले अक्षर से राशि अनुमानित होती है।
- भाषा: डिफ़ॉल्ट English है। राज्य के आधार पर हिंदी/ਪੰਜਾਬੀ का सुझाव आता है, और प्रोफ़ाइल में कभी भी भाषा बदली जा सकती है।
- पंजाबी में गुरमुखी लिपि का उपयोग होता है। अनुवाद की समीक्षा किसी मूल भाषा-भाषी से करवाना बेहतर रहेगा।
- ऐप मनोरंजन और सांस्कृतिक जानकारी के लिए है। स्वास्थ्य, कानूनी या आर्थिक निर्णयों के लिए विशेषज्ञ से सलाह लें।

## लॉगिन चालू करना (Supabase, मुफ़्त)
1. [supabase.com](https://supabase.com) पर मुफ़्त प्रोजेक्ट बनाएँ।
2. SQL Editor में `supabase/schema.sql` चलाएँ।
3. Project Settings → API से **Project URL** और **anon public key** लें।
4. `index.html` में `AUTH_CONFIG` में ये दोनों मान डालें (anon key सार्वजनिक रह सकती है, सुरक्षा RLS से होती है)।
5. Authentication → URL Configuration में Site URL और Redirect URL में अपनी GitHub Pages URL जोड़ें।

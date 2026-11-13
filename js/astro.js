/* खगोलीय गणना (Sidereal / Lahiri अयनांश) — बिना किसी server या API के।
 * सूत्र: Paul Schlyter की सरल ग्रह-स्थिति विधि (Sun, Moon) + लग्न।
 * सटीकता: सूर्य ~0.01°, चंद्र ~0.3° (राशि और नक्षत्र के लिए पर्याप्त)।
 * ये परिणाम पारंपरिक पंचांग/ सॉफ़्टवेयर से छोटे अंतर दे सकते हैं, खासकर सीमा-रेखा पर।
 */
const Astro = (() => {
  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;
  const norm = x => ((x % 360) + 360) % 360;

  const RASHI_NAMES = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'];
  const NAKSHATRA_NAMES = [
    'अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा','पुनर्वसु','पुष्य','आश्लेषा',
    'मघा','पूर्वा फाल्गुनी','उत्तरा फाल्गुनी','हस्त','चित्रा','स्वाति','विशाखा','अनुराधा','ज्येष्ठा',
    'मूल','पूर्वाषाढ़ा','उत्तराषाढ़ा','श्रवण','धनिष्ठा','शतभिषा','पूर्वाभाद्रपद','उत्तराभाद्रपद','रेवती'
  ];

  // जूलियन दिन (Julian Day) से d = दिन 2000-01-00 UT से
  const daysSince2000 = utcMs => utcMs / 86400000 + 2440587.5 - 2451543.5;

  // Lahiri अयनांश (लगभग)
  function lahiriAyanamsa(d) {
    const years = 2000 + d / 365.25;
    return 23.8536 + 0.013969 * (years - 2000);
  }

  function sunLongitude(d) {
    const w = norm(282.9404 + 4.70935e-5 * d);
    const e = 0.016709 - 1.151e-9 * d;
    const M = norm(356.0470 + 0.9856002585 * d);
    const E = M + DEG * e * Math.sin(M * RAD) * (1 + e * Math.cos(M * RAD));
    const xv = Math.cos(E * RAD) - e;
    const yv = Math.sqrt(1 - e * e) * Math.sin(E * RAD);
    const v = Math.atan2(yv, xv) * DEG;
    return norm(v + w);
  }

  function moonLongitude(d) {
    const N = norm(125.1228 - 0.0529538083 * d);
    const i = 5.1454;
    const w = norm(318.0634 + 0.1643573223 * d);
    const e = 0.054900;
    const M = norm(115.3654 + 13.0649929509 * d);
    const E = M + DEG * e * Math.sin(M * RAD) * (1 + e * Math.cos(M * RAD));
    const xv = Math.cos(E * RAD) - e;
    const yv = Math.sqrt(1 - e * e) * Math.sin(E * RAD);
    const v = Math.atan2(yv, xv) * DEG;
    const r = Math.sqrt(xv * xv + yv * yv);
    const vw = (v + w) * RAD;
    const xh = r * (Math.cos(N * RAD) * Math.cos(vw) - Math.sin(N * RAD) * Math.sin(vw) * Math.cos(i * RAD));
    const yh = r * (Math.sin(N * RAD) * Math.cos(vw) + Math.cos(N * RAD) * Math.sin(vw) * Math.cos(i * RAD));
    let lon = Math.atan2(yh, xh) * DEG;

    // सूर्य का प्रभाव (perturbations)
    const Ms = norm(356.0470 + 0.9856002585 * d);
    const Ls = norm(Ms + norm(282.9404 + 4.70935e-5 * d));
    const Lm = norm(M + w + N);
    const D = norm(Lm - Ls) * RAD;
    const F = norm(Lm - N) * RAD;
    const Mr = M * RAD, Msr = Ms * RAD;
    lon += -1.274 * Math.sin(Mr - 2 * D) + 0.658 * Math.sin(2 * D) - 0.186 * Math.sin(Msr)
         - 0.059 * Math.sin(2 * Mr - 2 * D) - 0.057 * Math.sin(Mr - 2 * D + Msr)
         + 0.053 * Math.sin(Mr + 2 * D) + 0.046 * Math.sin(2 * D - Msr) + 0.041 * Math.sin(Mr - Msr)
         - 0.035 * Math.sin(D) - 0.031 * Math.sin(Mr + Msr) - 0.015 * Math.sin(2 * F - 2 * D)
         + 0.011 * Math.sin(Mr - 4 * D);
    return norm(lon);
  }

  // लग्न (Ascendant), tropical। lat/lon डिग्री में, lon पूर्व में धनात्मक।
  function ascendantTropical(d, latDeg, lonDeg) {
    // 280.46 सूर्य का माध्य देशांतर है; GMST के लिए उसमें 180° जोड़ना होता है।
    const gmst = norm(280.46061837 + 180 + 360.98564736629 * d);
    const lst = norm(gmst + lonDeg);
    const ecl = 23.4393 - 3.563e-7 * d;
    const y = Math.cos(lst * RAD);
    const x = -(Math.sin(lst * RAD) * Math.cos(ecl * RAD) + Math.tan(latDeg * RAD) * Math.sin(ecl * RAD));
    return norm(Math.atan2(y, x) * DEG);
  }

  function signOf(siderealLon) {
    const idx = Math.floor(norm(siderealLon) / 30);
    return { index: idx, name: RASHI_NAMES[idx], degree: +(norm(siderealLon) % 30).toFixed(2) };
  }

  function nakshatraOf(siderealMoon) {
    const pos = norm(siderealMoon);
    const idx = Math.floor(pos / (360 / 27));
    const pada = Math.floor((pos % (360 / 27)) / (360 / 108)) + 1;
    return { index: idx, name: NAKSHATRA_NAMES[idx], pada };
  }

  /**
   * पूरा चार्ट।
   * @param {Date} localDate  — जन्म का स्थानीय समय (हम UTC offset से UTC निकालते हैं)
   * @param {number} utcOffsetHours — जैसे भारत के लिए 5.5
   * @param {number|null} lat, lon — स्थान (null हो तो लग्न नहीं निकलेगा)
   */
  function chart({ year, month, day, hour, minute, utcOffsetHours, lat = null, lon = null }) {
    const utcMs = Date.UTC(year, month - 1, day, hour, minute) - utcOffsetHours * 3600000;
    const d = daysSince2000(utcMs);
    const ay = lahiriAyanamsa(d);

    const sunS = norm(sunLongitude(d) - ay);
    const moonS = norm(moonLongitude(d) - ay);

    const out = {
      sun: signOf(sunS),
      moon: signOf(moonS),
      nakshatra: nakshatraOf(moonS),
      ayanamsa: +ay.toFixed(3),
      lagna: null,
    };

    if (lat !== null && lon !== null) {
      const ascS = norm(ascendantTropical(d, lat, lon) - ay);
      out.lagna = signOf(ascS);
    }
    return out;
  }


  /* ग्रह: गुरु (Jupiter) और शनि (Saturn)।
   * स्रोत: JPL "Keplerian Elements for Approximate Positions" (E. M. Standish), 1800–2050 के लिए।
   * सटीकता: लगभग कुछ arcminute। J2000 से of-date तक precession भी जोड़ा गया है।
   * d = 2000-01-00 UT से दिन (sunLongitude / moonLongitude की तरह)।
   */
  const EL = {
    earth: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668],
             L: [100.46457166, 35999.37244981], peri: [102.93768193, 0.32327364], node: [0, 0] },
    jupiter: { a: [5.20288700, -0.00011607], e: [0.04838624, -0.00013253], I: [1.30439695, -0.00183714],
               L: [34.39644051, 3034.74612775], peri: [14.72847983, 0.21252668], node: [100.47390909, 0.20469106] },
    saturn: { a: [9.53667594, -0.00125060], e: [0.05386179, -0.00050991], I: [2.48599187, 0.00193609],
              L: [49.95424423, 1222.49362201], peri: [92.59887831, -0.41897216], node: [113.66242448, -0.28867794] },
  };
  // हेलियोसेंट्रिक रेक्टेंगुलर कोऑर्डिनेट (J2000 इक्लिप्टिक), AU में
  function helioXYZ(el, T) {
    const v_ = k => el[k][0] + el[k][1] * T;
    const a = v_('a'), e = v_('e'), I = v_('I') * RAD;
    const L = v_('L'), peri = v_('peri'), node = v_('node') * RAD;
    const w = (peri - v_('node')) * RAD;
    let M = ((L - peri) % 360 + 540) % 360 - 180;
    M *= RAD;
    let E = M + e * Math.sin(M);
    for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const xv = a * (Math.cos(E) - e), yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const v = Math.atan2(yv, xv), r = Math.hypot(xv, yv);
    const u = v + w;
    return {
      x: r * (Math.cos(node) * Math.cos(u) - Math.sin(node) * Math.sin(u) * Math.cos(I)),
      y: r * (Math.sin(node) * Math.cos(u) + Math.cos(node) * Math.sin(u) * Math.cos(I)),
    };
  }
  // ग्रह का sidereal (Lahiri) भोगांश, 0–360°। name = 'jupiter' | 'saturn'
  function planetSidereal(d, name) {
    const JD = d + 2451543.5;
    const T = (JD - 2451545.0) / 36525;
    const P = helioXYZ(EL[name], T), Ea = helioXYZ(EL.earth, T);
    const lonJ2000 = Math.atan2(P.y - Ea.y, P.x - Ea.x) * DEG;
    const precession = 1.396971 * T + 0.000308 * T * T;   // J2000 से of-date तक
    const tropical = norm(lonJ2000 + precession);
    return norm(tropical - lahiriAyanamsa(d));
  }

  return { chart, sunLongitude, moonLongitude, lahiriAyanamsa, daysSince2000, planetSidereal, RASHI_NAMES, NAKSHATRA_NAMES };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Astro;

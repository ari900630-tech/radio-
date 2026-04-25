import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  Play, Pause, Volume2, Heart, Globe,  
  Radio, Music, 
  Settings, HelpCircle, Share2, LogIn, LogOut,
  Expand, Minimize,
  WifiOff, AlertCircle, X, Search, ArrowRight,
  ExternalLink, Grid2X2, Grid3X3, LayoutGrid, MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import Hls from "hls.js";
import { cn } from "./lib/utils";
import { RadioStation, ViewType, Country } from "./types";
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User, handleFirestoreError, testConnection } from "./lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, deleteDoc, serverTimestamp } from 'firebase/firestore';

const RADIO_MIRRORS = [
  "https://de1.api.radio-browser.info/json",
  "https://at1.api.radio-browser.info/json",
  "https://nl1.api.radio-browser.info/json"
];

const GENRE_IMAGES: Record<string, string> = {
  "ישראלי": "1531278520760-405aa30c335e",
  "ג'אז": "1511671782779-c97d3d27a1d4",
  "רוק": "1498038432885-c6f3f1b912ee",
  "פופ": "1514525253344-f81cee3e2dd9",
  "אלקטרוני": "1470225620780-dba8ba36b745",
  "ראפ": "1493225255756-042739eba544",
  "היפ הופ": "1516280440605-ebaa7d2305df",
  "מטאל": "1511671566508-ea246a741baf",
  "קלאסי": "1507838596044-ad7115c1b41d",
  "רטרו": "1459749411177-04028ce104d4",
  "דאנס": "1535525153412-d021f07f50e2",
  "רגאיי": "1508700115892-45ecd05a2cba",
  "מדיטציה": "1506126613408-c796920aa7b2",
  "חדשות": "1504715101211-f136a4914405",
  "ספורט": "1461896740118-2816d42e27e2",
  "ילדים": "1602048900010-09932d0c92ce",
  "ים תיכוני": "1516280440605-ebaa7d2305df",
  "דתי": "1519751138012-70f9fd97f26d",
  "אינדי": "1498114141620-83ea17bcc610",
  "פסקול": "1485848395967-aeda365317fb",
  "דיסקו": "1533171638242-201503c4f9cf",
  "יוונית": "1503224505310-7f9959b71e1a",
  "ערבית": "1512467847644-4007df358b8d",
  "חסידית": "1501612722244-42b78473ef9c",
  "אופרה": "1516450360452-46c53f3f1e9c",
  "קומדיה": "1517232111-2053647000e3",
  "פודקאסט": "1477068815518-df1c5ad0a90d",
  "טבע": "144197423153b-0e59eeaa0ae3",
  "כלכלה": "1611974717539-0bd5c1d9df6c",
  "שירי ארץ ישראל": "1516065561002-dba8bad7c6e0",
  "טכנו": "1605722243979-fe0be8158c31",
  "האוס": "1601614002621-399fb1253457",
  "טראנס": "1492619227582-7f3b20202d2d",
  "מזרחית": "1516280440605-ebaa7d2305df",
  "צ'ילהאאוט": "1490248122-ec968f9a69cc",
  "בלוז": "1514749065961-042079632734",
  "ניינטיז": "1451000305-6a84f3ccb2b8",
  "אייטיז": "1459749411177-04028ce104d4",
  "פאנק": "1514660312-3f18e9772a08",
  "סול": "1514749065961-042079632734",
  "פסייטרנס": "1514466906236-4074f764c2ec",
  "חלופית": "1498114141620-83ea17bcc610",
  "לו-פיי": "1526218626217-09c5b56294c1",
  "צ'יל": "1490248122-ec968f9a69cc",
  "אווירה": "144197423153b-0e59eeaa0ae3",
  "מחזות זמר": "1516450360452-46c53f3f1e9c",
  "חדשות עולם": "1504715101211-f136a4914405",
  "קאנטרי": "1534065608827-024e03027f3b",
  "סינת'פופ": "1550483034-7db30155b274",
  "דיפ האוס": "1601614002621-399fb1253457",
  "רוחנית": "1506126613408-c796920aa7b2"
};

const getGenreGradient = (name: string) => {
  const colors = [
    'from-pink-500/20 to-purple-500/20',
    'from-blue-500/20 to-cyan-500/20',
    'from-emerald-500/20 to-teal-500/20',
    'from-orange-500/20 to-yellow-500/20',
    'from-red-500/20 to-pink-500/20',
    'from-indigo-500/20 to-blue-500/20',
    'from-rose-500/20 to-orange-500/20',
    'from-amber-500/20 to-yellow-500/20'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const API_BASE = "/api/proxy";

const COUNTRY_TRANSLATIONS: Record<string, string> = {
  "Israel": "ישראל",
  "United States": "ארצות הברית",
  "USA": "ארצות הברית",
  "The United States": "ארצות הברית",
  "United States of America": "ארצות הברית",
  "United Kingdom": "בריטניה",
  "UK": "בריטניה",
  "The United Kingdom": "בריטניה",
  "Great Britain": "בריטניה",
  "Germany": "גרמניה",
  "France": "צרפת",
  "Russia": "רוסיה",
  "Russian Federation": "רוסיה",
  "Spain": "ספרד",
  "Italy": "איטליה",
  "Brazil": "ברזיל",
  "Canada": "קנדה",
  "Australia": "אוסטרליה",
  "Netherlands": "הולנד",
  "The Netherlands": "הולנד",
  "Switzerland": "שוויץ",
  "Poland": "פולין",
  "Greece": "יוון",
  "Turkiye": "טורקיה",
  "Turkey": "טורקיה",
  "Japan": "יפן",
  "Mexico": "מקסיקו",
  "Argentina": "ארגנטינה",
  "Ukraine": "אוקראינה",
  "Portugal": "פורטוגל",
  "Belgium": "בלגיה",
  "Austria": "אוסטריה",
  "Sweden": "שוודיה",
  "Norway": "נורווגיה",
  "Finland": "פינלנד",
  "Denmark": "דנמרק",
  "Czech Republic": "צ'כיה",
  "Czechia": "צ'כיה",
  "The Czech Republic": "צ'כיה",
  "Hungary": "הונגריה",
  "India": "הודו",
  "Indonesia": "אינדונזיה",
  "South Africa": "דרום אפריקה",
  "China": "סין",
  "Thailand": "תאילנד",
  "Vietnam": "וייטנאם",
  "Viet Nam": "וייטנאם",
  "Romania": "רומניה",
  "Ireland": "אירלנד",
  "New Zealand": "ניו זילנד",
  "Chile": "צ'ילה",
  "Colombia": "קולומביה",
  "Estonia": "אסטוניה",
  "Latvia": "לטביה",
  "Lithuania": "ליטא",
  "Bulgaria": "בולגריה",
  "Croatia": "קרואטיה",
  "Serbia": "סרביה",
  "Slovakia": "סלובקיה",
  "Slovenia": "סלובניה",
  "Egypt": "מצרים",
  "Jordan": "ירדן",
  "Cyprus": "קפריסין",
  "Morocco": "מרוקו",
  "Tunisia": "תוניסיה",
  "Algeria": "אלג'יריה",
  "Saudi Arabia": "ערב הסעודית",
  "Kingdom of Saudi Arabia": "ערב הסעודית",
  "United Arab Emirates": "איחוד האמירויות",
  "UAE": "איחוד האמירויות",
  "Qatar": "קטאר",
  "Kuwait": "כווית",
  "Bahrain": "בחריין",
  "Oman": "עומאן",
  "South Korea": "דרום קוריאה",
  "Korea, Republic of": "דרום קוריאה",
  "Republic of Korea": "דרום קוריאה",
  "North Korea": "צפון קוריאה",
  "Philippines": "פיליפינים",
  "The Philippines": "פיליפינים",
  "Malaysia": "מלזיה",
  "Singapore": "סינגפור",
  "Peru": "פרו",
  "Uruguay": "אורוגוואי",
  "Paraguay": "פרגוואי",
  "Ecuador": "אקוודור",
  "Venezuela": "ונצואלה",
  "Panama": "פנמה",
  "Costa Rica": "קוסטה ריקה",
  "Cuba": "קובה",
  "Jamaica": "ג'מייקה",
  "Iceland": "איסלנד",
  "Luxembourg": "לוקסמבורג",
  "Malta": "מלטה",
  "Albania": "אלבניה",
  "Georgia": "גיאורגיה",
  "Armenia": "ארמניה",
  "Azerbaijan": "אזרבייג'ן",
  "Kazakhstan": "קזחסטן",
  "Uzbekistan": "אוזבקיסטן",
  "Nigeria": "ניגריה",
  "Kenya": "קניה",
  "Ethiopia": "אתיופיה",
  "Ghana": "גאנה",
  "Senegal": "סנגל",
  "Ivory Coast": "חוף השנהב",
  "Cameroon": "קמרון",
  "Tanzania": "טנזניה",
  "Uganda": "אוגנדה",
  "Mauritius": "מאוריציוס",
  "Taiwan": "טייוואן",
  "Hong Kong": "הונג קונג",
  "Pakistan": "פקיסטן",
  "Bangladesh": "בנגלדש",
  "Sri Lanka": "סרי לנקה",
  "Nepal": "נפאל",
  "Lebanon": "לבנון",
  "Moldova": "מולדובה",
  "Bosnia and Herzegovina": "בוסניה והרצגובינה",
  "North Macedonia": "צפון מקדוניה",
  "Montenegro": "מונטנגרו",
  "Bolivia": "בוליביה",
  "Guatemala": "גואטמלה",
  "Honduras": "הונדורס",
  "El Salvador": "אל סלוודור",
  "Nicaragua": "ניקרגואה",
  "Dominican Republic": "הרפובליקה הדומיניקנית",
  "The Dominican Republic": "הרפובליקה הדומיניקנית",
  "Haiti": "האיטי",
  "Trinidad and Tobago": "טרינידד וטובגו",
  "Guyana": "גיאנה",
  "Suriname": "סורינאם",
  "Belize": "בליז",
  "Bahamas": "איי הבהאמה",
  "The Bahamas": "איי הבהאמה",
  "Barbados": "ברבדוס",
  "Saint Lucia": "סנט לוסיה",
  "Grenada": "גרנדה",
  "Saint Vincent and the Grenadines": "סנט וינסנט והגרנדינים",
  "Antigua and Barbuda": "אנטיגואה וברבודה",
  "Dominica": "דומיניקה",
  "Saint Kitts and Nevis": "סנט קיטס ונוויס",
  "Cambodia": "קמבודיה",
  "Laos": "לאוס",
  "Myanmar": "מיאנמר (בורמה)",
  "Burma": "מיאנמר (בורמה)",
  "Mongolia": "מונגוליה",
  "Kyrgyzstan": "קירגיזסטן",
  "Tajikistan": "טג'יקיסטן",
  "Turkmenistan": "טורקמניסטן",
  "Afghanistan": "אפגניסטן",
  "Iraq": "עיראק",
  "Iran": "איראן",
  "Syria": "סוריה",
  "Yemen": "תימן",
  "Palestine": "פלסטין",
  "State of Palestine": "פלסטין",
  "Libya": "לוב",
  "Sudan": "סודן",
  "South Sudan": "דרום סודן",
  "Somalia": "סומליה",
  "Djibouti": "ג'יבוטי",
  "Eritrea": "אריתריאה",
  "Rwanda": "רואנדה",
  "Burundi": "בורונדי",
  "Malawi": "מלאווי",
  "Zambia": "זמביה",
  "Zimbabwe": "זימבבואה",
  "Botswana": "בוטסואנה",
  "Namibia": "נמיביה",
  "Angola": "אנגולה",
  "Gabon": "גבון",
  "Congo": "קונגו",
  "Democratic Republic of the Congo": "קונגו הדמוקרטית",
  "Equatorial Guinea": "גינאה המשוונית",
  "Central African Republic": "הרפובליקה המרכז אפריקאית",
  "Chad": "צ'אד",
  "Niger": "ניז'ר",
  "Mali": "מאלי",
  "Burkina Faso": "בורקינה פאסו",
  "Mauritania": "מאוריטניה",
  "Gambia": "גמביה",
  "The Gambia": "גמביה",
  "Guinea": "גינאה",
  "Guinea-Bissau": "גינאה ביסאו",
  "Sierra Leone": "סיירה לאון",
  "Liberia": "ליבריה",
  "Togo": "טוגו",
  "Benin": "בנין",
  "Cape Verde": "כף ורדה",
  "Seychelles": "סיישל",
  "Madagascar": "מדגסקר",
  "Comoros": "קומורו",
  "Maldives": "האיים המלדיביים",
  "Brunei": "ברוניי",
  "Timor-Leste": "טימור לסטה",
  "Papua New Guinea": "פפואה גינאה החדשה",
  "Fiji": "פיג'י",
  "Solomon Islands": "איי שלמה",
  "Vanuatu": "ונואטו",
  "Samoa": "סמואה",
  "Tonga": "טונגה",
  "Kiribati": "קיריבטי",
  "Micronesia": "מיקרונזיה",
  "Palau": "פלאו",
  "Marshall Islands": "איי מרשל",
  "Nauru": "נאורו",
  "Tuvalu": "טובאלו",
  "Andorra": "אנדורה",
  "Monaco": "מונאקו",
  "San Marino": "סן מרינו",
  "Liechtenstein": "ליכטנשטיין",
  "Vatican City": "ותיקן",
  "Holy See": "ותיקן",
  "Puerto Rico": "פוארטו ריקו",
  "Guam": "גוואם",
  "Martinique": "מרטיניק",
  "Guadeloupe": "גוואדלופ",
  "French Polynesia": "פולינזיה הצרפתית",
  "New Caledonia": "קלדוניה החדשה",
  "Reunion": "ראוניון",
  "French Guiana": "גיינה הצרפתית",
  "Mayotte": "מיוט",
  "Macao": "מקאו",
  "Faroe Islands": "איי פארו",
  "Gibraltar": "גיברלטר",
  "Isle of Man": "האי מאן",
  "Jersey": "ג'רזי",
  "Guernsey": "גרנזי",
  "Greenland": "גרינלנד",
  "Bermuda": "ברמודה",
  "Cayman Islands": "איי קיימן",
  "British Virgin Islands": "איי הבתולה הבריטיים",
  "Aruba": "ארובה",
  "Curacao": "קוראסאו",
  "Curaçao": "קוראסאו",
  "Sint Maarten": "סן מרטן",
  "Saint Martin": "סן מרטן",
  "Bonaire": "בונייר",
  "Montserrat": "מונסראט",
  "Anguilla": "אנגווילה",
  "American Samoa": "סמואה האמריקנית",
  "Northern Mariana Islands": "איי מריאנה הצפוניים",
  "Cook Islands": "איי קוק",
  "Wallis and Futuna": "ואליס ופוטונה",
  "Niue": "ניואה",
  "Tokelau": "טוקלאו",
  "Kosovo": "קוסובו",
  "Mozambique": "מוזמביק",
  "International": "בינלאומי",
  "Unknown": "לא ידוע",
  "Turks and Caicos Islands": "איי טרקס וקייקוס",
  "Saba": "סאבא",
  "Sint Eustatius": "סנט אוסטטיוס",
  "Lesotho": "לסוטו",
  "Eswatini": "אסוואטיני",
  "Swaziland": "סוואזילנד",
  "Sao Tome and Principe": "סאו טומה ופרינסיפה",
  "Western Sahara": "סהרה המערבית",
  "Saint Pierre and Miquelon": "סן-פייר ומיקלון",
  "Falkland Islands": "איי פוקלנד",
  "South Georgia and the South Sandwich Islands": "איי ג'ורג'יה הדרומית ואיי סנדוויץ' הדרומיים",
  "Heard Island and McDonald Islands": "האי הרד ואיי מקדונלד",
  "British Indian Ocean Territory": "הטריטוריה הבריטית באוקיינוס ההודי",
  "Christmas Island": "אי חג המולד",
  "Cocos (Keeling) Islands": "איי קוקוס",
  "Norfolk Island": "האי נורפוק",
  "Pitcairn": "פיטקרן",
  "Saint Helena": "סנט הלנה",
  "Antarctica": "אנטארקטיקה",
  "Belarus": "בלארוס",
  "Republic of Belarus": "בלארוס",
  "Brunei Darussalam": "ברוניי",
  "Congo, Democratic Republic of": "קונגו הדמוקרטית",
  "Congo, Republic of": "קונגו",
  "Cote d'Ivoire": "חוף השנהב",
  "Holy See (Vatican City State)": "ותיקן",
  "Iran, Islamic Republic of": "איראן",
  "Korea, Democratic People's Republic of": "צפון קוריאה",
  "Lao People's Democratic Republic": "לאוס",
  "Libyan Arab Jamahiriya": "לוב",
  "Micronesia, Federated States of": "מיקרונזיה",
  "Moldova, Republic of": "מולדובה",
  "Palestine, State of": "פלסטין",
  "Svalbard and Jan Mayen": "סבאלברד ויאן מאיין",
  "Syrian Arab Republic": "סוריה",
  "Tanzania, United Republic of": "טנזניה",
  "Venezuela, Bolivarian Republic of": "ונצואלה",
  "U.S. Virgin Islands": "איי הבתולה של ארצות הברית",
  "Saint Barthélemy": "סן ברתלמי",
  "Saint-Barthélemy": "סן ברתלמי",
  "St. Barts": "סן ברתלמי",
  "Sint Maarten (Dutch part)": "סן מרטן",
  "Saint Martin (French part)": "סן מרטן",
  "The United Kingdom of Great Britain and Northern Ireland": "בריטניה",
  "Saint Vincent and The Grenadines": "סנט וינסנט והגרנדינים",
  "The Republic of Yemen": "תימן",
  "The Sultanate of Oman": "עומאן",
  "The Republic of Iraq": "עיראק",
  "Kingdom of Morocco": "מרוקו",
  "State of Kuwait": "כווית",
  "Hashemite Kingdom of Jordan": "ירדן",
  "Republic of Lebanon": "לבנון",
  "The Arabic Republic of Egypt": "מצרים",
  "The French Republic": "צרפת",
  "The Italian Republic": "איטליה",
  "The Swiss Confederation": "שוויץ",
  "The Portuguese Republic": "פורטוגל",
  "The Hellenic Republic": "יוון",
  "The Kingdom of Spain": "ספרד",
  "The Kingdom of Norway": "נורווגיה",
  "The Kingdom of Sweden": "שוודיה",
  "The Kingdom of Belgium": "בלגיה",
  "The Grand Duchy of Luxembourg": "לוקסמבורג",
  "Bonaire, Sint Eustatius and Saba": "בונייר, סנט אוסטטיוס וסאבא",
  "St. Barthelemy": "סן ברתלמי",
  "St. Martin": "סן מרטן",
  "Wallis & Futuna": "ואליס ופוטונה",
  "Turks & Caicos": "איי טרקס וקייקוס",
  "The Vatican City State": "ותיקן",
  "Réunion": "ראוניון",
  "The Republic of Korea": "דרום קוריאה",
  "The People's Republic of China": "סין",
  "The Republic of India": "הודו",
  "The Federative Republic of Brazil": "ברזיל",
  "The United Mexican States": "מקסיקו",
  "The Republic of Indonesia": "אינדונזיה",
  "The Islamic Republic of Pakistan": "פקיסטן",
  "The Federal Republic of Nigeria": "ניגריה",
  "The People's Republic of Bangladesh": "בנגלדש",
  "The Federal Republic of Ethiopia": "אתיופיה",
  "The Republic of the Philippines": "פיליפינים",
  "The Arab Republic of Egypt": "מצרים",
  "The Socialist Republic of Viet Nam": "וייטנאם",
  "The Republic of Turkey": "טורקיה",
  "The Federal Republic of Germany": "גרמניה",
  "The Kingdom of Thailand": "תאילנד",
  "The United Republic of Tanzania": "טנזניה",
  "The Republic of South Africa": "דרום אפריקה",
  "The Republic of Kenya": "קניה",
  "The Republic of Colombia": "קולומביה",
  "The Republic of Algeria": "אלג'יריה",
  "The Republic of Peru": "פרו",
  "The Republic of Uzbekistan": "אוזבקיסטן",
  "The Federation of Malaysia": "מלזיה",
  "The Republic of Ghana": "גאנה",
  "The Republic of Mozambique": "מוזמביק",
  "The Republic of Madagascar": "מדגסקר",
  "The Republic of Cameroon": "קמרון",
  "The Republic of Cote d'Ivoire": "חוף השנהב",
  "The Republic of Niger": "ניז'ר",
  "The Republic of Malawi": "מלאווי",
  "The Republic of Zambia": "זמביה",
  "The Republic of Mali": "מאלי",
  "The Republic of Sri Lanka": "סרי לנקה",
  "The Republic of Kazakhstan": "קזחסטן",
  "The Republic of Chile": "צ'ילה",
  "The Republic of Romania": "רומניה",
  "The Republic of Guatemala": "גואטמלה",
  "The Republic of Chad": "צ'אד",
  "The Republic of Senegal": "סנגל",
  "The Kingdom of Cambodia": "קמבודיה",
  "The Republic of Zimbabwe": "זימבבואה",
  "The Republic of Guinea": "גינאה",
  "The Republic of Rwanda": "רואנדה",
  "The Republic of Benin": "בנין",
  "The Republic of Burundi": "בורונדי",
  "The Republic of Tunisia": "תוניסיה",
  "The Republic of South Sudan": "דרום סודן",
  "The Republic of Honduras": "הונדורס",
  "The Republic of El Salvador": "אל סלוודור",
  "The Independent State of Papua New Guinea": "פפואה גינאה החדשה",
  "The Republic of Austria": "אוסטריה",
  "The Republic of Tajikistan": "טג'יקיסטן",
  "The Kingdom of Denmark": "דנמרק",
  "The Republic of Finland": "פינלנד",
  "The Slovak Republic": "סלובקיה",
  "The Republic of Bulgaria": "בולגריה",
  "The Republic of Paraguay": "פרגוואי",
  "The Republic of Laos": "לאוס",
  "The Republic of Nicaragua": "ניקרגואה",
  "The Kyrgyz Republic": "קירגיזסטן",
  "The Republic of Turkmenistan": "טורקמניסטן",
  "The Republic of Singapore": "סינגפור",
  "The State of Eritrea": "אריתריאה",
  "The Republic of the Congo": "קונגו",
  "The Republic of Togo": "טוגו",
  "The Republic of Sierra Leone": "סיירה לאון",
  "The State of Libya": "לוב",
  "The Republic of Costa Rica": "קוסטה ריקה",
  "The Republic of Liberia": "ליבריה",
  "The State of Palestine": "פלסטין",
  "The Republic of Croatia": "קרואטיה",
  "The Republic of Georgia": "גיאורגיה",
  "The Republic of Armenia": "ארמניה",
  "The Republic of Moldova": "מולדובה",
  "The Republic of Panama": "פנמה",
  "The Republic of Ireland": "אירלנד",
  "The Oriental Republic of Uruguay": "אורוגוואי",
  "The Republic of Lithuania": "ליטא",
  "The Republic of Albania": "אלבניה",
  "The Republic of Mongolia": "מונגוליה",
  "The State of Qatar": "קטאר",
  "The Republic of Slovenia": "סלובניה",
  "The Republic of Cyprus": "קפריסין",
  "The Republic of Estonia": "אסטוניה",
  "The Republic of Fiji": "פיג'י",
  "The Republic of Guyana": "גיאנה",
  "The Republic of Djibouti": "ג'יבוטי",
  "The Union of the Comoros": "קומורו",
  "The Kingdom of Bhutan": "בהוטן",
  "The Republic of Montenegro": "מונטנגרו",
  "The Republic of Suriname": "סורינאם",
  "The Republic of Cape Verde": "כף ורדה",
  "The Republic of Malta": "מלטה",
  "The Republic of Maldives": "האיים המלדיביים",
  "The Republic of Iceland": "איסלנד",
  "The Republic of Vanuatu": "ונואטו",
  "The Republic of Seychelles": "סיישל",
  "The Principality of Monaco": "מונאקו",
  "The Principality of Liechtenstein": "ליכטנשטיין",
  "The Republic of San Marino": "סן מרינו",
  "The State of the Vatican City": "ותיקן",
  "The Republic of Botswana": "בוטסואנה",
  "The Republic of Namibia": "נמיביה",
  "The Republic of Angola": "אנגולה",
  "The Gabonese Republic": "גבון",
  "The Republic of the Gambia": "גמביה",
  "The Republic of Guinea-Bissau": "גינאה ביסאו",
  "The Republic of Mauritius": "מאוריציוס",
  "The Republic of Nauru": "נאורו",
  "The State of Samoa": "סמואה",
  "The Kingdom of Tonga": "טונגה",
  "The Republic of Trinidad and Tobago": "טרינידד וטובגו",
  "The Republic of Cabo Verde": "כף ורדה",
  "The Kingdom of the Netherlands": "הולנד",
  "The People's Democratic Republic of Algeria": "אלג'יריה",
  "The Republic of Equatorial Guinea": "גינאה המשוונית",
  "The Sahrawi Arab Democratic Republic": "סהרה המערבית",
  "The Republic of the Marshall Islands": "איי מרשל",
  "The Republic of Palau": "פלאו",
  "The Federated States of Micronesia": "מיקרונזיה",
  "The Independent State of Samoa": "סמואה",
  "The Republic of Kiribati": "קיריבטי",
  "The Solomon Islands": "איי שלמה",
  "Türkiye": "טורקיה",
  "Taiwan, Republic Of China": "טייוואן",
  "Bolivarian Republic Of Venezuela": "ונצואלה",
  "Republic Of North Macedonia": "צפון מקדוניה",
  "Islamic Republic Of Iran": "איראן",
  "The United States Minor Outlying Islands": "איי המינור המרוחקים של ארה\"ב",
  "The Democratic Peoples Republic Of Korea": "צפון קוריאה",
  "US Virgin Islands": "איי הבתולה של ארה\"ב",
  "Coted Ivoire": "חוף השנהב",
  "The Falkland Islands Malvinas": "איי פוקלנד",
  "The Lao Peoples Democratic Republic": "לאוס",
  "Cabo Verde": "כף ורדה",
  "Aland Islands": "איי אולנד",
  "Guinea Bissau": "גינאה ביסאו",
  "Ascension And Tristan Da Cunha Saint Helena": "סנט הלנה",
  "The French Southern Territories": "הטריטוריות הדרומיות של צרפת",
  "Bhutan": "בהוטן",
  "The Cocos Keeling Islands": "איי קוקוס (קילינג)",
  "Timor Leste": "מזרח טימור",
  "United States Virgin Islands": "איי הבתולה של ארצות הברית"
};

// Memoized canonical map for faster translation lookups
const CANONICAL_TRANSLATIONS: Record<string, string> = Object.entries(COUNTRY_TRANSLATIONS).reduce((acc, [key, val]) => {
  acc[key.toLowerCase()] = val;
  // Also add stripped version
  const stripped = key.replace(/\(the\)/i, "").replace(/^the /i, "").trim().toLowerCase();
  if (!acc[stripped]) acc[stripped] = val;
  return acc;
}, {} as Record<string, string>);

// --- Memoized Components ---

const StationCard = React.memo(({ 
  station, 
  isActive, 
  isPlaying,
  isBuffering,
  visualizer,
  isFavorite, 
  onPlay, 
  onToggleFavorite, 
  translateCountry 
}: { 
  station: RadioStation; 
  isActive: boolean; 
  isPlaying: boolean;
  isBuffering: boolean;
  visualizer: boolean;
  isFavorite: boolean; 
  onPlay: (s: RadioStation) => void; 
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  translateCountry: (name: string) => string;
}) => {
  return (
    <div 
      id={`station-${station.stationuuid}`}
      className="group relative bg-[#1e362d]/80 border border-white/5 p-2 md:p-4 rounded-sm flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform aspect-square" 
      onClick={() => onPlay(station)}
    >
      {isActive && (
        <div className="absolute inset-0 border-2 border-[#dccba3]/40 bg-[#dccba3]/5 rounded-xl md:rounded-3xl z-10 pointer-events-none" />
      )}
      
      <div className="relative w-12 h-12 md:w-20 md:h-20 mb-2 md:mb-3 z-20 rounded-lg md:rounded-2xl overflow-hidden bg-[#12241d] shadow-inner border border-white/5 flex-shrink-0">
        {station.favicon ? (
          <img 
            src={station.favicon} 
            alt="" 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
            onError={(e) => { e.currentTarget.src = "https://picsum.photos/seed/radio/150/150"; }} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="text-[#dccba3]/20 w-5 h-5 md:w-8 md:h-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 md:group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
          <Play fill="currentColor" size={20} className="text-white md:w-6 md:h-6" />
        </div>
      </div>

      <div className="w-full min-w-0 z-20 text-center overflow-hidden h-10 md:h-14 flex flex-col justify-center">
        <h3 className="font-bold text-white truncate text-[10px] md:text-sm mb-0.5 md:mb-1 px-2">{station.name}</h3>
        <div className="text-[8px] md:text-xs text-[#e3d5b8]/30 flex items-center justify-center gap-1 min-h-[12px] md:min-h-[16px]">
          {isActive && isPlaying && !isBuffering && visualizer ? (
            <div className="flex items-end gap-0.5 h-2 md:h-3">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: ["30%", "100%", "40%", "90%", "30%"] }}
                  transition={{ repeat: Infinity, duration: 0.4 + i * 0.1, ease: "easeInOut" }}
                  className="w-0.5 bg-[#dccba3] rounded-full"
                />
              ))}
            </div>
          ) : (
            <>
              <span className="truncate">{translateCountry(station.country)}</span>
              <img src={`https://flagcdn.com/w20/${(station.countrycode || "il").toLowerCase()}.png`} className="w-3 h-2 rounded-sm opacity-30 flex-shrink-0" alt="" />
            </>
          )}
        </div>
      </div>

      <div className="absolute top-1 right-1 md:top-2 md:right-2 z-30">
        <button 
          onClick={(e) => onToggleFavorite(station.stationuuid, e)} 
          className={cn("p-1 md:p-1.5 rounded-full", isFavorite ? "text-[#ff6b6b]" : "text-white/10 hover:text-white/40")}
        >
          <Heart size={12} className="md:w-4 md:h-4" fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
});

export default function App() {
  // State
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewType>("popular");
  const [previousView, setPreviousView] = useState<ViewType>("countries");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [useStreamProxy, setUseStreamProxy] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "error" | "info" } | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [gridCols, setGridCols] = useState<number>(3);
  const [playedFromView, setPlayedFromView] = useState<ViewType | null>(null);
  const [playedFromCountry, setPlayedFromCountry] = useState<string | null>(null);
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [theme, setTheme] = useState<"dark" | "high-contrast">("dark");
  const [visualizer, setVisualizer] = useState(true);
  const [saveConsent, setSaveConsent] = useState(true);
  const [visibleCount, setVisibleCount] = useState(60);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);

  // Test Firebase connection
  useEffect(() => {
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Splash Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      setIsAppLoaded(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Sync Favorites & Settings with Firestore
  useEffect(() => {
    if (!user) {
      // Load from local storage for guests
      const savedFavs = localStorage.getItem("radioprime_favorites");
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
      const savedCols = localStorage.getItem("radioprime_grid_cols");
      if (savedCols) setGridCols(parseInt(savedCols));
      const savedCountry = localStorage.getItem("radioprime_user_country");
      if (savedCountry) setUserCountry(savedCountry);
      return;
    }

    // Sync Settings
    const userDocRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.gridCols) {
          setGridCols(data.gridCols);
          localStorage.setItem("radioprime_grid_cols", data.gridCols.toString());
        }
        if (data.quality) setQuality(data.quality);
        if (data.theme) setTheme(data.theme);
        if (data.visualizer !== undefined) setVisualizer(data.visualizer);
        if (data.userCountry) {
          setUserCountry(data.userCountry);
          localStorage.setItem("radioprime_user_country", data.userCountry);
        }
      } else {
        // Initial set for new user from local storage
        const savedCols = localStorage.getItem("radioprime_grid_cols") || "3";
        const savedCountry = localStorage.getItem("radioprime_user_country");
        setDoc(userDocRef, {
          gridCols: parseInt(savedCols),
          quality: "high",
          theme: "dark",
          visualizer: true,
          userCountry: savedCountry || null,
          updatedAt: serverTimestamp()
        });
      }
    });

    // Sync Favorites
    const favsRef = collection(db, 'users', user.uid, 'favorites');
    const unsubFavs = onSnapshot(favsRef, (querySnap) => {
      const favIds = querySnap.docs.map(d => d.data().stationId);
      setFavorites(favIds);
      localStorage.setItem("radioprime_favorites", JSON.stringify(favIds));
    });

    return () => {
      unsubUser();
      unsubFavs();
    };
  }, [user]);

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // Check backend health
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await axios.get("/api/health", { timeout: 3000 });
        setBackendAvailable(res.data.status === "ok");
      } catch (e) {
        console.warn("Backend server not detected (e.g. static hosting like Netlify). Using direct mirrors.");
        setBackendAvailable(false);
      }
    };
    checkBackend();
  }, []);

  // Scroll to top when view or selection changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    setVisibleCount(60);
  }, [view, selectedCountry]);

  // Reset lazy load on new stations
  useEffect(() => {
    setVisibleCount(60);
  }, [stations]);

  // Infinite scroll logic components
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 800) {
      setVisibleCount(prev => Math.min(prev + 60, stations.length));
    }
  }, [stations.length]);

  useEffect(() => {
    const scrollElem = scrollRef.current;
    if (scrollElem) {
      scrollElem.addEventListener("scroll", handleScroll, { passive: true });
    }
    return () => {
      if (scrollElem) {
        scrollElem.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll]);

  const translateCountry = useCallback((name: string) => {
    if (!name) return "";
    
    // Exact match first
    if (COUNTRY_TRANSLATIONS[name]) return COUNTRY_TRANSLATIONS[name];

    // Case-insensitive canonical match (O(1) average lookup)
    const canonical = name.trim().toLowerCase();
    if (CANONICAL_TRANSLATIONS[canonical]) return CANONICAL_TRANSLATIONS[canonical];

    // Try stripping prefixes
    const stripped = name.replace(/\(the\)/i, "").replace(/^the /i, "").trim().toLowerCase();
    if (CANONICAL_TRANSLATIONS[stripped]) return CANONICAL_TRANSLATIONS[stripped];
    
    return name;
  }, []);

  const showNotification = useCallback((message: string, type: "error" | "info" = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const fetchStations = useCallback(async (type: ViewType = "countries", extraParams: any = {}, retryCount = 0) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    try {
      const currentCountry = extraParams.country || selectedCountry;
      const countryToFetch = currentCountry || (type === "countries" ? "Israel" : "");

      // Base endpoint logic
      let endpoint = `/stations/topclick/100`;
      let queryParams = { ...extraParams };
      
      if (type === "search" || searchQuery) {
        endpoint = `/stations/search`;
        queryParams = { name: searchQuery, limit: 100000, ...extraParams };
      } else if (type === "favorites") {
        setLoading(false);
        return;
      } else if (countryToFetch) {
        endpoint = `/stations/bycountry/${countryToFetch}`;
        queryParams = { order: "clickcount", reverse: "true", limit: 100000, ...extraParams };
      }

      // Try local proxy first
      try {
        const url = `${API_BASE}${endpoint}`;
        const response = await axios.get(url, { 
          params: queryParams,
          signal: abortControllerRef.current.signal 
        });
        
        const uniqueStations: RadioStation[] = [];
        const seenIds = new Set<string>();
        for (const station of response.data) {
          if (station.stationuuid && !seenIds.has(station.stationuuid)) {
            seenIds.add(station.stationuuid);
            uniqueStations.push(station);
          }
        }
        setStations(uniqueStations);
      } catch (proxyError) {
        if (axios.isCancel(proxyError)) return;
        console.error("Proxy Load Error:", {
          url: `${API_BASE}${endpoint}`,
          params: queryParams,
          error: proxyError
        });
        console.warn("Proxy failed, trying direct mirror...");
        
        // Fallback to mirrors
        let success = false;
        for (const mirror of RADIO_MIRRORS) {
          try {
            const mirrorUrl = `${mirror}${endpoint}`;
            const response = await axios.get(mirrorUrl, { 
              params: queryParams,
              signal: abortControllerRef.current.signal 
            });
            const uniqueStations: RadioStation[] = [];
            const seenIds = new Set<string>();
            for (const station of response.data) {
              if (station.stationuuid && !seenIds.has(station.stationuuid)) {
                seenIds.add(station.stationuuid);
                uniqueStations.push(station);
              }
            }
            setStations(uniqueStations);
            success = true;
            break;
          } catch (mirrorError) {
            console.error(`Mirror Load Error (${mirror}):`, {
              url: `${mirror}${endpoint}`,
              params: queryParams,
              error: mirrorError
            });
          }
        }
        
        if (!success) {
          console.error("All load attempts failed (Proxy + Mirrors)");
          throw proxyError;
        }
      }

      if (stations.length === 0 && (type === "search" || searchQuery)) {
        showNotification("לא נמצאו תחנות תואמות לחיפוש", "info");
      }
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error("Failed to fetch stations", error);
      if (retryCount < 2) {
        setTimeout(() => fetchStations(type, extraParams, retryCount + 1), 1500);
      } else {
        showNotification("שגיאה בטעינת תחנות. נסה שוב מאוחר יותר", "error");
      }
    } finally {
      // Small artificial delay to smooth out rapid state changes if connection is "too fast"
      setTimeout(() => setLoading(false), 300);
    }
  }, [selectedCountry, searchQuery, showNotification]);

  const fetchCountries = useCallback(async (retryCount = 0) => {
    try {
      // Try proxy first
      try {
        const url = `${API_BASE}/countries`;
        const response = await axios.get(url);
        if (Array.isArray(response.data)) {
          const validCountries = response.data.filter((c: any) => c.iso_3166_1 && c.stationcount > 0);
          setCountries(validCountries.sort((a: any, b: any) => b.stationcount - a.stationcount));
        } else throw new Error("Invalid response format");
      } catch (proxyError) {
        console.error("Proxy Countries Load Error:", {
          url: `${API_BASE}/countries`,
          error: proxyError
        });
        console.warn("Proxy countries fetch failed, trying direct mirror...");
        let success = false;
        for (const mirror of RADIO_MIRRORS) {
          try {
            const mirrorUrl = `${mirror}/countries`;
            const response = await axios.get(mirrorUrl);
            if (Array.isArray(response.data)) {
              const validCountries = response.data.filter((c: any) => c.iso_3166_1 && c.stationcount > 0);
              setCountries(validCountries.sort((a: any, b: any) => b.stationcount - a.stationcount));
              success = true;
              break;
            }
          } catch (mirrorError) {
            console.error(`Mirror Countries Load Error (${mirror}):`, {
              url: `${mirror}/countries`,
              error: mirrorError
            });
          }
        }
        if (!success) {
          console.error("All countries load attempts failed");
          throw proxyError;
        }
      }
    } catch (error) {
      console.error("Failed to fetch countries", error);
      if (retryCount < 2) {
        setTimeout(() => fetchCountries(retryCount + 1), 2000);
      } else {
        showNotification("לא הצלחנו לטעון את רשימת המדינות. נסה לרענן.", "error");
      }
    }
  }, [showNotification]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOnlineEvent = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      showNotification("חיבור האינטרנט אבד", "error");
    };
    window.addEventListener("online", handleOnlineEvent);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnlineEvent);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showNotification]);

  // Save Settings
  useEffect(() => {
    if (!saveConsent) return;
    
    if (!user) {
      localStorage.setItem("radioprime_grid_cols", gridCols.toString());
      localStorage.setItem("radioprime_quality", quality);
      localStorage.setItem("radioprime_theme", theme);
      localStorage.setItem("radioprime_visualizer", visualizer.toString());
      if (userCountry) localStorage.setItem("radioprime_user_country", userCountry);
      else localStorage.removeItem("radioprime_user_country");
    } else {
      const userDocRef = doc(db, 'users', user.uid);
      updateDoc(userDocRef, { 
        gridCols, 
        quality, 
        theme, 
        visualizer, 
        userCountry,
        updatedAt: serverTimestamp() 
      }).catch(e => {
        if (e.code === 'not-found') {
          setDoc(userDocRef, { 
            gridCols, 
            quality, 
            theme, 
            visualizer, 
            userCountry,
            updatedAt: serverTimestamp() 
          });
        }
      });
    }
  }, [gridCols, quality, theme, visualizer, userCountry, user, saveConsent]);

  // Load Settings from Local Storage for Guests
  useEffect(() => {
    if (!user) {
      const savedCols = localStorage.getItem("radioprime_grid_cols");
      if (savedCols) setGridCols(parseInt(savedCols));
      const savedQuality = localStorage.getItem("radioprime_quality");
      if (savedQuality) setQuality(savedQuality as any);
      const savedTheme = localStorage.getItem("radioprime_theme");
      if (savedTheme) setTheme(savedTheme as any);
      const savedVis = localStorage.getItem("radioprime_visualizer");
      if (savedVis) setVisualizer(savedVis === "true");
    }
  }, [user]);

  // Load Favorites - Handled by Firebase Sync effect now, keeping only for guest
  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem("radioprime_favorites");
      if (saved) setFavorites(JSON.parse(saved));
    }
  }, [user]);

  // Save Favorites locally - Handled by Firebase sync mostly, but keep for consistency
  useEffect(() => {
    localStorage.setItem("radioprime_favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Fetch Initial Data
  useEffect(() => {
    const savedCountry = localStorage.getItem("radioprime_user_country");
    if (savedCountry) {
      setUserCountry(savedCountry);
      setSelectedCountry(savedCountry);
      setView("stations");
      fetchStations("stations", { country: savedCountry });
    } else {
      fetchStations("popular");
    }
    fetchCountries();
  }, [fetchStations, fetchCountries]);

  const toggleFavorite = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFav = favorites.includes(id);
    
    // Optimistic UI
    setFavorites(prev => 
      isFav ? prev.filter(f => f !== id) : [...prev, id]
    );

    if (user) {
      try {
        const favDocRef = doc(db, 'users', user.uid, 'favorites', id);
        if (isFav) {
          await deleteDoc(favDocRef);
        } else {
          await setDoc(favDocRef, {
            stationId: id,
            createdAt: serverTimestamp()
          });
        }
      } catch (err) {
        handleFirestoreError(err, isFav ? 'delete' : 'create', `favorites/${id}`);
        showNotification("שגיאה בסנכרון מועדפים", "error");
      }
    }
  }, [favorites, user, showNotification]);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showNotification("התחברת בהצלחה", "info");
      setIsSettingsOpen(false);
    } catch (err: any) {
      console.error(err);
      showNotification("שגיאה בהתחברות", "error");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      showNotification("התנתקת בהצלחה", "info");
      setIsSettingsOpen(false);
      setFavorites([]); // Clear local state, will sync back if persistent
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'RadioPrime - רדיו בסטייל',
        text: 'בואו להאזין לרדיו מכל העולם!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      showNotification("הקישור הועתק ללוח", "info");
    }
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      const elem = document.documentElement as any;
      const requestFullscreen = 
        elem.requestFullscreen || 
        elem.webkitRequestFullscreen || 
        elem.mozRequestFullScreen || 
        elem.msRequestFullscreen;

      if (requestFullscreen) {
        requestFullscreen.call(elem).catch((err: any) => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
          showNotification("הצגת מסך מלא לא נתמכת בדפדפן זה", "error");
        });
      } else {
        showNotification("הצגת מסך מלא לא נתמכת בדפדפן זה", "error");
      }
    } else {
      const exitFullscreen = 
        document.exitFullscreen || 
        (document as any).webkitExitFullscreen || 
        (document as any).mozCancelFullScreen || 
        (document as any).msExitFullscreen;

      if (exitFullscreen) {
        exitFullscreen.call(document);
      }
    }
  }, [showNotification]);

  const playStation = useCallback(async (station: RadioStation, retryCount = 0) => {
    setCurrentStation(station);
    setPlayedFromView(view);
    setPlayedFromCountry(selectedCountry);
    const useProxy = retryCount > 0;
    setUseStreamProxy(useProxy);
    setIsBuffering(true);
    setIsPlaying(true);

    if (!audioRef.current) return;

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    try {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src'); 
      audioRef.current.load();

      let streamUrl = station.url_resolved || station.url;
      
      // Force proxy for http or if it's a retry, but ONLY if backend is available
      if ((streamUrl.startsWith("http://") || useProxy) && backendAvailable !== false) {
        streamUrl = `/api/stream?url=${encodeURIComponent(streamUrl)}`;
      } else if (streamUrl.startsWith("http://") && location.protocol === "https:") {
        console.warn("Attempting to load HTTP stream on HTTPS page without proxy. This may fail.");
        // We still try, some browsers might allow it or users might have relaxed settings
      }

      if (station.hls === 1 && Hls.isSupported() && !useProxy) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 0,
          manifestLoadingMaxRetry: 1
        });
        
        hls.loadSource(streamUrl);
        hls.attachMedia(audioRef.current);
        hlsRef.current = hls;
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audioRef.current?.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && retryCount === 0) {
            hls.destroy();
            playStation(station, 1);
          }
        });

      } else {
        audioRef.current.src = streamUrl;
        audioRef.current.load();
        await audioRef.current.play();
      }
      setIsBuffering(false);
    } catch (err) {
      console.warn("Playback attempt failed:", err);
      if (retryCount === 0) {
        playStation(station, 1);
      } else {
        setIsPlaying(false);
        setIsBuffering(false);
        showNotification(`נראה שיש בעיה בשידור של ${station.name}. נסה תחנה אחרת.`, "error");
      }
    }
  }, [showNotification]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      const nextPlayingState = !isPlaying;
      setIsPlaying(nextPlayingState);

      if (!nextPlayingState) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => {
          console.error(e);
          setIsPlaying(false);
        });
      }
    }
  }, [isPlaying]);

  const scrollToStation = useCallback(() => {
    if (!currentStation) return;
    const element = document.getElementById(`station-${currentStation.stationuuid}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // If not in current view, we don't automatically navigate to avoid confusing the user,
      // but we could optionally notify them.
      showNotification("התחנה לא מופיעה ברשימה הנוכחית", "info");
    }
  }, [currentStation, showNotification]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (view === "favorites") {
      if (favorites.length === 0) {
        setStations([]);
        return;
      }
      setLoading(true);
      const urlPromises = favorites.map(id => 
        axios.get(`${API_BASE}/stations/byuuid/${id}`)
      );
      Promise.all(urlPromises)
        .then(results => {
          const rawStations = results.map(r => r.data[0]).filter(Boolean);
          const uniqueStations: RadioStation[] = [];
          const seenIds = new Set<string>();
          for (const station of rawStations) {
            if (station.stationuuid && !seenIds.has(station.stationuuid)) {
              seenIds.add(station.stationuuid);
              uniqueStations.push(station);
            }
          }
          setStations(uniqueStations);
        })
        .catch((err) => {
          console.error("Favorites Load Error:", {
            favoriteIds: favorites,
            error: err
          });
          showNotification("שגיאה בטעינת המועדפים", "error");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [view, favorites, showNotification]);

  const filteredCountries = useMemo(() => {
    const query = countrySearchQuery.toLowerCase().trim();
    if (!query) return countries;
    return countries.filter(c => 
      c.name.toLowerCase().includes(query) || 
      translateCountry(c.name).toLowerCase().includes(query)
    );
  }, [countries, countrySearchQuery, translateCountry]);

  const allGenres = useMemo(() => [
    "ישראלי", "פופ", "רוק", "אלקטרוני", "טכנו", "האוס", "טראנס", "דאנס", "ראפ", "היפ הופ", 
    "ג'אז", "בלוז", "מטאל", "לו-פיי", "קלאסי", "צ'ילהאאוט", "רטרו", "אייטיז", "ניינטיז", 
    "ים תיכוני", "דתי", "חדשות", "ספורט", "רגאיי", "פאנק", "סול", "מדיטציה", "ילדים", "קאנטרי",
    "אינדי", "חלופית", "פסקול", "סינת'פופ", "דיסקו", "דיפ האוס", "פסייטרנס", "צ'יל", 
    "אווירה", "שירי ארץ ישראל", "יוונית", "ערבית", "מזרחית", "חסידית", "רוחנית", 
    "אופרה", "מחזות זמר", "קומדיה", "פודקאסט", "טבע", "חדשות עולם", "כלכלה"
  ], []);

  const filteredGenres = useMemo(() => {
    const query = tagSearchQuery.toLowerCase().trim();
    if (!query) return allGenres;
    return allGenres.filter(g => g.toLowerCase().includes(query));
  }, [allGenres, tagSearchQuery]);

  return (
    <div dir="rtl" className={cn(
      "h-screen bg-[#12241d] text-[#e3d5b8] font-sans selection:bg-[#dccba3] selection:text-black overflow-hidden flex flex-col relative transition-[filter,background-color] duration-500",
      theme === "high-contrast" ? "brightness-125 contrast-125" : ""
    )}>
        <AnimatePresence>
          {isOffline && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="bg-red-600 text-white text-[10px] md:text-xs py-1 text-center font-bold flex items-center justify-center gap-2 z-[100]"
            >
              <WifiOff size={14} /> אתם במצב אופליין. חלק מהתכונות לא יהיו זמינות.
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className={cn(
                "fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl flex items-center gap-4 backdrop-blur-2xl shadow-2xl min-w-[320px] md:min-w-[440px] border",
                notification.type === "error" ? "bg-red-500/10 border-red-500/30 text-red-200" : "bg-white/[0.08] border-white/10 text-white"
              )}
            >
              {notification.type === "error" ? <AlertCircle size={18} /> : <Radio size={18} className="text-[#dccba3]" />}
              <span className="text-xs md:text-sm font-medium flex-1">{notification.message}</span>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-full"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[#12241d]" />
        <div className="absolute top-[-10%] left-[20%] w-[70%] h-[70%] bg-[#dccba3]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-[#b3a478]/10 blur-[100px] rounded-full animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.05]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 50 Q30 10 50 50 T90 50' stroke='%23e3d5b8' fill='none' stroke-width='0.5'/%3E%3C/svg%3E")`, backgroundSize: '300px' }} />
      </div>

      <header className="h-16 border-b border-[#e3d5b8]/10 flex items-center justify-between px-6 bg-[#12241d]/80 backdrop-blur-xl z-[60] sticky top-0 transition-all">
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right flex items-center gap-2">
            <div className="w-1 h-6 bg-[#dccba3] rounded-full" />
            <h1 className="text-xl font-bold tracking-tight text-[#e3d5b8] uppercase italic">רדיו<span className="text-[#dccba3]">פריים</span></h1>
          </div>
        </div>

        <div className="flex-1 max-w-sm mx-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#dccba3]/40" size={18} />
          <input 
            type="text" 
            placeholder={view === "countries" ? "חפש מדינה..." : view === "genres" ? "חפש קטגוריה..." : "חפש תחנה..."}
            value={view === "countries" ? countrySearchQuery : view === "genres" ? tagSearchQuery : searchQuery}
            onChange={(e) => {
              const q = e.target.value;
              if (view === "countries") {
                setCountrySearchQuery(q);
              } else if (view === "genres") {
                setTagSearchQuery(q);
              } else {
                setSearchQuery(q);
                if (q.trim().length > 0) {
                  setSelectedGenre(null);
                  setView("search");
                  fetchStations("search");
                } else if (view === "search") {
                  setSelectedGenre(null);
                  setView("popular");
                  fetchStations("popular");
                }
              }
            }}
            className="w-full bg-white/10 border border-white/20 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#dccba3]/60 focus:bg-white/15 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-[#dccba3] border border-white/5 bg-white/5 shadow-lg group">
            <Settings size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <main ref={scrollRef} className="flex-1 overflow-y-auto py-4 md:py-10 custom-scrollbar relative px-0">
          <div className="w-full space-y-8 md:space-y-12 pb-36">
            <section>
              <div className="flex items-center justify-between mb-8 px-4">
                <div className="flex items-start gap-3 md:gap-4 flex-1">
                  <div className="w-1.5 h-8 md:h-10 bg-gradient-to-b from-[#dccba3] to-[#b3a478] rounded-full shadow-[0_0_15px_rgba(220,203,163,0.3)] shrink-0 mt-1 md:mt-0" />
                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 flex-1">
                    <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-[#e3d5b8] leading-tight md:leading-normal">
                      {view === "favorites" ? "הפלייליסט שלי" : 
                       view === "countries" ? "מפה עולמית" : 
                       view === "genres" ? "קטגוריות" : 
                       (selectedCountry && view === "stations") ? `רדיו ${translateCountry(selectedCountry)}` : 
                       (selectedGenre && (view === "search" || view === "stations") && !searchQuery) ? `רדיו ${selectedGenre}` :
                       view === "search" && searchQuery ? "תוצאות חיפוש" : "הצעות בשבילך"}
                    </h2>
                    <span className="text-sm md:text-base font-medium text-[#dccba3]/40 shrink-0">
                      {view === "countries" ? `(${countries.length})` : view === "genres" ? `(${allGenres.length})` : 
                       view === "favorites" ? `(${favorites.length})` : `(${stations.length})`}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {(view === "stations" || view === "search" || view === "favorites" || view === "countries" || view === "genres") ? (
                  <button onClick={() => { 
                    const targetView = view === "stations" ? "countries" : "popular";
                    setSelectedCountry(null); 
                    setSelectedGenre(null);
                    setSearchQuery("");
                    setView(targetView); 
                    fetchStations(targetView);
                  }} className="flex items-center gap-2 py-2 px-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-[#dccba3] font-bold text-sm group">
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /> 
                    <span>חזרה</span>
                  </button>
                ) : <div />}
                </div>
              </div>

              {/* Country search bar removed as requested */}

              {loading ? (
                <div className={cn(
                  "grid gap-0 w-full",
                  gridCols === 2 ? "grid-cols-2" : 
                  gridCols === 4 ? "grid-cols-4" : 
                  gridCols === 5 ? "grid-cols-5" : 
                  "grid-cols-3"
                )}>
                  {[...Array(150)].map((_, i) => (
                    <div key={i} className="aspect-square bg-white/[0.02] border border-white/5 animate-pulse" />
                  ))}
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={view + (selectedCountry || "")} 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                  {view === "genres" ? (
                    <div className={cn(
                      "grid gap-0 w-full",
                      gridCols === 2 ? "grid-cols-2" : 
                      gridCols === 4 ? "grid-cols-4" : 
                      gridCols === 5 ? "grid-cols-5" : 
                      "grid-cols-3"
                    )}>
                      {filteredGenres.map((genre) => (
                        <motion.button 
                          key={genre} 
                          onClick={() => { 
                            const mapping: any = { 
                              "ישראלי": "Israel", "אלקטרוני": "Electronic", "טכנו": "Techno", "ראפ": "Rap", 
                              "היפ הופ": "Hip Hop", "ג'אז": "Jazz", "מטאל": "Metal", "לו-פיי": "Lofi", 
                              "קלאסי": "Classical", "רוק": "Rock", "פופ": "Pop", "צ'ילהאאוט": "Chillout", 
                              "רטרו": "Retro", "דאנס": "Dance", "האוס": "House", "טראנס": "Trance", 
                              "קאנטרי": "Country", "בלוז": "Blues", "סול": "Soul", "פאנק": "Funk", 
                              "רגאיי": "Reggae", "מדיטציה": "Meditation", "חדשות": "News", "ספורט": "Sport", 
                              "ילדים": "Kids", "ים תיכוני": "Mizrahi", "דתי": "Religious", "אייטיז": "80s", 
                              "ניינטיז": "90s", "אינדי": "Indie", "חלופית": "Alternative", "פסקול": "Soundtrack",
                              "סינת'פופ": "Synthpop", "דיסקו": "Disco", "דיפ האוס": "Deep House", 
                              "פסייטרנס": "Psytrance", "צ'יל": "Chill", "אווירה": "Ambient", "יוונית": "Greek",
                              "ערבית": "Arabic", "מזרחית": "Mizrahi", "חסידית": "Hasidic", "רוחנית": "Spiritual",
                              "אופרה": "Opera", "מחזות זמר": "Musicals", "קומדיה": "Comedy", "פודקאסט": "Podcast",
                              "טבע": "Nature", "חדשות עולם": "World News", "כלכלה": "Economy", "שירי ארץ ישראל": "Hebrew"
                            }; 
                            const q = mapping[genre] || genre; 
                            setSelectedGenre(genre);
                            setSearchQuery(""); 
                            setTagSearchQuery("");
                            setPreviousView("genres");
                            setView("search"); 
                            fetchStations("search", { tag: q.toLowerCase() }); 
                          }} 
                          className={cn(
                            "group relative h-28 rounded-sm flex flex-col items-center justify-center p-0 overflow-hidden hover:bg-white/10 active:scale-95 border border-white/5 transition-all bg-gradient-to-br",
                            getGenreGradient(genre)
                          )}
                        >
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                          <div className="relative z-10 flex flex-col items-center p-2">
                            <Music className="w-6 h-6 mb-2 text-white/50 group-hover:text-[#dccba3] transition-colors" />
                            <span className="text-sm font-bold text-white group-hover:text-white text-center drop-shadow-md">{genre}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : view === "countries" ? (
                    <div className={cn(
                      "grid gap-0 w-full",
                      gridCols === 2 ? "grid-cols-2" : 
                      gridCols === 4 ? "grid-cols-4" : 
                      gridCols === 5 ? "grid-cols-5" : 
                      "grid-cols-3"
                    )}>
                      {filteredCountries.map((country) => (
                        <motion.button 
                          key={country.iso_3166_1} 
                          onClick={() => { 
                            setSelectedCountry(country.name); 
                            setPreviousView("countries");
                            setView("stations"); 
                            fetchStations("stations", { country: country.name }); 
                            setCountrySearchQuery(""); 
                          }} 
                          className="group relative h-24 bg-[#162a22]/40 border border-white/5 hover:border-[#dccba3]/50 rounded-sm flex flex-col items-center justify-center p-3 hover:bg-[#162a22]/60 active:scale-95"
                        >
                          <div className="relative mb-2 w-10 h-10 overflow-hidden rounded-lg border border-white/10 group-hover:border-[#dccba3]/50 transition-all"><img src={`https://flagcdn.com/w80/${country.iso_3166_1.toLowerCase()}.png`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" loading="lazy" referrerPolicy="no-referrer" /></div>
                          <span className="text-[10px] md:text-xs font-bold text-white/50 text-center truncate w-full group-hover:text-white uppercase">{translateCountry(country.name)}</span>
                        </motion.button>
                      ))}
                    </div>
                  ) : stations.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center py-20 text-center w-full"
                    >
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        {view === "favorites" ? <Heart className="w-10 h-10 text-[#dccba3]/30" /> : <Search className="w-10 h-10 text-[#dccba3]/30" />}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        {view === "favorites" ? "אין לכם מועדפים עדיין" : "לא נמצאו תחנות"}
                      </h3>
                      <p className="text-[#e3d5b8]/30 max-w-xs mx-auto">
                        {view === "favorites" 
                          ? "לחצו על הלב בתחנות שאתם אוהבים כדי שיופיעו כאן בגישה מהירה" 
                          : "נסו לחפש משהו אחר או לבדוק את החיבור לאינטרנט"}
                      </p>
                    </motion.div>
                  ) : (
                    <div className={cn(
                      "grid gap-0 w-full",
                      gridCols === 2 ? "grid-cols-2" : 
                      gridCols === 4 ? "grid-cols-4" : 
                      gridCols === 5 ? "grid-cols-5" : 
                      "grid-cols-3"
                    )}>
                      {stations.slice(0, visibleCount).map((station) => (
                        <StationCard 
                          key={station.stationuuid}
                          station={station}
                          isActive={currentStation?.stationuuid === station.stationuuid}
                          isPlaying={isPlaying}
                          isBuffering={isBuffering}
                          visualizer={visualizer}
                          isFavorite={favorites.includes(station.stationuuid)}
                          onPlay={playStation}
                          onToggleFavorite={toggleFavorite}
                          translateCountry={translateCountry}
                        />
                      ))}
                      {visibleCount < stations.length && loading === false && (
                        <div className="col-span-full h-32 flex items-center justify-center">
                          <div className="flex items-center gap-2 text-[#dccba3]/50 animate-pulse">
                            <Music size={18} />
                            <span>טוען רדיו נוסף...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  </motion.div>
                </AnimatePresence>
              )}
            </section>
          </div>
        </main>
      </div>

      <AnimatePresence>
        <motion.footer initial={{ y: 150 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#12241d]/80 backdrop-blur-xl shadow-[0_-15px_50px_rgba(0,0,0,0.6)] border-t border-[#e3d5b8]/10 pb-safe">
          <AnimatePresence>
            {currentStation && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-white/5">
                <div className="h-16 md:h-20 px-4 md:px-8 grid grid-cols-3 items-center w-full">
                  {/* Right side: Station Info */}
                  <div className="flex items-center gap-3 overflow-hidden justify-start">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (currentStation && playedFromView) {
                          const isSameView = view === playedFromView;
                          const isSameCountry = playedFromView === "stations" ? selectedCountry === playedFromCountry : true;
                          const isAlreadyThere = isSameView && isSameCountry;

                          if (!isAlreadyThere) {
                            if (playedFromView === "stations" && playedFromCountry) {
                              setSelectedCountry(playedFromCountry);
                              setView("stations");
                              fetchStations("stations", { country: playedFromCountry });
                            } else {
                              setView(playedFromView);
                              if (playedFromView === "popular") {
                                fetchStations("popular");
                              } else if (playedFromView === "favorites") {
                                // No action needed as favorites is usually kept in state
                              }
                            }
                          }

                          // Give a moment for potential view switch, or scroll immediately if already there
                          const scrollDelay = isAlreadyThere ? 0 : 300;
                          setTimeout(() => {
                            const element = document.getElementById(`station-${currentStation.stationuuid}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              element.classList.add('ring-2', 'ring-[#dccba3]', 'ring-offset-2', 'ring-offset-[#12241d]');
                              setTimeout(() => {
                                element.classList.remove('ring-2', 'ring-[#dccba3]', 'ring-offset-2', 'ring-offset-[#12241d]');
                              }, 2000);
                            }
                          }, scrollDelay);
                        }
                      }}
                      className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 cursor-pointer"
                    >
                      {currentStation.favicon ? (
                        <img src={currentStation.favicon} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src="https://picsum.photos/seed/radio/100/100"; }} />
                      ) : <div className="w-full h-full flex items-center justify-center text-white/10"><Radio size={20} /></div>}
                    </motion.button>
                    <div className="overflow-hidden text-right">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm md:text-lg font-bold text-white tracking-tight truncate leading-tight">
                          {currentStation.name}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Play Button (Center) */}
                  <div className="flex justify-center">
                    <button onClick={togglePlay} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#dccba3] flex items-center justify-center shadow-[0_0_20px_rgba(220,203,163,0.3)] transition-[transform,background-color] duration-75 hover:scale-105 active:scale-95 text-[#12241d]">
                      {isBuffering ? (
                        <div className="w-4 h-4 md:w-6 md:h-6 border-2 border-[#12241d]/10 border-t-[#12241d] rounded-full animate-spin" />
                      ) : (
                        isPlaying ? <Pause size={24} className="md:w-6 md:h-6" fill="currentColor" /> : <Play size={24} className="md:w-6 md:h-6 mr-0.5" fill="currentColor" />
                      )}
                    </button>
                  </div>

                  {/* Left side: Country Info */}
                  <div className="flex items-center gap-3 overflow-hidden justify-end">
                    <div className="overflow-hidden text-right">
                      <h4 className="text-xs md:text-lg font-bold text-white tracking-tight truncate leading-tight">
                        {translateCountry(currentStation.country)}
                      </h4>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (currentStation.country) {
                          setSelectedCountry(currentStation.country);
                          setView("stations");
                          fetchStations("stations", { country: currentStation.country });
                        }
                      }}
                      className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 cursor-pointer"
                    >
                      <img 
                        src={`https://flagcdn.com/w160/${(currentStation.countrycode || "il").toLowerCase()}.png`} 
                        className="w-full h-full object-cover" 
                        alt="" 
                      />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="h-16 md:h-20 flex items-center justify-center gap-12 md:gap-32 px-8">
            {[
              { id: "countries", icon: Globe, label: "מדינות", count: countries.length }, 
              { id: "favorites", icon: Heart, label: "מועדפים", count: favorites.length }, 
              { id: "genres", icon: Music, label: "קטגוריות", count: allGenres.length }
            ].map((item) => (
              <button 
                key={item.id} 
                onClick={() => { 
                  if (item.id === "countries") setSelectedCountry(null); 
                  setSelectedGenre(null);
                  setView(item.id as any); 
                }} 
                className={cn(
                  "flex flex-col items-center gap-1 active:scale-95 relative py-2 min-w-[64px]", 
                  view === item.id || (item.id === "countries" && view === "stations" && selectedCountry) ? "text-[#dccba3]" : "text-[#e3d5b8]/30 hover:text-white/60"
                )}
              >
                <div className="relative">
                  <item.icon size={22} className="md:w-[26px] md:h-[26px]" fill={view === item.id && item.id === "favorites" ? "currentColor" : "none" } />
                  {view === item.id && (<motion.div layoutId="active-nav" className="absolute -inset-2 bg-[#dccba3]/5 rounded-xl -z-10" transition={{ duration: 0.1 }} />)}
                </div>
                <span className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>
        </motion.footer>
      </AnimatePresence>

      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[200] bg-[#12241d] flex flex-col items-center justify-center font-sans"
            dir="rtl"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0] 
              }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="relative mb-8"
            >
              <div className="absolute inset-0 bg-[#dccba3]/20 blur-2xl rounded-full" />
              <Radio size={80} className="text-[#dccba3] relative" />
            </motion.div>
            <h1 className="text-4xl font-bold text-[#e3d5b8] mb-2 italic">רדיו<span className="text-[#dccba3]">פריים</span></h1>
            <p className="text-[#dccba3]/40 text-sm tracking-[0.3em] uppercase">World Wide Beats</p>
            <div className="mt-12 w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="h-full bg-[#dccba3] shadow-[0_0_15px_rgba(220,203,163,0.6)]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 bg-[#12241d] z-[160] flex flex-col overflow-hidden"
              dir="rtl"
            >
              <header className="h-16 border-b border-[#e3d5b8]/10 flex items-center justify-between px-6 bg-[#12241d]/80 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold tracking-tight text-[#e3d5b8] flex items-center gap-3 italic">
                    <Settings className="text-[#dccba3]" size={20} /> הגדרות
                  </h2>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-all hover:rotate-90"><X size={24} /></button>
              </header>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
                <div className="max-w-2xl mx-auto space-y-10">
                  <section>
                  <h3 className="text-xs font-bold text-[#dccba3]/40 uppercase tracking-widest mb-4">תצוגת רשת</h3>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5].map(cols => (
                      <button 
                        key={cols}
                        onClick={() => setGridCols(cols)}
                        className={cn(
                          "flex-1 py-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all",
                          gridCols === cols ? "bg-[#dccba3] border-[#dccba3] text-[#12241d]" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                        )}
                      >
                        {cols <= 2 ? <Grid2X2 size={18} /> : cols === 3 ? <Grid3X3 size={18} /> : <LayoutGrid size={18} />}
                        <span className="text-[10px] font-bold">{cols} עמ'</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-[#dccba3]/40 uppercase tracking-widest mb-4">איכות וחוויה</h3>
                  <div className="space-y-3">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">איכות שמע</div>
                        <div className="text-[10px] text-white/40">איכות גבוהה צורכת יותר דאטה</div>
                      </div>
                      <div className="flex bg-black/40 p-1 rounded-lg">
                        <button 
                          onClick={() => setQuality("high")}
                          className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", quality === "high" ? "bg-[#dccba3] text-[#12241d]" : "text-white/40")}
                        >HI-FI</button>
                        <button 
                          onClick={() => setQuality("low")}
                          className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", quality === "low" ? "bg-[#dccba3] text-[#12241d]" : "text-white/40")}
                        >LOW</button>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">אפקטים חזותיים</div>
                        <div className="text-[10px] text-white/40">אנימציות וויזואליזציה של השמע</div>
                      </div>
                      <button 
                        onClick={() => setVisualizer(!visualizer)}
                        className={cn(
                          "w-12 h-6 rounded-full relative transition-all duration-300",
                          visualizer ? "bg-[#dccba3]" : "bg-white/20"
                        )}
                      >
                        <motion.div 
                          animate={{ x: visualizer ? -24 : 0 }}
                          className="absolute right-1 top-1 w-4 h-4 bg-[#12241d] rounded-full"
                        />
                      </button>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">ניגודיות גבוהה</div>
                        <div className="text-[10px] text-white/40">שיפור הקריאות של הממשק</div>
                      </div>
                      <button 
                        onClick={() => setTheme(theme === "dark" ? "high-contrast" : "dark")}
                        className={cn(
                          "w-12 h-6 rounded-full relative transition-all duration-300",
                          theme === "high-contrast" ? "bg-[#dccba3]" : "bg-white/20"
                        )}
                      >
                        <motion.div 
                          animate={{ x: theme === "high-contrast" ? -24 : 0 }}
                          className="absolute right-1 top-1 w-4 h-4 bg-[#12241d] rounded-full"
                        />
                      </button>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-[#dccba3]/40 uppercase tracking-widest mb-4">התאמה אישית</h3>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="text-right mb-3">
                      <div className="text-sm font-bold text-white">מדינת ברירת מחדל</div>
                      <div className="text-[10px] text-[#dccba3]/40">כשתפתחו את האפליקציה, יוצגו תחנות ממדינה זו</div>
                    </div>
                    <div className="relative">
                      <select 
                        value={userCountry || ""} 
                        onChange={(e) => {
                          const val = e.target.value || null;
                          setUserCountry(val);
                          if (val) {
                            setIsSettingsOpen(false);
                            setSelectedCountry(val);
                            setView("stations");
                            fetchStations("stations", { country: val });
                          }
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e3d5b8] focus:outline-none focus:border-[#dccba3]/50 appearance-none"
                        dir="rtl"
                      >
                        <option value="">ללא (הצעות בשבילך)</option>
                        {[...countries]
                          .sort((a,b) => translateCountry(a.name).localeCompare(translateCountry(b.name)))
                          .map(c => (
                            <option key={c.name} value={c.name}>{translateCountry(c.name)} ({c.stationcount})</option>
                          ))
                        }
                      </select>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                        <MapPin size={16} />
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  {!user ? (
                    <button 
                      onClick={login}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#dccba3]/10 rounded-full flex items-center justify-center text-[#dccba3]"><LogIn size={20} /></div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">התחבר עם Google</div>
                          <div className="text-[10px] text-white/40">שמור מועדפים והגדרות בענן</div>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                        <img src={user.photoURL || ""} alt="" className="w-10 h-10 rounded-full border border-white/20" />
                        <div className="text-right flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{user.displayName}</div>
                          <div className="text-[10px] text-white/40 truncate">{user.email}</div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={logout}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-200 rounded-2xl p-4 flex items-center justify-center gap-2 font-bold transition-all"
                      >
                        <LogOut size={18} /> התנתק
                      </button>
                    </div>
                  )}
                </section>


                <section>
                  <h3 className="text-xs font-bold text-[#dccba3]/40 uppercase tracking-widest mb-4">פעולות נוספות</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={handleShare}
                      className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 text-white/60 transition-all font-bold"
                    >
                      <Share2 size={24} className="text-[#dccba3]" />
                      <span className="text-xs">שיתוף</span>
                    </button>
                    <button 
                      onClick={toggleFullscreen}
                      className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 text-white/60 transition-all font-bold"
                    >
                      {isFullscreen ? <Minimize size={24} className="text-[#dccba3]" /> : <Expand size={24} className="text-[#dccba3]" />}
                      <span className="text-xs">{isFullscreen ? 'מזער' : 'מסך מלא'}</span>
                    </button>
                    <button 
                      onClick={() => setIsHelpOpen(true)}
                      className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 text-white/60 transition-all font-bold col-span-2"
                    >
                      <HelpCircle size={24} className="text-[#dccba3]" />
                      <span className="text-xs">מרכז העזרה והנחיות</span>
                    </button>
                  </div>
                </section>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 text-center bg-[#12241d]/80 backdrop-blur-xl shrink-0">
                <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] mb-4">RadioPrime v2.5.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHelpOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsHelpOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[210]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-[#12241d] z-[220] flex flex-col overflow-hidden"
              dir="rtl"
            >
              <header className="h-16 border-b border-[#e3d5b8]/10 flex items-center justify-between px-6 bg-[#12241d]/80 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold tracking-tight text-[#e3d5b8] flex items-center gap-3 italic">
                    <HelpCircle className="text-[#dccba3]" size={20} /> מרכז עזרה
                  </h2>
                </div>
                <button onClick={() => setIsHelpOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-all hover:rotate-90"><X size={24} /></button>
              </header>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
                <div className="max-w-5xl mx-auto space-y-12 text-right">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-[#dccba3]">איך משתמשים ב-RadioPrime?</h3>
                  <p className="text-white/60 leading-relaxed">האפליקציה מאפשרת לך להאזין לאלפי תחנות רדיו מכל העולם בצורה פשוטה ומהירה. ניתן לנווט בין מדינות, קטגוריות מוזיקה או פשוט לחפש תחנה ספציפית.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                    <Heart className="text-[#ff6b6b] mb-3" />
                    <h4 className="font-bold text-white mb-2">מועדפים</h4>
                    <p className="text-xs text-white/40">לחצו על אייקון הלב בכל תחנה כדי להוסיף אותה לרשימת המועדפים האישית שלכם לגישה מהירה.</p>
                  </div>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                    <Grid3X3 className="text-[#dccba3] mb-3" />
                    <h4 className="font-bold text-white mb-2">שינוי תצוגה</h4>
                    <p className="text-xs text-white/40">בהגדרות ניתן לקבוע כמה תחנות יוצגו בשורה אחת (בין 2 ל-5) כדי להתאים את הממשק למכשיר שלכם.</p>
                  </div>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                    <LogIn className="text-blue-400 mb-3" />
                    <h4 className="font-bold text-white mb-2">חשבון וסנכרון</h4>
                    <p className="text-xs text-white/40">התחברו עם Google כדי שכל המועדפים וההגדרות שלכם יישמרו בענן ויהיו זמינים מכל מכשיר.</p>
                  </div>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                    <Globe className="text-emerald-400 mb-3" />
                    <h4 className="font-bold text-white mb-2">חיפוש עולמי</h4>
                    <p className="text-xs text-white/40">לחצו על 'מדינות' בתחתית המסך כדי לגלות תחנות רדיו מכל פינה בעולם לפי יבשות ומדינות.</p>
                  </div>
                </div>

                <div className="bg-[#dccba3]/10 p-6 rounded-2xl border border-[#dccba3]/20">
                  <h4 className="font-bold text-[#dccba3] mb-2 flex items-center gap-2"><Settings size={18} /> טיפ למקצוענים</h4>
                  <p className="text-sm text-white/70 italic">לחצו על תמונת התחנה בנגן למטה כדי לנווט ישירות למדינה ממנה היא משדרת ולגלות תחנות דומות נוספות.</p>
                </div>

                <div className="pt-4 text-center">
                  <p className="text-xs text-white/20">כל הזכויות שמורות ל-RadioPrime &copy; 2026</p>
                </div>
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      <audio ref={audioRef} onPlay={() => { setIsPlaying(true); setIsBuffering(false); }} onPause={() => setIsPlaying(false)} onWaiting={() => setIsBuffering(true)} onCanPlay={() => setIsBuffering(false)} onError={() => { if (currentStation && !useStreamProxy) playStation(currentStation, 1); else { setIsPlaying(false); setIsBuffering(false); } }} crossOrigin="anonymous" />
    </div>
  );
}

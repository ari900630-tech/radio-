import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  Play, Pause, Volume2, Heart, Globe,  
  Radio, Music, 
  Expand, Minimize,
  WifiOff, AlertCircle, X, Search, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import Hls from "hls.js";
import { cn } from "./lib/utils";
import { RadioStation, ViewType, Country } from "./types";

const RADIO_MIRRORS = [
  "https://de1.api.radio-browser.info/json",
  "https://at1.api.radio-browser.info/json",
  "https://nl1.api.radio-browser.info/json"
];

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
  isFavorite, 
  onPlay, 
  onToggleFavorite, 
  translateCountry 
}: { 
  station: RadioStation; 
  isActive: boolean; 
  isFavorite: boolean; 
  onPlay: (s: RadioStation) => void; 
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  translateCountry: (name: string) => string;
}) => {
  return (
    <div 
      id={`station-${station.stationuuid}`}
      className="group relative bg-[#1e362d]/80 border border-white/5 p-2 md:p-4 rounded-xl md:rounded-3xl flex flex-col items-center text-center cursor-pointer active:scale-95 transition-transform" 
      onClick={() => onPlay(station)}
    >
      {isActive && (
        <div className="absolute inset-0 border-2 border-[#dccba3]/40 bg-[#dccba3]/5 rounded-xl md:rounded-3xl z-10 pointer-events-none" />
      )}
      
      <div className="relative w-12 h-12 md:w-24 md:h-24 mb-2 md:mb-4 z-20 rounded-lg md:rounded-2xl overflow-hidden bg-[#12241d] shadow-inner border border-white/5 flex-shrink-0">
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

      <div className="w-full min-w-0 z-20 text-center overflow-hidden">
        <h3 className="font-bold text-white truncate text-[10px] md:text-base mb-0.5 md:mb-1">{station.name}</h3>
        <div className="text-[8px] md:text-xs text-[#e3d5b8]/30 flex items-center justify-center gap-1">
          <span className="truncate">{translateCountry(station.country)}</span>
          <img src={`https://flagcdn.com/w20/${(station.countrycode || "il").toLowerCase()}.png`} className="w-3 h-2 rounded-sm opacity-30 flex-shrink-0" alt="" />
        </div>
      </div>

      <div className="absolute top-1 right-1 md:top-3 md:right-3 z-30">
        <button 
          onClick={(e) => onToggleFavorite(station.stationuuid, e)} 
          className={cn("p-1 md:p-2 rounded-full", isFavorite ? "text-[#ff6b6b]" : "text-white/10 hover:text-white/40")}
        >
          <Heart size={14} className="md:w-5 md:h-5" fill={isFavorite ? "currentColor" : "none"} />
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
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [useStreamProxy, setUseStreamProxy] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "error" | "info" } | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);

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
  }, [view, selectedCountry]);

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
        queryParams = { name: searchQuery, limit: 500, ...extraParams };
      } else if (type === "favorites") {
        setLoading(false);
        return;
      } else if (countryToFetch) {
        endpoint = `/stations/bycountry/${countryToFetch}`;
        queryParams = { order: "clickcount", reverse: "true", limit: 1000, ...extraParams };
      }

      // Try local proxy first
      try {
        const response = await axios.get(`${API_BASE}${endpoint}`, { 
          params: queryParams,
          signal: abortControllerRef.current.signal 
        });
        
        setStations(response.data.filter((station: RadioStation, index: number, self: RadioStation[]) =>
          index === self.findIndex((s) => s.stationuuid === station.stationuuid)
        ));
      } catch (proxyError) {
        if (axios.isCancel(proxyError)) return;
        console.warn("Proxy failed, trying direct mirror...");
        
        // Fallback to mirrors
        let success = false;
        for (const mirror of RADIO_MIRRORS) {
          try {
            const response = await axios.get(`${mirror}${endpoint}`, { 
              params: queryParams,
              signal: abortControllerRef.current.signal 
            });
            setStations(response.data.filter((station: RadioStation, index: number, self: RadioStation[]) =>
              index === self.findIndex((s) => s.stationuuid === station.stationuuid)
            ));
            success = true;
            break;
          } catch (mirrorError) {
            console.error(`Mirror ${mirror} failed`, mirrorError);
          }
        }
        
        if (!success) throw proxyError;
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
        const response = await axios.get(`${API_BASE}/countries`);
        if (Array.isArray(response.data)) {
          const validCountries = response.data.filter((c: any) => c.iso_3166_1 && c.stationcount > 0);
          setCountries(validCountries.sort((a: any, b: any) => b.stationcount - a.stationcount));
        } else throw new Error("Invalid response");
      } catch (proxyError) {
        console.warn("Proxy countries fetch failed, trying direct mirror...");
        let success = false;
        for (const mirror of RADIO_MIRRORS) {
          try {
            const response = await axios.get(`${mirror}/countries`);
            if (Array.isArray(response.data)) {
              const validCountries = response.data.filter((c: any) => c.iso_3166_1 && c.stationcount > 0);
              setCountries(validCountries.sort((a: any, b: any) => b.stationcount - a.stationcount));
              success = true;
              break;
            }
          } catch (mirrorError) {
            console.error(`Mirror ${mirror} failed for countries`, mirrorError);
          }
        }
        if (!success) throw proxyError;
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

  // Load Favorites
  useEffect(() => {
    const saved = localStorage.getItem("radioprime_favorites");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  // Save Favorites
  useEffect(() => {
    localStorage.setItem("radioprime_favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Fetch Initial Data
  useEffect(() => {
    fetchStations("popular");
    fetchCountries();
  }, [fetchStations, fetchCountries]);

  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const playStation = useCallback(async (station: RadioStation, retryCount = 0) => {
    setCurrentStation(station);
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
          const uniqueStations = rawStations.filter((station: RadioStation, index: number, self: RadioStation[]) =>
            index === self.findIndex((s) => s.stationuuid === station.stationuuid)
          );
          setStations(uniqueStations);
        })
        .catch(() => {
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
    <div dir="rtl" className="min-h-screen bg-[#12241d] text-[#e3d5b8] font-sans selection:bg-[#dccba3] selection:text-black overflow-hidden flex flex-col">
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
          <div className="text-right"><h1 className="text-xl font-bold tracking-tight text-[#e3d5b8] uppercase italic">רדיו<span className="text-[#dccba3]">פריים</span></h1></div>
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
                  setView("search");
                  fetchStations("search");
                } else if (view === "search") {
                  setView("popular");
                  fetchStations("popular");
                }
              }
            }}
            className="w-full bg-white/10 border border-white/20 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#dccba3]/60 focus:bg-white/15 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button onClick={toggleFullscreen} className="p-2 hover:bg-white/5 rounded-full transition-all text-[#e3d5b8]/40 hover:text-white">{isFullscreen ? <Minimize size={20} /> : <Expand size={20} />}</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <main ref={scrollRef} className="flex-1 overflow-y-auto py-4 md:py-10 custom-scrollbar relative px-0">
          <div className="w-full space-y-8 md:space-y-12 pb-36">
            <section>
              <div className="flex items-center justify-between mb-8 px-4 md:px-10">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#e3d5b8] flex items-center gap-4">
                  <div className="w-1.5 h-10 bg-gradient-to-b from-[#dccba3] to-[#b3a478] rounded-full shadow-[0_0_15px_rgba(220,203,163,0.3)]" />
                  {view === "favorites" ? "הפלייליסט שלי" : view === "countries" ? "מפה עולמית" : view === "genres" ? "קטגוריות" : (selectedCountry && view === "stations") ? `רדיו ${translateCountry(selectedCountry)}` : "תוצאות חיפוש"}
                  <span className="text-sm font-medium text-[#dccba3]/40 mr-2">
                    {view === "countries" ? `(${countries.length})` : view === "genres" ? `(${allGenres.length})` : 
                     view === "favorites" ? `(${favorites.length})` : `(${stations.length})`}
                  </span>
                </h2>
                <div className="flex gap-2">
                  {(view === "stations" || view === "search") ? (
                  <button onClick={() => { if (view === "stations") setSelectedCountry(null); setView("countries"); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-white/50"><ArrowRight size={20} /></button>
                ) : <div />}
                </div>
              </div>

              {/* Country search bar removed as requested */}

              {loading ? (
                <div className="grid grid-cols-3 gap-1 md:gap-4 w-full px-4 md:px-10">
                  {[...Array(18)].map((_, i) => (
                    <div key={i} className="aspect-square bg-white/[0.02] rounded-2xl border border-white/5 animate-pulse" />
                  ))}
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={view + (selectedCountry || "")} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                  {view === "genres" ? (
                    <div className="grid grid-cols-3 gap-1 md:gap-4 w-full">
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
                            setSearchQuery(""); 
                            setTagSearchQuery("");
                            setView("search"); 
                            fetchStations("search", { tag: q.toLowerCase() }); 
                          }} 
                          className="group relative h-20 bg-white/5 rounded-2xl flex flex-col items-center justify-center p-4 hover:bg-white/10 active:scale-95 border border-white/5"
                        >
                          <Music className="w-5 h-5 mb-1 text-white/20 group-hover:text-[#dccba3]" /><span className="text-xs font-bold text-white/60 group-hover:text-white text-center">{genre}</span>
                        </motion.button>
                      ))}
                    </div>
                  ) : view === "countries" ? (
                    <div className="grid grid-cols-3 gap-1 md:gap-4 w-full">
                      {filteredCountries.map((country) => (
                        <motion.button 
                          key={country.iso_3166_1} 
                          onClick={() => { setSelectedCountry(country.name); setView("stations"); fetchStations("stations", { country: country.name }); setCountrySearchQuery(""); }} 
                          className="group relative h-24 bg-[#162a22]/40 border border-white/5 hover:border-[#dccba3]/50 rounded-2xl flex flex-col items-center justify-center p-3 hover:bg-[#162a22]/60 active:scale-95"
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
                    <div className="grid grid-cols-3 gap-1 md:gap-3 lg:gap-6 w-full">
                      {stations.map((station) => (
                        <StationCard 
                          key={station.stationuuid}
                          station={station}
                          isActive={currentStation?.stationuuid === station.stationuuid}
                          isFavorite={favorites.includes(station.stationuuid)}
                          onPlay={playStation}
                          onToggleFavorite={toggleFavorite}
                          translateCountry={translateCountry}
                        />
                      ))}
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
        <motion.footer initial={{ y: 150 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#0d1613]/98 backdrop-blur-xl shadow-[0_-15px_50px_rgba(0,0,0,0.6)] border-t border-white/5 pb-safe">
          <AnimatePresence>
            {currentStation && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-white/5">
                <div className="h-16 md:h-20 px-4 md:px-8 grid grid-cols-3 items-center w-full">
                  {/* Right side: Station Info */}
                  <div className="flex items-center gap-3 overflow-hidden justify-start">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={scrollToStation}
                      className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 cursor-pointer"
                    >
                      {currentStation.favicon ? (
                        <img src={currentStation.favicon} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src="https://picsum.photos/seed/radio/100/100"; }} />
                      ) : <div className="w-full h-full flex items-center justify-center text-white/10"><Radio size={20} /></div>}
                    </motion.button>
                    <div className="overflow-hidden text-right">
                      <h4 className="text-sm md:text-lg font-bold text-white tracking-tight truncate leading-tight">
                        {currentStation.name}
                      </h4>
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
                      <h4 className="text-sm md:text-lg font-bold text-white tracking-tight truncate leading-tight">
                        {translateCountry(currentStation.country)}
                      </h4>
                    </div>
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                      <img 
                        src={`https://flagcdn.com/w160/${(currentStation.countrycode || "il").toLowerCase()}.png`} 
                        className="w-full h-full object-cover" 
                        alt="" 
                      />
                    </div>
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
                onClick={() => { if (item.id === "countries") setSelectedCountry(null); setView(item.id as any); }} 
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

      <audio ref={audioRef} onPlay={() => { setIsPlaying(true); setIsBuffering(false); }} onPause={() => setIsPlaying(false)} onWaiting={() => setIsBuffering(true)} onCanPlay={() => setIsBuffering(false)} onError={() => { if (currentStation && !useStreamProxy) playStation(currentStation, 1); else { setIsPlaying(false); setIsBuffering(false); } }} crossOrigin="anonymous" />
    </div>
  );
}

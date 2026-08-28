/**
 * Support directory: helplines, legal aid, shelters and complaint bodies.
 *
 * Verification policy
 * -------------------
 * This is the one dataset in the app where being wrong has a physical cost. A
 * survivor who dials a dead number in a crisis does not try again — she
 * concludes that help does not exist.
 *
 * So every entry carries a `verification` flag:
 *
 *   "confirmed"   — we are confident that dialling this reaches this service.
 *   "unconfirmed" — the organisation is real and worth contacting, but we have
 *                   not verified the contact details currently listed.
 *
 * Two rules follow from that flag, enforced in code rather than by convention:
 *
 *   1. Only confirmed resources are injected into the AI system prompt, so the
 *      model can never instruct someone to call a number we have not stood
 *      behind. See `getResourcesForPrompt`.
 *   2. The directory renders unconfirmed entries in a separate section without
 *      a tap-to-call link, showing the website or office route instead.
 *
 * docs/RESOURCE-VERIFICATION.md tracks everything still awaiting sign-off. That
 * checklist is the natural first task for the PNCY legal desk.
 */

import type { CaseCategory, Confidence, Gender, ProvinceId } from "./provinces";

export type ResourceType =
  | "emergency"
  | "police"
  | "government"
  | "ngo"
  | "legal_aid"
  | "shelter"
  | "cyber"
  | "counselling"
  | "child";

/** "national" means the resource serves the whole country. */
export type ResourceScope = "national" | ProvinceId;

/** Who the service is set up to help. "any" means it serves everyone. */
export type ServesGroup = Gender | "child";

export interface Resource {
  id: string;
  name: string;
  nameUr: string;
  type: ResourceType;
  scope: ResourceScope[];
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  hours: string;
  hoursUr: string;
  description: string;
  descriptionUr: string;
  serves: ServesGroup[] | "any";
  handles: CaseCategory[];
  /** Lower sorts first. 0 is reserved for life-threatening emergencies. */
  priority: number;
  verification: Confidence;
  /** What specifically needs checking, for the verification checklist. */
  verifyNote?: string;
}

export const RESOURCES: Resource[] = [
  // -------------------------------------------------------------------------
  // National — emergency
  // -------------------------------------------------------------------------
  {
    id: "police_15",
    name: "Police Emergency",
    nameUr: "پولیس ایمرجنسی",
    type: "emergency",
    scope: ["national"],
    phone: "15",
    hours: "24/7",
    hoursUr: "ہر وقت",
    description:
      "Nationwide police emergency line for immediate danger. You can also ask the police to escort you while you collect belongings from an unsafe home.",
    descriptionUr:
      "فوری خطرے کے لیے ملک بھر میں پولیس ایمرجنسی نمبر۔ آپ پولیس سے یہ بھی کہہ سکتی ہیں کہ وہ غیر محفوظ گھر سے آپ کا سامان لینے کے دوران آپ کے ساتھ جائیں۔",
    serves: "any",
    handles: ["physical", "sexual", "domestic", "harmful_practice", "other"],
    priority: 0,
    verification: "confirmed",
  },
  {
    id: "rescue_1122",
    name: "Rescue 1122",
    nameUr: "ریسکیو 1122",
    type: "emergency",
    scope: ["punjab", "kp"],
    phone: "1122",
    hours: "24/7",
    hoursUr: "ہر وقت",
    description:
      "Emergency ambulance and rescue service. Call this for urgent medical help after an assault, including transport to a government hospital for a medico-legal examination.",
    descriptionUr:
      "ایمرجنسی ایمبولینس اور ریسکیو سروس۔ تشدد کے بعد فوری طبی مدد کے لیے کال کریں، بشمول میڈیکو لیگل معائنے کے لیے سرکاری ہسپتال تک منتقلی۔",
    serves: "any",
    handles: ["physical", "sexual", "domestic"],
    priority: 0,
    verification: "confirmed",
  },

  // -------------------------------------------------------------------------
  // National — government
  // -------------------------------------------------------------------------
  {
    id: "mohr_1099",
    name: "Ministry of Human Rights Helpline",
    nameUr: "وزارتِ انسانی حقوق ہیلپ لائن",
    type: "government",
    scope: ["national"],
    phone: "1099",
    whatsapp: "0333-9085709",
    website: "https://mohr.gov.pk/",
    hours: "Daytime, daily",
    hoursUr: "روزانہ، دن کے اوقات میں",
    description:
      "Free legal advice, counselling and referral on any human rights violation, anywhere in Pakistan. The most useful single number when you are not sure who else to call.",
    descriptionUr:
      "پاکستان میں کہیں بھی انسانی حقوق کی خلاف ورزی پر مفت قانونی مشورہ، کاؤنسلنگ اور رہنمائی۔ جب سمجھ نہ آئے کہ کس سے رابطہ کریں تو یہ سب سے مفید نمبر ہے۔",
    serves: "any",
    handles: [
      "domestic",
      "physical",
      "sexual",
      "economic",
      "family_law",
      "harmful_practice",
      "workplace",
      "other",
    ],
    priority: 1,
    verification: "confirmed",
  },
  {
    id: "fia_cybercrime",
    name: "FIA Cyber Crime Wing",
    nameUr: "ایف آئی اے سائبر کرائم ونگ",
    type: "cyber",
    scope: ["national"],
    phone: "1991",
    website: "https://complaint.fia.gov.pk/",
    hours: "24/7 helpline; offices during working hours",
    hoursUr: "ہیلپ لائن ہر وقت؛ دفاتر کام کے اوقات میں",
    description:
      "Report online blackmail, sextortion, non-consensual sharing of private images, impersonation and cyber stalking. Complaints can be filed online or at a regional office. Preserve screenshots and URLs before you block anyone.",
    descriptionUr:
      "آن لائن بلیک میل، نجی تصاویر کا بغیر اجازت پھیلانا، جعلی اکاؤنٹ اور سائبر اسٹاکنگ کی شکایت درج کروائیں۔ شکایت آن لائن یا علاقائی دفتر میں کی جا سکتی ہے۔ کسی کو بلاک کرنے سے پہلے اسکرین شاٹس محفوظ کر لیں۔",
    serves: "any",
    handles: ["cyber", "sexual"],
    priority: 1,
    verification: "confirmed",
  },
  {
    id: "nccia",
    name: "National Cyber Crime Investigation Agency (NCCIA)",
    nameUr: "نیشنل سائبر کرائم انویسٹی گیشن ایجنسی",
    type: "cyber",
    scope: ["national"],
    phone: "1799",
    website: "https://nccia.gov.pk/",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "The agency that has taken over cyber crime investigation from the FIA. Handles the same offences under PECA 2016.",
    descriptionUr:
      "وہ ادارہ جس نے ایف آئی اے سے سائبر کرائم کی تفتیش سنبھالی ہے۔ پیکا 2016 کے تحت وہی جرائم دیکھتا ہے۔",
    serves: "any",
    handles: ["cyber", "sexual"],
    priority: 2,
    verification: "unconfirmed",
    verifyNote:
      "Confirm the current public helpline number and whether complaints should now be routed to NCCIA rather than complaint.fia.gov.pk. The FIA-to-NCCIA transition means one of these two entries is likely to be stale.",
  },
  {
    id: "fospah",
    name: "Federal Ombudsperson for Protection against Harassment (FOSPAH)",
    nameUr: "وفاقی محتسب برائے انسدادِ ہراسانی",
    type: "government",
    scope: ["national"],
    website: "https://www.fospah.gov.pk/",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Decides workplace harassment complaints, and appeals from an employer's inquiry committee. Since the 2022 amendment this covers students, domestic workers, home-based and gig workers, not only formal employees. Complaints can be filed online.",
    descriptionUr:
      "کام کی جگہ پر ہراسانی کی شکایات اور ادارے کی انکوائری کمیٹی کے فیصلوں کے خلاف اپیل سنتا ہے۔ 2022 کی ترمیم کے بعد اس میں طلبہ، گھریلو ملازمین اور غیر رسمی کارکن بھی شامل ہیں۔ شکایت آن لائن درج کی جا سکتی ہے۔",
    serves: "any",
    handles: ["workplace", "sexual"],
    priority: 1,
    verification: "confirmed",
    verifyNote:
      "Website confirmed. A public phone number should be added once verified.",
  },
  {
    id: "fospah_punjab",
    name: "Punjab Ombudsperson for Protection against Harassment",
    nameUr: "پنجاب محتسب برائے انسدادِ ہراسانی",
    type: "government",
    scope: ["punjab"],
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Punjab's own ombudsperson for workplace harassment complaints, and appeals from an employer's inquiry committee. Closer than the federal office and usually faster.",
    descriptionUr:
      "کام کی جگہ پر ہراسانی کی شکایات اور ادارے کی انکوائری کمیٹی کے فیصلوں کے خلاف اپیل کے لیے پنجاب کا اپنا محتسب۔ وفاقی دفتر کی نسبت قریب اور عموماً تیز۔",
    serves: "any",
    handles: ["workplace", "sexual"],
    priority: 1,
    verification: "unconfirmed",
    verifyNote:
      "The office exists under the 2010 Act; confirm the current contact details and complaint intake route.",
  },
  {
    id: "fospah_sindh",
    name: "Sindh Ombudsperson for Protection against Harassment",
    nameUr: "سندھ محتسب برائے انسدادِ ہراسانی",
    type: "government",
    scope: ["sindh"],
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Sindh's ombudsperson for workplace harassment complaints and appeals against an inquiry committee's decision.",
    descriptionUr:
      "کام کی جگہ پر ہراسانی کی شکایات اور انکوائری کمیٹی کے فیصلے کے خلاف اپیل کے لیے سندھ کا محتسب۔",
    serves: "any",
    handles: ["workplace", "sexual"],
    priority: 1,
    verification: "unconfirmed",
    verifyNote: "Confirm current contact details and complaint intake route.",
  },
  {
    id: "fospah_kp",
    name: "Khyber Pakhtunkhwa Ombudsperson for Protection against Harassment",
    nameUr: "خیبر پختونخوا محتسب برائے انسدادِ ہراسانی",
    type: "government",
    scope: ["kp"],
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Khyber Pakhtunkhwa's ombudsperson for workplace harassment complaints and appeals.",
    descriptionUr:
      "کام کی جگہ پر ہراسانی کی شکایات اور اپیلوں کے لیے خیبر پختونخوا کا محتسب۔",
    serves: "any",
    handles: ["workplace", "sexual"],
    priority: 1,
    verification: "unconfirmed",
    verifyNote: "Confirm current contact details and complaint intake route.",
  },
  {
    id: "fospah_balochistan",
    name: "Balochistan Ombudsperson for Protection against Harassment",
    nameUr: "بلوچستان محتسب برائے انسدادِ ہراسانی",
    type: "government",
    scope: ["balochistan"],
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Balochistan's ombudsperson for workplace harassment complaints and appeals.",
    descriptionUr:
      "کام کی جگہ پر ہراسانی کی شکایات اور اپیلوں کے لیے بلوچستان کا محتسب۔",
    serves: "any",
    handles: ["workplace", "sexual"],
    priority: 1,
    verification: "unconfirmed",
    verifyNote: "Confirm the office is operational, and its contact details.",
  },
  {
    id: "nchr",
    name: "National Commission for Human Rights (NCHR)",
    nameUr: "قومی کمیشن برائے انسانی حقوق",
    type: "government",
    scope: ["national"],
    phone: "051-9217340",
    email: "complaints@nchr.gov.pk",
    website: "https://www.nchr.gov.pk/",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Statutory body that receives and investigates human rights complaints, including where the police or a public authority have refused to act.",
    descriptionUr:
      "قانونی ادارہ جو انسانی حقوق کی شکایات وصول کرتا اور ان کی تحقیقات کرتا ہے، بشمول ان معاملات کے جہاں پولیس یا سرکاری ادارے نے کارروائی سے انکار کیا ہو۔",
    serves: "any",
    handles: ["physical", "sexual", "economic", "harmful_practice", "other"],
    priority: 3,
    verification: "unconfirmed",
    verifyNote: "Confirm the direct complaints line and email are still current.",
  },
  {
    id: "ncsw",
    name: "National Commission on the Status of Women (NCSW)",
    nameUr: "قومی کمیشن برائے حیثیتِ نسواں",
    type: "government",
    scope: ["national"],
    website: "https://www.ncsw.gov.pk/",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "The federal body overseeing women's rights policy, and the source of the standardised indicators this app's assessment is built on.",
    descriptionUr:
      "خواتین کے حقوق کی پالیسی کی نگرانی کرنے والا وفاقی ادارہ، اور ان معیاری اشاریوں کا ماخذ جن پر اس ایپ کا جائزہ مبنی ہے۔",
    serves: ["woman"],
    handles: ["other"],
    priority: 4,
    verification: "confirmed",
  },

  // -------------------------------------------------------------------------
  // National — NGO and legal aid
  // -------------------------------------------------------------------------
  {
    id: "drf_cyber",
    name: "Digital Rights Foundation — Cyber Harassment Helpline",
    nameUr: "ڈیجیٹل رائٹس فاؤنڈیشن — سائبر ہراسانی ہیلپ لائن",
    type: "cyber",
    scope: ["national"],
    phone: "0800-39393",
    email: "helpdesk@digitalrightsfoundation.pk",
    website: "https://digitalrightsfoundation.pk/",
    hours: "Monday to Friday, working hours",
    hoursUr: "پیر تا جمعہ، کام کے اوقات",
    description:
      "Free, confidential helpline for online harassment. They walk you through evidence collection, platform takedown requests and the FIA complaint process, and offer legal and psychological support.",
    descriptionUr:
      "آن لائن ہراسانی کے لیے مفت، خفیہ ہیلپ لائن۔ وہ ثبوت جمع کرنے، مواد ہٹوانے اور ایف آئی اے میں شکایت کے عمل میں آپ کی رہنمائی کرتے ہیں، اور قانونی و نفسیاتی مدد فراہم کرتے ہیں۔",
    serves: "any",
    handles: ["cyber", "sexual"],
    priority: 1,
    verification: "confirmed",
  },
  {
    id: "madadgaar",
    name: "Madadgaar National Helpline (LHRLA)",
    nameUr: "مددگار نیشنل ہیلپ لائن",
    type: "ngo",
    scope: ["national"],
    phone: "1098",
    website: "https://www.madadgaar.org/",
    hours: "Daytime",
    hoursUr: "دن کے اوقات",
    description:
      "Long-running national helpline run by Lawyers for Human Rights and Legal Aid, for women and children facing violence. Provides counselling, legal referral and shelter linkage.",
    descriptionUr:
      "تشدد کا سامنا کرنے والی خواتین اور بچوں کے لیے قومی ہیلپ لائن، جو لائرز فار ہیومن رائٹس اینڈ لیگل ایڈ چلاتی ہے۔ کاؤنسلنگ، قانونی رہنمائی اور شیلٹر تک رسائی فراہم کرتی ہے۔",
    serves: ["woman", "child"],
    handles: ["domestic", "physical", "sexual", "child", "family_law"],
    priority: 2,
    verification: "unconfirmed",
    verifyNote:
      "1098 is widely published for Madadgaar but should be dialled and confirmed, along with current operating hours.",
  },
  {
    id: "darulaman_route",
    name: "Dar-ul-Aman (government women's shelter)",
    nameUr: "دارالامان (سرکاری خواتین شیلٹر)",
    type: "shelter",
    scope: [
      "punjab",
      "sindh",
      "kp",
      "balochistan",
      "ict",
      "gb",
      "ajk",
    ],
    hours: "Admission 24/7 in most districts",
    hoursUr: "زیادہ تر اضلاع میں داخلہ ہر وقت",
    description:
      "State-run shelters for women in danger, present in most districts. There is no single national number: reach one through the 1099 helpline, the district Social Welfare Department, a Violence Against Women Centre, or by asking the Family Court for a shelter referral. A woman can be admitted without a male guardian's permission.",
    descriptionUr:
      "خطرے میں گھری خواتین کے لیے سرکاری پناہ گاہیں، جو زیادہ تر اضلاع میں موجود ہیں۔ کوئی ایک قومی نمبر نہیں: 1099 ہیلپ لائن، ضلعی محکمہ سماجی بہبود، وی اے ڈبلیو سینٹر، یا فیملی کورٹ کے ذریعے رجوع کریں۔ خاتون کو کسی مرد سرپرست کی اجازت کے بغیر داخل کیا جا سکتا ہے۔",
    serves: ["woman", "child"],
    handles: ["domestic", "physical", "harmful_practice"],
    priority: 2,
    verification: "confirmed",
    verifyNote:
      "Deliberately listed without a phone number because access is district-level. Consider adding per-district numbers for the highest-traffic cities.",
  },
  {
    id: "legal_aid_society",
    name: "Legal Aid Society",
    nameUr: "لیگل ایڈ سوسائٹی",
    type: "legal_aid",
    scope: ["national", "sindh"],
    website: "https://www.legalaidsociety.org.pk/",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Free legal representation and advice, with particular strength in criminal cases and access to justice for women and detainees. Based in Karachi with national programmes.",
    descriptionUr:
      "مفت قانونی نمائندگی اور مشورہ، خاص طور پر فوجداری مقدمات اور خواتین و زیرِ حراست افراد کے لیے انصاف تک رسائی میں۔ کراچی میں قائم، قومی سطح پر پروگرام۔",
    serves: "any",
    handles: ["family_law", "physical", "sexual", "domestic", "economic"],
    priority: 2,
    verification: "unconfirmed",
    verifyNote: "Confirm the current intake phone number and referral process.",
  },
  {
    id: "rozan",
    name: "Rozan Counselling Helpline",
    nameUr: "روزن کاؤنسلنگ ہیلپ لائن",
    type: "counselling",
    scope: ["national", "ict"],
    phone: "0304-111-1741",
    website: "https://rozan.org/",
    hours: "Monday to Friday, working hours",
    hoursUr: "پیر تا جمعہ، کام کے اوقات",
    description:
      "Confidential psychological counselling for women and children affected by violence and abuse. Useful when you need to think through options before taking any formal step.",
    descriptionUr:
      "تشدد اور زیادتی سے متاثرہ خواتین اور بچوں کے لیے خفیہ نفسیاتی کاؤنسلنگ۔ جب آپ کوئی رسمی قدم اٹھانے سے پہلے اپنے راستے سوچنا چاہتی ہوں تو مفید ہے۔",
    serves: ["woman", "child"],
    handles: ["domestic", "sexual", "physical", "child"],
    priority: 2,
    verification: "unconfirmed",
    verifyNote: "Confirm the helpline number and current operating hours.",
  },
  {
    id: "sahil",
    name: "Sahil",
    nameUr: "ساحل",
    type: "child",
    scope: ["national"],
    website: "https://sahil.org/",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Specialises in child sexual abuse: free legal aid, counselling for children and families, and support through the investigation and trial.",
    descriptionUr:
      "بچوں کے جنسی استحصال میں مہارت رکھتی ہے: مفت قانونی مدد، بچوں اور خاندانوں کے لیے کاؤنسلنگ، اور تفتیش و مقدمے میں معاونت۔",
    serves: ["child"],
    handles: ["child", "sexual"],
    priority: 2,
    verification: "unconfirmed",
    verifyNote: "Confirm the current toll-free helpline number.",
  },
  {
    id: "aurat_foundation",
    name: "Aurat Foundation",
    nameUr: "عورت فاؤنڈیشن",
    type: "ngo",
    scope: ["national"],
    website: "https://www.af.org.pk/",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Women's rights organisation with offices across all four provinces. Provides referral to legal aid, crisis support and advocacy, and can help you find a local service where none is listed here.",
    descriptionUr:
      "خواتین کے حقوق کی تنظیم جس کے دفاتر چاروں صوبوں میں ہیں۔ قانونی مدد، بحرانی معاونت اور وکالت کے لیے رہنمائی فراہم کرتی ہے، اور مقامی خدمات تلاش کرنے میں مدد کر سکتی ہے۔",
    serves: ["woman"],
    handles: ["domestic", "economic", "family_law", "harmful_practice", "other"],
    priority: 3,
    verification: "unconfirmed",
    verifyNote: "Confirm provincial office contact numbers.",
  },
  {
    id: "shirkat_gah",
    name: "Shirkat Gah",
    nameUr: "شرکت گاہ",
    type: "ngo",
    scope: ["national"],
    website: "https://shirkatgah.org/",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Women's resource centre working on legal awareness, reproductive rights and access to justice, with a long record on family law and inheritance cases.",
    descriptionUr:
      "خواتین کا وسائل مرکز جو قانونی آگاہی، تولیدی حقوق اور انصاف تک رسائی پر کام کرتا ہے، اور عائلی قوانین و وراثت کے مقدمات میں دیرینہ تجربہ رکھتا ہے۔",
    serves: ["woman"],
    handles: ["family_law", "economic", "domestic"],
    priority: 3,
    verification: "unconfirmed",
    verifyNote: "Confirm office contact numbers for Lahore and Karachi.",
  },

  // -------------------------------------------------------------------------
  // Punjab
  // -------------------------------------------------------------------------
  {
    id: "pcsw_1043",
    name: "Punjab Women's Helpline (PCSW)",
    nameUr: "پنجاب ویمن ہیلپ لائن",
    type: "government",
    scope: ["punjab"],
    phone: "1043",
    website: "https://pcsw.punjab.gov.pk/",
    hours: "24/7",
    hoursUr: "ہر وقت",
    description:
      "Toll-free helpline staffed entirely by women, with legal advisors and psychosocial counsellors. They can also arrange shelter and connect you to a Violence Against Women Centre.",
    descriptionUr:
      "مکمل طور پر خواتین عملے پر مشتمل مفت ہیلپ لائن، جس میں قانونی مشیر اور نفسیاتی کاؤنسلر شامل ہیں۔ وہ پناہ گاہ کا انتظام اور وی اے ڈبلیو سینٹر سے رابطہ بھی کروا سکتی ہیں۔",
    serves: ["woman"],
    handles: ["domestic", "physical", "sexual", "workplace", "family_law", "economic"],
    priority: 1,
    verification: "confirmed",
  },
  {
    id: "vawc_punjab",
    name: "Violence Against Women Centre (VAWC)",
    nameUr: "وائلنس اگینسٹ ویمن سینٹر",
    type: "government",
    scope: ["punjab"],
    hours: "24/7",
    hoursUr: "ہر وقت",
    description:
      "One-stop centres where FIR registration, medical examination, forensics, prosecution, counselling and short-stay shelter all happen in one building, so you do not have to repeat your account at four separate offices. Reach one through 1043.",
    descriptionUr:
      "ایک ہی چھت کے نیچے مرکز جہاں ایف آئی آر، طبی معائنہ، فرانزک، استغاثہ، کاؤنسلنگ اور عارضی پناہ سب ایک جگہ دستیاب ہیں، تاکہ آپ کو اپنی بات چار مختلف دفاتر میں دہرانی نہ پڑے۔ 1043 کے ذریعے رابطہ کریں۔",
    serves: ["woman"],
    handles: ["domestic", "physical", "sexual"],
    priority: 1,
    verification: "confirmed",
    verifyNote:
      "Confirm which districts currently have an operational VAWC, and add direct numbers.",
  },
  {
    id: "cpwb_punjab",
    name: "Child Protection & Welfare Bureau, Punjab",
    nameUr: "چائلڈ پروٹیکشن اینڈ ویلفیئر بیورو، پنجاب",
    type: "child",
    scope: ["punjab"],
    phone: "1121",
    hours: "24/7",
    hoursUr: "ہر وقت",
    description:
      "Provincial body for children at risk of abuse, neglect, child labour or child marriage. Can take a child into protective custody.",
    descriptionUr:
      "زیادتی، نظراندازی، مشقت یا کم عمری کی شادی کے خطرے سے دوچار بچوں کے لیے صوبائی ادارہ۔ بچے کو تحفظ میں لے سکتا ہے۔",
    serves: ["child"],
    handles: ["child", "harmful_practice"],
    priority: 2,
    verification: "unconfirmed",
    verifyNote: "Confirm 1121 is still the live short code.",
  },
  {
    id: "aghs",
    name: "AGHS Legal Aid Cell",
    nameUr: "اے جی ایچ ایس لیگل ایڈ سیل",
    type: "legal_aid",
    scope: ["punjab"],
    phone: "0800-00123",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Pakistan's oldest free legal aid organisation for women, based in Lahore. Handles family court cases, protection orders and criminal complaints, and runs the Dastak shelter.",
    descriptionUr:
      "خواتین کے لیے پاکستان کی قدیم ترین مفت قانونی امداد کی تنظیم، لاہور میں قائم۔ فیملی کورٹ کے مقدمات، تحفظ کے احکامات اور فوجداری شکایات دیکھتی ہے، اور دستک شیلٹر چلاتی ہے۔",
    serves: ["woman"],
    handles: ["family_law", "domestic", "sexual", "economic"],
    priority: 2,
    verification: "unconfirmed",
    verifyNote:
      "The number 0800-00123 was inherited from the original prototype and has not been verified. Confirm with AGHS directly before this is shown to users.",
  },
  {
    id: "dastak",
    name: "Dastak Charitable Trust (shelter)",
    nameUr: "دستک چیریٹیبل ٹرسٹ (پناہ گاہ)",
    type: "shelter",
    scope: ["punjab"],
    hours: "24/7",
    hoursUr: "ہر وقت",
    description:
      "Independent shelter in Lahore for women fleeing violence or forced marriage, with legal support attached through AGHS. An alternative for women who do not want to enter a government Dar-ul-Aman.",
    descriptionUr:
      "لاہور میں تشدد یا جبری شادی سے بھاگنے والی خواتین کے لیے خودمختار پناہ گاہ، جس کے ساتھ اے جی ایچ ایس کی قانونی معاونت منسلک ہے۔ ان خواتین کے لیے متبادل جو سرکاری دارالامان نہیں جانا چاہتیں۔",
    serves: ["woman", "child"],
    handles: ["domestic", "harmful_practice", "physical"],
    priority: 2,
    verification: "unconfirmed",
    verifyNote: "Confirm intake number and whether direct approach is accepted.",
  },
  {
    id: "bedari",
    name: "Bedari",
    nameUr: "بیداری",
    type: "ngo",
    scope: ["punjab"],
    phone: "0300-5251717",
    website: "https://bedari.org.pk/",
    hours: "Monday to Friday, working hours",
    hoursUr: "پیر تا جمعہ، کام کے اوقات",
    description:
      "Legal aid, counselling and shelter referral for women and children, with a focus on rural Punjab where formal services are thin.",
    descriptionUr:
      "خواتین اور بچوں کے لیے قانونی مدد، کاؤنسلنگ اور پناہ گاہ تک رہنمائی، خاص طور پر دیہی پنجاب میں جہاں رسمی خدمات کم ہیں۔",
    serves: ["woman", "child"],
    handles: ["domestic", "child", "harmful_practice", "family_law"],
    priority: 3,
    verification: "unconfirmed",
    verifyNote: "Confirm the mobile helpline number is still in service.",
  },
  {
    id: "war_lahore",
    name: "War Against Rape (WAR) — Lahore",
    nameUr: "وار اگینسٹ ریپ — لاہور",
    type: "ngo",
    scope: ["punjab"],
    website: "https://war.org.pk/",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Specialist support for survivors of sexual assault: accompaniment to the medico-legal examination, free legal representation, and counselling.",
    descriptionUr:
      "جنسی تشدد سے بچ جانے والوں کے لیے خصوصی معاونت: میڈیکو لیگل معائنے میں ہمراہی، مفت قانونی نمائندگی، اور کاؤنسلنگ۔",
    serves: "any",
    handles: ["sexual"],
    priority: 2,
    verification: "unconfirmed",
    verifyNote: "Confirm the Lahore office phone number.",
  },

  // -------------------------------------------------------------------------
  // Sindh
  // -------------------------------------------------------------------------
  {
    id: "sindh_women_helpline",
    name: "Sindh Women's Helpline",
    nameUr: "سندھ ویمن ہیلپ لائن",
    type: "government",
    scope: ["sindh"],
    phone: "1094",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Women Development Department helpline for Sindh, providing guidance, complaint registration and referral.",
    descriptionUr:
      "سندھ کے محکمہ ترقیِ نسواں کی ہیلپ لائن، جو رہنمائی، شکایت کے اندراج اور رجوع کی سہولت دیتی ہے۔",
    serves: ["woman"],
    handles: ["domestic", "physical", "workplace", "family_law"],
    priority: 1,
    verification: "unconfirmed",
    verifyNote:
      "1094 was inherited from the original prototype. Confirm it is live and staffed, and establish its actual hours.",
  },
  {
    id: "war_karachi",
    name: "War Against Rape (WAR) — Karachi",
    nameUr: "وار اگینسٹ ریپ — کراچی",
    type: "ngo",
    scope: ["sindh"],
    website: "https://war.org.pk/",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Karachi-based specialist service for survivors of sexual assault: medico-legal accompaniment, free legal aid and psychological support.",
    descriptionUr:
      "کراچی میں جنسی تشدد سے بچ جانے والوں کے لیے خصوصی ادارہ: میڈیکو لیگل معائنے میں ہمراہی، مفت قانونی مدد اور نفسیاتی معاونت۔",
    serves: "any",
    handles: ["sexual"],
    priority: 2,
    verification: "unconfirmed",
    verifyNote: "Confirm the Karachi office phone number.",
  },
  {
    id: "scsw",
    name: "Sindh Commission on the Status of Women",
    nameUr: "سندھ کمیشن برائے حیثیتِ نسواں",
    type: "government",
    scope: ["sindh"],
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Provincial oversight body for women's rights in Sindh. Receives complaints where a government department has failed to act.",
    descriptionUr:
      "سندھ میں خواتین کے حقوق کا صوبائی نگران ادارہ۔ ان شکایات کو دیکھتا ہے جہاں کسی سرکاری محکمے نے کارروائی نہ کی ہو۔",
    serves: ["woman"],
    handles: ["other", "workplace"],
    priority: 4,
    verification: "unconfirmed",
    verifyNote: "Confirm contact details and complaint intake route.",
  },

  // -------------------------------------------------------------------------
  // Khyber Pakhtunkhwa
  // -------------------------------------------------------------------------
  {
    id: "kpcsw",
    name: "KP Commission on the Status of Women",
    nameUr: "خیبر پختونخوا کمیشن برائے حیثیتِ نسواں",
    type: "government",
    scope: ["kp"],
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Provincial commission overseeing women's rights in Khyber Pakhtunkhwa, and the body to approach where a department has refused to act on a complaint.",
    descriptionUr:
      "خیبر پختونخوا میں خواتین کے حقوق کی نگرانی کرنے والا صوبائی کمیشن، اور وہ ادارہ جس سے رجوع کیا جائے جب کوئی محکمہ شکایت پر کارروائی سے انکار کرے۔",
    serves: ["woman"],
    handles: ["other", "workplace", "domestic"],
    priority: 3,
    verification: "unconfirmed",
    verifyNote: "Confirm contact number and complaint intake route.",
  },
  {
    id: "da_hawwa_lur",
    name: "Da Hawwa Lur (shelter, Peshawar)",
    nameUr: "دا حوا لور (پناہ گاہ، پشاور)",
    type: "shelter",
    scope: ["kp"],
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Peshawar-based organisation providing shelter, legal aid and counselling for women facing violence in Khyber Pakhtunkhwa.",
    descriptionUr:
      "پشاور میں قائم تنظیم جو خیبر پختونخوا میں تشدد کا سامنا کرنے والی خواتین کو پناہ، قانونی مدد اور کاؤنسلنگ فراہم کرتی ہے۔",
    serves: ["woman", "child"],
    handles: ["domestic", "harmful_practice", "physical"],
    priority: 2,
    verification: "unconfirmed",
    verifyNote: "Confirm the organisation is still operating and get its intake number.",
  },
  {
    id: "blue_veins",
    name: "Blue Veins",
    nameUr: "بلیو وینز",
    type: "ngo",
    scope: ["kp"],
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Peshawar-based rights organisation, one of the few in Khyber Pakhtunkhwa working directly with transgender people as well as women, on violence, healthcare access and legal recognition.",
    descriptionUr:
      "پشاور میں قائم حقوق کی تنظیم، خیبر پختونخوا میں ان چند اداروں میں سے ایک جو خواتین کے ساتھ ساتھ ٹرانسجینڈر افراد کے ساتھ تشدد، صحت کی سہولیات اور قانونی شناخت پر براہِ راست کام کرتی ہے۔",
    serves: ["woman", "transgender"],
    handles: ["physical", "sexual", "other"],
    priority: 3,
    verification: "unconfirmed",
    verifyNote: "Confirm contact details and current programme areas.",
  },

  // -------------------------------------------------------------------------
  // Balochistan
  // -------------------------------------------------------------------------
  {
    id: "bcsw",
    name: "Balochistan Commission on the Status of Women",
    nameUr: "بلوچستان کمیشن برائے حیثیتِ نسواں",
    type: "government",
    scope: ["balochistan"],
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Provincial commission for women's rights in Balochistan. Formal services in the province are limited, so the national 1099 helpline is often the faster route.",
    descriptionUr:
      "بلوچستان میں خواتین کے حقوق کا صوبائی کمیشن۔ صوبے میں رسمی خدمات محدود ہیں، اس لیے قومی ہیلپ لائن 1099 اکثر تیز راستہ ہوتا ہے۔",
    serves: ["woman"],
    handles: ["other", "domestic", "workplace"],
    priority: 3,
    verification: "unconfirmed",
    verifyNote: "Confirm contact details and whether complaint intake is operational.",
  },
  {
    id: "aurat_balochistan",
    name: "Aurat Foundation — Quetta",
    nameUr: "عورت فاؤنڈیشن — کوئٹہ",
    type: "ngo",
    scope: ["balochistan"],
    website: "https://www.af.org.pk/",
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "Provincial office providing legal referral and crisis support in Balochistan, where dedicated women's services are scarce.",
    descriptionUr:
      "صوبائی دفتر جو بلوچستان میں قانونی رہنمائی اور بحرانی معاونت فراہم کرتا ہے، جہاں خواتین کے لیے مخصوص خدمات کم ہیں۔",
    serves: ["woman"],
    handles: ["domestic", "family_law", "harmful_practice", "other"],
    priority: 3,
    verification: "unconfirmed",
    verifyNote: "Confirm the Quetta office contact number.",
  },

  // -------------------------------------------------------------------------
  // Gilgit-Baltistan and Azad Jammu & Kashmir
  // -------------------------------------------------------------------------
  {
    id: "gb_social_welfare",
    name: "Gilgit-Baltistan Social Welfare Department",
    nameUr: "گلگت بلتستان محکمہ سماجی بہبود",
    type: "government",
    scope: ["gb"],
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "The district Social Welfare office is the main route to shelter and support in Gilgit-Baltistan, where dedicated women's helplines are not established. The national 1099 helpline also covers this region.",
    descriptionUr:
      "گلگت بلتستان میں پناہ اور معاونت کا بنیادی راستہ ضلعی محکمہ سماجی بہبود ہے، جہاں خواتین کے لیے مخصوص ہیلپ لائنیں قائم نہیں۔ قومی ہیلپ لائن 1099 بھی اس علاقے کو کور کرتی ہے۔",
    serves: "any",
    handles: ["domestic", "child", "other"],
    priority: 3,
    verification: "unconfirmed",
    verifyNote:
      "Establish which district offices handle violence cases and whether any shelter capacity exists in GB.",
  },
  {
    id: "ajk_social_welfare",
    name: "AJK Social Welfare & Women Development Department",
    nameUr: "آزاد کشمیر محکمہ سماجی بہبود و ترقیِ نسواں",
    type: "government",
    scope: ["ajk"],
    hours: "Working hours",
    hoursUr: "کام کے اوقات",
    description:
      "The departmental route to shelter, counselling and legal referral in Azad Jammu & Kashmir. AJK has its own legislature, so some federal statutes apply only once adopted locally. The national 1099 helpline also covers this region.",
    descriptionUr:
      "آزاد جموں و کشمیر میں پناہ، کاؤنسلنگ اور قانونی رہنمائی کا محکمانہ راستہ۔ آزاد کشمیر کی اپنی اسمبلی ہے، اس لیے کچھ وفاقی قوانین مقامی سطح پر منظوری کے بعد ہی لاگو ہوتے ہیں۔ قومی ہیلپ لائن 1099 بھی اس علاقے کو کور کرتی ہے۔",
    serves: "any",
    handles: ["domestic", "child", "family_law", "other"],
    priority: 3,
    verification: "unconfirmed",
    verifyNote:
      "Confirm departmental contacts, and establish which federal statutes AJK has adopted.",
  },
];

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface ResourceQuery {
  province?: ProvinceId;
  gender?: Gender;
  categories?: CaseCategory[];
  types?: ResourceType[];
  /** Include entries awaiting verification. Default false. */
  includeUnconfirmed?: boolean;
  /** Free-text match against name and description. */
  search?: string;
}

function servesGender(resource: Resource, gender: Gender | undefined): boolean {
  if (resource.serves === "any") return true;
  if (!gender || gender === "unspecified") return true;
  return (resource.serves as ServesGroup[]).includes(gender);
}

/**
 * Filters an arbitrary resource list. Separated from `getResources` so the same
 * predicate serves both the bundled dataset and rows loaded from Supabase — the
 * directory must behave identically whichever supplied the data.
 */
export function filterResources(
  source: Resource[],
  query: ResourceQuery = {},
): Resource[] {
  const {
    province,
    gender,
    categories,
    types,
    includeUnconfirmed = false,
    search,
  } = query;

  const needle = search?.trim().toLowerCase();

  return source.filter((r) => {
    if (!includeUnconfirmed && r.verification !== "confirmed") return false;

    if (province && !r.scope.includes("national") && !r.scope.includes(province)) {
      return false;
    }

    if (!servesGender(r, gender)) return false;

    if (categories?.length && !r.handles.some((h) => categories.includes(h))) {
      return false;
    }

    if (types?.length && !types.includes(r.type)) return false;

    if (needle) {
      const haystack = [r.name, r.nameUr, r.description, r.descriptionUr]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  }).sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

/**
 * Resources relevant to a person, from the bundled dataset. National entries are
 * always included alongside the province-specific ones — a woman in Balochistan
 * should still see 15, 1099 and the cyber crime route.
 *
 * This reads the compiled-in data, which is the fallback path. Anything that can
 * be asynchronous should prefer the database via lib/db/reference.ts, so that a
 * number the legal desk verifies goes live without a deploy.
 */
export function getResources(query: ResourceQuery = {}): Resource[] {
  return filterResources(RESOURCES, query);
}

/**
 * The subset handed to the language model. Confirmed entries only, and trimmed
 * to the fields the model needs, so it cannot invent a number we have not
 * stood behind.
 */
export function getResourcesForPrompt(query: ResourceQuery = {}) {
  return getResources({ ...query, includeUnconfirmed: false }).map((r) => ({
    name: r.name,
    phone: r.phone,
    website: r.website,
    whatsapp: r.whatsapp,
    hours: r.hours,
    serves: r.serves,
    handles: r.handles,
    scope: r.scope,
    description: r.description,
  }));
}

/** Everything still awaiting legal-desk sign-off, for the verification doc. */
export function getUnverifiedResources(): Resource[] {
  return RESOURCES.filter((r) => r.verification !== "confirmed");
}

export function getResourceById(id: string): Resource | undefined {
  return RESOURCES.find((r) => r.id === id);
}

/**
 * Urdu for the NCSW framework, plus per-category guidance for /rights.
 *
 * The NCSW indicators are published in English only. The app claims to work in
 * Urdu, and roughly half the people it is built for will read it in Urdu, so
 * shipping a rights library with English category names inside an Urdu
 * interface would make the Urdu support decorative.
 *
 * Category names, descriptions and indicator names are translated here.
 * The worked examples in the knowledge base are not yet translated and fall
 * back to English — flagged in the UI rather than passed off as complete.
 */

import type { Localized } from "./guided-flow";

export const CATEGORY_UR: Record<string, { name: string; description: string }> = {
  physical: {
    name: "جسمانی تشدد",
    description:
      "ایسے اقدامات جو جسمانی نقصان، تکلیف، زخم یا موت کا سبب بنیں یا بن سکتے ہوں۔",
  },
  sexual: {
    name: "جنسی تشدد",
    description:
      "کوئی بھی جنسی عمل، کوشش، یا ناپسندیدہ جنسی رابطہ یا جملے جو جبر، طاقت یا دھمکی کے ذریعے کیے جائیں۔",
  },
  psychological: {
    name: "نفسیاتی / جذباتی تشدد",
    description:
      "ایسے اعمال جو ذہنی یا جذباتی اذیت کا سبب بنیں، بشمول جابرانہ رویے سے پیدا ہونے والی نفسیاتی خرابی۔",
  },
  harmful_traditional: {
    name: "نقصان دہ روایتی رسومات",
    description:
      "خواتین کے لیے نقصان دہ رسم و رواج، جنہیں اکثر ثقافت یا برادری کے نام پر جائز قرار دیا جاتا ہے۔ پاکستانی قانون انہیں تشدد تسلیم کرتا ہے۔",
  },
  economic: {
    name: "معاشی تشدد",
    description:
      "مالی وسائل پر قابو، کام سے روکنا، نان نفقہ سے انکار، یا محنت کا استحصال۔",
  },
  cyber: {
    name: "سائبر تشدد / ٹیکنالوجی کے ذریعے تشدد",
    description:
      "آن لائن ہراسانی، بلیک میل، نجی تصاویر کا بغیر اجازت پھیلانا، ڈیجیٹل تعاقب۔",
  },
};

export const INDICATOR_UR: Record<string, string> = {
  phys_01: "مارنا، تھپڑ مارنا، لات مارنا، مکہ مارنا یا پیٹنا",
  phys_02: "دھکا دینا، بال کھینچنا، گھسیٹنا",
  phys_03: "خاتون پر چیزیں پھینکنا",
  phys_04: "جلانا، کھولتا پانی ڈالنا، یا تیزاب پھینکنا",
  phys_05: "ہتھیار کا استعمال — چاقو، اسلحہ، ڈنڈا، سریا",
  phys_06: "گلا دبانا یا سانس روکنا",
  phys_07: "قید رکھنا اور نقل و حرکت پر پابندی",
  phys_08: "قتل یا اقدامِ قتل (بشمول غیرت کے نام پر قتل)",
  sex_01: "زیادتی اور اقدامِ زیادتی",
  sex_02: "شوہر کی جانب سے زبردستی جنسی تعلق",
  sex_03: "بغیر اجازت چھونا، پکڑنا",
  sex_04: "زبانی جنسی ہراسانی — فقرے کسنا، آوازیں کسنا",
  sex_05: "کام کی جگہ پر جنسی ہراسانی",
  sex_06: "جبری جسم فروشی یا جنسی استحصال",
  sex_07: "بچیوں کا جنسی استحصال",
  psych_01: "زبانی بدسلوکی — گالیاں، تذلیل، بے عزتی",
  psych_02: "تشدد، نقصان یا چھوڑ دینے کی دھمکیاں",
  psych_03: "قابو رکھنے کا رویہ — خاندان اور دوستوں سے کاٹ دینا",
  psych_04: "خوفزدہ کرنا — سامان توڑنا، ہتھیار دکھانا",
  psych_05: "تعاقب اور نگرانی",
  psych_06: "گیس لائٹنگ — متاثرہ کو اپنی یادداشت پر شک دلانا",
  psych_07: "بچوں کو قابو پانے کے لیے استعمال کرنا",
  trad_01: "غیرت کے نام پر قتل (کاروکاری) یا اس کی دھمکی",
  trad_02: "جبری شادی",
  trad_03: "کم عمری کی شادی",
  trad_04: "ونی / سوارہ — تنازعات طے کرنے کے لیے خواتین دینا",
  trad_05: "وٹہ سٹہ — تبادلے کی شادی",
  trad_06: "جہیز سے متعلق تشدد",
  trad_07: "وراثت کے حق سے محرومی",
  trad_08: "اقلیتی خواتین کی جبری تبدیلیِ مذہب اور شادی",
  econ_01: "مالی وسائل یا نان نفقہ روکنا",
  econ_02: "آمدنی یا کمائی پر قابو",
  econ_03: "کام کرنے سے روکنا",
  econ_04: "جائیداد یا اثاثوں سے محروم کرنا",
  econ_05: "تعلیم سے محرومی",
  cyber_01: "نجی تصاویر یا ویڈیوز بغیر اجازت پھیلانا",
  cyber_02: "آن لائن ہراسانی اور سائبر بلنگ",
  cyber_03: "ڈیجیٹل بلیک میل یا سیکسٹورشن",
  cyber_04: "ڈیجیٹل تعاقب اور نگرانی",
  cyber_05: "جعلی شناخت اور جعلی پروفائل",
  cyber_06: "ڈوکسنگ — نجی معلومات شائع کرنا",
};

/**
 * What someone can actually do, per category. Deliberately concrete: the
 * failure mode of a rights page is telling people they have rights without
 * telling them where to go.
 */
export const CATEGORY_ACTIONS: Record<string, Localized[]> = {
  physical: [
    {
      en: "Get a medico-legal certificate from a **government** hospital, not a private clinic. It carries most weight within 24 hours, while injuries are fresh — but go even if more time has passed.",
      ur: "کسی **سرکاری** ہسپتال سے میڈیکو لیگل سرٹیفکیٹ حاصل کریں، نجی کلینک سے نہیں۔ یہ زخم کے 24 گھنٹوں کے اندر سب سے زیادہ وزن رکھتا ہے — لیکن وقت گزر جانے پر بھی ضرور جائیں۔",
    },
    {
      en: "Photograph injuries with a date visible, and keep the photographs somewhere the other person cannot reach.",
      ur: "زخموں کی تصاویر تاریخ کے ساتھ لیں، اور انہیں ایسی جگہ رکھیں جہاں دوسرا شخص نہ پہنچ سکے۔",
    },
    {
      en: "An FIR can be registered at the police station covering where it happened. If the police refuse, that refusal is itself something a legal aid organisation can act on.",
      ur: "جہاں واقعہ ہوا وہاں کے تھانے میں ایف آئی آر درج ہو سکتی ہے۔ اگر پولیس انکار کرے تو یہ انکار خود ایسی بات ہے جس پر قانونی امداد کا ادارہ کارروائی کر سکتا ہے۔",
    },
  ],
  sexual: [
    {
      en: "Seek a medico-legal examination as early as you can, at a government hospital. If possible, do not wash or change clothes first.",
      ur: "جتنی جلد ممکن ہو سرکاری ہسپتال میں میڈیکو لیگل معائنہ کروائیں۔ اگر ممکن ہو تو پہلے نہ نہائیں اور نہ کپڑے بدلیں۔",
    },
    {
      en: "The law protects your identity. Under the Anti-Rape Act 2021 your name is not to be published, and special courts hear these cases.",
      ur: "قانون آپ کی شناخت کی حفاظت کرتا ہے۔ اینٹی ریپ ایکٹ 2021 کے تحت آپ کا نام شائع نہیں کیا جا سکتا، اور یہ مقدمات خصوصی عدالتیں سنتی ہیں۔",
    },
    {
      en: "Organisations that specialise in this can go with you to the hospital and the police station. You do not have to do it alone.",
      ur: "اس شعبے میں مہارت رکھنے والے ادارے ہسپتال اور تھانے میں آپ کے ساتھ جا سکتے ہیں۔ آپ کو یہ اکیلے نہیں کرنا۔",
    },
  ],
  psychological: [
    {
      en: "Keep a dated record of incidents — what was said, when, and who else was present. A pattern is what makes this provable.",
      ur: "واقعات کا تاریخ وار ریکارڈ رکھیں — کیا کہا گیا، کب، اور کون موجود تھا۔ تسلسل ہی وہ چیز ہے جو اسے ثابت کرتی ہے۔",
    },
    {
      en: "A protection order can prohibit contact, and in some provinces can require the other person to leave the home. You do not have to leave to apply for one.",
      ur: "تحفظ کا حکم رابطے پر پابندی لگا سکتا ہے، اور بعض صوبوں میں دوسرے شخص کو گھر چھوڑنے کا پابند کر سکتا ہے۔ اس کے لیے آپ کا گھر چھوڑنا ضروری نہیں۔",
    },
  ],
  harmful_traditional: [
    {
      en: "Threats made in the name of honour are a criminal offence, and since 2016 the family can no longer forgive the perpetrator to avoid punishment.",
      ur: "غیرت کے نام پر دی گئی دھمکیاں فوجداری جرم ہیں، اور 2016 کے بعد خاندان سزا سے بچانے کے لیے مجرم کو معاف نہیں کر سکتا۔",
    },
    {
      en: "A marriage contracted without free consent can be challenged. Giving a woman to settle a dispute is a separate offence carrying 3 to 10 years.",
      ur: "آزادانہ رضامندی کے بغیر ہونے والی شادی کو چیلنج کیا جا سکتا ہے۔ تنازع طے کرنے کے لیے خاتون دینا الگ جرم ہے جس کی سزا 3 سے 10 سال ہے۔",
    },
    {
      en: "If you are in danger from your own family, a shelter can admit you without a male guardian's permission.",
      ur: "اگر آپ کو اپنے ہی خاندان سے خطرہ ہے تو پناہ گاہ آپ کو کسی مرد سرپرست کی اجازت کے بغیر داخل کر سکتی ہے۔",
    },
  ],
  economic: [
    {
      en: "Maintenance is a legal obligation, not a favour. It can be claimed in the Family Court, and children's maintenance continues regardless of divorce.",
      ur: "نان نفقہ قانونی ذمہ داری ہے، احسان نہیں۔ اس کا دعویٰ فیملی کورٹ میں کیا جا سکتا ہے، اور بچوں کا خرچ طلاق کے بعد بھی جاری رہتا ہے۔",
    },
    {
      en: "Depriving a woman of inheritance is a criminal offence under Section 498-A, not only a family matter.",
      ur: "کسی خاتون کو وراثت سے محروم کرنا دفعہ 498-A کے تحت فوجداری جرم ہے، محض خاندانی معاملہ نہیں۔",
    },
    {
      en: "Gather what proves the other person's income — salary slips, bank details, property papers — before you need them.",
      ur: "دوسرے شخص کی آمدنی ثابت کرنے والے کاغذات — تنخواہ کی پرچی، بینک تفصیلات، جائیداد کے کاغذات — ضرورت پڑنے سے پہلے جمع کر لیں۔",
    },
  ],
  cyber: [
    {
      en: "Do not delete anything. Screenshot the messages, the profile and the URL before you block or report — that evidence disappears once the account does.",
      ur: "کچھ بھی حذف نہ کریں۔ بلاک یا رپورٹ کرنے سے پہلے پیغامات، پروفائل اور لنک کے اسکرین شاٹ لیں — اکاؤنٹ ختم ہوتے ہی وہ ثبوت غائب ہو جاتا ہے۔",
    },
    {
      en: "Sharing intimate images without consent carries 5 to 7 years under PECA 2016. The person doing it is committing the offence, not you.",
      ur: "بغیر اجازت نجی تصاویر پھیلانے کی سزا پیکا 2016 کے تحت 5 سے 7 سال ہے۔ جرم وہ کر رہا ہے جو یہ کر رہا ہے، آپ نہیں۔",
    },
    {
      en: "Complaints can be filed online, without going to an office in person.",
      ur: "شکایات آن لائن درج کی جا سکتی ہیں، دفتر جانے کی ضرورت نہیں۔",
    },
  ],
};

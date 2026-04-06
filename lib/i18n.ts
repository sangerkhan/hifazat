export type Locale = "en" | "ur";

export const translations = {
  en: {
    // Meta
    pageTitle: "My Resources",

    // Navigation
    goBack: "Go back",
    save: "Save",
    backHome: "Back home",

    // Landing
    heroHeadline: "You deserve to know your rights!",
    heroSubtext:
      "Describe what happened and we'll help you understand what you can do about it under Pakistani Law.",
    ctaPrimary: "Describe your situation",
    ctaSecondary: "Guide me step by step",
    emergencyLabel: "In Immediate danger?",
    callPolice: "Call 15 (Police)",
    callHumanRights: "Call 1099 (Human rights)",

    // Assess
    assessHeading: "Tell us what happened",
    assessSubtext:
      "Your words are never stored. This conversation is completely private.",
    assessPlaceholder:
      "Describe what happened in your own words... You can write in English or Urdu.",
    assessSubmit: "Assess my situation",
    assessAnalysing: "Analysing...",
    assessPrivacy: "Nothing you type is saved anywhere.",

    // Guided — Gender & Province
    guidedGender: "What is your gender?",
    guidedGenderOpts: ["Woman", "Man", "Transgender person"],
    guidedProvince: "Which province or territory are you in?",
    guidedProvinceOpts: [
      "Punjab",
      "Sindh",
      "Khyber Pakhtunkhwa",
      "Balochistan",
      "Islamabad Capital Territory",
      "Gilgit-Baltistan",
      "Azad Jammu & Kashmir",
    ],

    // Guided
    guidedStepOf: "Step {current} of {total}",
    guidedQ1: "Where did this happen?",
    guidedQ1Opts: [
      "At home",
      "At work",
      "Online / digital",
      "In public",
      "At school or university",
      "Other",
    ],
    guidedQ2: "Who did this?",
    guidedQ2Opts: [
      "Husband or partner",
      "Family member",
      "In-law",
      "Colleague or boss",
      "Stranger",
      "Someone I know",
      "Ex-partner",
    ],
    guidedKids: "Are children involved in this situation?",
    guidedKidsOpts: ["Yes", "No"],
    guidedKidsCount: "How many children?",
    guidedKidsCountOpts: ["1", "2", "3", "4 or more"],
    guidedIntent: "What do you want to do?",
    guidedIntentOpts: [
      "I want to leave with my children",
      "I want to leave without my children",
      "I want a khula (divorce)",
      "I want to stay but need protection",
    ],
    guidedQ3: "What happened?",
    guidedQ3Opts: [
      "Hit, slapped, or physically hurt",
      "Threatened me",
      "Controlled where I go or who I talk to",
      "Touched me without my consent",
      "Said hurtful or degrading things",
      "Took my money or stopped me from working",
      "Shared my private photos or messages",
      "Forced me into marriage",
      "Denied my inheritance or property",
      "Stalked or followed me",
      "Other",
    ],
    guidedQ4: "How often does this happen?",
    guidedQ4Opts: [
      "It happened once",
      "It happens sometimes",
      "It happens regularly",
      "It is happening right now",
    ],
    guidedQ5: "Anything else you'd like to share?",
    guidedQ5Sub: "This is optional. You can skip this step.",
    guidedQ5Placeholder: "Add any additional details here...",
    guidedNext: "Next",
    guidedSubmit: "Submit",
    guidedSkip: "Skip",

    // Assessment Result
    resultCredibility: "Based on NCSW Standardized Indicators on Violence against Women in Pakistan",
    resultRecognisedAs: "What you describe is recognised as",
    resultUnderLaw: "under Pakistani Law",
    resultUrgent: "Your safety is the priority.",
    resultCallPolice: "Call 15 — Police",
    resultCallHR: "Call 1099 — Human Rights",
    resultLegalSeverity: "Legal Severity",
    resultCharges: "Charges",
    resultSeverityConcerning: "Concerning",
    resultSeveritySerious: "Serious",
    resultSeverityCritical: "Critical / Urgent",
    resultPriorityImmediate: "Immediate",
    resultPriorityShort: "Short term",
    resultPriorityLong: "Longer term",
    resultClassificationsHeading: "Legal breakdown",
    resultActionsHeading: "What you can do",
    resultResourcesHeading: "Resources for you",
    resultNote: "Note",
    resultReportComplaint: "Report Complaint now",
    resultReportHelper:
      "This will lead you to the complaint registration page where you can take your first line of action.",
    resultNewAssessment: "Start a new assessment",

    // Resources page
    resourcesHeading: "Resources",
    resourcesSubtext: "Helplines, legal aid, and support organisations",
    resourceTypeEmergency: "Emergency",
    resourceTypeGovernment: "Government",
    resourceTypeNgo: "NGO",
    resourceTypeLegalAid: "Legal Aid",

    // Footer
    footerDescription:
      "Hifazat is a non-profit project to facilitate victims of violence.",
    footerCredit: "Created by",
    footerAuthor: "Sanger Khan",
  },

  ur: {
    // Meta
    pageTitle: "میرے وسائل",

    // Navigation
    goBack: "واپس جائیں",
    save: "محفوظ کریں",
    backHome: "واپس ہوم پر جائیں",

    // Landing
    heroHeadline: "آپ کو اپنے حقوق جاننے کا حق ہے!",
    heroSubtext:
      "بتائیں کیا ہوا اور ہم آپ کو سمجھنے میں مدد کریں گے کہ پاکستانی قانون کے تحت آپ کیا کر سکتے ہیں۔",
    ctaPrimary: "اپنی صورتحال بیان کریں",
    ctaSecondary: "مجھے قدم بہ قدم رہنمائی کریں",
    emergencyLabel: "فوری خطرے میں ہیں؟",
    callPolice: "15 پر کال کریں (پولیس)",
    callHumanRights: "1099 پر کال کریں (انسانی حقوق)",

    // Assess
    assessHeading: "ہمیں بتائیں کیا ہوا",
    assessSubtext:
      "آپ کے الفاظ کبھی محفوظ نہیں کیے جاتے۔ یہ گفتگو مکمل طور پر نجی ہے۔",
    assessPlaceholder:
      "اپنے الفاظ میں بتائیں کیا ہوا... آپ اردو یا انگریزی میں لکھ سکتے ہیں۔",
    assessSubmit: "میری صورتحال کا جائزہ لیں",
    assessAnalysing: "تجزیہ ہو رہا ہے...",
    assessPrivacy: "آپ جو کچھ بھی لکھیں وہ کہیں محفوظ نہیں ہوتا۔",

    // Guided — Gender & Province
    guidedGender: "آپ کی صنف کیا ہے؟",
    guidedGenderOpts: ["خاتون", "مرد", "ٹرانسجینڈر"],
    guidedProvince: "آپ کس صوبے یا علاقے میں ہیں؟",
    guidedProvinceOpts: [
      "پنجاب",
      "سندھ",
      "خیبر پختونخوا",
      "بلوچستان",
      "اسلام آباد وفاقی دارالحکومت",
      "گلگت بلتستان",
      "آزاد جموں و کشمیر",
    ],

    // Guided
    guidedStepOf: "مرحلہ {current} از {total}",
    guidedQ1: "یہ کہاں ہوا؟",
    guidedQ1Opts: [
      "گھر میں",
      "کام کی جگہ پر",
      "آن لائن / ڈیجیٹل",
      "عوامی جگہ پر",
      "اسکول یا یونیورسٹی میں",
      "کوئی اور جگہ",
    ],
    guidedQ2: "یہ کس نے کیا؟",
    guidedQ2Opts: [
      "شوہر یا پارٹنر",
      "خاندان کا فرد",
      "سسرال والے",
      "ساتھی یا باس",
      "اجنبی",
      "کوئی جاننے والا",
      "سابق پارٹنر",
    ],
    guidedKids: "کیا اس صورتحال میں بچے شامل ہیں؟",
    guidedKidsOpts: ["ہاں", "نہیں"],
    guidedKidsCount: "کتنے بچے ہیں؟",
    guidedKidsCountOpts: ["1", "2", "3", "4 یا زیادہ"],
    guidedIntent: "آپ کیا کرنا چاہتی ہیں؟",
    guidedIntentOpts: [
      "میں اپنے بچوں کے ساتھ جانا چاہتی ہوں",
      "میں بچوں کے بغیر جانا چاہتی ہوں",
      "میں خلع چاہتی ہوں",
      "میں رہنا چاہتی ہوں لیکن تحفظ چاہیے",
    ],
    guidedQ3: "کیا ہوا؟",
    guidedQ3Opts: [
      "مارا، تھپڑ مارا، یا جسمانی تکلیف دی",
      "دھمکی دی",
      "میرے جانے یا بات کرنے پر پابندی لگائی",
      "میری مرضی کے بغیر چھوا",
      "تکلیف دہ یا ذلت آمیز باتیں کیں",
      "میرے پیسے لے لیے یا کام سے روکا",
      "میری نجی تصاویر یا پیغامات شیئر کیے",
      "زبردستی شادی کرائی",
      "وراثت یا جائیداد سے محروم کیا",
      "پیچھا کیا یا تعاقب کیا",
      "کوئی اور بات",
    ],
    guidedQ4: "یہ کتنی بار ہوتا ہے؟",
    guidedQ4Opts: [
      "ایک بار ہوا",
      "کبھی کبھی ہوتا ہے",
      "باقاعدگی سے ہوتا ہے",
      "ابھی ہو رہا ہے",
    ],
    guidedQ5: "کچھ اور بتانا چاہتے ہیں؟",
    guidedQ5Sub: "یہ اختیاری ہے۔ آپ یہ مرحلہ چھوڑ سکتے ہیں۔",
    guidedQ5Placeholder: "کوئی اضافی تفصیلات یہاں لکھیں...",
    guidedNext: "اگلا",
    guidedSubmit: "جمع کرائیں",
    guidedSkip: "چھوڑیں",

    // Assessment Result
    resultCredibility: "پاکستان میں تشدد کے خلاف NCSW کے معیاری اشاریوں پر مبنی",
    resultRecognisedAs: "آپ نے جو بیان کیا ہے وہ تسلیم شدہ ہے بطور",
    resultUnderLaw: "پاکستانی قانون کے تحت",
    resultUrgent: "آپ کی حفاظت سب سے اہم ہے۔",
    resultCallPolice: "15 پر کال کریں — پولیس",
    resultCallHR: "1099 پر کال کریں — انسانی حقوق",
    resultLegalSeverity: "قانونی شدت",
    resultCharges: "دفعات",
    resultSeverityConcerning: "تشویشناک",
    resultSeveritySerious: "سنگین",
    resultSeverityCritical: "انتہائی سنگین / فوری",
    resultPriorityImmediate: "فوری",
    resultPriorityShort: "قلیل مدتی",
    resultPriorityLong: "طویل مدتی",
    resultClassificationsHeading: "قانونی تفصیلات",
    resultActionsHeading: "آپ کیا کر سکتے ہیں",
    resultResourcesHeading: "آپ کے لیے وسائل",
    resultNote: "نوٹ",
    resultReportComplaint: "ابھی شکایت درج کروائیں",
    resultReportHelper:
      "یہ آپ کو شکایت درج کرانے کے صفحے پر لے جائے گا جہاں آپ اپنا پہلا قدم اٹھا سکتے ہیں۔",
    resultNewAssessment: "نیا جائزہ شروع کریں",

    // Resources page
    resourcesHeading: "وسائل",
    resourcesSubtext: "ہیلپ لائنز، قانونی مدد، اور معاون ادارے",
    resourceTypeEmergency: "ایمرجنسی",
    resourceTypeGovernment: "سرکاری",
    resourceTypeNgo: "این جی او",
    resourceTypeLegalAid: "قانونی مدد",

    // Footer
    footerDescription:
      "حفاظت تشدد کے متاثرین کی مدد کے لیے ایک غیر منافع بخش منصوبہ ہے۔",
    footerCredit: "تخلیق کار",
    footerAuthor: "سنگر خان",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(locale: Locale, key: TranslationKey): string {
  const value = translations[locale][key];
  if (typeof value === "string") return value;
  return String(value);
}

export function tArray(locale: Locale, key: TranslationKey): string[] {
  const value = translations[locale][key];
  if (Array.isArray(value)) return value as string[];
  return [];
}

export function tStep(locale: Locale, current: number, total: number): string {
  return t(locale, "guidedStepOf")
    .replace("{current}", String(current))
    .replace("{total}", String(total));
}

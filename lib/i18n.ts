/**
 * Interface strings.
 *
 * Question and option text for the guided flow lives in `guided-flow.ts`
 * instead, next to the branching logic that depends on it. Keeping them
 * together is what makes it safe to reword an option: nothing matches on the
 * label any more, only on the option ID.
 */

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
    ctaSecondary: "Analyse my situation",
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

    // Guided flow chrome
    guidedStepOf: "Step {current} of {total}",
    guidedNext: "Next",
    guidedSubmit: "Get my guidance",
    guidedSkip: "Skip this question",
    guidedEdit: "Change",
    guidedTextPlaceholder: "Add anything else here...",
    guidedReviewSubmit: "Look at my situation",
    guidedNoAnswers: "You have not answered anything yet.",

    // Safety interstitial
    dangerTitle: "Your safety comes first",
    dangerBody:
      "If you are in danger right now, call for help before anything else. Both of these lines are free and you do not need credit on your phone.",
    dangerContinue: "I am safe enough to continue",
    dangerExpress: "Skip the questions — tell me what to do now",

    // Result
    resultCredibility:
      "Based on NCSW Standardized Indicators on Violence against Women in Pakistan",
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

    // Resources directory
    resourcesHeading: "Resources",
    resourcesSubtext: "Helplines, legal aid, and support organisations",
    resourcesFilterProvince: "Where are you?",
    resourcesFilterAll: "All of Pakistan",
    resourcesFilterType: "Type of help",
    resourcesFilterAllTypes: "Everything",
    resourcesSearchPlaceholder: "Search by name or what they do",
    resourcesNoResults:
      "Nothing matches those filters. Try clearing the search, or choose “All of Pakistan”.",
    resourcesCount: "{count} organisations",
    resourcesNationwide: "Nationwide",
    resourcesUnverifiedHeading: "Also in your area",
    resourcesUnverifiedNote:
      "These organisations work in your area, but we are still confirming their current contact details, so we are not listing a number we cannot stand behind. Reach them through their website, or call 1099 and ask to be connected.",
    resourcesWhatsapp: "WhatsApp",
    resourcesEmail: "Email",
    resourcesWebsite: "Visit website",
    resourceTypeEmergency: "Emergency",
    resourceTypePolice: "Police",
    resourceTypeGovernment: "Government",
    resourceTypeNgo: "NGO",
    resourceTypeLegalAid: "Legal Aid",
    resourceTypeShelter: "Shelter",
    resourceTypeCyber: "Online / Cyber",
    resourceTypeCounselling: "Counselling",
    resourceTypeChild: "Children",

    // Lawyer referral
    referralCtaTitle: "Would you like a lawyer to contact you?",
    referralCtaBody:
      "We can pass your situation to a lawyer in our partner network who works on cases like yours. It is free, and they will contact you directly.",
    referralCtaButton: "Ask a lawyer to contact me",
    referralHeading: "Ask a lawyer to contact you",
    referralIntro:
      "A lawyer from our partner network will look at your situation and contact you directly. There is no charge for this first contact.",
    referralName: "Your name",
    referralNamePlaceholder: "What should the lawyer call you?",
    referralNameHelp: "A first name is enough. You do not have to give your real name.",
    referralPhone: "Phone number",
    referralPhonePlaceholder: "03XX XXXXXXX",
    referralPhoneHelp: "This is how the lawyer will reach you.",
    referralSafeToCall: "Is it safe for us to call this number?",
    referralSafeYes: "Yes, I can take a call",
    referralSafeNo: "No — message me first, do not call",
    referralSafeHelp:
      "If someone else can see your phone or hear your calls, choose the second option.",
    referralBestTime: "When is the safest time to reach you?",
    referralTimeAny: "Any time",
    referralTimeMorning: "Morning",
    referralTimeAfternoon: "Afternoon",
    referralTimeEvening: "Evening",
    referralCity: "Your city or district",
    referralCityPlaceholder: "So we can match you with a lawyer nearby",
    referralConsent:
      "I agree that Hifazat may share what I have described with a lawyer in its partner network so that they can contact me.",
    referralConsentRequired: "Please tick the box so we can pass your case on.",
    referralSubmit: "Send to a lawyer",
    referralSubmitting: "Sending...",
    referralCancel: "Not right now",
    referralRequiredFields: "Please fill in your name and a phone number.",
    referralInvalidPhone: "That does not look like a Pakistani phone number.",
    referralError: "We could not send that. Please try again in a moment.",
    referralSuccessTitle: "Sent to the legal desk",
    referralSuccessBody:
      "A lawyer who works on this kind of case will contact you. Keep your reference number in case you need to follow up.",
    referralReference: "Your reference",
    referralSuccessSafety:
      "If your situation gets worse before they reach you, call 15 or 1099 straight away.",
    referralPrivacy:
      "We pass on your answers, your name and your number, and nothing else. We do not keep a copy after it reaches the legal desk.",

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
    ctaSecondary: "میری صورتحال کا جائزہ لیں",
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

    // Guided flow chrome
    guidedStepOf: "مرحلہ {current} از {total}",
    guidedNext: "اگلا",
    guidedSubmit: "میری رہنمائی دیکھیں",
    guidedSkip: "یہ سوال چھوڑ دیں",
    guidedEdit: "تبدیل کریں",
    guidedTextPlaceholder: "کوئی اور بات یہاں لکھیں...",
    guidedReviewSubmit: "میری صورتحال کا جائزہ لیں",
    guidedNoAnswers: "آپ نے ابھی کوئی جواب نہیں دیا۔",

    // Safety interstitial
    dangerTitle: "آپ کی حفاظت سب سے پہلے",
    dangerBody:
      "اگر آپ اس وقت خطرے میں ہیں تو سب سے پہلے مدد کے لیے کال کریں۔ یہ دونوں نمبر مفت ہیں اور ان کے لیے فون میں بیلنس کی ضرورت نہیں۔",
    dangerContinue: "میں سوالات جاری رکھ سکتی/سکتا ہوں",
    dangerExpress: "سوالات چھوڑیں — مجھے ابھی بتائیں کہ کیا کرنا ہے",

    // Result
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

    // Resources directory
    resourcesHeading: "وسائل",
    resourcesSubtext: "ہیلپ لائنز، قانونی مدد، اور معاون ادارے",
    resourcesFilterProvince: "آپ کہاں ہیں؟",
    resourcesFilterAll: "پورا پاکستان",
    resourcesFilterType: "کس قسم کی مدد",
    resourcesFilterAllTypes: "سب کچھ",
    resourcesSearchPlaceholder: "نام یا کام کے لحاظ سے تلاش کریں",
    resourcesNoResults:
      "ان فلٹرز سے کچھ نہیں ملا۔ تلاش صاف کریں، یا ”پورا پاکستان“ منتخب کریں۔",
    resourcesCount: "{count} ادارے",
    resourcesNationwide: "ملک بھر میں",
    resourcesUnverifiedHeading: "آپ کے علاقے میں مزید",
    resourcesUnverifiedNote:
      "یہ ادارے آپ کے علاقے میں کام کرتے ہیں، لیکن ہم ان کے موجودہ رابطہ نمبروں کی تصدیق کر رہے ہیں، اس لیے ہم ایسا نمبر نہیں دے رہے جس کی ذمہ داری ہم نہ لے سکیں۔ ان کی ویب سائٹ کے ذریعے رجوع کریں، یا 1099 پر کال کر کے رابطہ کروانے کو کہیں۔",
    resourcesWhatsapp: "واٹس ایپ",
    resourcesEmail: "ای میل",
    resourcesWebsite: "ویب سائٹ دیکھیں",
    resourceTypeEmergency: "ایمرجنسی",
    resourceTypePolice: "پولیس",
    resourceTypeGovernment: "سرکاری",
    resourceTypeNgo: "این جی او",
    resourceTypeLegalAid: "قانونی مدد",
    resourceTypeShelter: "پناہ گاہ",
    resourceTypeCyber: "آن لائن / سائبر",
    resourceTypeCounselling: "کاؤنسلنگ",
    resourceTypeChild: "بچے",

    // Lawyer referral
    referralCtaTitle: "کیا آپ چاہتی/چاہتے ہیں کہ کوئی وکیل آپ سے رابطہ کرے؟",
    referralCtaBody:
      "ہم آپ کی صورتحال ہمارے پارٹنر نیٹ ورک کے ایسے وکیل تک پہنچا سکتے ہیں جو ایسے مقدمات دیکھتا ہو۔ یہ مفت ہے، اور وہ آپ سے براہِ راست رابطہ کریں گے۔",
    referralCtaButton: "وکیل سے رابطہ کروائیں",
    referralHeading: "وکیل سے رابطہ کروائیں",
    referralIntro:
      "ہمارے پارٹنر نیٹ ورک کا ایک وکیل آپ کی صورتحال دیکھ کر آپ سے براہِ راست رابطہ کرے گا۔ اس پہلے رابطے کی کوئی فیس نہیں۔",
    referralName: "آپ کا نام",
    referralNamePlaceholder: "وکیل آپ کو کس نام سے پکارے؟",
    referralNameHelp: "صرف پہلا نام کافی ہے۔ اصل نام دینا ضروری نہیں۔",
    referralPhone: "فون نمبر",
    referralPhonePlaceholder: "03XX XXXXXXX",
    referralPhoneHelp: "وکیل اسی نمبر پر آپ سے رابطہ کرے گا۔",
    referralSafeToCall: "کیا اس نمبر پر کال کرنا آپ کے لیے محفوظ ہے؟",
    referralSafeYes: "ہاں، میں کال سن سکتی/سکتا ہوں",
    referralSafeNo: "نہیں — پہلے پیغام بھیجیں، کال نہ کریں",
    referralSafeHelp:
      "اگر کوئی اور آپ کا فون دیکھ سکتا ہے یا آپ کی کالیں سن سکتا ہے تو دوسرا آپشن منتخب کریں۔",
    referralBestTime: "آپ سے رابطے کا محفوظ ترین وقت کون سا ہے؟",
    referralTimeAny: "کوئی بھی وقت",
    referralTimeMorning: "صبح",
    referralTimeAfternoon: "دوپہر",
    referralTimeEvening: "شام",
    referralCity: "آپ کا شہر یا ضلع",
    referralCityPlaceholder: "تاکہ ہم قریبی وکیل سے رابطہ کروا سکیں",
    referralConsent:
      "میں اجازت دیتی/دیتا ہوں کہ حفاظت میری بیان کردہ تفصیلات اپنے پارٹنر نیٹ ورک کے وکیل کو دے تاکہ وہ مجھ سے رابطہ کر سکیں۔",
    referralConsentRequired: "براہِ کرم خانے پر نشان لگائیں تاکہ ہم آپ کا معاملہ آگے بھیج سکیں۔",
    referralSubmit: "وکیل کو بھیجیں",
    referralSubmitting: "بھیجا جا رہا ہے...",
    referralCancel: "ابھی نہیں",
    referralRequiredFields: "براہِ کرم اپنا نام اور فون نمبر لکھیں۔",
    referralInvalidPhone: "یہ پاکستانی فون نمبر نہیں لگتا۔",
    referralError: "ہم اسے بھیج نہیں سکے۔ براہِ کرم تھوڑی دیر بعد دوبارہ کوشش کریں۔",
    referralSuccessTitle: "لیگل ڈیسک کو بھیج دیا گیا",
    referralSuccessBody:
      "ایسے مقدمات دیکھنے والا وکیل آپ سے رابطہ کرے گا۔ اپنا حوالہ نمبر محفوظ رکھیں تاکہ ضرورت پڑنے پر پوچھ سکیں۔",
    referralReference: "آپ کا حوالہ نمبر",
    referralSuccessSafety:
      "اگر ان کے رابطے سے پہلے آپ کی صورتحال بگڑ جائے تو فوراً 15 یا 1099 پر کال کریں۔",
    referralPrivacy:
      "ہم صرف آپ کے جوابات، آپ کا نام اور نمبر بھیجتے ہیں، اس کے علاوہ کچھ نہیں۔ لیگل ڈیسک تک پہنچنے کے بعد ہم اس کی نقل نہیں رکھتے۔",

    // Footer
    footerDescription:
      "حفاظت تشدد کے متاثرین کی مدد کے لیے ایک غیر منافع بخش منصوبہ ہے۔",
    footerCredit: "تخلیق کار",
    footerAuthor: "سنگر خان",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key];
}

export function tStep(locale: Locale, current: number, total: number): string {
  return t(locale, "guidedStepOf")
    .replace("{current}", String(current))
    .replace("{total}", String(total));
}

export function tCount(locale: Locale, key: TranslationKey, count: number): string {
  return t(locale, key).replace("{count}", String(count));
}

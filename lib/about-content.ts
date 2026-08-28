/**
 * Content for the /about page.
 *
 * Kept here rather than in i18n.ts for the same reason the guided flow keeps
 * its own question text: this is long-form prose that changes as a unit, and
 * splitting each paragraph into a translation key makes it harder to keep the
 * English and Urdu saying the same thing.
 *
 * This page is a trust document. Hifazat tells people what the law says about
 * the worst thing that has happened to them, and is about to start routing them
 * to lawyers. Anyone should be able to read here exactly how it reaches its
 * answers, what it cannot do, and what happens to what they type.
 */

import type { Localized } from "./guided-flow";

export type SectionTone = "default" | "note" | "warning";

export interface AboutSection {
  id: string;
  heading: Localized;
  /** Rendered as separate paragraphs. */
  body: Localized[];
  /** Optional bullet list rendered after the paragraphs. */
  bullets?: Localized[];
  tone?: SectionTone;
}

export const ABOUT_INTRO: Localized = {
  en: "Hifazat helps people in Pakistan understand whether what has happened to them is recognised as violence or harassment under Pakistani law, and what they can do about it. It is free, private, and available in English and Urdu.",
  ur: "حفاظت پاکستان میں لوگوں کو یہ سمجھنے میں مدد دیتی ہے کہ ان کے ساتھ جو ہوا وہ پاکستانی قانون کے تحت تشدد یا ہراسانی تسلیم کیا جاتا ہے یا نہیں، اور وہ اس بارے میں کیا کر سکتے ہیں۔ یہ مفت، نجی، اور اردو و انگریزی دونوں میں دستیاب ہے۔",
};

export const ABOUT_SECTIONS: AboutSection[] = [
  {
    id: "not-a-lawyer",
    tone: "warning",
    heading: {
      en: "This is not legal advice",
      ur: "یہ قانونی مشورہ نہیں ہے",
    },
    body: [
      {
        en: "Hifazat is an awareness tool, not a law firm. It can tell you what the law generally says about a situation like yours and what steps are usually available. It cannot tell you how a particular court will decide your case, and nothing here creates a lawyer-client relationship.",
        ur: "حفاظت ایک آگاہی کا ذریعہ ہے، کوئی قانونی فرم نہیں۔ یہ آپ کو بتا سکتی ہے کہ آپ جیسی صورتحال میں قانون عمومی طور پر کیا کہتا ہے اور کون سے اقدامات دستیاب ہوتے ہیں۔ یہ نہیں بتا سکتی کہ کوئی خاص عدالت آپ کے مقدمے کا کیا فیصلہ کرے گی، اور یہاں کچھ بھی وکیل اور مؤکل کا رشتہ قائم نہیں کرتا۔",
      },
      {
        en: "For anything you intend to file, take this to a lawyer. If you do not have one, the helplines and legal aid organisations in our directory can connect you to free representation.",
        ur: "جو کچھ آپ عدالت میں دائر کرنا چاہتی ہیں، اس کے لیے کسی وکیل سے رجوع کریں۔ اگر آپ کے پاس وکیل نہیں تو ہماری فہرست میں موجود ہیلپ لائنیں اور قانونی امداد کے ادارے آپ کو مفت نمائندگی دلوا سکتے ہیں۔",
      },
    ],
  },
  {
    id: "how-it-works",
    heading: {
      en: "How the assessment works",
      ur: "جائزہ کیسے کام کرتا ہے",
    },
    body: [
      {
        en: "You describe your situation, either in your own words or by answering a set of questions. That description is matched against the National Commission on the Status of Women's standardised indicators on violence against women, which is the framework Pakistan's own institutions use to classify these cases.",
        ur: "آپ اپنی صورتحال بیان کرتی ہیں، یا تو اپنے الفاظ میں یا سوالات کے جواب دے کر۔ اس بیان کو قومی کمیشن برائے حیثیتِ نسواں کے خواتین پر تشدد سے متعلق معیاری اشاریوں سے ملایا جاتا ہے، جو وہی فریم ورک ہے جسے پاکستان کے اپنے ادارے ان معاملات کی درجہ بندی کے لیے استعمال کرتے ہیں۔",
      },
      {
        en: "A language model then writes the explanation, the severity assessment and the action steps. It is given only the laws and helplines that apply to you, so it works from a narrowed set rather than from everything it happens to know.",
        ur: "پھر ایک لینگویج ماڈل وضاحت، شدت کا اندازہ اور اقدامات لکھتا ہے۔ اسے صرف وہی قوانین اور ہیلپ لائنیں دی جاتی ہیں جو آپ پر لاگو ہوتی ہیں، اس لیے وہ ایک محدود مجموعے سے کام کرتا ہے، نہ کہ ہر اُس چیز سے جو اسے معلوم ہو۔",
      },
    ],
  },
  {
    id: "scoping",
    heading: {
      en: "Why we ask where you live",
      ur: "ہم کیوں پوچھتے ہیں کہ آپ کہاں رہتی ہیں",
    },
    body: [
      {
        en: "Domestic violence law in Pakistan is provincial, not national. There is no single countrywide domestic violence act: Sindh passed its own in 2013, Balochistan in 2014, Punjab in 2016 and Khyber Pakhtunkhwa in 2021, while the 2012 act often described as federal applies only in Islamabad.",
        ur: "پاکستان میں گھریلو تشدد کا قانون صوبائی ہے، قومی نہیں۔ کوئی ایک ملک گیر قانون نہیں: سندھ نے 2013 میں، بلوچستان نے 2014 میں، پنجاب نے 2016 میں اور خیبر پختونخوا نے 2021 میں اپنا قانون منظور کیا، جبکہ 2012 کا قانون جسے اکثر وفاقی کہا جاتا ہے صرف اسلام آباد میں لاگو ہوتا ہے۔",
      },
      {
        en: "Telling someone in Peshawar to rely on a law that does not operate where she lives is worse than telling her nothing. So before the assessment is written, the system filters the law down to the statutes actually in force in your province, and to the ones that protect someone of your gender. The model is never shown the rest.",
        ur: "پشاور میں کسی خاتون کو ایسے قانون پر بھروسہ کرنے کو کہنا جو وہاں نافذ ہی نہیں، اسے کچھ نہ بتانے سے بدتر ہے۔ اس لیے جائزہ لکھے جانے سے پہلے نظام قوانین کو صرف اُن تک محدود کر دیتا ہے جو آپ کے صوبے میں واقعی نافذ ہیں اور جو آپ کی صنف کے فرد کا تحفظ کرتے ہیں۔ باقی ماڈل کو دکھائے ہی نہیں جاتے۔",
      },
      {
        en: "The same is true of helplines. The Punjab women's helpline does not answer calls from Sindh, so it is not offered there.",
        ur: "یہی بات ہیلپ لائنوں پر بھی لاگو ہوتی ہے۔ پنجاب کی ویمن ہیلپ لائن سندھ سے آنے والی کالیں وصول نہیں کرتی، اس لیے وہاں یہ تجویز نہیں کی جاتی۔",
      },
    ],
  },
  {
    id: "verification",
    heading: {
      en: "How we verify helplines",
      ur: "ہم ہیلپ لائنوں کی تصدیق کیسے کرتے ہیں",
    },
    body: [
      {
        en: "Every organisation in our directory is marked either confirmed or awaiting confirmation. Confirmed means someone has checked that the number reaches the service described. Awaiting confirmation means the organisation is real and worth contacting, but we have not verified the contact details we hold.",
        ur: "ہماری فہرست میں شامل ہر ادارہ یا تو تصدیق شدہ ہے یا تصدیق کا منتظر۔ تصدیق شدہ کا مطلب ہے کہ کسی نے جانچ لیا ہے کہ یہ نمبر بیان کردہ ادارے تک پہنچتا ہے۔ تصدیق کا منتظر کا مطلب ہے کہ ادارہ حقیقی ہے اور اس سے رابطہ کرنا مفید ہو سکتا ہے، لیکن ہم نے اس کی رابطہ تفصیلات کی تصدیق نہیں کی۔",
      },
      {
        en: "Two rules follow from that, and they are enforced in the software rather than left to good intentions:",
        ur: "اس سے دو اصول نکلتے ہیں، اور یہ سافٹ ویئر میں نافذ ہیں، محض نیک نیتی پر نہیں چھوڑے گئے:",
      },
    ],
    bullets: [
      {
        en: "The assessment can only recommend a confirmed number. It is not shown the others at all.",
        ur: "جائزہ صرف تصدیق شدہ نمبر تجویز کر سکتا ہے۔ باقی اسے دکھائے ہی نہیں جاتے۔",
      },
      {
        en: "In the directory, an unconfirmed number is never a tap-to-call link. Those organisations appear separately, with their website instead.",
        ur: "فہرست میں غیر تصدیق شدہ نمبر کبھی بھی کال کرنے کے قابل لنک نہیں ہوتا۔ وہ ادارے الگ سے، اپنی ویب سائٹ کے ساتھ دکھائے جاتے ہیں۔",
      },
    ],
  },
  {
    id: "verification-honesty",
    tone: "note",
    heading: {
      en: "What this means for you today",
      ur: "آج اس کا آپ کے لیے کیا مطلب ہے",
    },
    body: [
      {
        en: "It means some provinces currently show fewer numbers than we would like. Punjab has the deepest coverage. Balochistan, Gilgit-Baltistan and Azad Jammu & Kashmir have little beyond the national helplines while that verification work is done.",
        ur: "اس کا مطلب ہے کہ فی الحال کچھ صوبوں میں ہماری خواہش سے کم نمبر دکھائے جاتے ہیں۔ پنجاب میں سب سے زیادہ سہولیات ہیں۔ بلوچستان، گلگت بلتستان اور آزاد جموں و کشمیر میں قومی ہیلپ لائنوں کے علاوہ فی الحال کم ہی دستیاب ہے جب تک تصدیق کا کام مکمل نہیں ہوتا۔",
      },
      {
        en: "We would rather show you a short list you can rely on than a long one where a number rings out. The national helplines below work everywhere in the country.",
        ur: "ہم آپ کو ایسی مختصر فہرست دینا بہتر سمجھتے ہیں جس پر آپ بھروسہ کر سکیں، بجائے ایسی لمبی فہرست کے جس میں کوئی نمبر بند ہو۔ نیچے دی گئی قومی ہیلپ لائنیں ملک بھر میں کام کرتی ہیں۔",
      },
    ],
  },
  {
    id: "privacy",
    heading: {
      en: "What happens to what you write",
      ur: "آپ جو لکھتی ہیں اس کا کیا ہوتا ہے",
    },
    body: [
      {
        en: "Your account of what happened is not stored. It is sent to be assessed, the answer comes back, and it is not kept against your name or your device. We do not ask you to make an account and we do not ask for your identity.",
        ur: "جو کچھ ہوا اس کا آپ کا بیان محفوظ نہیں کیا جاتا۔ اسے جائزے کے لیے بھیجا جاتا ہے، جواب واپس آتا ہے، اور اسے آپ کے نام یا آپ کے فون کے ساتھ نہیں رکھا جاتا۔ ہم آپ سے اکاؤنٹ بنانے کو نہیں کہتے اور نہ ہی آپ کی شناخت پوچھتے ہیں۔",
      },
      {
        en: "We keep anonymous counts — how many assessments came from each province, which categories came up, how long the answer took. These carry no name, no number and none of your words.",
        ur: "ہم گمنام اعداد و شمار رکھتے ہیں — کس صوبے سے کتنے جائزے آئے، کون سی اقسام سامنے آئیں، جواب میں کتنا وقت لگا۔ ان میں کوئی نام، کوئی نمبر اور آپ کے الفاظ میں سے کچھ بھی شامل نہیں ہوتا۔",
      },
      {
        en: "The one exception is if you choose to ask a lawyer to contact you. Then, and only then, your name, your number and what you described are passed to the legal desk, and only because you ticked the box asking us to.",
        ur: "اس کا واحد استثنا یہ ہے کہ اگر آپ خود کسی وکیل سے رابطے کی درخواست کریں۔ تب، اور صرف تب، آپ کا نام، نمبر اور بیان لیگل ڈیسک کو بھیجا جاتا ہے، اور صرف اس لیے کہ آپ نے خود اجازت کے خانے پر نشان لگایا۔",
      },
    ],
  },
  {
    id: "limitations",
    heading: {
      en: "What it gets wrong",
      ur: "یہ کہاں غلط ہو سکتا ہے",
    },
    body: [
      {
        en: "Being honest about this matters more than looking capable:",
        ur: "اس بارے میں ایمانداری قابلیت دکھانے سے زیادہ اہم ہے:",
      },
    ],
    bullets: [
      {
        en: "It is written by a language model and can be wrong, incomplete, or out of date. Check anything you plan to act on.",
        ur: "یہ ایک لینگویج ماڈل لکھتا ہے اور یہ غلط، نامکمل یا پرانا ہو سکتا ہے۔ جس بات پر عمل کرنا ہو اس کی تصدیق کر لیں۔",
      },
      {
        en: "Laws change. Penalties and procedures described here may have been amended since they were written down.",
        ur: "قوانین بدلتے رہتے ہیں۔ یہاں بیان کردہ سزائیں اور طریقۂ کار لکھے جانے کے بعد تبدیل ہو چکے ہو سکتے ہیں۔",
      },
      {
        en: "It knows the law as written, not how a particular police station or court behaves in practice.",
        ur: "یہ قانون کو اُس طرح جانتا ہے جیسے وہ لکھا گیا ہے، نہ کہ یہ کہ کوئی خاص تھانہ یا عدالت عملاً کیسے پیش آتی ہے۔",
      },
      {
        en: "The NCSW framework it classifies against was written about violence against women. We apply gender-neutral law where it fits, but the coverage for men and transgender people is thinner, and we would rather say so than pretend otherwise.",
        ur: "جس این سی ایس ڈبلیو فریم ورک کے مطابق درجہ بندی کی جاتی ہے وہ خواتین پر تشدد کے بارے میں لکھا گیا تھا۔ جہاں مناسب ہو ہم صنف سے آزاد قوانین لاگو کرتے ہیں، لیکن مردوں اور ٹرانسجینڈر افراد کے لیے یہ کم مکمل ہے، اور ہم اسے چھپانے کے بجائے بتانا بہتر سمجھتے ہیں۔",
      },
      {
        en: "It is not a crisis counsellor and it cannot send anyone to you. In an emergency, call 15.",
        ur: "یہ بحرانی کاؤنسلر نہیں ہے اور کسی کو آپ کے پاس نہیں بھیج سکتا۔ ہنگامی صورتحال میں 15 پر کال کریں۔",
      },
    ],
  },
  {
    id: "sources",
    heading: {
      en: "Where the law comes from",
      ur: "قوانین کہاں سے لیے گئے ہیں",
    },
    body: [
      {
        en: "The classification framework is the NCSW Standardized Indicators on Violence against Women in Pakistan. The legal provisions are drawn from the Pakistan Penal Code, the Prevention of Electronic Crimes Act 2016, the Protection against Harassment of Women at the Workplace Act 2010 as amended in 2022, the Transgender Persons (Protection of Rights) Act 2018, the family law statutes, and each province's own domestic violence legislation.",
        ur: "درجہ بندی کا فریم ورک این سی ایس ڈبلیو کے پاکستان میں خواتین پر تشدد سے متعلق معیاری اشاریے ہیں۔ قانونی دفعات پاکستان پینل کوڈ، پیکا 2016، کام کی جگہ پر ہراسانی کے انسداد کا قانون 2010 (ترمیم شدہ 2022)، ٹرانسجینڈر پرسنز ایکٹ 2018، عائلی قوانین، اور ہر صوبے کے اپنے گھریلو تشدد کے قوانین سے لی گئی ہیں۔",
      },
    ],
  },
];

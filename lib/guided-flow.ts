/**
 * The guided intake flow, expressed as data.
 *
 * What changed and why
 * --------------------
 * The previous flow stored the *displayed* answer text and branched by matching
 * it against string literals in both English and Urdu:
 *
 *     const SPOUSE_VALUES_UR = ["شوہر یا پارٹنر", "سابق پارٹنر"];
 *
 * That coupling is the source of most of the questionnaire's bugs. Editing a
 * label silently breaks a branch; a third language would need a third literal
 * list; and because "Ex-partner" sat in the spouse bucket, the flow went on to
 * offer khula to people who were no longer married.
 *
 * Here, answers are stable IDs. Labels are looked up for display only, and the
 * English narrative sent to the model is composed from the IDs, so it reads the
 * same whichever language the person used.
 *
 * Steps are predicates over the answer state rather than a fixed list, so the
 * flow can grow and shrink as answers change. `stepIndexById` and
 * `nextStepIndex` let the page track position by step ID rather than by array
 * index, which is what previously broke when someone went back and changed an
 * answer that added or removed a later question.
 */

import {
  PROVINCES,
  PROVINCE_IDS,
  type CaseCategory,
  type Gender,
  type ProvinceId,
} from "./provinces";
import type { Locale } from "./i18n";

export interface Localized {
  en: string;
  ur: string;
}

export function localized(value: Localized, locale: Locale): string {
  return locale === "ur" ? value.ur : value.en;
}

export interface FlowOption {
  id: string;
  label: Localized;
  /**
   * First-person English fragment used to compose the narrative for the model.
   * Falls back to the English label when omitted.
   */
  narrative?: string;
  /** Signals a life-threatening answer that should short-circuit the flow. */
  urgent?: boolean;
}

export type StepKind = "single" | "multi" | "text" | "review";

export interface FlowStep {
  id: string;
  question: Localized;
  help?: Localized;
  kind: StepKind;
  /** Static options, or a function of the answers so far. */
  options?: FlowOption[] | ((answers: Answers) => FlowOption[]);
  /** Shown only when this predicate passes. */
  visibleWhen?: (answers: Answers) => boolean;
  /** Optional steps render a Skip control. */
  optional?: boolean;
}

/** Answer state: step ID to the option IDs selected for it. */
export type Answers = Record<string, string[]>;

// ---------------------------------------------------------------------------
// Answer helpers
// ---------------------------------------------------------------------------

export function has(answers: Answers, stepId: string, ...optionIds: string[]): boolean {
  const selected = answers[stepId];
  if (!selected?.length) return false;
  return optionIds.some((id) => selected.includes(id));
}

export function first(answers: Answers, stepId: string): string | undefined {
  return answers[stepId]?.[0];
}

// Relationship groupings, defined once and reused by every predicate below.
const SPOUSAL = ["rel_spouse", "rel_ex_spouse", "rel_partner", "rel_ex_partner"];
const FAMILY = ["rel_parent", "rel_sibling", "rel_in_law", "rel_other_relative"];
const WORKPLACE = ["rel_employer", "rel_teacher"];
const ONLINE_ONLY = ["rel_online_unknown"];

const isSpousal = (a: Answers) => has(a, "who", ...SPOUSAL);
const isFamily = (a: Answers) => has(a, "who", ...FAMILY);
const isDomestic = (a: Answers) => isSpousal(a) || isFamily(a);
const isWorkplace = (a: Answers) =>
  has(a, "who", ...WORKPLACE) || has(a, "where", "where_work", "where_education");
const isOnline = (a: Answers) =>
  has(a, "who", ...ONLINE_ONLY) || has(a, "where", "where_online");

/**
 * True while the marriage subsists in law — which is what determines whether
 * khula is available. "Separated" and "nikah done, rukhsati pending" both still
 * count as married; "divorced" does not. This is the distinction the old flow
 * missed when it offered khula to people whose answer was "Ex-partner".
 */
const isStillMarried = (a: Answers) =>
  has(a, "maritalStatus", "marital_married", "marital_separated", "marital_nikah_only");

const hasChildren = (a: Answers) => has(a, "children", "children_yes");

// ---------------------------------------------------------------------------
// Option catalogues
// ---------------------------------------------------------------------------

const SAFETY_OPTIONS: FlowOption[] = [
  {
    id: "safety_danger_now",
    label: {
      en: "I am in danger right now",
      ur: "میں اس وقت خطرے میں ہوں",
    },
    narrative: "I am in immediate danger right now",
    urgent: true,
  },
  {
    id: "safety_afraid",
    label: {
      en: "Not this minute, but I am afraid",
      ur: "ابھی نہیں، لیکن مجھے ڈر لگتا ہے",
    },
    narrative: "I am not in immediate danger this minute, but I am afraid for my safety",
  },
  {
    id: "safety_safe",
    label: { en: "I am safe right now", ur: "میں اس وقت محفوظ ہوں" },
    narrative: "I am safe at this moment",
  },
];

const GENDER_OPTIONS: FlowOption[] = [
  { id: "gender_woman", label: { en: "Woman", ur: "خاتون" }, narrative: "I am a woman" },
  { id: "gender_man", label: { en: "Man", ur: "مرد" }, narrative: "I am a man" },
  {
    id: "gender_transgender",
    label: { en: "Transgender or non-binary", ur: "ٹرانسجینڈر یا نان بائنری" },
    narrative: "I am a transgender person",
  },
  {
    id: "gender_undisclosed",
    label: { en: "I would rather not say", ur: "میں بتانا نہیں چاہتا/چاہتی" },
    narrative: "I would rather not state my gender",
  },
];

const PROVINCE_OPTIONS: FlowOption[] = [
  ...PROVINCE_IDS.map((id) => ({
    id: `province_${id}`,
    label: { en: PROVINCES[id].en, ur: PROVINCES[id].ur },
    narrative: `I am in ${PROVINCES[id].en}`,
  })),
  {
    id: "province_undisclosed",
    label: { en: "I would rather not say", ur: "میں بتانا نہیں چاہتا/چاہتی" },
    narrative: "I would rather not say which province I am in",
  },
];

const WHERE_OPTIONS: FlowOption[] = [
  { id: "where_home", label: { en: "At home", ur: "گھر میں" }, narrative: "This happened at home" },
  {
    id: "where_work",
    label: { en: "At work", ur: "کام کی جگہ پر" },
    narrative: "This happened at my workplace",
  },
  {
    id: "where_education",
    label: { en: "At school, college or university", ur: "اسکول، کالج یا یونیورسٹی میں" },
    narrative: "This happened at my educational institution",
  },
  {
    id: "where_online",
    label: { en: "Online or on my phone", ur: "آن لائن یا میرے فون پر" },
    narrative: "This happened online or through my phone",
  },
  {
    id: "where_public",
    label: { en: "In a public place", ur: "عوامی جگہ پر" },
    narrative: "This happened in a public place",
  },
  {
    id: "where_institution",
    label: {
      en: "At a hospital, police station or government office",
      ur: "ہسپتال، تھانے یا سرکاری دفتر میں",
    },
    narrative:
      "This happened at a hospital, police station or government office, at the hands of someone acting in an official capacity",
  },
  { id: "where_other", label: { en: "Somewhere else", ur: "کسی اور جگہ" } },
];

const WHO_OPTIONS: FlowOption[] = [
  {
    id: "rel_spouse",
    label: { en: "My husband or wife", ur: "میرے شوہر یا بیوی" },
    narrative: "The person who did this is my spouse",
  },
  {
    id: "rel_ex_spouse",
    label: { en: "My ex-husband or ex-wife", ur: "میرے سابق شوہر یا سابق بیوی" },
    narrative: "The person who did this is my former spouse",
  },
  {
    id: "rel_partner",
    label: { en: "My fiancé(e) or partner", ur: "میرے منگیتر یا پارٹنر" },
    narrative: "The person who did this is my fiancé or partner, and we are not married",
  },
  {
    id: "rel_ex_partner",
    label: { en: "My ex-fiancé(e) or ex-partner", ur: "میرے سابق منگیتر یا سابق پارٹنر" },
    narrative: "The person who did this is my former fiancé or partner, and we were never married",
  },
  {
    id: "rel_parent",
    label: { en: "My parent or guardian", ur: "میرے والدین یا سرپرست" },
    narrative: "The person who did this is my parent or guardian",
  },
  {
    id: "rel_sibling",
    label: { en: "My brother or sister", ur: "میرا بھائی یا بہن" },
    narrative: "The person who did this is my sibling",
  },
  {
    id: "rel_in_law",
    label: { en: "My in-laws", ur: "میرے سسرال والے" },
    narrative: "The person who did this is a member of my in-laws",
  },
  {
    id: "rel_other_relative",
    label: { en: "Another relative", ur: "کوئی اور رشتہ دار" },
    narrative: "The person who did this is another relative of mine",
  },
  {
    id: "rel_employer",
    label: { en: "My employer, manager or colleague", ur: "میرا مالک، منیجر یا ساتھی" },
    narrative: "The person who did this is my employer, manager or colleague",
  },
  {
    id: "rel_teacher",
    label: { en: "A teacher or classmate", ur: "استاد یا ہم جماعت" },
    narrative: "The person who did this is a teacher or classmate at my institution",
  },
  {
    id: "rel_neighbour",
    label: { en: "A neighbour or landlord", ur: "پڑوسی یا مالک مکان" },
    narrative: "The person who did this is my neighbour or landlord",
  },
  {
    id: "rel_official",
    label: { en: "A police officer or official", ur: "پولیس اہلکار یا سرکاری افسر" },
    narrative:
      "The person who did this is a police officer or government official acting in that capacity",
  },
  {
    id: "rel_acquaintance",
    label: { en: "Someone I know", ur: "کوئی جاننے والا" },
    narrative: "The person who did this is someone I know",
  },
  {
    id: "rel_stranger",
    label: { en: "A stranger", ur: "کوئی اجنبی" },
    narrative: "The person who did this is a stranger",
  },
  {
    id: "rel_online_unknown",
    label: { en: "Someone online I have never met", ur: "آن لائن کوئی جسے میں نے کبھی نہیں دیکھا" },
    narrative: "The person who did this is someone online whom I have never met in person",
  },
];

const MARITAL_OPTIONS: FlowOption[] = [
  {
    id: "marital_married",
    label: { en: "We are still married", ur: "ہماری شادی اب بھی قائم ہے" },
    narrative: "We are still legally married and living together",
  },
  {
    id: "marital_separated",
    label: { en: "Married but living apart", ur: "شادی شدہ لیکن الگ رہ رہے ہیں" },
    narrative: "We are still legally married but living apart",
  },
  {
    id: "marital_nikah_only",
    label: { en: "Nikah done, rukhsati not yet", ur: "نکاح ہو چکا، رخصتی نہیں ہوئی" },
    narrative: "Our nikah has taken place but rukhsati has not, so we are legally married",
  },
  {
    id: "marital_divorced",
    label: { en: "We are divorced", ur: "ہماری طلاق ہو چکی ہے" },
    narrative: "We are divorced and the marriage is legally over",
  },
  {
    id: "marital_never_married",
    label: { en: "We were never married", ur: "ہماری کبھی شادی نہیں ہوئی" },
    narrative: "We were never married to each other",
  },
];

const CHILDREN_OPTIONS: FlowOption[] = [
  { id: "children_yes", label: { en: "Yes", ur: "ہاں" } },
  { id: "children_no", label: { en: "No", ur: "نہیں" } },
];

const CHILD_AGE_OPTIONS: FlowOption[] = [
  {
    id: "kids_under2",
    label: { en: "Under 2 years", ur: "2 سال سے کم" },
    narrative: "a child under two",
  },
  { id: "kids_2_6", label: { en: "2 to 6 years", ur: "2 سے 6 سال" }, narrative: "a child aged two to six" },
  {
    id: "kids_7_12",
    label: { en: "7 to 12 years", ur: "7 سے 12 سال" },
    narrative: "a child aged seven to twelve",
  },
  {
    id: "kids_13_17",
    label: { en: "13 to 17 years", ur: "13 سے 17 سال" },
    narrative: "a teenage child",
  },
  { id: "kids_adult", label: { en: "18 or older", ur: "18 یا زیادہ" }, narrative: "an adult child" },
];

const RECENCY_OPTIONS: FlowOption[] = [
  {
    id: "when_now",
    label: { en: "It is happening right now", ur: "یہ ابھی ہو رہا ہے" },
    narrative: "This is happening right now",
    urgent: true,
  },
  {
    id: "when_today",
    label: { en: "Today", ur: "آج" },
    narrative: "This happened today, within the last 24 hours",
  },
  {
    id: "when_week",
    label: { en: "Within the past week", ur: "گزشتہ ہفتے کے دوران" },
    narrative: "This happened within the past week",
  },
  {
    id: "when_month",
    label: { en: "Within the past month", ur: "گزشتہ مہینے کے دوران" },
    narrative: "This happened within the past month",
  },
  {
    id: "when_older",
    label: { en: "More than a month ago", ur: "ایک مہینے سے زیادہ پہلے" },
    narrative: "This happened more than a month ago",
  },
  {
    id: "when_years",
    label: { en: "It has gone on for years", ur: "یہ برسوں سے چل رہا ہے" },
    narrative: "This has been going on for years",
  },
];

const FREQUENCY_OPTIONS: FlowOption[] = [
  {
    id: "freq_once",
    label: { en: "It happened once", ur: "ایک بار ہوا" },
    narrative: "It happened once",
  },
  {
    id: "freq_sometimes",
    label: { en: "A few times", ur: "چند بار" },
    narrative: "It has happened a few times",
  },
  {
    id: "freq_regular",
    label: { en: "Regularly", ur: "باقاعدگی سے" },
    narrative: "It happens regularly",
  },
  {
    id: "freq_escalating",
    label: { en: "It is getting worse", ur: "یہ بگڑتا جا رہا ہے" },
    narrative: "It is happening repeatedly and getting worse over time",
  },
];

const EVIDENCE_OPTIONS: FlowOption[] = [
  {
    id: "ev_medical",
    label: { en: "A medical or hospital report", ur: "طبی یا ہسپتال کی رپورٹ" },
    narrative: "a medical or hospital report",
  },
  {
    id: "ev_photos",
    label: { en: "Photographs of injuries", ur: "زخموں کی تصاویر" },
    narrative: "photographs of my injuries",
  },
  {
    id: "ev_screenshots",
    label: { en: "Screenshots, messages or call records", ur: "اسکرین شاٹس، پیغامات یا کال ریکارڈ" },
    narrative: "screenshots, messages or call records",
  },
  {
    id: "ev_recordings",
    label: { en: "Audio or video recordings", ur: "آڈیو یا ویڈیو ریکارڈنگ" },
    narrative: "audio or video recordings",
  },
  {
    id: "ev_witnesses",
    label: { en: "People who saw or heard it", ur: "ایسے لوگ جنہوں نے دیکھا یا سنا" },
    narrative: "witnesses who saw or heard what happened",
  },
  {
    id: "ev_nikahnama",
    label: { en: "My nikah nama", ur: "میرا نکاح نامہ" },
    narrative: "my nikah nama",
  },
  {
    id: "ev_cnic",
    label: { en: "My CNIC and other documents", ur: "میرا شناختی کارڈ اور دیگر کاغذات" },
    narrative: "my CNIC and identity documents",
  },
  {
    id: "ev_none",
    label: { en: "Nothing yet", ur: "ابھی کچھ نہیں" },
    narrative: "no evidence collected yet",
  },
];

const REPORTED_OPTIONS: FlowOption[] = [
  {
    id: "rep_nobody",
    label: { en: "I have not told anyone", ur: "میں نے کسی کو نہیں بتایا" },
    narrative: "I have not told anyone about this yet",
  },
  {
    id: "rep_family",
    label: { en: "Only family or friends", ur: "صرف خاندان یا دوستوں کو" },
    narrative: "I have told family or friends, but no authority",
  },
  {
    id: "rep_police_refused",
    label: { en: "I went to the police but no FIR was registered", ur: "میں پولیس کے پاس گئی لیکن ایف آئی آر درج نہیں ہوئی" },
    narrative:
      "I went to the police but they did not register an FIR",
  },
  {
    id: "rep_fir",
    label: { en: "An FIR has been registered", ur: "ایف آئی آر درج ہو چکی ہے" },
    narrative: "An FIR has already been registered",
  },
  {
    id: "rep_court",
    label: { en: "There is already a case in court", ur: "عدالت میں پہلے سے مقدمہ ہے" },
    narrative: "There is already a case pending in court",
  },
  {
    id: "rep_employer",
    label: { en: "I complained to my employer or institution", ur: "میں نے اپنے ادارے میں شکایت کی" },
    narrative: "I have complained internally to my employer or institution",
  },
  {
    id: "rep_helpline",
    label: { en: "I called a helpline", ur: "میں نے ہیلپ لائن پر کال کی" },
    narrative: "I have called a helpline before",
  },
];

/**
 * Acts are drawn from a shared base plus context-specific additions, so the
 * list stays readable. Someone reporting workplace harassment should not have
 * to scroll past dowry demands to find quid pro quo.
 */
function whatHappenedOptions(answers: Answers): FlowOption[] {
  const base: FlowOption[] = [
    {
      id: "act_hit",
      label: { en: "Hit, slapped, kicked or beaten", ur: "مارا، تھپڑ مارا، لات ماری یا پیٹا" },
      narrative: "I was hit, slapped, kicked or beaten",
    },
    {
      id: "act_weapon",
      label: { en: "Attacked with a weapon or object", ur: "ہتھیار یا کسی چیز سے حملہ کیا گیا" },
      narrative: "I was attacked with a weapon or an object",
      urgent: true,
    },
    {
      id: "act_acid_burn",
      label: { en: "Burned, or attacked with acid", ur: "جلایا گیا، یا تیزاب پھینکا گیا" },
      narrative: "I was burned or attacked with acid",
      urgent: true,
    },
    {
      id: "act_strangled",
      label: { en: "Choked or strangled", ur: "گلا دبایا گیا" },
      narrative: "I was choked or strangled",
      urgent: true,
    },
    {
      id: "act_threat_harm",
      label: { en: "Threatened with harm", ur: "نقصان پہنچانے کی دھمکی دی گئی" },
      narrative: "I was threatened with harm",
    },
    {
      id: "act_threat_kill",
      label: { en: "Threatened with death, or in the name of honour", ur: "قتل کی، یا غیرت کے نام پر دھمکی دی گئی" },
      narrative:
        "I was threatened with death, including threats made in the name of honour",
      urgent: true,
    },
    {
      id: "act_verbal",
      label: { en: "Insulted, humiliated or degraded", ur: "بے عزتی، تذلیل یا توہین کی گئی" },
      narrative: "I was insulted, humiliated and degraded",
    },
    {
      id: "act_control",
      label: {
        en: "Controlled where I go or who I speak to",
        ur: "میرے آنے جانے یا بات کرنے پر پابندی لگائی گئی",
      },
      narrative: "My movement and contact with others was controlled",
    },
    {
      id: "act_confined",
      label: { en: "Locked in, or stopped from leaving", ur: "بند رکھا گیا یا جانے سے روکا گیا" },
      narrative: "I was locked in or prevented from leaving",
    },
    {
      id: "act_touch",
      label: { en: "Touched without my consent", ur: "میری مرضی کے بغیر چھوا گیا" },
      narrative: "I was touched without my consent",
    },
    {
      id: "act_forced_sex",
      label: { en: "Forced into sex or a sexual act", ur: "جنسی عمل پر مجبور کیا گیا" },
      narrative: "I was forced into a sexual act without my consent",
      urgent: true,
    },
    {
      id: "act_stalked",
      label: { en: "Followed or stalked", ur: "پیچھا کیا گیا" },
      narrative: "I was followed or stalked",
    },
    {
      id: "act_money",
      label: {
        en: "Took my money, or stopped me from working",
        ur: "میرے پیسے لے لیے، یا کام سے روکا",
      },
      narrative: "My money was taken from me, or I was prevented from working",
    },
    {
      id: "act_images",
      label: {
        en: "Shared or threatened to share my private photos",
        ur: "میری نجی تصاویر پھیلائیں یا پھیلانے کی دھمکی دی",
      },
      narrative:
        "My private photographs or messages were shared, or there were threats to share them",
    },
    {
      id: "act_other",
      label: { en: "Something else", ur: "کوئی اور بات" },
    },
  ];

  const contextual: FlowOption[] = [];

  if (isDomestic(answers)) {
    contextual.push(
      {
        id: "act_dowry",
        label: {
          en: "Demanded dowry, or harassed me over it",
          ur: "جہیز کا مطالبہ کیا، یا اس پر تنگ کیا",
        },
        narrative: "I was harassed over dowry demands",
      },
      {
        id: "act_thrown_out",
        label: { en: "Threw me out of the house", ur: "مجھے گھر سے نکال دیا" },
        narrative: "I was thrown out of the house",
      },
      {
        id: "act_children_used",
        label: {
          en: "Used the children against me, or kept them from me",
          ur: "بچوں کو میرے خلاف استعمال کیا، یا مجھ سے دور رکھا",
        },
        narrative: "The children were used against me or kept away from me",
      },
      {
        id: "act_denied_medical",
        label: { en: "Denied me medical care", ur: "مجھے علاج سے روکا" },
        narrative: "I was denied medical care",
      },
      {
        id: "act_second_marriage",
        label: {
          en: "Married again without my consent",
          ur: "میری اجازت کے بغیر دوسری شادی کی",
        },
        narrative:
          "My husband contracted another marriage without my consent or the Arbitration Council's permission",
      },
    );
  }

  if (isSpousal(answers) || isFamily(answers)) {
    contextual.push(
      {
        id: "act_forced_marriage",
        label: { en: "Forced me into a marriage", ur: "زبردستی شادی کرائی" },
        narrative: "I was forced into a marriage against my will",
      },
      {
        id: "act_inheritance",
        label: {
          en: "Denied me my inheritance or property",
          ur: "مجھے وراثت یا جائیداد سے محروم کیا",
        },
        narrative: "I was deprived of my inheritance or property",
      },
      {
        id: "act_swara",
        label: {
          en: "Gave me away to settle a dispute (vani or swara)",
          ur: "تنازع طے کرنے کے لیے مجھے دے دیا (ونی یا سوارہ)",
        },
        narrative:
          "I was given away in marriage to settle a dispute, in the custom of vani or swara",
        urgent: true,
      },
    );
  }

  if (isWorkplace(answers)) {
    contextual.push(
      {
        id: "act_quid_pro_quo",
        label: {
          en: "Demanded sexual favours for a job, grade or promotion",
          ur: "نوکری، نمبر یا ترقی کے بدلے جنسی مطالبہ کیا",
        },
        narrative:
          "Sexual favours were demanded in exchange for a job benefit, grade or promotion",
      },
      {
        id: "act_hostile_env",
        label: {
          en: "Made the workplace hostile with sexual remarks",
          ur: "جنسی جملوں سے ماحول ناقابلِ برداشت بنایا",
        },
        narrative:
          "Sexual remarks and conduct made my working environment hostile",
      },
      {
        id: "act_retaliation",
        label: {
          en: "Punished me for refusing or complaining",
          ur: "انکار یا شکایت پر مجھے سزا دی",
        },
        narrative:
          "I was punished, demoted or dismissed for refusing advances or for complaining",
      },
    );
  }

  if (isOnline(answers) || has(answers, "where", "where_online")) {
    contextual.push(
      {
        id: "act_blackmail",
        label: { en: "Blackmailed me with private material", ur: "نجی مواد سے بلیک میل کیا" },
        narrative: "I am being blackmailed with private material",
      },
      {
        id: "act_fake_account",
        label: {
          en: "Made a fake account, or edited my photos",
          ur: "جعلی اکاؤنٹ بنایا، یا میری تصاویر تبدیل کیں",
        },
        narrative:
          "A fake account was created in my name, or my photographs were edited or faked",
      },
      {
        id: "act_doxxing",
        label: {
          en: "Published my number, address or private details",
          ur: "میرا نمبر، پتہ یا نجی تفصیلات شائع کیں",
        },
        narrative: "My phone number, address or private details were published online",
      },
      {
        id: "act_online_threats",
        label: { en: "Sent me threatening or obscene messages", ur: "دھمکی آمیز یا فحش پیغامات بھیجے" },
        narrative: "I received threatening or obscene messages",
      },
    );
  }

  // "Something else" stays last however many contextual options were added.
  const other = base.pop()!;
  return [...base, ...contextual, other];
}

/**
 * Goals, computed from the relationship and marital status. This is the fix for
 * the flow's most visible error: khula was previously offered to anyone in the
 * spouse branch, including people who selected "Ex-partner".
 */
function intentOptions(answers: Answers): FlowOption[] {
  const opts: FlowOption[] = [];

  const stopIt: FlowOption = {
    id: "intent_stop",
    label: { en: "I want it to stop", ur: "میں چاہتی/چاہتا ہوں کہ یہ بند ہو" },
    narrative: "I want the abuse to stop",
  };
  const protection: FlowOption = {
    id: "intent_protection",
    label: { en: "I want legal protection from this person", ur: "مجھے اس شخص سے قانونی تحفظ چاہیے" },
    narrative: "I want a protection order against this person",
  };
  const criminal: FlowOption = {
    id: "intent_criminal",
    label: { en: "I want them charged with a crime", ur: "میں چاہتی/چاہتا ہوں ان پر مقدمہ بنے" },
    narrative: "I want criminal charges brought against them",
  };
  const understand: FlowOption = {
    id: "intent_understand",
    label: {
      en: "I am not ready to act — I just want to understand my rights",
      ur: "میں ابھی قدم اٹھانے کو تیار نہیں — بس اپنے حقوق سمجھنا چاہتی/چاہتا ہوں",
    },
    narrative:
      "I am not ready to take formal action yet. I want to understand my rights and my options first",
  };

  if (isSpousal(answers)) {
    opts.push(stopIt, protection);

    if (isStillMarried(answers)) {
      opts.push(
        {
          id: "intent_khula",
          label: { en: "I want a khula or divorce", ur: "میں خلع یا طلاق چاہتی ہوں" },
          narrative: "I want to dissolve the marriage through khula",
        },
        {
          id: "intent_maintenance",
          label: { en: "I want maintenance (nafaqa)", ur: "مجھے نان نفقہ چاہیے" },
          narrative: "I want to claim maintenance",
        },
      );
    } else {
      opts.push({
        id: "intent_stop_contact",
        label: { en: "I want them to stop contacting me", ur: "میں چاہتی/چاہتا ہوں وہ رابطہ بند کریں" },
        narrative: "I want this person to stop contacting me",
      });
    }

    if (hasChildren(answers)) {
      if (isStillMarried(answers)) {
        opts.push(
          {
            id: "intent_leave_with_kids",
            label: { en: "I want to leave, with my children", ur: "میں اپنے بچوں کے ساتھ جانا چاہتی ہوں" },
            narrative: "I want to leave the household and take my children with me",
          },
          {
            id: "intent_leave_without_kids",
            label: {
              en: "I want to leave, without my children for now",
              ur: "میں فی الحال بچوں کے بغیر جانا چاہتی ہوں",
            },
            narrative:
              "I want to leave the household, without my children for the time being",
          },
        );
      }
      opts.push(
        {
          id: "intent_custody",
          label: { en: "I want custody of my children", ur: "مجھے اپنے بچوں کی تحویل چاہیے" },
          narrative: "I want custody of my children",
        },
        {
          id: "intent_child_maintenance",
          label: { en: "I want maintenance for my children", ur: "مجھے بچوں کا خرچ چاہیے" },
          narrative: "I want maintenance for my children",
        },
      );
    }

    opts.push({
      id: "intent_dowry_recovery",
      label: { en: "I want my dowry articles back", ur: "مجھے اپنا جہیز واپس چاہیے" },
      narrative: "I want to recover my dowry articles",
    });

    if (isStillMarried(answers)) {
      opts.push({
        id: "intent_stay_safely",
        label: {
          en: "I want to stay in the marriage but be safe",
          ur: "میں شادی میں رہنا چاہتی ہوں لیکن محفوظ رہنا چاہتی ہوں",
        },
        narrative:
          "I want to remain in the marriage but be protected from further violence",
      });
    }

    opts.push(criminal, understand);
    return opts;
  }

  if (isFamily(answers)) {
    return [
      stopIt,
      protection,
      {
        id: "intent_leave_home",
        label: { en: "I want to leave home safely", ur: "میں محفوظ طریقے سے گھر چھوڑنا چاہتی/چاہتا ہوں" },
        narrative: "I want to leave the household safely",
      },
      {
        id: "intent_stop_forced_marriage",
        label: { en: "I want to stop a marriage being forced on me", ur: "میں زبردستی شادی رکوانا چاہتی/چاہتا ہوں" },
        narrative: "I want to prevent a marriage being forced on me",
      },
      {
        id: "intent_inheritance",
        label: { en: "I want my share of inheritance or property", ur: "مجھے وراثت یا جائیداد میں اپنا حصہ چاہیے" },
        narrative: "I want to claim my share of inheritance or property",
      },
      criminal,
      understand,
    ];
  }

  if (isWorkplace(answers)) {
    return [
      stopIt,
      {
        id: "intent_internal_complaint",
        label: {
          en: "I want to complain inside my organisation",
          ur: "میں اپنے ادارے میں شکایت کرنا چاہتی/چاہتا ہوں",
        },
        narrative:
          "I want to make a formal complaint to my organisation's inquiry committee",
      },
      {
        id: "intent_ombudsperson",
        label: { en: "I want to complain to the Ombudsperson", ur: "میں محتسب کو شکایت کرنا چاہتی/چاہتا ہوں" },
        narrative: "I want to take my complaint to the Ombudsperson",
      },
      {
        id: "intent_keep_job",
        label: { en: "I want to keep my job or place", ur: "میں اپنی نوکری یا جگہ برقرار رکھنا چاہتی/چاہتا ہوں" },
        narrative:
          "I want to keep my job or my place at the institution while this is resolved",
      },
      criminal,
      understand,
    ];
  }

  if (isOnline(answers)) {
    return [
      {
        id: "intent_remove_content",
        label: { en: "I want the content taken down", ur: "میں چاہتی/چاہتا ہوں یہ مواد ہٹا دیا جائے" },
        narrative: "I want the content removed from the internet",
      },
      {
        id: "intent_stop_contact",
        label: { en: "I want them to stop contacting me", ur: "میں چاہتی/چاہتا ہوں وہ رابطہ بند کریں" },
        narrative: "I want this person to stop contacting me",
      },
      {
        id: "intent_identify",
        label: { en: "I want to find out who is doing this", ur: "میں جاننا چاہتی/چاہتا ہوں یہ کون کر رہا ہے" },
        narrative: "I want the person behind the account identified",
      },
      criminal,
      understand,
    ];
  }

  return [
    stopIt,
    protection,
    {
      id: "intent_stop_contact",
      label: { en: "I want them to stop contacting me", ur: "میں چاہتی/چاہتا ہوں وہ رابطہ بند کریں" },
      narrative: "I want this person to stop contacting me",
    },
    criminal,
    understand,
  ];
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

export const FLOW_STEPS: FlowStep[] = [
  {
    id: "safety",
    kind: "single",
    question: { en: "Are you safe right now?", ur: "کیا آپ اس وقت محفوظ ہیں؟" },
    help: {
      en: "We ask this first so we can get you emergency help straight away if you need it.",
      ur: "ہم یہ سب سے پہلے پوچھتے ہیں تاکہ ضرورت ہو تو فوری مدد فراہم کر سکیں۔",
    },
    options: SAFETY_OPTIONS,
  },
  {
    id: "gender",
    kind: "single",
    question: { en: "What is your gender?", ur: "آپ کی صنف کیا ہے؟" },
    help: {
      en: "Some Pakistani laws protect specific groups, so this changes which ones apply to you.",
      ur: "پاکستان کے کچھ قوانین مخصوص گروہوں کا تحفظ کرتے ہیں، اس لیے اس سے یہ بدلتا ہے کہ کون سے قوانین آپ پر لاگو ہوں گے۔",
    },
    options: GENDER_OPTIONS,
  },
  {
    id: "province",
    kind: "single",
    question: {
      en: "Which province or territory are you in?",
      ur: "آپ کس صوبے یا علاقے میں ہیں؟",
    },
    help: {
      en: "Domestic violence law is provincial, not national. Each province has its own act and its own helplines.",
      ur: "گھریلو تشدد کا قانون صوبائی ہے، قومی نہیں۔ ہر صوبے کا اپنا قانون اور اپنی ہیلپ لائنیں ہیں۔",
    },
    options: PROVINCE_OPTIONS,
  },
  {
    id: "where",
    kind: "single",
    question: { en: "Where did this happen?", ur: "یہ کہاں ہوا؟" },
    options: WHERE_OPTIONS,
  },
  {
    id: "who",
    kind: "single",
    question: { en: "Who did this?", ur: "یہ کس نے کیا؟" },
    options: WHO_OPTIONS,
  },
  {
    id: "maritalStatus",
    kind: "single",
    question: {
      en: "What is your marriage status with this person?",
      ur: "اس شخص کے ساتھ آپ کی ازدواجی حیثیت کیا ہے؟",
    },
    help: {
      en: "This decides which family law remedies are open to you. Khula, for instance, is only available while the marriage still stands.",
      ur: "اس سے طے ہوتا ہے کہ عائلی قانون کے کون سے راستے آپ کے لیے کھلے ہیں۔ مثلاً خلع صرف اسی وقت ممکن ہے جب نکاح قائم ہو۔",
    },
    visibleWhen: isSpousal,
    options: MARITAL_OPTIONS,
  },
  {
    id: "children",
    kind: "single",
    question: {
      en: "Are there children in this situation?",
      ur: "کیا اس صورتحال میں بچے شامل ہیں؟",
    },
    visibleWhen: isDomestic,
    options: CHILDREN_OPTIONS,
  },
  {
    id: "intent",
    kind: "multi",
    question: { en: "What would you like to happen?", ur: "آپ کیا چاہتی/چاہتے ہیں؟" },
    help: {
      en: "Choose as many as apply. There is no wrong answer, and choosing something here does not commit you to it.",
      ur: "جتنے بھی لاگو ہوں منتخب کریں۔ کوئی جواب غلط نہیں، اور یہاں کچھ منتخب کرنے کا مطلب یہ نہیں کہ آپ اس کی پابند ہیں۔",
    },
    options: intentOptions,
  },
  {
    id: "childAges",
    kind: "multi",
    question: { en: "How old are the children?", ur: "بچوں کی عمریں کیا ہیں؟" },
    help: {
      en: "Custody rules in Pakistan turn on the child's age, so this materially changes the advice.",
      ur: "پاکستان میں تحویل کے قواعد بچے کی عمر پر منحصر ہیں، اس لیے اس سے مشورہ نمایاں طور پر بدلتا ہے۔",
    },
    visibleWhen: (a) =>
      hasChildren(a) &&
      has(
        a,
        "intent",
        "intent_custody",
        "intent_leave_with_kids",
        "intent_leave_without_kids",
        "intent_child_maintenance",
      ),
    options: CHILD_AGE_OPTIONS,
  },
  {
    id: "whatHappened",
    kind: "multi",
    question: { en: "What happened?", ur: "کیا ہوا؟" },
    help: {
      en: "Choose everything that applies. Most situations involve more than one thing.",
      ur: "جو کچھ بھی لاگو ہو سب منتخب کریں۔ زیادہ تر معاملات میں ایک سے زیادہ باتیں ہوتی ہیں۔",
    },
    options: whatHappenedOptions,
  },
  {
    id: "recency",
    kind: "single",
    question: { en: "When did this happen?", ur: "یہ کب ہوا؟" },
    help: {
      en: "Timing matters. A medico-legal report carries most weight within 24 hours of an injury.",
      ur: "وقت اہم ہے۔ میڈیکو لیگل رپورٹ زخم کے 24 گھنٹوں کے اندر سب سے زیادہ وزن رکھتی ہے۔",
    },
    options: RECENCY_OPTIONS,
  },
  {
    id: "frequency",
    kind: "single",
    optional: true,
    question: { en: "How often does this happen?", ur: "یہ کتنی بار ہوتا ہے؟" },
    options: FREQUENCY_OPTIONS,
  },
  {
    id: "evidence",
    kind: "multi",
    optional: true,
    question: {
      en: "Do you already have any of these?",
      ur: "کیا آپ کے پاس ان میں سے کچھ پہلے سے موجود ہے؟",
    },
    help: {
      en: "Knowing what you already hold lets us tell you what is still missing before you go to court or the police.",
      ur: "یہ جان کر کہ آپ کے پاس کیا موجود ہے، ہم بتا سکتے ہیں کہ عدالت یا پولیس جانے سے پہلے کیا کمی ہے۔",
    },
    options: EVIDENCE_OPTIONS,
  },
  {
    id: "reported",
    kind: "single",
    optional: true,
    question: {
      en: "Have you reported this to anyone already?",
      ur: "کیا آپ نے یہ بات پہلے کسی کو بتائی ہے؟",
    },
    options: REPORTED_OPTIONS,
  },
  {
    id: "additional",
    kind: "text",
    optional: true,
    question: { en: "Anything else you would like to add?", ur: "کچھ اور بتانا چاہیں گی/گے؟" },
    help: {
      en: "Optional. Anything you write here stays private and is not stored.",
      ur: "اختیاری۔ آپ یہاں جو بھی لکھیں گی وہ نجی رہے گا اور محفوظ نہیں کیا جائے گا۔",
    },
  },
  {
    id: "review",
    kind: "review",
    question: { en: "Check your answers", ur: "اپنے جوابات دیکھ لیں" },
    help: {
      en: "Tap any answer to change it before we look at your situation.",
      ur: "جائزہ لینے سے پہلے کسی بھی جواب کو تبدیل کرنے کے لیے اس پر ٹیپ کریں۔",
    },
  },
];

// ---------------------------------------------------------------------------
// Flow navigation
// ---------------------------------------------------------------------------

export function getVisibleSteps(answers: Answers): FlowStep[] {
  return FLOW_STEPS.filter((s) => !s.visibleWhen || s.visibleWhen(answers));
}

export function getStepOptions(step: FlowStep, answers: Answers): FlowOption[] {
  if (!step.options) return [];
  return typeof step.options === "function" ? step.options(answers) : step.options;
}

export function stepIndexById(steps: FlowStep[], stepId: string | undefined): number {
  if (!stepId) return -1;
  return steps.findIndex((s) => s.id === stepId);
}

/**
 * The index to land on after answering `currentStepId`, given the step list
 * recomputed from the *updated* answers. Because the list is recomputed first,
 * a newly unlocked conditional step (marital status appearing once "my husband"
 * is chosen) is picked up automatically, and a step that just disappeared does
 * not leave the index pointing past it.
 */
export function nextStepIndex(steps: FlowStep[], currentStepId: string): number {
  const i = stepIndexById(steps, currentStepId);
  if (i === -1) return 0;
  return Math.min(i + 1, steps.length - 1);
}

/**
 * Where to sit after the answer state changed underneath us — for instance when
 * someone goes back and changes "who did this", removing three later questions.
 * Keeps the person on the same question where it still exists, and clamps into
 * range where it does not.
 */
export function reconcileIndex(
  steps: FlowStep[],
  currentStepId: string | undefined,
  fallbackIndex: number,
): number {
  const i = stepIndexById(steps, currentStepId);
  if (i !== -1) return i;
  return Math.max(0, Math.min(fallbackIndex, steps.length - 1));
}

/**
 * Drops answers belonging to steps that are no longer visible. Without this a
 * woman who selects "my husband", answers the marital and children questions,
 * then changes the perpetrator to "a colleague" would still carry a khula goal
 * into the narrative sent to the model.
 */
export function pruneAnswers(answers: Answers): Answers {
  let current: Answers = { ...answers };

  // Removing one answer can hide a step that depended on it, which can in turn
  // hide another — dropping "who" hides the marital question, which hides the
  // child-age question. So iterate to a fixed point rather than passing once.
  for (let pass = 0; pass < FLOW_STEPS.length; pass++) {
    const next: Answers = {};
    const visible = getVisibleSteps(current);

    for (const step of visible) {
      const selected = current[step.id];
      if (!selected?.length) continue;

      if (step.kind === "text") {
        next[step.id] = selected;
        continue;
      }

      // Selected options can also stop being offered — the goal list is rebuilt
      // from the relationship, so a khula goal must not survive a switch to
      // "divorced". Keep only selections still present in the current options.
      const available = new Set(getStepOptions(step, current).map((o) => o.id));
      const kept = selected.filter((id) => available.has(id));
      if (kept.length) next[step.id] = kept;
    }

    const stable =
      Object.keys(next).length === Object.keys(current).length &&
      Object.keys(next).every(
        (k) => current[k]?.length === next[k].length &&
          next[k].every((v, i) => current[k][i] === v),
      );

    current = next;
    if (stable) break;
  }

  return current;
}

export function isStepAnswered(step: FlowStep, answers: Answers): boolean {
  if (step.kind === "text" || step.kind === "review") return true;
  return Boolean(answers[step.id]?.length);
}

/** True when any selected answer indicates a threat to life. */
export function isUrgent(answers: Answers): boolean {
  for (const step of getVisibleSteps(answers)) {
    const selected = answers[step.id];
    if (!selected?.length) continue;
    const options = getStepOptions(step, answers);
    if (options.some((o) => o.urgent && selected.includes(o.id))) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Narrative and case context
// ---------------------------------------------------------------------------

function optionById(step: FlowStep, answers: Answers, id: string): FlowOption | undefined {
  return getStepOptions(step, answers).find((o) => o.id === id);
}

function narrativeFor(step: FlowStep, answers: Answers, id: string): string | undefined {
  const opt = optionById(step, answers, id);
  if (!opt) return undefined;
  return opt.narrative ?? opt.label.en;
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Composes the English account sent to the model. Always English regardless of
 * the interface language: the system prompt handles what language to answer in,
 * and keeping the input consistent means an Urdu user gets the same quality of
 * classification as an English one.
 */
export function buildNarrative(answers: Answers, additionalText = ""): string {
  const steps = getVisibleSteps(answers);
  const byId = new Map(steps.map((s) => [s.id, s]));
  const parts: string[] = [];

  const single = (stepId: string) => {
    const step = byId.get(stepId);
    const id = first(answers, stepId);
    if (!step || !id) return undefined;
    return narrativeFor(step, answers, id);
  };

  const multi = (stepId: string) => {
    const step = byId.get(stepId);
    const ids = answers[stepId];
    if (!step || !ids?.length) return [];
    return ids
      .map((id) => narrativeFor(step, answers, id))
      .filter((n): n is string => Boolean(n));
  };

  const identity = [single("gender"), single("province")].filter(Boolean);
  if (identity.length) parts.push(`${identity.join(". ")}.`);

  const safety = single("safety");
  if (safety) parts.push(`${safety}.`);

  const where = single("where");
  if (where) parts.push(`${where}.`);

  const who = single("who");
  if (who) parts.push(`${who}.`);

  const marital = single("maritalStatus");
  if (marital) parts.push(`${marital}.`);

  if (has(answers, "children", "children_yes")) {
    const ages = multi("childAges");
    parts.push(
      ages.length
        ? `There are children involved: ${joinList(ages)}.`
        : "There are children involved.",
    );
  } else if (has(answers, "children", "children_no")) {
    parts.push("There are no children involved.");
  }

  const acts = multi("whatHappened");
  if (acts.length) parts.push(`${joinList(acts)}.`);

  const when = single("recency");
  if (when) parts.push(`${when}.`);

  const freq = single("frequency");
  if (freq) parts.push(`${freq}.`);

  const evidence = multi("evidence");
  if (evidence.length) {
    parts.push(
      has(answers, "evidence", "ev_none")
        ? "I have not collected any evidence yet."
        : `Evidence I already have: ${joinList(evidence)}.`,
    );
  }

  const reported = single("reported");
  if (reported) parts.push(`${reported}.`);

  const goals = multi("intent");
  if (goals.length) parts.push(`What I want: ${joinList(goals)}.`);

  const extra = additionalText.trim();
  if (extra) parts.push(`In my own words: ${extra}`);

  return parts.join(" ");
}

/**
 * Structured facts derived from the answers, used to scope the law and
 * resources injected into the prompt, and to route a referral to the right
 * category of lawyer.
 */
export interface CaseContext {
  gender: Gender;
  province?: ProvinceId;
  categories: CaseCategory[];
  urgent: boolean;
  /** Coarse relationship bucket, for referral routing. */
  relationship: "spousal" | "family" | "workplace" | "online" | "other" | "unknown";
  stillMarried: boolean;
  hasChildren: boolean;
  /** True when the person said they are not ready to take formal action. */
  informationOnly: boolean;
}

const GENDER_BY_OPTION: Record<string, Gender> = {
  gender_woman: "woman",
  gender_man: "man",
  gender_transgender: "transgender",
  gender_undisclosed: "unspecified",
};

/** Which case categories each act maps to, for law and resource scoping. */
const ACT_CATEGORIES: Record<string, CaseCategory[]> = {
  act_hit: ["physical", "domestic"],
  act_weapon: ["physical"],
  act_acid_burn: ["physical", "harmful_practice"],
  act_strangled: ["physical"],
  act_threat_harm: ["physical"],
  act_threat_kill: ["physical", "harmful_practice"],
  act_verbal: ["domestic"],
  act_control: ["domestic"],
  act_confined: ["physical", "domestic"],
  act_touch: ["sexual"],
  act_forced_sex: ["sexual"],
  act_stalked: ["sexual", "cyber"],
  act_money: ["economic", "domestic"],
  act_images: ["cyber", "sexual"],
  act_dowry: ["domestic", "economic"],
  act_thrown_out: ["domestic", "economic"],
  act_children_used: ["domestic", "family_law", "child"],
  act_denied_medical: ["domestic", "physical"],
  act_second_marriage: ["family_law"],
  act_forced_marriage: ["harmful_practice", "family_law"],
  act_inheritance: ["economic", "family_law"],
  act_swara: ["harmful_practice", "family_law"],
  act_quid_pro_quo: ["workplace", "sexual"],
  act_hostile_env: ["workplace", "sexual"],
  act_retaliation: ["workplace"],
  act_blackmail: ["cyber", "sexual"],
  act_fake_account: ["cyber"],
  act_doxxing: ["cyber"],
  act_online_threats: ["cyber"],
};

const INTENT_CATEGORIES: Record<string, CaseCategory[]> = {
  intent_khula: ["family_law"],
  intent_maintenance: ["family_law", "economic"],
  intent_custody: ["family_law", "child"],
  intent_child_maintenance: ["family_law", "economic", "child"],
  intent_leave_with_kids: ["family_law", "domestic", "child"],
  intent_leave_without_kids: ["family_law", "domestic"],
  intent_dowry_recovery: ["family_law", "economic"],
  intent_inheritance: ["economic", "family_law"],
  intent_stop_forced_marriage: ["harmful_practice", "family_law"],
  intent_internal_complaint: ["workplace"],
  intent_ombudsperson: ["workplace"],
  intent_keep_job: ["workplace"],
  intent_remove_content: ["cyber"],
  intent_identify: ["cyber"],
  intent_protection: ["domestic"],
};

export function deriveCaseContext(answers: Answers): CaseContext {
  const genderId = first(answers, "gender");
  const gender = (genderId && GENDER_BY_OPTION[genderId]) || "unspecified";

  const provinceId = first(answers, "province");
  const province =
    provinceId && provinceId !== "province_undisclosed"
      ? (provinceId.replace("province_", "") as ProvinceId)
      : undefined;

  const categories = new Set<CaseCategory>();
  for (const act of answers.whatHappened ?? []) {
    for (const c of ACT_CATEGORIES[act] ?? []) categories.add(c);
  }
  for (const intent of answers.intent ?? []) {
    for (const c of INTENT_CATEGORIES[intent] ?? []) categories.add(c);
  }

  // The relationship and setting add categories the acts alone may not imply.
  if (isDomestic(answers)) categories.add("domestic");
  if (isSpousal(answers)) categories.add("family_law");
  if (isWorkplace(answers)) categories.add("workplace");
  if (isOnline(answers)) categories.add("cyber");
  if (categories.size === 0) categories.add("other");

  let relationship: CaseContext["relationship"] = "unknown";
  if (isSpousal(answers)) relationship = "spousal";
  else if (isFamily(answers)) relationship = "family";
  else if (has(answers, "who", ...WORKPLACE)) relationship = "workplace";
  else if (isOnline(answers)) relationship = "online";
  else if (answers.who?.length) relationship = "other";

  return {
    gender,
    province,
    categories: Array.from(categories),
    urgent: isUrgent(answers),
    relationship,
    stillMarried: isStillMarried(answers),
    hasChildren: hasChildren(answers),
    informationOnly: has(answers, "intent", "intent_understand"),
  };
}

/**
 * Answers rendered for the review screen, in display language, skipping steps
 * the person never reached.
 */
export function summariseAnswers(
  answers: Answers,
  additionalText: string,
  locale: Locale,
): { stepId: string; question: string; answer: string }[] {
  const rows: { stepId: string; question: string; answer: string }[] = [];

  for (const step of getVisibleSteps(answers)) {
    if (step.kind === "review") continue;

    if (step.kind === "text") {
      const text = additionalText.trim();
      if (text) {
        rows.push({
          stepId: step.id,
          question: localized(step.question, locale),
          answer: text,
        });
      }
      continue;
    }

    const selected = answers[step.id];
    if (!selected?.length) continue;

    const options = getStepOptions(step, answers);
    const labels = selected
      .map((id) => options.find((o) => o.id === id))
      .filter((o): o is FlowOption => Boolean(o))
      .map((o) => localized(o.label, locale));

    if (labels.length) {
      rows.push({
        stepId: step.id,
        question: localized(step.question, locale),
        answer: labels.join(locale === "ur" ? "، " : ", "),
      });
    }
  }

  return rows;
}

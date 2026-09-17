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
const isWorkplace = (a: Answers) => has(a, "who", ...WORKPLACE);
const isOnline = (a: Answers) => has(a, "who", ...ONLINE_ONLY);

/** Acts that put a case in cyber territory whoever did them — a husband and a
    stranger blackmail with photographs in exactly the same way. */
const CYBER_ACTS = ["act_images", "act_blackmail", "act_online_threats", "act_fake_account", "act_doxxing"];

const involvesCyber = (a: Answers) => has(a, "whatHappened", ...CYBER_ACTS);

/**
 * True while the marriage subsists in law — which is what determines whether
 * khula is available.
 *
 * This used to be a question of its own, asked after "who did this", with five
 * options covering separated and nikah-without-rukhsati. It is now read
 * straight off the relationship, because the relationship answer already
 * carries it: "my husband or wife" is a marriage that subsists, including when
 * the couple are living apart, and "my ex-husband or ex-wife" is one that does
 * not. The labels say so explicitly for that reason. A fiancé or partner was
 * never married, so khula was never available there either.
 *
 * The correctness this protects is the same as before — khula must not be
 * offered to someone who is divorced, which is the error the original flow
 * made — but it costs one screen instead of two.
 */
const isStillMarried = (a: Answers) => has(a, "who", "rel_spouse");

/**
 * True when the person has chosen a goal that only makes sense with children.
 *
 * Also inverted from how it worked before. There used to be a yes/no children
 * question, and a follow-up asking their ages, purely so the goal list could
 * decide whether to offer custody. Offering custody to everyone and reading the
 * answer back off what they chose gets the same fact from a screen they were
 * going to see anyway — nobody selects "I want custody of my children" by
 * accident.
 */
const CHILD_INTENTS = ["intent_custody", "intent_child_maintenance"];

const hasChildren = (a: Answers) => has(a, "intent", ...CHILD_INTENTS);

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

const WHO_OPTIONS: FlowOption[] = [
  {
    id: "rel_spouse",
    // The parenthetical is doing legal work, not reassurance. Khula is open
    // while the marriage subsists, and living apart does not end a marriage —
    // so someone who has left must still recognise themselves in this option
    // rather than reaching for the one below it.
    label: {
      en: "My husband or wife — including if we are separated",
      ur: "میرے شوہر یا بیوی — چاہے ہم الگ رہ رہے ہوں",
    },
    narrative:
      "The person who did this is my spouse, and we are still legally married",
  },
  {
    id: "rel_ex_spouse",
    label: {
      en: "My ex-husband or ex-wife — we are divorced",
      ur: "میرے سابق شوہر یا سابق بیوی — ہماری طلاق ہو چکی ہے",
    },
    narrative: "The person who did this is my former spouse, and the marriage has ended",
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
      id: "act_blackmail",
      label: { en: "Blackmailed me with private material", ur: "نجی مواد سے بلیک میل کیا" },
      narrative: "I am being blackmailed with private material",
    },
    {
      id: "act_online_threats",
      label: {
        en: "Sent me threatening or obscene messages",
        ur: "دھمکی آمیز یا فحش پیغامات بھیجے",
      },
      narrative: "I received threatening or obscene messages",
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

  // Blackmail and threatening messages used to live in this block, which meant
  // they were only offered once the perpetrator was "someone online I have
  // never met". A husband threatening to circulate photographs is the more
  // common case in the referrals we see, and it was unreachable. They are in
  // the base list now; what remains here is genuinely specific to an account
  // rather than a person.
  if (isOnline(answers)) {
    contextual.push(
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
  const stopContact: FlowOption = {
    id: "intent_stop_contact",
    label: { en: "I want them to stop contacting me", ur: "میں چاہتی/چاہتا ہوں وہ رابطہ بند کریں" },
    narrative: "I want this person to stop contacting me",
  };
  const removeContent: FlowOption = {
    id: "intent_remove_content",
    label: { en: "I want the content taken down", ur: "میں چاہتی/چاہتا ہوں یہ مواد ہٹا دیا جائے" },
    narrative: "I want the content removed from the internet",
  };

  /**
   * Goals that follow from what was described rather than from who did it.
   *
   * A takedown is the right first move whether the photographs are being
   * circulated by a stranger or by a husband, and the second is the more common
   * referral. This used to depend on the perpetrator being "someone online",
   * so the goal was unreachable for most of the people who needed it.
   */
  const actDriven: FlowOption[] =
    involvesCyber(answers) && !isOnline(answers) ? [removeContent] : [];

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
      opts.push({
        id: "intent_leave_home",
        label: { en: "I want to leave the house safely", ur: "میں محفوظ طریقے سے گھر چھوڑنا چاہتی ہوں" },
        narrative: "I want to leave the household safely",
      });
    } else {
      opts.push(stopContact);
    }

    // Offered to everyone in this branch rather than behind a "do you have
    // children?" question and an ages question after it. Someone without
    // children reads past these two lines; someone with them has answered both
    // of the questions those screens used to ask by picking one.
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

    opts.push(...actDriven, criminal, understand);
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
      ...actDriven,
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
      ...actDriven,
      criminal,
      understand,
    ];
  }

  if (isOnline(answers)) {
    return [
      removeContent,
      stopContact,
      {
        id: "intent_identify",
        label: { en: "I want to find out who is doing this", ur: "میں جاننا چاہتی/چاہتا ہوں یہ کون کر رہا ہے" },
        narrative: "I want the person behind the account identified",
      },
      criminal,
      understand,
    ];
  }

  return [stopIt, protection, stopContact, ...actDriven, criminal, understand];
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
    id: "who",
    kind: "single",
    question: { en: "Who did this?", ur: "یہ کس نے کیا؟" },
    help: {
      en: "This decides which law applies. A husband, an employer and a stranger are three different cases in Pakistani law, even for the same act.",
      ur: "اس سے طے ہوتا ہے کہ کون سا قانون لاگو ہوگا۔ ایک ہی عمل کے لیے شوہر، آجر اور اجنبی پاکستانی قانون میں تین الگ معاملات ہیں۔",
    },
    options: WHO_OPTIONS,
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

  const who = single("who");
  if (who) parts.push(`${who}.`);

  const acts = multi("whatHappened");
  if (acts.length) parts.push(`${joinList(acts)}.`);

  if (hasChildren(answers)) parts.push("There are children involved.");

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
  intent_leave_home: ["family_law", "domestic"],
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

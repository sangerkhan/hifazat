/**
 * Province registry and jurisdiction-aware legal instrument catalogue.
 *
 * Why this file exists
 * --------------------
 * Domestic violence, child protection and women's property rights are all
 * DEVOLVED subjects after the 18th Amendment. There is no single national
 * domestic violence statute: the Domestic Violence (Prevention and Protection)
 * Act 2012 applies to the Islamabad Capital Territory only, and each province
 * has since passed its own. Telling a woman in Peshawar to rely on the 2012 Act
 * sends her to a law that does not operate where she lives.
 *
 * Previously the app handled this by dumping every provision into the system
 * prompt and instructing the model not to cite the wrong ones. That is a
 * request, not a guarantee. Scoping now happens here, in code: the model is
 * only ever shown the instruments that actually apply to the user's province
 * and gender.
 *
 * Every entry carries a `confidence` flag. Only `confirmed` instruments are
 * injected into the prompt — see `getApplicableLaw`. Anything marked
 * `unconfirmed` is tracked in docs/RESOURCE-VERIFICATION.md for the PNCY legal
 * desk to sign off before it reaches a user.
 */

export type ProvinceId =
  | "punjab"
  | "sindh"
  | "kp"
  | "balochistan"
  | "ict"
  | "gb"
  | "ajk";

export type Gender = "woman" | "man" | "transgender" | "unspecified";

export type CaseCategory =
  | "domestic"
  | "sexual"
  | "cyber"
  | "workplace"
  | "harmful_practice"
  | "economic"
  | "child"
  | "family_law"
  | "physical"
  | "other";

export type Confidence = "confirmed" | "unconfirmed";

export interface Province {
  id: ProvinceId;
  en: string;
  ur: string;
  /** Shorter label for filter chips, where the full name does not fit. */
  shortEn: string;
  shortUr: string;
  /**
   * Minimum legal age of marriage for a female. Sindh and (subject to
   * verification) ICT are 18; everywhere else the Child Marriage Restraint Act
   * 1929 still sets 16 for females and 18 for males.
   */
  minMarriageAgeFemale: number;
  minMarriageAgeFemaleConfidence: Confidence;
  /** Provincial commission on the status of women, where one is constituted. */
  womenCommission?: string;
  /** Whether dedicated Violence Against Women Centres operate here. */
  hasVawCentres: boolean;
}

export const PROVINCES: Record<ProvinceId, Province> = {
  punjab: {
    id: "punjab",
    en: "Punjab",
    ur: "پنجاب",
    shortEn: "Punjab",
    shortUr: "پنجاب",
    minMarriageAgeFemale: 16,
    minMarriageAgeFemaleConfidence: "confirmed",
    womenCommission: "Punjab Commission on the Status of Women (PCSW)",
    hasVawCentres: true,
  },
  sindh: {
    id: "sindh",
    en: "Sindh",
    ur: "سندھ",
    shortEn: "Sindh",
    shortUr: "سندھ",
    minMarriageAgeFemale: 18,
    minMarriageAgeFemaleConfidence: "confirmed",
    womenCommission: "Sindh Commission on the Status of Women (SCSW)",
    hasVawCentres: false,
  },
  kp: {
    id: "kp",
    en: "Khyber Pakhtunkhwa",
    ur: "خیبر پختونخوا",
    shortEn: "KP",
    shortUr: "خیبر پختونخوا",
    minMarriageAgeFemale: 16,
    minMarriageAgeFemaleConfidence: "confirmed",
    womenCommission: "Khyber Pakhtunkhwa Commission on the Status of Women",
    hasVawCentres: false,
  },
  balochistan: {
    id: "balochistan",
    en: "Balochistan",
    ur: "بلوچستان",
    shortEn: "Balochistan",
    shortUr: "بلوچستان",
    minMarriageAgeFemale: 16,
    minMarriageAgeFemaleConfidence: "confirmed",
    womenCommission: "Balochistan Commission on the Status of Women",
    hasVawCentres: false,
  },
  ict: {
    id: "ict",
    en: "Islamabad Capital Territory",
    ur: "اسلام آباد وفاقی دارالحکومت",
    shortEn: "Islamabad",
    shortUr: "اسلام آباد",
    // The Child Marriage Restraint (Amendment) Act 2025 raised the ICT minimum
    // to 18. Recent enough that the legal desk should confirm before we lean
    // on it in advice.
    minMarriageAgeFemale: 18,
    minMarriageAgeFemaleConfidence: "unconfirmed",
    womenCommission: "National Commission on the Status of Women (NCSW)",
    hasVawCentres: false,
  },
  gb: {
    id: "gb",
    en: "Gilgit-Baltistan",
    ur: "گلگت بلتستان",
    shortEn: "Gilgit-Baltistan",
    shortUr: "گلگت بلتستان",
    minMarriageAgeFemale: 16,
    minMarriageAgeFemaleConfidence: "unconfirmed",
    hasVawCentres: false,
  },
  ajk: {
    id: "ajk",
    en: "Azad Jammu & Kashmir",
    ur: "آزاد جموں و کشمیر",
    shortEn: "AJK",
    shortUr: "آزاد کشمیر",
    minMarriageAgeFemale: 16,
    minMarriageAgeFemaleConfidence: "unconfirmed",
    hasVawCentres: false,
  },
};

export const PROVINCE_IDS = Object.keys(PROVINCES) as ProvinceId[];

export function getProvince(id: ProvinceId | undefined): Province | undefined {
  return id ? PROVINCES[id] : undefined;
}

/**
 * Best-effort resolution of a free-text province name to an ID. Used when a
 * referral or assessment arrives from a channel that did not use the guided
 * flow (WhatsApp or Instagram intake, for example).
 */
export function resolveProvinceId(input: string | undefined): ProvinceId | undefined {
  if (!input) return undefined;
  const needle = input.trim().toLowerCase();
  if (!needle) return undefined;

  for (const p of Object.values(PROVINCES)) {
    if (
      needle === p.id ||
      needle === p.en.toLowerCase() ||
      needle === p.shortEn.toLowerCase() ||
      needle === p.ur ||
      needle === p.shortUr
    ) {
      return p.id;
    }
  }

  const aliases: Record<string, ProvinceId> = {
    kpk: "kp",
    "khyber pakhtoonkhwa": "kp",
    "khyber pakhtunkhwa": "kp",
    nwfp: "kp",
    peshawar: "kp",
    lahore: "punjab",
    multan: "punjab",
    faisalabad: "punjab",
    rawalpindi: "punjab",
    karachi: "sindh",
    hyderabad: "sindh",
    sukkur: "sindh",
    quetta: "balochistan",
    islamabad: "ict",
    isb: "ict",
    "azad kashmir": "ajk",
    kashmir: "ajk",
    muzaffarabad: "ajk",
    gilgit: "gb",
    skardu: "gb",
    baltistan: "gb",
  };

  return aliases[needle];
}

// ---------------------------------------------------------------------------
// Legal instruments
// ---------------------------------------------------------------------------

export interface LegalInstrument {
  id: string;
  title: string;
  shortTitle: string;
  /** "federal" applies everywhere; a ProvinceId applies only in that province. */
  jurisdiction: "federal" | ProvinceId;
  categories: CaseCategory[];
  /** Which victims the instrument protects. "all" means gender-neutral. */
  protects: Gender[] | "all";
  summary: string;
  /** What the person can actually do under this law. */
  remedy?: string;
  confidence: Confidence;
}

export const LEGAL_INSTRUMENTS: LegalInstrument[] = [
  // --- Federal, gender-neutral ------------------------------------------
  {
    id: "ppc_hurt",
    title: "Pakistan Penal Code 1860, Sections 332–337 (Hurt)",
    shortTitle: "PPC 332–337 (Hurt)",
    jurisdiction: "federal",
    categories: ["physical", "domestic"],
    protects: "all",
    summary:
      "Causing bodily pain, injury, disease or infirmity. Covers slapping, hitting, beating and wounding. Penalties scale with the severity and permanence of the injury.",
    remedy:
      "Register an FIR at the police station with jurisdiction over where the incident happened. A medico-legal certificate strengthens the case substantially.",
    confidence: "confirmed",
  },
  {
    id: "ppc_302",
    title: "Pakistan Penal Code 1860, Section 302 (Qatl-i-amd)",
    shortTitle: "PPC 302 (Murder)",
    jurisdiction: "federal",
    categories: ["physical", "harmful_practice"],
    protects: "all",
    summary:
      "Intentional killing, punishable by death or life imprisonment. Relevant where threats to life have been made.",
    confidence: "confirmed",
  },
  {
    id: "ppc_506",
    title: "Pakistan Penal Code 1860, Section 506 (Criminal intimidation)",
    shortTitle: "PPC 506 (Criminal intimidation)",
    jurisdiction: "federal",
    categories: ["physical", "domestic", "other"],
    protects: "all",
    summary:
      "Threatening someone with injury to their person, reputation or property in order to alarm them or make them act against their will.",
    remedy: "Report to police; threats in writing or recordings are strong evidence.",
    confidence: "confirmed",
  },
  {
    id: "peca_2016",
    title: "Prevention of Electronic Crimes Act 2016",
    shortTitle: "PECA 2016",
    jurisdiction: "federal",
    categories: ["cyber", "sexual"],
    protects: "all",
    summary:
      "Section 20 covers offences against a person's dignity; Section 21 covers sharing sexually explicit content without consent (5–7 years and fine up to PKR 5 million); Section 24 covers cyber stalking.",
    remedy:
      "Complain to the cyber crime authority in person or online. Preserve every screenshot, URL and profile before blocking anyone.",
    confidence: "confirmed",
  },
  {
    id: "workplace_harassment_2010",
    title:
      "Protection against Harassment of Women at the Workplace Act 2010 (as amended 2022)",
    shortTitle: "Workplace Harassment Act 2010 (am. 2022)",
    jurisdiction: "federal",
    categories: ["workplace", "sexual"],
    protects: "all",
    summary:
      "Covers unwelcome sexual advances, demands for sexual favours in exchange for work benefits, and conduct creating a hostile working environment. The 2022 amendment widened the definition of workplace and employee to include students, domestic workers, home-based and informal workers, and gig workers.",
    remedy:
      "File with your organisation's Inquiry Committee within 30 days, or go directly to the Ombudsperson if the organisation has no committee. Appeals go to the Ombudsperson within 30 days of a decision.",
    confidence: "confirmed",
  },
  {
    id: "transgender_2018",
    title: "Transgender Persons (Protection of Rights) Act 2018",
    shortTitle: "Transgender Persons Act 2018",
    jurisdiction: "federal",
    categories: ["physical", "sexual", "workplace", "economic", "other"],
    protects: ["transgender"],
    summary:
      "Guarantees the right to self-perceived gender identity, inheritance, education, employment, healthcare and access to public spaces. Harassment of a transgender person carries 6 months to 3 years imprisonment and a fine up to PKR 100,000.",
    remedy:
      "Complaints can be pursued through the police and through the National Commission for Human Rights.",
    confidence: "confirmed",
  },
  {
    id: "honour_2016",
    title:
      "Criminal Law (Amendment) (Offences in the name or pretext of Honour) Act 2016",
    shortTitle: "Anti-Honour Killing Act 2016",
    jurisdiction: "federal",
    categories: ["harmful_practice", "physical"],
    protects: "all",
    summary:
      "Removed the forgiveness loophole that previously let families pardon a killer under Qisas and Diyat. Honour killings now carry a mandatory life sentence of at least 25 years, and the death penalty remains available.",
    confidence: "confirmed",
  },
  {
    id: "anti_women_practices_2011",
    title:
      "Prevention of Anti-Women Practices (Criminal Law Amendment) Act 2011",
    shortTitle: "Anti-Women Practices Act 2011",
    jurisdiction: "federal",
    categories: ["harmful_practice", "economic", "family_law"],
    protects: ["woman"],
    summary:
      "Criminalises giving a woman in marriage to settle a dispute (vani or swara), forced marriage, marriage to the Quran, and depriving a woman of her inheritance. Penalties run 3 to 10 years.",
    confidence: "confirmed",
  },
  {
    id: "ppc_354",
    title: "Pakistan Penal Code 1860, Section 354",
    shortTitle: "PPC 354 (Assault to outrage modesty)",
    jurisdiction: "federal",
    categories: ["sexual"],
    protects: ["woman"],
    summary:
      "Assault or criminal force against a woman intending to outrage her modesty. Up to 2 years imprisonment and a fine.",
    confidence: "confirmed",
  },
  {
    id: "ppc_509",
    title: "Pakistan Penal Code 1860, Section 509",
    shortTitle: "PPC 509 (Insulting modesty / harassment)",
    jurisdiction: "federal",
    categories: ["sexual", "workplace"],
    protects: ["woman"],
    summary:
      "Words, gestures or acts intended to insult the modesty of a woman, including sexual harassment. Up to 3 years and a fine.",
    confidence: "confirmed",
  },
  {
    id: "ppc_375_376",
    title: "Pakistan Penal Code 1860, Sections 375–376 (Rape)",
    shortTitle: "PPC 375–376 (Rape)",
    jurisdiction: "federal",
    categories: ["sexual"],
    protects: "all",
    summary:
      "Rape carries death or 10 to 25 years imprisonment; gang rape carries death or life imprisonment. The Anti-Rape (Investigation and Trial) Act 2021 added special courts and protections for the survivor's identity.",
    remedy:
      "A medico-legal examination should be sought as early as possible, at a government hospital. Do not wash or change clothes beforehand if that can be avoided.",
    confidence: "confirmed",
  },
  {
    // Note: this is NOT the Indian Section 498-A (cruelty by husband). In
    // Pakistan, 498-A was inserted by the Prevention of Anti-Women Practices
    // Act 2011 and concerns inheritance. The earlier legal-provisions file
    // carried the Indian meaning, which would have misdirected dowry and
    // cruelty complaints.
    id: "ppc_498a",
    title: "Pakistan Penal Code 1860, Section 498-A",
    shortTitle: "PPC 498-A (Depriving a woman of inheritance)",
    jurisdiction: "federal",
    categories: ["economic", "family_law"],
    protects: ["woman"],
    summary:
      "Depriving a woman of her inheritance by deceitful or illegal means. Inserted by the Prevention of Anti-Women Practices Act 2011 and punishable by 5 to 10 years or a fine of PKR 1 million, or both.",
    confidence: "confirmed",
  },
  {
    id: "ppc_498b",
    title: "Pakistan Penal Code 1860, Section 498-B",
    shortTitle: "PPC 498-B (Forced marriage)",
    jurisdiction: "federal",
    categories: ["harmful_practice", "family_law"],
    protects: ["woman"],
    summary:
      "Compelling a woman to marry against her will. Punishable by 3 to 10 years and a fine of PKR 500,000.",
    confidence: "confirmed",
  },
  {
    id: "ppc_310a",
    title: "Pakistan Penal Code 1860, Section 310-A",
    shortTitle: "PPC 310-A (Badl-i-sulh, vani, swara)",
    jurisdiction: "federal",
    categories: ["harmful_practice", "family_law"],
    protects: ["woman"],
    summary:
      "Giving a woman or girl in marriage to settle a civil dispute or criminal liability. 3 to 10 years imprisonment.",
    confidence: "confirmed",
  },
  {
    id: "ppc_365b",
    title: "Pakistan Penal Code 1860, Section 365-B",
    shortTitle: "PPC 365-B (Abduction to compel marriage)",
    jurisdiction: "federal",
    categories: ["harmful_practice", "sexual"],
    protects: ["woman"],
    summary:
      "Kidnapping or abducting a woman in order to compel her to marry, or to force or seduce her into illicit intercourse. Life imprisonment or 10 to 25 years.",
    confidence: "confirmed",
  },
  {
    id: "mfl_1961",
    title: "Muslim Family Laws Ordinance 1961",
    shortTitle: "Muslim Family Laws Ordinance 1961",
    jurisdiction: "federal",
    categories: ["family_law"],
    protects: "all",
    summary:
      "Governs registration of marriage, talaq procedure, polygamy permissions through the Arbitration Council, dower (mehr) and maintenance obligations.",
    confidence: "confirmed",
  },
  {
    id: "dmma_1939",
    title: "Dissolution of Muslim Marriages Act 1939",
    shortTitle: "Dissolution of Muslim Marriages Act 1939",
    jurisdiction: "federal",
    categories: ["family_law"],
    protects: ["woman"],
    summary:
      "Sets out the grounds on which a Muslim woman may obtain a decree dissolving her marriage, including cruelty, failure to maintain, and desertion. Khula is available through the Family Court and does not require the husband's consent.",
    remedy:
      "File in the Family Court of your district. The nikah nama is the essential document.",
    confidence: "confirmed",
  },
  {
    id: "guardians_wards_1890",
    title: "Guardians and Wards Act 1890",
    shortTitle: "Guardians and Wards Act 1890",
    jurisdiction: "federal",
    categories: ["family_law", "child"],
    protects: "all",
    summary:
      "The overarching custody and guardianship statute. Courts decide custody on the welfare of the child, which overrides the default hizanat age rules where the child's safety is at stake.",
    confidence: "confirmed",
  },
  {
    id: "family_courts_1964",
    title: "(West Pakistan) Family Courts Act 1964",
    shortTitle: "Family Courts Act 1964",
    jurisdiction: "federal",
    categories: ["family_law"],
    protects: "all",
    summary:
      "Establishes the Family Courts that hear dissolution of marriage, dower, maintenance, custody and guardianship, and recovery of dowry articles. Adopted with local amendments in each province.",
    confidence: "confirmed",
  },
  {
    id: "womens_property_2020",
    title: "Enforcement of Women's Property Rights Act 2020",
    shortTitle: "Women's Property Rights Act 2020",
    jurisdiction: "ict",
    categories: ["economic", "family_law"],
    protects: ["woman"],
    summary:
      "A woman deprived of property she owns or inherited can complain to the Ombudsman, who can order restoration of possession, transfer of title, police assistance and compensation for lost rent. Decisions are targeted within 60 days.",
    confidence: "confirmed",
  },

  // --- Provincial domestic violence statutes -----------------------------
  // These are the reason this file exists. There is no national DV act.
  {
    id: "dv_ict_2012",
    title: "Domestic Violence (Prevention and Protection) Act 2012",
    shortTitle: "DV Act 2012 (Islamabad)",
    jurisdiction: "ict",
    categories: ["domestic", "physical", "economic"],
    protects: "all",
    summary:
      "Applies in the Islamabad Capital Territory. Covers physical, sexual, psychological and economic abuse within a domestic relationship and is gender-neutral, so it protects men and transgender household members too.",
    remedy:
      "Apply to the Court of Magistrate for a protection order, residence order or monetary relief.",
    confidence: "confirmed",
  },
  {
    id: "dv_punjab_2016",
    title: "Punjab Protection of Women against Violence Act 2016",
    shortTitle: "Punjab PWVA 2016",
    jurisdiction: "punjab",
    categories: ["domestic", "physical", "economic", "sexual"],
    protects: ["woman"],
    summary:
      "Covers physical, sexual, psychological and economic abuse and stalking against women in Punjab. Establishes Violence Against Women Centres and the 1043 helpline, and provides for protection, residence and monetary orders.",
    remedy:
      "Apply to the Family Court, or go to a Violence Against Women Centre, which combines police reporting, medical examination, prosecution and shelter in one building.",
    confidence: "confirmed",
  },
  {
    id: "dv_sindh_2013",
    title: "Sindh Domestic Violence (Prevention and Protection) Act 2013",
    shortTitle: "Sindh DV Act 2013",
    jurisdiction: "sindh",
    categories: ["domestic", "physical", "economic"],
    protects: "all",
    summary:
      "Sindh's own domestic violence statute. Covers physical, sexual, psychological and economic abuse in a domestic relationship, and provides for protection, residence and monetary orders.",
    remedy: "Apply to the Court of Judicial Magistrate for a protection order.",
    confidence: "confirmed",
  },
  {
    id: "dv_balochistan_2014",
    title: "Balochistan Domestic Violence (Prevention and Protection) Act 2014",
    shortTitle: "Balochistan DV Act 2014",
    jurisdiction: "balochistan",
    categories: ["domestic", "physical", "economic"],
    protects: "all",
    summary:
      "Balochistan's domestic violence statute, providing for protection orders, residence orders and monetary relief for abuse within a domestic relationship.",
    confidence: "confirmed",
  },
  {
    id: "dv_kp_2021",
    title:
      "Khyber Pakhtunkhwa Domestic Violence against Women (Prevention and Protection) Act 2021",
    shortTitle: "KP DV Act 2021",
    jurisdiction: "kp",
    categories: ["domestic", "physical", "economic"],
    protects: ["woman"],
    summary:
      "Khyber Pakhtunkhwa's domestic violence statute, replacing reliance on federal provisions. Provides for protection orders and relief for women subjected to abuse in a domestic relationship.",
    confidence: "confirmed",
  },

  // --- Other provincial statutes ----------------------------------------
  {
    id: "child_marriage_sindh_2013",
    title: "Sindh Child Marriages Restraint Act 2013",
    shortTitle: "Sindh Child Marriages Restraint Act 2013",
    jurisdiction: "sindh",
    categories: ["child", "harmful_practice", "family_law"],
    protects: "all",
    summary:
      "Sets the minimum age of marriage at 18 for both parties in Sindh, making it the strictest such law in the country. Contracting, conducting or facilitating a child marriage is a cognisable offence.",
    confidence: "confirmed",
  },
  {
    id: "child_marriage_1929",
    title: "Child Marriage Restraint Act 1929",
    shortTitle: "Child Marriage Restraint Act 1929",
    jurisdiction: "federal",
    categories: ["child", "harmful_practice", "family_law"],
    protects: "all",
    summary:
      "The default position outside Sindh and Islamabad: the minimum age of marriage is 16 for a female and 18 for a male. Punjab increased the penalties in 2015 without changing the age.",
    confidence: "confirmed",
  },
  {
    id: "ghag_kp_2013",
    title: "Khyber Pakhtunkhwa Elimination of the Custom of Ghag Act 2013",
    shortTitle: "KP Ghag Act 2013",
    jurisdiction: "kp",
    categories: ["harmful_practice", "family_law"],
    protects: ["woman"],
    summary:
      "Criminalises ghag, the custom of a man publicly claiming a woman for marriage to prevent anyone else from proposing. Carries imprisonment of 3 to 7 years and a fine.",
    confidence: "confirmed",
  },
  {
    id: "property_kp_2019",
    title:
      "Khyber Pakhtunkhwa Enforcement of Women's Property Rights Act 2019",
    shortTitle: "KP Women's Property Rights Act 2019",
    jurisdiction: "kp",
    categories: ["economic", "family_law"],
    protects: ["woman"],
    summary:
      "Allows a woman deprived of her property or inheritance in Khyber Pakhtunkhwa to complain to the provincial Ombudsperson for restoration of her rights.",
    confidence: "confirmed",
  },
];

/**
 * The domestic violence statute that actually operates in a given province.
 * Returns undefined where we have not confirmed one, which is a signal to fall
 * back to the Penal Code hurt provisions rather than to cite a statute that may
 * not be in force.
 */
export function getDomesticViolenceAct(
  province: ProvinceId | undefined
): LegalInstrument | undefined {
  if (!province) return undefined;
  return LEGAL_INSTRUMENTS.find(
    (l) =>
      l.jurisdiction === province &&
      l.categories.includes("domestic") &&
      l.confidence === "confirmed"
  );
}

export interface LegalScopeQuery {
  province?: ProvinceId;
  gender?: Gender;
  categories?: CaseCategory[];
  /** Include instruments still awaiting legal-desk sign-off. Default false. */
  includeUnconfirmed?: boolean;
}

/**
 * Returns only the legal instruments that apply to this person, in this
 * province, for this kind of case. This is what gets injected into the prompt,
 * replacing the previous approach of showing the model everything and asking it
 * to filter.
 */
export function getApplicableLaw(query: LegalScopeQuery): LegalInstrument[] {
  const { province, gender, categories, includeUnconfirmed = false } = query;

  return LEGAL_INSTRUMENTS.filter((law) => {
    if (!includeUnconfirmed && law.confidence !== "confirmed") return false;

    // Jurisdiction: federal applies everywhere. A provincial statute applies
    // only in its own province. When we do not know the province, provincial
    // statutes are excluded rather than guessed at.
    if (law.jurisdiction !== "federal") {
      if (!province || law.jurisdiction !== province) return false;
    }

    // Gender: a woman-only statute is not cited for a male complainant, and the
    // Transgender Persons Act is not omitted for a transgender complainant.
    if (law.protects !== "all" && gender && gender !== "unspecified") {
      if (!law.protects.includes(gender)) return false;
    }

    if (categories?.length) {
      if (!law.categories.some((c) => categories.includes(c))) return false;
    }

    return true;
  });
}

/**
 * A short prose briefing on what is distinctive about this province, for the
 * system prompt. Keeps jurisdictional facts in one place rather than scattered
 * through prompt text.
 */
export function getProvinceBriefing(province: ProvinceId | undefined): string {
  const p = getProvince(province);
  if (!p) {
    return "The user has not told us their province. Cite only federal law and national helplines. Do not name a provincial statute or a provincial helpline, and invite them to say where they are so the guidance can be made specific.";
  }

  const dvAct = getDomesticViolenceAct(p.id);
  const lines: string[] = [`The user is in ${p.en}.`];

  if (dvAct) {
    lines.push(
      `The domestic violence statute in force here is the ${dvAct.title}. Cite this, never another province's domestic violence act.`
    );
  } else {
    lines.push(
      `We have not confirmed a domestic violence statute in force in ${p.en}. Rely on the Pakistan Penal Code hurt and intimidation provisions instead, and do not cite another province's domestic violence act.`
    );
  }

  if (p.hasVawCentres) {
    lines.push(
      "Violence Against Women Centres operate here. They combine police reporting, medical examination, prosecution and shelter under one roof, which spares the person from making the same disclosure at four separate offices."
    );
  }

  if (p.minMarriageAgeFemaleConfidence === "confirmed") {
    lines.push(
      `The minimum legal age of marriage for a woman here is ${p.minMarriageAgeFemale}.`
    );
  }

  if (p.womenCommission) {
    lines.push(`The relevant oversight body is the ${p.womenCommission}.`);
  }

  return lines.join(" ");
}

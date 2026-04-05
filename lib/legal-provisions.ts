export const LEGAL_PROVISIONS = {
  workplace_harassment: {
    act: "Protection Against Harassment of Women at the Workplace Act 2010 (amended 2022)",
    short_name: "Workplace Harassment Act 2010",
    scope: "All workplaces nationwide — offices, educational institutions, online businesses, courts, highways, gyms, performance venues",
    definitions: {
      harassment:
        "Any unwelcome sexual advance, request for sexual favours, verbal/written/visual sexual communication, stalking, cyber stalking, or sexually demeaning attitudes causing interference with work or creating a hostile environment. Single incidents creating fear or discomfort also count.",
      abuse_of_authority:
        "Demanding sexual favours in exchange for job benefits — promotion, raise, transfer, or continued employment.",
      hostile_environment:
        "Unwelcome conduct that interferes with work performance or creates an intimidating, hostile, or offensive work atmosphere.",
      retaliation:
        "Punishing someone for refusing sexual favours — limited promotions, distorted evaluations, gossip campaigns, or demotion.",
    },
    complaint_procedure: [
      "Every organisation with 10+ employees must have a 3-member Inquiry Committee (at least 1 woman, 1 management rep, 1 employee rep)",
      "Complaint must be filed within 30 days of the incident",
      "Inquiry Committee must complete investigation within 30 days",
      "Appeal can be filed with the Ombudsperson within 30 days of the decision",
      "If no Inquiry Committee exists, complain directly to the Federal/Provincial Ombudsperson",
    ],
    penalties: {
      minor:
        "Censure, withheld promotion (1 year), withheld increment (1 year), stoppage at efficiency bar",
      major:
        "Demotion, compulsory retirement, dismissal, suspension/cancellation of professional license",
      fine: "Up to PKR 500,000",
    },
    complaint_bodies: {
      federal_ombudsperson: {
        name: "Federal Ombudsperson for Protection Against Harassment",
        url: "https://www.fospah.gov.pk/",
      },
    },
  },

  womens_property_rights: {
    act: "Enforcement of Women's Property Rights Act 2020",
    scope: "Islamabad Capital Territory (ICT) only",
    provisions:
      "Women deprived of inherited property can file a complaint with the Ombudsman, who can order the Deputy Commissioner to restore property, transfer title, and provide police assistance. Compensation for lost rent may also be awarded.",
    timeline: "Decision preferably within 60 days",
    limitation: "Only applies to Islamabad — other provinces follow general inheritance law under Sharia and PPC",
  },

  transgender_rights: {
    act: "Transgender Persons (Protection of Rights) Act 2018",
    scope: "Nationwide",
    provisions: [
      "Right to self-perceived gender identity",
      "Right to inherit property",
      "Right to education, employment, vote, hold public office",
      "Protection from harassment, violence, and discrimination",
      "Access to public places and services",
      "Right to health care including separate wards",
    ],
    penalties:
      "Harassment of transgender persons: 6 months to 3 years imprisonment and fine up to PKR 100,000",
  },

  ppc_sections: {
    "302": {
      section: "302",
      title: "Qatl-i-amd (Murder)",
      plain: "Intentional killing — punishable by death or life imprisonment",
      severity: "critical",
    },
    "332-337": {
      section: "332-337",
      title: "Hurt",
      plain: "Causing bodily pain, disease, or infirmity — covers slapping, hitting, beating, wounding. Penalties vary by severity of injury.",
      severity: "serious",
    },
    "354": {
      section: "354",
      title: "Assault on woman to outrage modesty",
      plain: "Using criminal force on a woman intending to outrage her modesty — up to 2 years imprisonment and fine",
      severity: "serious",
    },
    "354-A": {
      section: "354-A",
      title: "Assault or stripping of woman's clothes",
      plain: "Stripping or parading a woman — death or life imprisonment",
      severity: "critical",
    },
    "375-376": {
      section: "375-376",
      title: "Rape and punishment",
      plain: "Rape — death or 10-25 years imprisonment. Gang rape carries death penalty or life imprisonment.",
      severity: "critical",
    },
    "489": {
      section: "489",
      title: "Conjugal rights / domestic provisions",
      plain: "Relevant to marital disputes and maintenance obligations",
      severity: "serious",
    },
    "496-A": {
      section: "496-A",
      title: "Enticing or taking away woman",
      plain: "Enticing a married woman to leave her husband — up to 7 years imprisonment",
      severity: "serious",
    },
    "498-A": {
      section: "498-A",
      title: "Cruelty to wife",
      plain: "Husband or in-laws subjecting a woman to cruelty — used in domestic violence and dowry cases",
      severity: "serious",
    },
    "509": {
      section: "509",
      title: "Word, gesture or act to insult modesty of woman",
      plain: "Verbal or gestural sexual harassment — up to 1 year imprisonment or fine or both",
      severity: "concerning",
    },
    "310-A": {
      section: "310-A",
      title: "Prohibition of giving a female in marriage or otherwise in badl-i-sulh, wanni, or swara",
      plain: "Giving a woman/girl to settle a dispute is a criminal offence — 3-10 years imprisonment",
      severity: "critical",
    },
    "365-B": {
      section: "365-B",
      title: "Kidnapping or abducting woman to compel marriage",
      plain: "Kidnapping a woman to force marriage — life imprisonment or 10-25 years",
      severity: "critical",
    },
  },

  peca_2016: {
    act: "Prevention of Electronic Crimes Act (PECA) 2016",
    scope: "Nationwide — covers all electronic/digital offences",
    sections: {
      "20": {
        title: "Offences against dignity of a person",
        plain: "Sharing information to harm reputation — 3 years imprisonment or fine up to PKR 1 million or both",
      },
      "21": {
        title: "Offences against modesty and minor",
        plain: "Sharing sexually explicit content of a person without consent — 5-7 years imprisonment and fine up to PKR 5 million",
      },
      "24": {
        title: "Cyber stalking",
        plain: "Persistent unwanted communication, monitoring, or surveillance via electronic means — 3 years imprisonment or fine up to PKR 1 million",
      },
    },
    complaint_bodies: {
      fia_cyber_crime: {
        name: "FIA Cyber Crime Wing",
        phone: "1991",
        url: "https://ccs.fia.gov.pk/",
      },
      nccia: {
        name: "National Cyber Crime Investigation Agency",
        phone: "1799",
        url: "https://nccia.gov.pk/",
      },
    },
  },

  domestic_violence: {
    act: "Domestic Violence (Prevention and Protection) Act 2012",
    scope: "Federal — applies to all genders",
    provisions:
      "Covers physical, sexual, psychological, and economic violence within domestic relationships. Victims can obtain protection orders from a court. Applies to ALL household members regardless of gender.",
    gender_note: "This act is gender-neutral and protects men and transgender persons as well.",
  },

  provincial_laws: {
    punjab: {
      act: "Punjab Protection of Women against Violence Act 2016",
      scope: "Punjab only — women only",
      provisions:
        "Establishes VAW centres, toll-free helpline (1043), protection system for women. Covers physical, sexual, psychological, economic violence and stalking.",
      helpline: "1043",
    },
    sindh: {
      act: "Sindh Child Marriage Restraint Act 2013",
      scope: "Sindh only",
      provisions: "Minimum marriage age raised to 18 for both boys and girls in Sindh.",
    },
    kpk: {
      note: "KPK follows federal laws. The Domestic Violence Act 2012 applies.",
    },
    balochistan: {
      note: "Balochistan follows federal laws. Limited province-specific legislation on VAW.",
    },
    islamabad: {
      note: "Islamabad Capital Territory follows all federal laws directly including Domestic Violence Act 2012 and Women's Property Rights Act 2020.",
    },
  },

  honour_crimes: {
    act: "Criminal Law (Amendment) (Offences in the name or pretext of Honour) Act 2016",
    scope: "Nationwide",
    provisions:
      "Closed the 'forgiveness loophole' — families can no longer forgive perpetrators to avoid punishment. Mandatory life imprisonment (minimum 25 years) for honour killings. Death penalty possible.",
    key_change:
      "Before 2016, families could pardon the killer under Qisas/Diyat provisions. This amendment removed that option for honour-based killings.",
  },

  anti_women_practices: {
    act: "Prevention of Anti-Women Practices (Criminal Law Amendment) Act 2011",
    scope: "Nationwide",
    provisions: [
      "Criminalises giving women in marriage to settle disputes (vani/swara)",
      "Criminalises forced marriage",
      "Criminalises marriage with the Quran (to deny inheritance)",
      "Criminalises depriving women of inheritance rights",
    ],
    penalties: "3-10 years imprisonment depending on the offence",
  },
};

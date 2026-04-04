export const NCSW_KNOWLEDGE_BASE = {
  source: "NCSW Standardized Indicators on Violence against Women in Pakistan (2015)",
  source_org: "National Commission on the Status of Women, Government of Pakistan",
  definition: "Violence against women (VAW) is any act of gender-based violence that results in, or is likely to result in, physical, sexual or psychological harm or suffering to women, including threats of such acts, coercion or arbitrary deprivation of liberty, whether occurring in public or in private life. (UN General Assembly, 1993; adopted by Pakistan Ministry of Law, Justice and Human Rights)",

  categories: [
    {
      id: "physical",
      name: "Physical Violence",
      description: "Acts of physical aggression that cause or could cause physical harm, pain, injury, or death.",
      legal_refs: [
        "Pakistan Penal Code Sections 332-337 (Hurt)",
        "Punjab Protection of Women against Violence Act 2016, Section 2(o)(1)",
        "Domestic Violence (Prevention and Protection) Act 2012"
      ],
      indicators: [
        {
          id: "phys_01",
          indicator: "Hitting, slapping, kicking, punching, or beating",
          description: "Any act of striking with hands, fists, feet, or body parts",
          severity: "serious",
          examples: ["Husband slaps wife during argument", "In-law beats daughter-in-law", "Brother hits sister for going out"]
        },
        {
          id: "phys_02",
          indicator: "Pushing, shoving, pulling hair, dragging",
          description: "Physical force used to control, intimidate, or cause pain",
          severity: "serious",
          examples: ["Partner shoves woman against wall", "Father drags daughter by hair"]
        },
        {
          id: "phys_03",
          indicator: "Throwing objects at a woman",
          description: "Using projectiles — dishes, shoes, furniture, phones",
          severity: "serious",
          examples: ["Husband throws plate during dinner", "Objects thrown during argument"]
        },
        {
          id: "phys_04",
          indicator: "Burning, scalding, or acid attacks",
          description: "Use of fire, hot liquids, acid, or corrosive substances",
          severity: "critical",
          legal_ref_extra: "Acid Control and Acid Crime Prevention Act 2011",
          examples: ["Acid thrown on face", "Stove burning made to appear accidental"]
        },
        {
          id: "phys_05",
          indicator: "Use of weapons — knife, firearm, stick, rod",
          description: "Attacking or threatening with any weapon or instrument",
          severity: "critical",
          examples: ["Threatened with knife", "Hit with rod or stick", "Firearm used to threaten"]
        },
        {
          id: "phys_06",
          indicator: "Choking, strangling, or suffocating",
          description: "Restricting breathing or blood flow",
          severity: "critical",
          examples: ["Hands around throat during argument", "Pillow held over face"]
        },
        {
          id: "phys_07",
          indicator: "Confinement and restriction of movement",
          description: "Locking in a room or space against her will",
          severity: "serious",
          examples: ["Locked in room to prevent leaving", "Not allowed to leave house"]
        },
        {
          id: "phys_08",
          indicator: "Murder or attempted murder (including honour killing)",
          description: "Killing or attempting to kill, including in the name of so-called honour",
          severity: "critical",
          legal_ref_extra: "Criminal Law (Amendment) (Offences in the name or pretext of Honour) Act 2016",
          examples: ["Threats to kill for perceived dishonour", "Family plotting harm for marriage choice"]
        }
      ]
    },
    {
      id: "sexual",
      name: "Sexual Violence",
      description: "Any sexual act, attempt, or unwanted sexual contact or comments directed against a woman using coercion, force, or threats.",
      legal_refs: [
        "PPC Sections 354, 354-A, 375-376, 509",
        "Protection of Women (Criminal Laws Amendment) Act 2006",
        "Punjab Protection of Women against Violence Act 2016"
      ],
      indicators: [
        {
          id: "sex_01",
          indicator: "Rape and attempted rape",
          description: "Forced intercourse or attempted forced intercourse without consent",
          severity: "critical",
          examples: ["Forced intercourse by stranger", "Sexual assault by acquaintance"]
        },
        {
          id: "sex_02",
          indicator: "Marital rape / forced sexual acts by spouse",
          description: "Sexual acts within marriage without consent. Recognised as violence by NCSW. Pakistan's legal framework on marital rape is evolving.",
          severity: "critical",
          examples: ["Husband forces intercourse despite refusal", "Coerced through threats"]
        },
        {
          id: "sex_03",
          indicator: "Unwanted touching, groping, grabbing",
          description: "Non-consensual physical contact of a sexual nature",
          severity: "serious",
          examples: ["Groped in public transport", "Unwanted touching by colleague"]
        },
        {
          id: "sex_04",
          indicator: "Verbal sexual harassment — comments, catcalling",
          description: "Unwanted sexual remarks, explicit comments, degrading language",
          severity: "concerning",
          examples: ["Catcalling on the street", "Sexual comments at workplace"]
        },
        {
          id: "sex_05",
          indicator: "Workplace sexual harassment",
          description: "Unwanted sexual advances or hostile environment at work",
          severity: "serious",
          legal_ref_extra: "Protection Against Harassment of Women at the Workplace Act 2010",
          examples: ["Boss makes sexual advances", "Promotion conditioned on sexual favours"]
        },
        {
          id: "sex_06",
          indicator: "Forced prostitution or sexual exploitation",
          description: "Compelling into commercial sexual activity through force or coercion",
          severity: "critical",
          examples: ["Trafficked into sex work", "Forced by family into prostitution"]
        },
        {
          id: "sex_07",
          indicator: "Sexual abuse of female children",
          description: "Any sexual act or contact with a female minor",
          severity: "critical",
          legal_ref_extra: "Zainab Alert, Response and Recovery Act 2020",
          examples: ["Child molestation", "Sexual abuse by family member"]
        }
      ]
    },
    {
      id: "psychological",
      name: "Psychological / Emotional Violence",
      description: "Acts causing mental or emotional suffering, including psychological deterioration resulting from oppressive behaviour.",
      legal_refs: [
        "Punjab Protection of Women against Violence Act 2016, Section 2(o)(2)",
        "Domestic Violence (Prevention and Protection) Act 2012"
      ],
      indicators: [
        {
          id: "psych_01",
          indicator: "Verbal abuse — insults, humiliation, belittling",
          description: "Repeated degrading language to undermine self-worth",
          severity: "concerning",
          examples: ["Called stupid or worthless regularly", "Publicly humiliated", "Constant criticism"]
        },
        {
          id: "psych_02",
          indicator: "Threats of violence, harm, or abandonment",
          description: "Using threats to intimidate — threats to hit, kill, divorce, or take children",
          severity: "serious",
          examples: ["Threatens divorce if she visits parents", "Threatens to take children", "Threatens harm if she tells anyone"]
        },
        {
          id: "psych_03",
          indicator: "Controlling behaviour — isolation from family and friends",
          description: "Restricting freedom of movement, social contact, or communication",
          severity: "serious",
          examples: ["Not allowed to visit parents", "Phone taken away", "Forbidden from having friends", "Not allowed to work"]
        },
        {
          id: "psych_04",
          indicator: "Intimidation — destroying property, displaying weapons",
          description: "Acts to frighten without direct physical contact",
          severity: "serious",
          examples: ["Smashes things during arguments", "Punches walls near her"]
        },
        {
          id: "psych_05",
          indicator: "Stalking and surveillance",
          description: "Repeated unwanted following, watching, monitoring",
          severity: "serious",
          examples: ["Ex follows her to work", "Checks phone constantly", "Shows up uninvited"]
        },
        {
          id: "psych_06",
          indicator: "Gaslighting — making victim doubt reality",
          description: "Manipulating into questioning own memory or sanity",
          severity: "serious",
          examples: ["'That never happened, you're imagining things'", "'You're crazy, no one will believe you'"]
        },
        {
          id: "psych_07",
          indicator: "Using children as tools of control",
          description: "Threatening custody, turning children against mother",
          severity: "serious",
          examples: ["'I'll take the kids'", "Tells children their mother is bad"]
        }
      ]
    },
    {
      id: "harmful_traditional",
      name: "Harmful Traditional Practices",
      description: "Customary practices harmful to women, often justified by culture or community norms. Recognised as violence under Pakistani law.",
      legal_refs: [
        "Prevention of Anti-Women Practices (Criminal Law Amendment) Act 2011",
        "Criminal Law (Amendment) (Offences in the name or pretext of Honour) Act 2016",
        "Child Marriage Restraint Act 1929 (amended)"
      ],
      indicators: [
        {
          id: "trad_01",
          indicator: "Honour killing (karo-kari) or threats",
          description: "Murder or threat of murder in the name of so-called honour. Criminal offence.",
          severity: "critical",
          examples: ["Family threatens to kill for choosing own husband", "Threats over social media use"]
        },
        {
          id: "trad_02",
          indicator: "Forced marriage",
          description: "Compelling marriage without free and full consent",
          severity: "critical",
          examples: ["Parents arranging marriage without consent", "Pressured through threats"]
        },
        {
          id: "trad_03",
          indicator: "Child / early marriage",
          description: "Marriage of a girl under 16 (Sindh: 18). Criminal offence.",
          severity: "critical",
          examples: ["13-year-old being married off", "Underage marriage arranged"]
        },
        {
          id: "trad_04",
          indicator: "Vani / Swara — women given to settle disputes",
          description: "Giving a woman or girl to another family as compensation. Criminal offence.",
          severity: "critical",
          examples: ["Girl given to rival family to settle dispute", "Jirga decides to exchange women"]
        },
        {
          id: "trad_05",
          indicator: "Watta-satta — exchange marriage",
          description: "Reciprocal bride exchange where one marriage is conditional on another",
          severity: "concerning",
          examples: ["Marriage only agreed if brother also marries their daughter"]
        },
        {
          id: "trad_06",
          indicator: "Dowry-related violence",
          description: "Violence or threats related to dowry demands",
          severity: "serious",
          examples: ["In-laws demanding more dowry", "Beaten for insufficient dowry"]
        },
        {
          id: "trad_07",
          indicator: "Denial of inheritance rights",
          description: "Depriving a woman of her legal right to inherit. Criminal offence.",
          severity: "serious",
          examples: ["Brothers take all land", "Forced to sign away rights", "Threatened for claiming inheritance"]
        },
        {
          id: "trad_08",
          indicator: "Forced conversion and marriage of minority women",
          description: "Abducting, forcibly converting, and compelling marriage of religious minority women",
          severity: "critical",
          examples: ["Hindu girl kidnapped and forced to convert", "Christian woman coerced"]
        }
      ]
    },
    {
      id: "economic",
      name: "Economic Violence",
      description: "Controlling financial resources, preventing work, denying maintenance, or exploiting labour.",
      legal_refs: [
        "Punjab Protection of Women against Violence Act 2016",
        "Domestic Violence (Prevention and Protection) Act 2012",
        "Prevention of Anti-Women Practices Act 2011 (inheritance)"
      ],
      indicators: [
        {
          id: "econ_01",
          indicator: "Withholding financial resources or maintenance",
          description: "Denying money for basic needs — food, healthcare, children",
          severity: "serious",
          examples: ["No money for household expenses", "Has to beg for children's school fees"]
        },
        {
          id: "econ_02",
          indicator: "Controlling earnings or income",
          description: "Taking salary, forcing handover of earnings, controlling bank account",
          severity: "serious",
          examples: ["Husband takes her salary", "Not allowed own bank account"]
        },
        {
          id: "econ_03",
          indicator: "Preventing from working",
          description: "Forbidding employment, forcing to quit, sabotaging work",
          severity: "serious",
          examples: ["Husband forbids her from working", "In-laws force her to quit"]
        },
        {
          id: "econ_04",
          indicator: "Dispossession of property or assets",
          description: "Taking, selling, or destroying personal property or assets",
          severity: "serious",
          examples: ["In-laws take gold jewellery", "Property transferred without consent"]
        },
        {
          id: "econ_05",
          indicator: "Denial of education",
          description: "Preventing from attending school, college, or university",
          severity: "serious",
          examples: ["Pulled out of school", "Not allowed to attend university"]
        }
      ]
    },
    {
      id: "cyber",
      name: "Cyber Violence / Technology-Facilitated VAW",
      description: "Online harassment, blackmail, non-consensual image sharing, digital stalking. Added as a Pakistan-specific category during stakeholder consultations.",
      legal_refs: [
        "Prevention of Electronic Crimes Act (PECA) 2016",
        "Punjab Protection of Women against Violence Act 2016 (includes cyber crime)"
      ],
      indicators: [
        {
          id: "cyber_01",
          indicator: "Non-consensual sharing of intimate images or videos",
          description: "Sharing or threatening to share private images without consent",
          severity: "critical",
          examples: ["Ex threatens to share private photos", "Intimate photos posted without consent"]
        },
        {
          id: "cyber_02",
          indicator: "Online harassment and cyberbullying",
          description: "Persistent online abuse, trolling, threats via social media or messaging",
          severity: "concerning",
          examples: ["Threatening WhatsApp messages", "Abusive social media comments"]
        },
        {
          id: "cyber_03",
          indicator: "Digital blackmail or sextortion",
          description: "Using private information or images to extort or coerce",
          severity: "critical",
          examples: ["Blackmailed with screenshots", "Demanding money to not share photos"]
        },
        {
          id: "cyber_04",
          indicator: "Digital stalking and surveillance",
          description: "Tracking location, monitoring messages, installing spyware, accessing accounts",
          severity: "serious",
          examples: ["Tracking app installed on phone", "Someone logs into her accounts"]
        },
        {
          id: "cyber_05",
          indicator: "Impersonation and fake profiles",
          description: "Creating fake profiles using a woman's identity or photos to defame",
          severity: "serious",
          examples: ["Fake profile made with her photos", "Someone impersonating her online"]
        },
        {
          id: "cyber_06",
          indicator: "Doxxing — publishing private information",
          description: "Sharing personal info (address, phone, workplace) online to endanger",
          severity: "critical",
          examples: ["Home address posted with threats", "Phone number shared to invite harassment"]
        }
      ]
    }
  ]
};

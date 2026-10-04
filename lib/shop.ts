/**
 * The Pulse 8 online store.
 *
 * Every product, price, photograph and description here was taken from the
 * WooCommerce catalogue on pulse8.ie (October 2026). Names were moved out of
 * all caps and obvious supplier typos were corrected; nothing else was
 * rewritten. Images live in /public/shop and are served from this app, so the
 * store no longer depends on the WordPress media library.
 *
 * Prices are in euro, as published, including VAT where the old store did.
 */

export type ProductBlock =
  | { type: "p"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "specs"; rows: Array<{ label: string; value: string }> };

export type CategorySlug =
  | "defibrillators"
  | "pads"
  | "batteries"
  | "defibrillator-cabinets"
  | "aed-bags-signs"
  | "first-aid-supplies"
  | "wearables"
  | "workplace"
  | "schools"
  | "montessori-childcare"
  | "books";

export type Category = {
  slug: CategorySlug;
  name: string;
  description: string;
};

export type Product = {
  slug: string;
  name: string;
  category: CategorySlug;
  /** euro, as published on the old store */
  price: number;
  /** first image is the lead shot */
  images: string[];
  description: ProductBlock[];
  /** a single required choice, such as glove size */
  options?: { name: string; values: string[] };
};

export const categories: Category[] = [
  {
    slug: "defibrillators",
    name: "Defibrillators",
    description: "Semi-automatic AEDs for workplaces, schools and clubs."
  },
  {
    slug: "pads",
    name: "Pads",
    description: "Replacement adult and paediatric pads for the AEDs we supply."
  },
  {
    slug: "batteries",
    name: "Batteries",
    description: "Replacement AED batteries and HeartSine Pad-Paks."
  },
  {
    slug: "defibrillator-cabinets",
    name: "Defibrillator cabinets",
    description: "Indoor and outdoor alarmed cabinets."
  },
  {
    slug: "aed-bags-signs",
    name: "AED bags and signs",
    description: "Signage, wall hooks and carry cases."
  },
  {
    slug: "first-aid-supplies",
    name: "First aid supplies",
    description: "Dressings, plasters, eye wash and kit refills."
  },
  {
    slug: "wearables",
    name: "Wearables",
    description: "Nitrile gloves and CPR pocket masks."
  },
  {
    slug: "workplace",
    name: "Workplace",
    description: "Complete first aid points and vehicle kits."
  },
  {
    slug: "schools",
    name: "Schools",
    description: "A kit sized for yard duty and school first aid."
  },
  {
    slug: "montessori-childcare",
    name: "Montessori and childcare",
    description: "First aid kits sized by the number of children in your care."
  },
  {
    slug: "books",
    name: "Books",
    description: "Course manuals and handbooks."
  }
];

export const products: Product[] = [
  {
    slug: "mindray-beneheart-c1a-defibrillator",
    name: "Mindray BeneHeart C1A Defibrillator",
    category: "defibrillators",
    price: 1295,
    images: [
      "/shop/mindray-beneheart-c1a-defibrillator.jpg",
      "/shop/mindray-beneheart-c1a-defibrillator-2.jpg"
    ],
    description: [
      {
        type: "p",
        text: "The BeneHeart range of AED Defibrillators are one of the smartest defibs in the market. Come with 8 year warranty, 5 year battery and pads."
      },
      {
        type: "heading",
        text: "Smart And Easy"
      },
      {
        type: "p",
        text: "BeneHeart C Series knows what a first-time rescuer needs, and provides the smart ResQNavi™ technology to guide you through the tense rescue process step by step with animation coaching and voice prompts. The proficiency of a rescuer can be determined, according to the time spent at each step, with appropriate guidance and encouragement to help you save lives with confidence."
      },
      {
        type: "specs",
        rows: [
          {
            label: "Smartest",
            value: "ResQNavi™ gives more guidance to less experienced rescuers"
          },
          {
            label: "Smartest",
            value: "Continuous encouragement during CPR process"
          },
          {
            label: "Fastest",
            value: "Opening the lid powers the defibrillator; single pad for all patients"
          },
          {
            label: "Fastest",
            value: "Quickest shock defibrillator available: 7 seconds to first shock"
          },
          {
            label: "Easiest",
            value: "Single switch between Adult & Child mode"
          },
          {
            label: "Easiest",
            value: "Auto adjustment of volume to suit environment, CPR Metronom"
          },
          {
            label: "Easiest",
            value: "Status light and pads expiry date for pads at front of device"
          },
          {
            label: "Powerful",
            value: "Escalating levels of shock, different levels for adults and children"
          },
          {
            label: "Powerful",
            value: "Adult: 1st shock 200j, 2nd shock 300j,3rd shock 360j"
          },
          {
            label: "Powerful",
            value: "Child*: 1st shock 50j, 2nd shock 70j,3rd shock 100j"
          },
          {
            label: "Powerful",
            value: "Auto-compensation for patient impedance (an overweight patient gets a higher energy shock compensating for more body mass)"
          },
          {
            label: "Robust",
            value: "1.5metre drop on 6 sides, IP55 water/dust-proof"
          },
          {
            label: "Robust",
            value: "Works from -381 to + 4575 metres altitude- suitable for helicopters"
          },
          {
            label: "Economical",
            value: "5 year battery from installation, 5 year from manufacture pads, 8 year warranty, Single pad for either adult or child patient"
          }
        ]
      },
      {
        type: "p",
        text: "Child* = 25 Kilos and under. Average weight for 8 year olds."
      },
      {
        type: "heading",
        text: "Faster Shock"
      },
      {
        type: "p",
        text: "The defibrillation success rate drops with every second. Thanks to the new QShock™ technology that enables the first shock to be delivered in less than 8 seconds, the BeneHeart C Series is able to increase the chance of successful defibrillation, and help rescuers save every second to save lives. The QShock™ technology shortens the ECG analysis time to only 5 seconds with pre-charging completed synchronously, so that no extra time is needed for charging."
      },
      {
        type: "heading",
        text: "Higher Energy"
      },
      {
        type: "p",
        text: "Higher energy for subsequent shocks is recommended to increase the termination rates of refibrillation in the 2015 AHA Guidelines for CPR and ECC, and the ERC Guidelines for Resuscitation 2015. BeneHeart C Series features the 360J biphasic technology, meeting the needs of individual SCA patients."
      }
    ]
  },
  {
    slug: "defibtech-lifeline-aed",
    name: "Defibtech Lifeline AED",
    category: "defibrillators",
    price: 1695,
    images: [
      "/shop/defibtech-lifeline-aed.jpg"
    ],
    description: [
      {
        type: "p",
        text: "Defibtech Lifeline semi-automatic AED."
      },
      {
        type: "heading",
        text: "Complete with"
      },
      {
        type: "list",
        items: [
          "5 year battery",
          "Adult pads",
          "AED prep kit",
          "8 year warranty",
          "Free upgrades"
        ]
      },
      {
        type: "p",
        text: "Indoor and outdoor cabinets available. Carry cases / brackets all available at very reasonable prices."
      }
    ]
  },
  {
    slug: "mediana-a15-hearton-aed",
    name: "Mediana A15 HeartOn AED",
    category: "defibrillators",
    price: 1295,
    images: [
      "/shop/mediana-a15-hearton-aed.webp",
      "/shop/mediana-a15-hearton-aed-2.webp",
      "/shop/mediana-a15-hearton-aed-3.webp"
    ],
    description: [
      {
        type: "list",
        items: [
          "Instant switch from Adult to Paediatric.",
          "Suitable for all schools, clubs and groups.",
          "Automatic switch on when lid opened.",
          "Pads attached, ready for use.",
          "Pads fit both Adults and Paediatrics.",
          "Semi Automatic"
        ]
      },
      {
        type: "heading",
        text: "Contents"
      },
      {
        type: "list",
        items: [
          "1 Mediana HeartOn AED A15",
          "1 Carry Case",
          "1 Adult/Paediatric Pads",
          "1 Defib Accessory Pack"
        ]
      }
    ]
  },
  {
    slug: "defibtech-view-paediatric-pads-electrodes",
    name: "Defibtech View Paediatric Pads",
    category: "pads",
    price: 195,
    images: [
      "/shop/defibtech-view-paediatric-pads-electrodes.jpg"
    ],
    description: [
      {
        type: "p",
        text: "Defibtech Lifeline View Paediatric Defibrillation Pads Package"
      },
      {
        type: "p",
        text: "This package contains one pair of child/infant defibrillation pads for use with the Lifeline View, PRO and ECG AED."
      },
      {
        type: "list",
        items: [
          "These pads should be used on patients less than 8 years old.",
          "Pads should be stored connected to the AED or in the available carrying case.",
          "Pad package has ca. 1,5 year shelf life.",
          "Suitable for use with the Defibtech Lifeline View AED defibrillator."
        ]
      }
    ]
  },
  {
    slug: "defibtech-view-adult-electrodes-unit-with-screen",
    name: "Defibtech View Adult Pads (Unit with Screen)",
    category: "pads",
    price: 130,
    images: [
      "/shop/defibtech-view-adult-electrodes-unit-with-screen.jpg"
    ],
    description: [
      {
        type: "p",
        text: "Defibtech Lifeline View Pads"
      },
      {
        type: "p",
        text: "This package contains one pair of adult defibrillation pads for use with the Defibtech Lifeline View, PRO and ECG AED."
      },
      {
        type: "list",
        items: [
          "These pads are for adult use only (8 years or older)",
          "Pads should be stored connected to the AED",
          "Extra pads can be stored in the available carrying case",
          "This pad package has ca. two-years shelf life",
          "These Defibtech Lifeline View pads are not suitable for the Defibtech Lifeline AED Defibrillator."
        ]
      }
    ]
  },
  {
    slug: "defibtech-paediatric-pads-electrodes",
    name: "Defibtech Paediatric Pads",
    category: "pads",
    price: 195,
    images: [
      "/shop/defibtech-paediatric-pads-electrodes.jpg"
    ],
    description: [
      {
        type: "p",
        text: "This package contains one pair (1 set) of child/infant defibrillation pads for use with the Lifeline AED and the Lifeline AUTO."
      },
      {
        type: "p",
        text: "These pads should be used on patients less than 8 years old."
      },
      {
        type: "list",
        items: [
          "Pads should be stored connected to the AED or in the available carrying case",
          "Pad package has a two-year shelf life",
          "Suitable for use with the Defibtech Lifeline AED and the Lifeline Auto"
        ]
      }
    ]
  },
  {
    slug: "defibtech-adult-electrodes",
    name: "Defibtech Adult Pads",
    category: "pads",
    price: 120,
    images: [
      "/shop/defibtech-adult-electrodes.jpg"
    ],
    description: [
      {
        type: "p",
        text: "This package contains one pair of adult defibrillation pads for use with the Lifeline AED and the Lifeline AUTO."
      },
      {
        type: "list",
        items: [
          "These pads are for adult use only (8 years or older).",
          "Pads should be stored connected to the AED.",
          "Extra pads can be stored in the available carrying case.",
          "Pad package has ca. two-year shelf life.",
          "Suitable for use with Defibtech Lifeline and Lifeline Auto."
        ]
      },
      {
        type: "p",
        text: "Please don't forget to replace the 9v Lithium battery which has to be done every year. This battery is needed for the AED to do its self-test. Please view the related products."
      }
    ]
  },
  {
    slug: "mediana-a15-aed-adult-child-dual-pads",
    name: "Mediana A15 AED Adult/Child Dual Pads",
    category: "pads",
    price: 120,
    images: [
      "/shop/mediana-a15-aed-adult-child-dual-pads.jpg"
    ],
    description: [
      {
        type: "p",
        text: "Replacement adult pads for the Mediana A15 HeartOn AED."
      }
    ]
  },
  {
    slug: "heartsine-samaritan-pad-pak-paediatric",
    name: "HeartSine Samaritan Pad-Pak, Paediatric",
    category: "batteries",
    price: 320,
    images: [
      "/shop/heartsine-samaritan-pad-pak-paediatric.jpg"
    ],
    description: [
      {
        type: "list",
        items: [
          "HeartSine samaritan Pad-Pak Paediatric (includes one set of defibrillation pads and battery).",
          "Incorporates one expiration date for worry free maintenance.",
          "HeartSine brand AEDs operate on Pad-Paks only. Always have a fully charged spare Pad-Pak available."
        ]
      }
    ]
  },
  {
    slug: "heartsine-samaritan-pad-pak",
    name: "HeartSine Samaritan Pad-Pak",
    category: "batteries",
    price: 295,
    images: [
      "/shop/heartsine-samaritan-pad-pak.jpg",
      "/shop/heartsine-samaritan-pad-pak-2.jpg",
      "/shop/heartsine-samaritan-pad-pak-3.jpg"
    ],
    description: [
      {
        type: "list",
        items: [
          "HeartSine samaritan Pad-Pak. Adult (includes one set of defibrillation pads and battery).",
          "Incorporates one expiration date for worry free maintenance.",
          "HeartSine brand AEDs operate on Pad-Paks only. Always have a fully charged spare Pad-Pak available."
        ]
      }
    ]
  },
  {
    slug: "defibtech-battery-7-year",
    name: "Defibtech Battery, 7 Year",
    category: "batteries",
    price: 460,
    images: [
      "/shop/defibtech-battery-7-year.webp"
    ],
    description: [
      {
        type: "p",
        text: "Defibtech Lifeline ca. 7-year battery pack (DBP-2800)."
      },
      {
        type: "p",
        text: "Defibtech's battery technology is nothing short of brilliant. A replaceable 9 volt battery powers the device's regular electronic self-tests leaving the pack available for any emergency use."
      },
      {
        type: "p",
        text: "This “high-use” pack offers up to seven years of standby life. It's another great innovation from Defibtech."
      },
      {
        type: "p",
        text: "The Defibtech AED defibrillators operate on batteries only. Always have a fully charged spare."
      },
      {
        type: "heading",
        text: "Specifications"
      },
      {
        type: "specs",
        rows: [
          {
            label: "Suitable for model",
            value: "Defibtech Lifeline AED/AUTO"
          },
          {
            label: "Lifespan",
            value: "ca. 7 years (average from 6.5 years to 7.5 years)"
          },
          {
            label: "Weight",
            value: "0.4 kgs"
          }
        ]
      }
    ]
  },
  {
    slug: "defibtech-battery-5-year",
    name: "Defibtech Battery, 5 Year",
    category: "batteries",
    price: 360,
    images: [
      "/shop/defibtech-battery-5-year.webp"
    ],
    description: [
      {
        type: "p",
        text: "Defibtech Lifeline ca. 5-years battery (DBP-1400). Defibtech's battery technology is nothing short of brilliant. A replaceable 9 volt battery powers the device's regular electronic self-tests leaving the pack available for any emergency use."
      },
      {
        type: "p",
        text: "This “high-use” pack offers up to five years of standby life. It's another great innovation from Defibtech. If you don't need a high-use battery. The Defibtech AED defibrillators function on batteries only. Always have a fully charged spare."
      },
      {
        type: "heading",
        text: "Specifications"
      },
      {
        type: "specs",
        rows: [
          {
            label: "Defibtech Lifeline",
            value: "ca. 5-years battery"
          },
          {
            label: "Suitable for model",
            value: "Defibtech Lifeline AED/AUTO"
          },
          {
            label: "Lifespan",
            value: "ca. 5 years (average from 4.5 years to 5.5 years)"
          },
          {
            label: "Weight",
            value: "0.4 kgs"
          }
        ]
      }
    ]
  },
  {
    slug: "mediana-a15-hearton-aed-battery",
    name: "Mediana A15 HeartOn AED Battery",
    category: "batteries",
    price: 320,
    images: [
      "/shop/mediana-a15-hearton-aed-battery.webp"
    ],
    description: [
      {
        type: "list",
        items: [
          "Disposable.",
          "LiMnO2 Non-Rechargeable.",
          "Two years shelf life.",
          "Five years standby life."
        ]
      }
    ]
  },
  {
    slug: "rotaid-solid-plus-external-alarmed-aed-cabinet",
    name: "Rotaid Solid Plus External Alarmed AED Cabinet",
    category: "defibrillator-cabinets",
    price: 550,
    images: [
      "/shop/rotaid-solid-plus-external-alarmed-aed-cabinet.jpg",
      "/shop/rotaid-solid-plus-external-alarmed-aed-cabinet-2.jpg"
    ],
    description: [
      {
        type: "p",
        text: "The Rotaid Solid Plus Heat offers defibrillator (AED) storage in a wide variety of outdoor environments. It has an impact resistant design and comes equipped with a fully automated heating system."
      },
      {
        type: "p",
        text: "In addition, the system is equipped with eight LED lights to ensure the cabinet stands out at dusk or in darkness."
      },
      {
        type: "p",
        text: "The total system runs on 24 Volts and includes a transformer, connector set and power cord. It can be safely plugged into any available power socket."
      },
      {
        type: "list",
        items: [
          "Audible Alarm",
          "UV Protected Cover",
          "Ingress Protection IP55",
          "Impact Protection IK10 (20J)",
          "Heating System",
          "LED Lighting",
          "-20°C / -5°F and above"
        ]
      }
    ]
  },
  {
    slug: "indoor-aed-cabinet-with-alarm-beacon",
    name: "Indoor AED Cabinet with Alarm and Beacon",
    category: "defibrillator-cabinets",
    price: 145,
    images: [
      "/shop/indoor-aed-cabinet-with-alarm-beacon.webp",
      "/shop/indoor-aed-cabinet-with-alarm-beacon-2.jpg"
    ],
    description: [
      {
        type: "list",
        items: [
          "Indoor AED Cabinet with Alarm & Beacon",
          "Size: H45cm x W35cm x D18cm",
          "Weight: 2.58KG",
          "Material: ABS + PC Glass",
          "Alarm: Yes",
          "Strobe Light: Yes"
        ]
      }
    ]
  },
  {
    slug: "aed-sign-a4-nearest-person-in-charge",
    name: "AED Sign A4, Nearest AED / Person in Charge",
    category: "aed-bags-signs",
    price: 9,
    images: [
      "/shop/aed-sign-a4-nearest-person-in-charge.jpg"
    ],
    description: [
      {
        type: "list",
        items: [
          "Ensures visibility of AED's",
          "Provides clear identification of the AED location"
        ]
      }
    ]
  },
  {
    slug: "panoramic-aed-sign-aluminium",
    name: "Panoramic AED Sign, Aluminium",
    category: "aed-bags-signs",
    price: 19.5,
    images: [
      "/shop/panoramic-aed-sign-aluminium.jpg"
    ],
    description: [
      {
        type: "list",
        items: [
          "Ensures visibility of AED's",
          "Provides clear identification of the AED location",
          "3D to provide multi-angle signage",
          "Wall mounting",
          "Size: 150 x 350mm"
        ]
      }
    ]
  },
  {
    slug: "defibrilalator-wall-hook",
    name: "Defibrillator Wall Hook",
    category: "aed-bags-signs",
    price: 40,
    images: [
      "/shop/defibrilalator-wall-hook.jpg"
    ],
    description: [
      {
        type: "p",
        text: "Wall hook for a Defibrillator."
      }
    ]
  },
  {
    slug: "defibtech-carry-case",
    name: "Defibtech Carry Case",
    category: "aed-bags-signs",
    price: 120,
    images: [
      "/shop/defibtech-carry-case.webp"
    ],
    description: [
      {
        type: "p",
        text: "Black carry bag that can be used with the Defibtech range of defibrillators. With a front pouch, there is plenty of storage for extra pads & a battery. Carry handle and reflective strip for easy location."
      },
      {
        type: "p",
        text: "Small PVC window in the top right hand corner which allows a visual check on the LED indicator light on the Defibtech Lifeline AED."
      }
    ]
  },
  {
    slug: "first-aid-rucksack-compact-empty",
    name: "First Aid Rucksack, Compact (Empty)",
    category: "first-aid-supplies",
    price: 45,
    images: [
      "/shop/first-aid-rucksack-compact-empty.webp",
      "/shop/first-aid-rucksack-compact-empty-2.webp",
      "/shop/first-aid-rucksack-compact-empty-3.webp"
    ],
    description: [
      {
        type: "p",
        text: "A compact first aid rucksack that offers excellent portability for the first aider. The bag features double zip-pulls that allow the bag to open fully, offering easy viewing of the products required in an emergency."
      },
      {
        type: "p",
        text: "Elasticated loops, sealable pockets, and a removable compartment, hold all the contents securely."
      },
      {
        type: "p",
        text: "Dimensions: 37cmH x 33cmW x 21cmD"
      }
    ]
  },
  {
    slug: "eye-pad-dressing-no-16",
    name: "Eye Pad Dressing No. 16",
    category: "first-aid-supplies",
    price: 0.68,
    images: [
      "/shop/eye-pad-dressing-no-16.webp"
    ],
    description: [
      {
        type: "p",
        text: "Eye Pad Dressings"
      },
      {
        type: "list",
        items: [
          "Low adherent sterile eye pad.",
          "Choice of boxed or flow-wrap.",
          "Thick, comfortable sterile eye pad dressings, attached to continuous stretch bandage.",
          "The dressing pad has a low adherent contact layer, designed not to stick. Suitable for replacement in all HSE first aid kits."
        ]
      }
    ]
  },
  {
    slug: "moist-wipe-for-skin-100-pack",
    name: "Moist Skin Wipes (100 Pack)",
    category: "first-aid-supplies",
    price: 10.5,
    images: [
      "/shop/moist-wipe-for-skin-100-pack.webp"
    ],
    description: [
      {
        type: "p",
        text: "Individually wrapped alcohol-free disposable wipes. Impregnated with simple, safe, sterile salt water (NaCl 0.9%). Safe and easy to use, our wipes are made from a soft fabric material rather than crepe or paper, making them much gentler on the skin."
      },
      {
        type: "list",
        items: [
          "Sterile and alcohol-free.",
          "Designed for all mandatory kits.",
          "Extra strong soft fabric material.",
          "Safe for all skin types."
        ]
      }
    ]
  },
  {
    slug: "medium-dressing-no-8",
    name: "Medium Dressing No. 8",
    category: "first-aid-supplies",
    price: 0.65,
    images: [
      "/shop/medium-dressing-no-8.webp"
    ],
    description: [
      {
        type: "list",
        items: [
          "Quality sterile wound dressings",
          "Pad cushions the wound and absorbs exudate",
          "Provides initial protection from infection whilst en-route to hospital",
          "Strong elastic bandage holds the dressing securely in place",
          "Life saving dressing following serious trauma"
        ]
      }
    ]
  },
  {
    slug: "instant-ice-pack-single",
    name: "Instant Ice Pack, Single",
    category: "first-aid-supplies",
    price: 2.1,
    images: [
      "/shop/instant-ice-pack-single.jpg"
    ],
    description: [
      {
        type: "p",
        text: "No need to place ice packs in the freezer: Simply squeezing the water sachet inside the pack activates them."
      },
      {
        type: "list",
        items: [
          "Instant Ice Packs cool the problem area in seconds. Simply squeeze and shake to activate",
          "Ideal for emergency pitchside use",
          "Ideal to treat sprains and strains immediately after the injury has happened, the most critical time",
          "Ice packs are ideal for all sports injuries particularly when there are no first aid facilities close by"
        ]
      },
      {
        type: "p",
        text: "Easy to use, disposable ice pack for the first aid treatment of sprains and abrasions. On the spot immediate ice therapy, twist the pack and apply to bruising, sports sprains and muscle injuries."
      }
    ]
  },
  {
    slug: "large-dressing-no-9",
    name: "Large Dressing No. 9",
    category: "first-aid-supplies",
    price: 0.8,
    images: [
      "/shop/large-dressing-no-9.webp"
    ],
    description: [
      {
        type: "list",
        items: [
          "Quality sterile wound dressings",
          "Pad cushions the wound and absorbs exudate",
          "Provides initial protection from infection whilst en-route to hospital",
          "Strong elastic bandage holds the dressing securely in place",
          "Life saving dressing following serious trauma"
        ]
      }
    ]
  },
  {
    slug: "x-large-dressing-no-3",
    name: "Extra Large Dressing No. 3",
    category: "first-aid-supplies",
    price: 1.8,
    images: [
      "/shop/x-large-dressing-no-3.webp"
    ],
    description: [
      {
        type: "p",
        text: "20cm x 28cm"
      }
    ]
  },
  {
    slug: "assorted-washproof-plasters-100-pack",
    name: "Assorted Washproof Plasters (100 Pack)",
    category: "first-aid-supplies",
    price: 7.95,
    images: [
      "/shop/assorted-washproof-plasters-100-pack.webp"
    ],
    description: [
      {
        type: "heading",
        text: "Hypoallergenic Washproof Plasters"
      },
      {
        type: "list",
        items: [
          "Hypoallergenic adhesive",
          "Excellent adhesive properties",
          "Comprehensive range",
          "Sterile/individually wrapped"
        ]
      }
    ]
  },
  {
    slug: "sterile-eye-wash-pods-20ml-25-pack",
    name: "Sterile Eye Wash Pods, 20ml (25 Pack)",
    category: "first-aid-supplies",
    price: 12.5,
    images: [
      "/shop/sterile-eye-wash-pods-20ml-25-pack.webp"
    ],
    description: [
      {
        type: "p",
        text: "To lessen the risk of permanent damage caused by eye injuries, it is important to treat eye injuries immediately and seek medical advice as soon as possible."
      },
      {
        type: "p",
        text: "It's vital to use a sterile eyewash in the event of an eye injury, and equally as important when treating a wound. The Steroplast saline solution ‘Sterowash' treats both, and is available on drug tariff"
      },
      {
        type: "heading",
        text: "Why use Eyewash/Wound wash?"
      },
      {
        type: "p",
        text: "A complete range of emergency eyewash is available to enable you to comply with the ACOP L74 health and safety (first aid) regulations. “If mains tap water is not readily available for eye irritation, at least a litre or sterile water or saline (0.9% w/v) in sealed, disposable containers should be provided. Once the seal has been broken, the containers should not be kept for reuse. The container should not be used after the expiry date.”"
      },
      {
        type: "heading",
        text: "Sterowash is so much safer than tap water, but why?"
      },
      {
        type: "list",
        items: [
          "Possible bacterial infection from contaminated water",
          "Potential eye irritation by chlorine and chemicals",
          "Natural objection to cold water reaction",
          "Physical problems associated with placing the eye under a tap or into a sink"
        ]
      },
      {
        type: "p",
        text: "Saline solution PH Eur 0.9% w/v"
      }
    ]
  },
  {
    slug: "ice-pack-hot-pack-reuseable",
    name: "Reusable Ice Pack and Hot Pack",
    category: "first-aid-supplies",
    price: 4.9,
    images: [
      "/shop/ice-pack-hot-pack-reuseable.webp"
    ],
    description: [
      {
        type: "p",
        text: "Reusable Hot and Cold Pack"
      },
      {
        type: "p",
        text: "High quality reusable gel pack for effective hot and cold therapy:"
      },
      {
        type: "list",
        items: [
          "Ideal for use on a sports injury to help reduce the pain",
          "Quality internal gel can be reheated and frozen repeatedly",
          "Soft coating ensures maximum user comfort and provides durability"
        ]
      },
      {
        type: "p",
        text: "If pack is used cold this will help to reduce the swelling."
      },
      {
        type: "p",
        text: "If pack is used hot this will assist in increasing circulation to the injured area."
      }
    ]
  },
  {
    slug: "washproof-plasters-20",
    name: "Washproof Plasters (20)",
    category: "first-aid-supplies",
    price: 1.95,
    images: [
      "/shop/washproof-plasters-20.webp"
    ],
    description: [
      {
        type: "p",
        text: "Flexible PE plastic film is used to ensure a super-thin, flexible, washproof plaster. The membrane is moisture vapour permeable, allowing the skin to breathe, without the need for physical perforations, keeping the adhesive securely in place, whilst acting as a complete barrier to water, virus, bacteria and fungi."
      },
      {
        type: "p",
        text: "High-tech acrylic adhesive provides a really secure fixing but is skin friendly and low allergy."
      },
      {
        type: "list",
        items: [
          "Washproof.",
          "Moisture vapour permeable membrane.",
          "Perfect barrier to water, virus, bacteria and fungi.",
          "Acrylic, low allergy adhesive."
        ]
      }
    ]
  },
  {
    slug: "disposable-sling-non-woven-triangular",
    name: "Disposable Triangular Sling, Non-Woven",
    category: "first-aid-supplies",
    price: 0.8,
    images: [
      "/shop/disposable-sling-non-woven-triangular.webp"
    ],
    description: [
      {
        type: "p",
        text: "Multi-functional bandages, used to create slings and ideal for splinting. The non-woven version is for single use only. The calico version may be washed and re-used as appropriate."
      },
      {
        type: "p",
        text: "The specially hemmed edge calico is especially practical for use on First Aid Training courses. Triangular bandages are indispensable an essential first aid bandage. All versions are supplied individually wrapped."
      }
    ]
  },
  {
    slug: "paramedic-shears",
    name: "Paramedic Shears",
    category: "first-aid-supplies",
    price: 4.95,
    images: [
      "/shop/paramedic-shears.jpg"
    ],
    description: [
      {
        type: "p",
        text: "7 inch tuff cut shears black handle."
      }
    ]
  },
  {
    slug: "cpr-pocket-mask",
    name: "CPR Pocket Mask",
    category: "wearables",
    price: 5.95,
    images: [
      "/shop/cpr-pocket-mask.jpg"
    ],
    description: [
      {
        type: "p",
        text: "Rebreath Pocket Face Mask with Valve"
      },
      {
        type: "list",
        items: [
          "Valve ensures breath can be given with control and accuracy.",
          "Supplied in a durable blue clamshell case.",
          "Offers protection from cross-infection."
        ]
      }
    ]
  },
  {
    slug: "nitrile-gloves-100s-medical-grade",
    name: "Nitrile Gloves, Medical Grade (100)",
    category: "wearables",
    price: 9.95,
    images: [
      "/shop/nitrile-gloves-100s-medical-grade.jpg"
    ],
    description: [
      {
        type: "list",
        items: [
          "Superior strength and resistance to tears and punctures",
          "Excellent resistance to aqueous chemical solutions, oil and grease",
          "Longer lasting due to superior resilience",
          "Similar feel to Latex gloves (less allergic reactions)"
        ]
      }
    ],
    options: {
      name: "Size",
      values: [
        "S",
        "M",
        "L",
        "XL"
      ]
    }
  },
  {
    slug: "first-aid-point-complete",
    name: "First Aid Point, Complete",
    category: "workplace",
    price: 195,
    images: [
      "/shop/first-aid-point-complete.jpg"
    ],
    description: [
      {
        type: "p",
        text: "Completed First Aid Point. HSA Standard First Aid Kit."
      },
      {
        type: "list",
        items: [
          "1-10 person HSA workplace kit",
          "3 bottle eye wash station",
          "Medium burns kit"
        ]
      }
    ]
  },
  {
    slug: "3-in-1-car-combo-first-aid-kit",
    name: "3-in-1 Car Combo First Aid Kit",
    category: "workplace",
    price: 42,
    images: [
      "/shop/3-in-1-car-combo-first-aid-kit.jpg"
    ],
    description: [
      {
        type: "heading",
        text: "Contents"
      },
      {
        type: "list",
        items: [
          "1 Pair of steel scissors 14.5cm",
          "1 Adhesive plaster tape 5m x 2.5cm",
          "6 Sterile non-woven swab 10cm x 10cm",
          "2 Non-woven triangular badge 96 x 96 x 136cm",
          "2 Sterile first aid dressing sheet 40cm x 60cm",
          "1 Sterile first aid dressing sheet 60cm x 80cm",
          "1 Sterile compress dressing with pad 10cm x 12cm",
          "3 Sterile compress dressing with pad 8cm x 10cm",
          "2 Conforming bandage 4m x 8cm",
          "3 Conforming bandage 4m x 6cm",
          "1 Emergency foil blanket 160cm x 210cm",
          "8 Adhesive wound dressing plasters 10cm x 6cm",
          "4 Disposable gloves",
          "1 Information sheet",
          "1 Guidance leaflet",
          "First aid kit",
          "Hi viz vest",
          "Warning triangle"
        ]
      }
    ]
  },
  {
    slug: "school-first-aid-kit-bag",
    name: "School First Aid Kit Bag",
    category: "schools",
    price: 49,
    images: [
      "/shop/school-first-aid-kit-bag.webp"
    ],
    description: [
      {
        type: "p",
        text: "Ideal kit for yard duties or general school first aid, small bag for ease of storage but with all the basic stock required for school first aid."
      },
      {
        type: "heading",
        text: "Contents"
      },
      {
        type: "list",
        items: [
          "1 * Dressing Forceps Nickel Plated 3″",
          "5 * Religlove nitrile powder-free medium/large single pair",
          "1 * Dependaplast washproof plasters assorted wallet of 10",
          "1 * Reliwipe moist saline cleansing wipes sterile pack of 10",
          "2 * Eye pad dressing no.16 with bandage sterile flow wrapped",
          "2 * Medium HSE dressing 12cm x 12cm sterile unboxed",
          "2 * Large HSE dressing 18cm x 18cm sterile unboxed",
          "2 * No 3 extra large dressing sterile unboxed",
          "2 * Relipore 5cm x 7.5cm sterile dressing",
          "2 * Relipore 7.5cm x 7.5cm sterile dressing",
          "2 * Relipore Xtreme 8cm x 10cm sterile dressing",
          "2 * Relipad Low Adherent Dressing Pads Sterile 5cm x 5cm",
          "2 * Relipad Low Adherent Dressing Pads Sterile 7.5cm x 7.5cm",
          "2 * Relipad Low Adherent Dressing Pads Sterile 10cm x 10cm",
          "1 * Relitape microporous tape 2.5cm x 5m",
          "2 * Reliform conforming bandage 5cm x 4m",
          "2 * Reliform conforming bandage 7.5cm x 4m",
          "1 * Relicrepe Crepe Bandage HQ 5.0cm x 4m",
          "2 * Relicrepe Crepe Bandage HQ 7.5cm x 4m",
          "4 * Relief Instant Mini Ice Pack 15 x 13cm",
          "4 * Eye wash single pod of 20ml",
          "1 * Burnsoothe Burn Relief Gel Bottle 50ml",
          "1 * Foil blanket adult size, 130cm x 210cm",
          "4 * Single use triangular bandage 90 x 127cm",
          "1 * Safety pins x 6 assorted",
          "1 * Universal shears small 6″",
          "1 * First aid scissors b/b green handles",
          "1 * Reliance pen torch 1 * CPR Pocket Mask"
        ]
      }
    ]
  },
  {
    slug: "eye-wash-kit-complete",
    name: "Eye Wash Kit, Complete",
    category: "montessori-childcare",
    price: 42,
    images: [
      "/shop/eye-wash-kit-complete.jpg"
    ],
    description: [
      {
        type: "p",
        text: "Evolution Eyewash kit complete in clear eye wash kit box:"
      },
      {
        type: "list",
        items: [
          "3 x 500ml eyewash bottles",
          "2 x No 16"
        ]
      },
      {
        type: "p",
        text: "Bracket not included."
      }
    ]
  },
  {
    slug: "childcare-first-aid-kit-26-to-50-kids",
    name: "Childcare First Aid Kit, 26 to 50 Children",
    category: "montessori-childcare",
    price: 75,
    images: [
      "/shop/childcare-first-aid-kit-26-to-50-kids.jpg"
    ],
    description: [
      {
        type: "heading",
        text: "Contents of kit"
      },
      {
        type: "list",
        items: [
          "40 Adhesive plasters",
          "4 Sterile eye pads (No. 16)",
          "6 Disposable triangular bandages",
          "4 Sterile Wound dressing medium",
          "8 Sterile Wound dressing large",
          "4 Sterile Wound dressing x-large",
          "40 Moist wipes",
          "1 Paramedic shears",
          "10 Pairs of examination gloves",
          "3 Crepe bandage 7.5cm",
          "1 CPR Face Shield",
          "1 Foil blanket",
          "2 Vomit bags",
          "1 Hazard waste bag",
          "1 Pen torch"
        ]
      },
      {
        type: "p",
        text: "Complete in a green first aid box."
      }
    ]
  },
  {
    slug: "childcare-first-aid-kit-11-to-25-kids",
    name: "Childcare First Aid Kit, 11 to 25 Children",
    category: "montessori-childcare",
    price: 65,
    images: [
      "/shop/childcare-first-aid-kit-11-to-25-kids.jpg"
    ],
    description: [
      {
        type: "heading",
        text: "Contents of kit"
      },
      {
        type: "list",
        items: [
          "20 Adhesive plasters",
          "2 Sterile eye pads (No. 16)",
          "6 Disposable triangular bandages",
          "2 Sterile Wound dressing medium",
          "6 Sterile Wound dressing large",
          "3 Sterile Wound dressing x-large",
          "20 Moist wipes",
          "1 Paramedic shears",
          "10 Pairs of examination gloves",
          "2 Crepe bandage 7.5cm",
          "1 CPR Face Shield",
          "1 Foil blanket",
          "2 Vomit bags",
          "1 Hazard waste bag",
          "1 Pen torch"
        ]
      },
      {
        type: "p",
        text: "Complete in a green first aid box (size: 330 x 240 x 100mm)"
      }
    ]
  },
  {
    slug: "childcare-first-aid-kit-1-to-10-kids",
    name: "Childcare First Aid Kit, 1 to 10 Children",
    category: "montessori-childcare",
    price: 45,
    images: [
      "/shop/childcare-first-aid-kit-1-to-10-kids.jpg"
    ],
    description: [
      {
        type: "heading",
        text: "Contents of first aid kit"
      },
      {
        type: "list",
        items: [
          "20 Adhesive plasters",
          "2 Sterile eye pads (No. 16)",
          "2 Disposable triangular bandages",
          "2 Sterile Wound dressing medium",
          "2 Sterile Wound dressing large",
          "2 Sterile Wound dressing x-large",
          "10 Moist wipes",
          "1 Paramedic shears",
          "5 Pairs of examination gloves",
          "1 Crepe bandage 7.5cm",
          "1 CPR Face Shield",
          "1 Foil blanket",
          "2 Vomit bags",
          "1 Hazard waste bag",
          "1 Pen torch"
        ]
      },
      {
        type: "p",
        text: "Complete in a green first aid box (size: 265 x 205 x 45mm)"
      }
    ]
  },
  {
    slug: "phecc-community-first-response-student-handbook",
    name: "PHECC Community First Response Student Handbook",
    category: "books",
    price: 7.95,
    images: [
      "/shop/phecc-community-first-response-student-handbook.jpg"
    ],
    description: [
      {
        type: "p",
        text: "CFR Community Student Handbook."
      }
    ]
  },
  {
    slug: "paediatric-first-aid-manual",
    name: "Paediatric First Aid Manual",
    category: "books",
    price: 4.95,
    images: [
      "/shop/paediatric-first-aid-manual.jpg"
    ],
    description: [
      {
        type: "list",
        items: [
          "Compliant with European resuscitation ILCOR 2015 guidelines",
          "A5 size",
          "76 full colour pages",
          "Printed in Ireland"
        ]
      }
    ]
  },
  {
    slug: "manual-handling-guide",
    name: "Manual Handling Guide",
    category: "books",
    price: 4.95,
    images: [
      "/shop/manual-handling-guide.jpg"
    ],
    description: [
      {
        type: "list",
        items: [
          "48 pages/full colour",
          "comprehensive manual handling handout",
          "Step by step safe lifting technique",
          "packed with illustrations, drawings, photographs"
        ]
      }
    ]
  },
  {
    slug: "fire-safety-manual",
    name: "Fire Safety Manual",
    category: "books",
    price: 4.95,
    images: [
      "/shop/fire-safety-manual.jpg"
    ],
    description: [
      {
        type: "p",
        text: "A comprehensive Fire Safety book which is designed to offer a detailed guide on aspects of fire safety training."
      },
      {
        type: "list",
        items: [
          "Complies with current Fire Safety legislation",
          "Packed with pictures, illustrations and humorous sketches for easy reading",
          "High quality professional book",
          "A5 40 page fire safety book",
          "Ideal for reference on Fire Safety training courses",
          "Written by experts in the field of Fire Safety and reviewed by Pete Pinney MIFSM GIFireE. FRACS FR30 a fire safety consultant",
          "Handy perforated tear out test page and training record"
        ]
      }
    ]
  },
  {
    slug: "first-aid-responder-manual",
    name: "First Aid Responder Manual",
    category: "books",
    price: 6.5,
    images: [
      "/shop/first-aid-responder-manual.jpg"
    ],
    description: [
      {
        type: "list",
        items: [
          "128 pages/full colour",
          "Approved and endorsed by Red Cross, Order of Malta, St John Ambulance",
          "Packed with illustrations, drawings, photographs"
        ]
      }
    ]
  },
  {
    slug: "emergency-first-aid-manual",
    name: "Emergency First Aid Manual",
    category: "books",
    price: 4.95,
    images: [
      "/shop/emergency-first-aid-manual.jpg"
    ],
    description: [
      {
        type: "list",
        items: [
          "Full colour",
          "Perfect for one day first aid training courses or emergency first aid courses.",
          "Packed with illustrations, drawings, photographs",
          "Printed in Ireland"
        ]
      },
      {
        type: "p",
        text: "Great value and professional finish to your course."
      }
    ]
  },
  {
    slug: "mental-health-assistance-guide",
    name: "Mental Health Assistance Guide",
    category: "books",
    price: 4.95,
    images: [
      "/shop/mental-health-assistance-guide.jpg"
    ],
    description: [
      {
        type: "p",
        text: "A Comprehensive Mental Health First Aid book which is designed to offer a detailed guide on aspects of Mental Health First Aid training."
      },
      {
        type: "p",
        text: "This book is designed to assist anyone who is supporting mental health in the workplace and to accompany anyone doing a course delivered by a qualified instructor for a mental health qualification."
      },
      {
        type: "p",
        text: "This book outlines an educational approach to mental health in the workplace covering the effects of poor mental health, common mental health conditions and how to manage mental health in the workplace."
      },
      {
        type: "p",
        text: "Complies with current Mental Health guidelines. The book contains colorful pictures, illustrations and humorous sketches for easy reading. Ideal for reference on Mental Health training courses."
      }
    ]
  },
  {
    slug: "cfr-manual",
    name: "CFR Manual",
    category: "books",
    price: 4.95,
    images: [
      "/shop/cfr-manual.jpg"
    ],
    description: [
      {
        type: "p",
        text: "A Comprehensive CFR Book which is designed to aid and support PHECC Cardiac First Response Course."
      },
      {
        type: "list",
        items: [
          "Book includes Learning on High Quality CPR and AED Use",
          "Complies with current CFR Guidelines",
          "The book contains colourful pictures, illustrations and humorous sketches for easy reading",
          "Ideal for CFR Courses"
        ]
      }
    ]
  }
];

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function productsIn(category: CategorySlug): Product[] {
  return products.filter((product) => product.category === category);
}

const money = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

/** Shop prices carry cents (€0.68, €1,295.00), unlike course prices. */
export function formatMoney(euro: number): string {
  return money.format(euro);
}

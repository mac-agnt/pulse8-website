/**
 * Long-form course content, ported from the course pages on pulse8.ie.
 *
 * Kept apart from `lib/data.ts` on purpose: the card data there is what the
 * /admin dashboard edits, and this is the page body that sits behind each
 * card. Matched to a course by slug. A course with no entry here still gets a
 * page, it just shows the card blurb.
 */

export type DetailSection = {
  heading: string;
  /** paragraphs */
  body?: string[];
  /** a list, rendered after any paragraphs */
  items?: string[];
};

export type CourseDetail = {
  /** opening paragraphs under the title */
  intro: string[];
  sections: DetailSection[];
  /** how long the certificate lasts, when the old page said */
  validity?: string;
  /** purchase link on the Pulse 8 e-learning portal, for courses sold online */
  buyOnlineUrl?: string;
};

export const courseDetails: Record<string, CourseDetail> = {
  "first-aid-response-phecc": {
    intro: [
      "The Health and Safety Authority (HSA) now recognises the PHECC First Aid Response (FAR) training course as meeting the needs of occupational first aid. The FAR Standard was developed by the Pre-Hospital Emergency Care Council (PHECC), an independent statutory body who set the standards for education and training for pre-hospital emergency care in Ireland.",
    ],
    sections: [
      {
        heading: "Programme content",
        items: [
          "Patient assessment",
          "Incident procedures",
          "Cardiac First Response (CPR & AED)",
          "Common medical emergencies (asthma, diabetes, seizures, poisoning & fainting)",
          "Injury management & shock (bleeding, bone injuries, sprains, strains & dislocations, shock)",
          "Care of the unconscious patient",
          "Burns & electrical injury care",
          "Hypothermia & hyperthermia",
          "Information management & communications",
          "The well-being of the first aid responder",
        ],
      },
      {
        heading: "Training methodology",
        body: [
          "The FAR course is a classroom based and instructor led interactive programme utilising a range of training methods such as presentation, group interactions, demonstrations and practical hands-on AED training.",
        ],
      },
      {
        heading: "Course assessments",
        body: [
          "Learners will be assessed on their practical skills and complete an MCQ (Multiple Choice Question) exam.",
        ],
      },
      {
        heading: "Certification",
        body: [
          "On successful completion of training learners will receive a Pre-Hospital Emergency Care Council First Aid Response Certificate which is valid for 2 years.",
        ],
      },
      {
        heading: "Remediation",
        body: [
          "Pulse 8 have a remediation process in place. Learners will be allowed to repeat an assessment in order to achieve a pass mark in both FAR skills and the MCQ (Multiple Choice Questions) paper in line with strict PHECC guidelines for remediation.",
        ],
      },
      {
        heading: "Support for learners",
        body: [
          "Pulse 8 will provide a high level of mentoring to students and will provide specific guidance in relation to the assessment process, in line with learner requirements.",
        ],
      },
      {
        heading: "What you receive",
        items: [
          "Pre-Hospital Emergency Care Council certificate",
          "First Aid Response manual",
          "CPR pocket facemask",
          "Pre-Hospital Emergency Care Council red card",
        ],
      },
      {
        heading: "Progression",
        body: [
          "On completion of this course, learners can progress onto the PHECC CFR Instructor Course or the PHECC FAR Instructor Course.",
        ],
      },
    ],
    validity: "2 years",
  },
  "first-aid-response-blended": {
    intro: [
      "The blended First Aid Response (FAR) course leads to the same PHECC certificate as the classroom course, which the Health and Safety Authority (HSA) recognises as meeting the needs of occupational first aid. The theory is completed online on the Pulse 8 e-learning portal at your own pace, and the practical skills are taught and assessed in person by a PHECC registered instructor.",
    ],
    sections: [
      {
        heading: "How it works",
        items: [
          "Complete the online theory on the Pulse 8 e-learning portal",
          "Attend the instructor-led practical session",
          "Be assessed on your practical skills and complete the MCQ (Multiple Choice Question) exam",
        ],
      },
      {
        heading: "Programme content",
        items: [
          "Patient assessment",
          "Incident procedures",
          "Cardiac First Response (CPR & AED)",
          "Common medical emergencies (asthma, diabetes, seizures, poisoning & fainting)",
          "Injury management & shock (bleeding, bone injuries, sprains, strains & dislocations, shock)",
          "Care of the unconscious patient",
          "Burns & electrical injury care",
          "Hypothermia & hyperthermia",
          "Information management & communications",
          "The well-being of the first aid responder",
        ],
      },
      {
        heading: "Certification",
        body: [
          "On successful completion learners receive a Pre-Hospital Emergency Care Council First Aid Response Certificate, valid for 2 years.",
        ],
      },
    ],
    validity: "2 years",
  },
  "first-aid-response-recertification": {
    intro: [
      "The Pre-Hospital Emergency Care Council (PHECC) of Ireland has designed the First Aid Response (FAR) Standard to offer appropriate training to individuals and groups who require a first aid skill set including cardiac first response. This standard is designed to meet first aid and basic life support (BLS) requirements that a person known as 'First Aid Responder' may encounter. The FAR Standard meets the Health and Safety Authority (HSA) requirement for occupational first aid training for the workplace. The Child and Family Agency (TUSLA) guidance also recognises FAR as the standard for child care.",
      "The First Aid Responder (FAR) Refresher Course can be delivered onsite or offsite as required in Dublin, Limerick and nationwide. The First Aid Responder Refresher Course is delivered by registered Pre-Hospital Emergency Care Council practitioners and instructors.",
    ],
    sections: [
      {
        heading: "Recognition of prior learning",
        body: [
          "Students who wish to qualify for the PHECC FAR 2 day recertification course are required to present Pulse 8 with an in-date PHECC FAR certificate at a minimum of at least one week prior to course commencement. This can be achieved by emailing a scanned copy to info@pulse8.ie.",
        ],
      },
      {
        heading: "FAR refresher course",
        body: [
          "2 day PHECC First Aid Recertification Course (FAR).",
          "The FAR course involves both theory and practical assessments by multiple choice questions (MCQ) and ongoing practical assessments.",
        ],
      },
      {
        heading: "Entry criteria",
        body: [
          "There is no specific entry criterion including a minimum age for undertaking the course. However, a course participant should be mature enough to comprehend the knowledge, skills and implications associated with defibrillation and have a maturity to complete assessment to receive certification.",
        ],
      },
      {
        heading: "Course content",
        items: [
          "Patient assessment",
          "Incident procedures",
          "Cardiac First Response (CPR & AED, choking & stroke)",
          "Common medical emergencies (asthma, diabetes, seizures, poisoning & fainting)",
          "Injury management & shock (bleeding, bone injuries, sprains, strains & dislocations, shock)",
          "Care of the unconscious patient",
          "Burns & electrical injury care",
          "Hypothermia & hyperthermia",
          "Information management & communications",
          "The well-being of the first aid responder",
          "MCQs",
        ],
      },
      {
        heading: "Certification",
        body: [
          "On successful completion each student will receive a PHECC First Aid Response certificate from Pulse 8 valid for two years.",
        ],
      },
    ],
    validity: "2 years",
  },
  "cardiac-first-response": {
    intro: [
      "Cardiac First Response (CFR): this half day course is recognised by the Pre-Hospital Emergency Care Council (PHECC). It teaches all the basic life support skills for victims of stroke, cardiac arrest, heart attack, choking, CPR and defibrillator use as well as the relevant legal issues and the administration of aspirin. It will cover children, adults and infants.",
    ],
    sections: [
      {
        heading: "Prerequisites",
        body: ["There is no prerequisite to enrol on the CFR course."],
      },
      {
        heading: "Certification",
        body: [
          "Upon completion you will receive a Pre-Hospital Emergency Care Council (PHECC) certificate from Pulse 8 valid for two years.",
        ],
      },
    ],
    validity: "2 years",
  },
  "basic-first-aid": {
    intro: [],
    sections: [
      {
        heading: "Course content",
        items: [
          "Patient assessment",
          "Incident procedures",
          "CPR adult, child & infants",
          "Choking adult, child & infants",
          "Recovery position",
          "Heart attack",
          "Stroke",
          "Sprain/strain",
          "Fainting",
          "Head injuries",
          "Bleeding",
          "Fractures",
          "Dislocation",
          "Seizures",
          "Heat exhaustion",
          "Asthma",
          "Hypothermia",
          "Allergic reaction",
          "Poisoning",
        ],
      },
      {
        heading: "Who should attend",
        items: [
          "Anyone in the workplace",
          "Teachers",
          "SNAs",
          "Coaches/instructors",
          "Members of the public",
          "New parents",
          "Childcare staff",
          "Childminders",
          "Families or friends",
        ],
      },
      {
        heading: "Certification",
        body: [
          "Successful completion of the Basic First Aid course leads to a certificate of attendance from Pulse 8 valid for 2 years.",
        ],
      },
    ],
    validity: "2 years",
  },
  "paediatric-first-aid": {
    intro: [],
    sections: [
      {
        heading: "Course content",
        items: [
          "Patient assessment",
          "Incident procedures",
          "CPR child & infants",
          "Choking child & infants",
          "Recovery position",
          "Sprain/strain",
          "Fainting",
          "Head injuries",
          "Bleeding",
          "Fractures",
          "Dislocation",
          "Seizures",
          "Febrile seizures",
          "Heat exhaustion",
          "Asthma",
          "Hypothermia",
          "Allergic reaction",
          "Poisoning",
        ],
      },
      {
        heading: "Who should attend",
        items: [
          "Anyone in the workplace",
          "Teachers",
          "SNAs",
          "Coaches",
          "Members of the public",
          "New parents",
          "Childcare staff",
          "Childminders",
          "Families or friends",
        ],
      },
      {
        heading: "Certification",
        body: [
          "Successful completion of the Paediatric First Aid course leads to a certificate of attendance from Pulse 8 valid for 2 years.",
        ],
      },
    ],
    validity: "2 years",
    buyOnlineUrl:
      "https://www.videotilehost.com/pulse8/purchaseCourse.php?nid=76",
  },
  "school-first-aid-course": {
    intro: [
      "As we all know minor injuries can occur in our schools but in particular in the school yard. Most people tend to panic and are at times unsure as to what to do and how to treat the child. Children love to have fun and at times accidents will happen. This is why Pulse 8 have developed a comprehensive First Aid course for teachers and SNAs that will equip them with the skills they will need in the event of any type of accident.",
    ],
    sections: [
      {
        heading: "Course overview",
        body: [
          "CPR, choking, recovery position, introduction to the AED, fractures, sprains, dislocations, asthma, head injuries, concussion, nose bleeds, allergies, epilepsy, diabetes and more.",
        ],
      },
      {
        heading: "School first aid courses include",
        items: [
          "Two-hour introduction to First Aid as part of the 'Croke Park hours'",
          "First Aid course for 5th and 6th class students",
          "One day Paediatric First Aid",
        ],
      },
      {
        heading: "Ask yourself the following",
        body: [
          "If your school does not have staff trained and in date in terms of certified first aiders, then it may be time to contact us.",
        ],
        items: [
          "How many of your staff members are trained to deliver First Aid?",
          "When did they last complete a First Aid course?",
          "Does your school have a First Aid policy in place?",
        ],
      },
      {
        heading: "2 hour first aid courses for teachers",
        body: [
          "In addition to the one-day course we also provide shorter courses (2 hours) which are extremely popular as part of the 'Croke Park hours'. This short course is perfect for teachers who may come across an accident in the classroom or indeed a medical emergency such as an asthma attack or a seizure.",
        ],
      },
      {
        heading: "Our trainers",
        body: [
          "Pulse 8 is an Approved Training Institute with PHECC (Pre-Hospital Emergency Care Council).",
          "At Pulse 8 we are very passionate about providing all the schools with a very highly professional service. We are the leading provider in Dublin and indeed throughout Ireland.",
          "All our trainers are Occupational First Aid Instructors, Paramedics, Advanced Paramedics and fire fighters. They are all fully insured and are affiliated with Pulse 8.",
          "All instructors are monitored on an ongoing basis so we can stand over our quality assurance.",
        ],
      },
    ],
  },
  "sports-first-aid": {
    intro: [],
    sections: [
      {
        heading: "Course content",
        items: [
          "Activation of the EMS",
          "Patient assessment",
          "Incident procedures",
          "CPR adult & child",
          "AED",
          "Choking adult & child",
          "Recovery position",
          "Heart attack",
          "Stroke",
          "Sprain/strain",
          "Fainting",
          "Shock",
          "Head injuries",
          "Fractures",
          "Dislocation",
          "Bleeding",
          "Asthma",
          "Seizures",
          "Heat exhaustion",
          "Hypothermia",
          "Allergic reaction",
          "Poisoning",
        ],
      },
      {
        heading: "Who should attend",
        items: [
          "Coaches",
          "Instructors",
          "Physios",
          "Members of the public",
          "Players",
          "Parents",
          "Families or friends",
        ],
      },
      {
        heading: "Certification",
        body: [
          "Successful completion of the Sports First Aid course leads to a certificate of attendance from Pulse 8 which is valid for 2 years.",
        ],
      },
    ],
    validity: "2 years",
  },
  "cpr-for-family-friends": {
    intro: [
      "The aim of the CPR for family and friends course is to teach you CPR skills. It will also teach you the importance of your role in the chain of survival.",
      "The atmosphere is always relaxed to help you enjoy and learn from the course. Your instructor will give all the help you need in making sure you feel confident in providing CPR if the situation ever arises. The course should take around 2.5 hours and is suitable for anyone who may be interested in learning basic skills in CPR.",
    ],
    sections: [
      {
        heading: "Booking for individuals",
        body: [
          "The course is open for any individual to take part in, just call us for the next course date.",
        ],
      },
      {
        heading: "Booking for groups/companies",
        body: [
          "This course can be run for any company/business. We can also run the course on weekends, and it can be tailored to meet your company's needs.",
        ],
      },
      {
        heading: "Need a course urgently?",
        body: [
          "If you require this course for work or a safety audit, we can arrange it anytime, even if it's for just one person, just call or email for a quote.",
        ],
      },
    ],
  },
  "emergency-first-aid-at-work-online": {
    intro: [
      "This emergency aid course will highlight some of the most common situations that you might come across and the actions that you can take to help.",
      "In the most serious situations a first aider's role will be to assess the scene so that accurate information can be passed to emergency services and then to act appropriately to try and increase the patient's odds of survival.",
    ],
    sections: [],
    buyOnlineUrl:
      "https://www.videotilehost.com/pulse8/purchaseCourse.php?nid=28",
  },
  "fire-marshal": {
    intro: [
      "The main outcome of this training course is to provide you with the knowledge to carry out the functions of a fire marshal.",
      "Please note, this course also contains all of the content in the Basic Fire Awareness and Fire Extinguisher courses.",
    ],
    sections: [],
    buyOnlineUrl:
      "https://www.videotilehost.com/pulse8/purchaseCourse.php?nid=15",
  },
  "fire-safety-awareness": {
    intro: [
      "This 2.5 hour Fire Safety Training Course will train participants and give them the confidence to deal with fire in an emergency. As an important component of the training a practical demonstration regarding escape routes and identification of hazards is also included.",
      "Participants will also gain valuable 'hands on' experience using a fire extinguisher. This course will emphasise the dangers of fire, the importance of prevention, and the necessity of urgent action if a fire breaks out.",
    ],
    sections: [
      {
        heading: "Modules covered",
        items: [
          "Course introduction and objectives",
          "Theory of fire and smoke behaviour",
          "Spread of fire",
          "Classification of fires",
          "Fire prevention and evacuation procedures (site specific)",
          "How to make evacuation realistic",
          "Duties of a fire warden",
          "Identify possible fire hazards in the workplace",
          "Identify if your workplace is equipped with appropriate detectors, fire alarms, and fire fighting equipment",
          "Ensure fire equipment is inspected and maintained",
        ],
      },
      {
        heading: "Who should attend",
        items: ["All staff"],
      },
      {
        heading: "Certification",
        body: [
          "Successful completion of the Fire Awareness course leads to a certificate of attendance from Pulse 8 valid for 2 years. You will need to do this course again to renew your certification.",
        ],
      },
    ],
    validity: "2 years",
    buyOnlineUrl:
      "https://www.videotilehost.com/pulse8/purchaseCourse.php?nid=13",
  },
  "manual-handling-training": {
    intro: [],
    sections: [
      {
        heading: "Theory training",
        body: [
          "The theory training will be completed via our online training portal. The course is divided into 6 modules that cover the following:",
        ],
        items: [
          "What is manual handling",
          "Law",
          "Safe handling",
          "Learning safe handling habits",
          "Practical manual handling solutions",
          "Use of mechanical aids",
        ],
      },
      {
        heading: "Practical session",
        body: [
          "The practical session which is conducted via video call with our course co-ordinator will consist of the training demonstrations of the following techniques:",
        ],
        items: ["Ground lift", "Bench lift", "Lifting to a height", "Team lift"],
      },
      {
        heading: "Prerequisites",
        body: [
          "There are no prerequisites for the Manual Handling theory course. For the Manual Handling practical session you will need a stable internet connection and a camera for the video call.",
        ],
      },
      {
        heading: "Certification",
        body: [
          "On completion of both the Manual Handling theory and the practical training you will receive a full Manual Handling Certificate which will be valid for 3 years.",
        ],
      },
    ],
    validity: "3 years",
    buyOnlineUrl:
      "https://www.videotilehost.com/pulse8/purchaseCourse.php?nid=9",
  },
  "patient-moving-handling-course": {
    intro: [
      "This training will show your staff how to lift patients, particularly elderly or incapacitated people and therefore avoid back injuries. Pulse 8 will train your staff in how to lift people safely therefore avoiding compensation claims and create a safe environment for those they take care of.",
      "To comply with current Health and Safety legislation, SHW at Work (General App) Regulations 2007, Part 2 Workplace and Work Equipment, Chapter 4 'Manual Handling of Loads' and Amendment Regulations 2007, nurses, healthcare staff and care assistants engaged in patient handling must be given training in safe lifting techniques.",
    ],
    sections: [
      {
        heading: "Patient handling training objective and learning outcomes",
        body: [
          "Upon successful completion of this course participants will gain the skills and knowledge necessary to:",
        ],
        items: [
          "Explain their legal rights and responsibilities",
          "Explain how the musculoskeletal system can get injured",
          "Identify risk factors associated with patient handling",
          "Apply the principles of safe lifting to inanimate objects",
          "Handle patients safely",
          "Recognise a load which is too heavy or awkward",
          "Understand the limitations of the spine and muscular system",
          "Conduct a patient handling risk assessment",
          "Lift and handle patients safely",
          "Understand correct lifting techniques",
        ],
      },
      {
        heading: "Course content",
        items: [
          "Legislation",
          "Dangers of unsafe lifting",
          "Overview of safety legislation",
          "Anatomy of the spine and muscular system",
          "Safe lifting points",
          "Injuries associated with manual handling",
          "Importance of exercise and nutrition",
          "Competence testing",
          "Dangers of careless and unskilled methods",
          "Principles of levers and laws of motion",
          "Potential harm through incorrect patient handling techniques",
          "Importance of physical fitness",
          "Personal protective equipment",
          "Patient handling aids and techniques",
          "Normal patient movement",
          "Patient risk assessment",
          "Patient profiling",
          "Use of hoists and other lifting/moving equipment",
        ],
      },
    ],
  },
  "workplace-health-and-safety": {
    intro: [
      "At the end of this course you will have an understanding of health and safety legislation and you'll be able to list common causes of accidents.",
      "You'll also be able to understand good practice in relation to electricity and describe the use of safe manual handling techniques as well as be able to describe good practice associated with COSHH regulations, be able to describe your action in the event of a fire and also you will know how to deal with an accident.",
    ],
    sections: [],
    buyOnlineUrl:
      "https://www.videotilehost.com/pulse8/purchaseCourse.php?nid=63",
  },
  "vdu-training": {
    intro: [
      "This course is essential for all personnel responsible for VDU assessments in their workplace. In order to complete these assessments they must have reached a certain level of competence. This course will equip them with the relevant knowledge and skills needed to complete these assessments.",
    ],
    sections: [
      {
        heading: "Learning outcomes",
        items: [
          "Understanding the requirements of the General Application Regulations 2007",
          "Understanding the factors that constitute an assessment",
          "Understanding ergonomic factors and VDU workstation layout",
          "Appreciating the postural implications of VDU workstations",
          "The knowledge to carry out VDU workstation assessments and advise operators",
        ],
      },
      {
        heading: "Course content",
        items: [
          "Introduction",
          "Ergonomics and anthropometrics",
          "An introduction to the relationships between the individual, the task, the environment and the work equipment",
          "Legal requirements",
          "Discussion on Irish and European legislation pertaining to VDU",
          "Perceived and real hazards of VDU work",
          "Controversial topics ranging from alleged reproductive hazards to radioactive emissions, which have been associated with VDU, will be addressed. Recent studies and their results will also be examined",
          "Principles and aims of assessment",
          "Assessment techniques",
        ],
      },
      {
        heading: "Designed for",
        body: [
          "All managers, supervisors or office personnel responsible for VDU operations and workstations.",
        ],
      },
      {
        heading: "Training methodology",
        body: [
          "Classroom based and where possible practical demonstration to reinforce learning.",
        ],
      },
      {
        heading: "Certification",
        body: [
          "Upon finishing the course a certificate of completion will be issued.",
        ],
      },
    ],
  },
  "safeguarding-children": {
    intro: [
      "Our Safeguarding courses have been created because, first and foremost, each and every one of us has basic human rights. Chief among these is the right to be healthy, happy and treated well, regardless of race, age, gender or location.",
      "When these rights are abused in some way it's wrong, and it is therefore vital that guidelines, policies and procedures are followed to enable everyone, without exception, to live a life in which these basic values and rights are maintained and upheld.",
      "Everyone, regardless of their age, gender, religion, ethnicity or background has the right to a healthy, happy life. Safeguarding is about minimising and managing the risks to vulnerable individuals.",
      "This course, 'Safeguarding Children', is aimed at anyone who has a duty of care for, or comes into contact with, children in their chosen profession. Although most children are brought up in loving, nurturing environments and grow up to lead happy lives, the subject has to be discussed in order to better protect those children that need it most.",
      "During this course you will hear many facts, figures and details surrounding the risk to children, the types of abuse suffered, how to recognise the signs of abuse and key safeguarding legislations put in place to minimise the abuse of children. Once you are able to recognise the signs of possible abuse, and know the steps you should take if you suspect it, you will be better able to protect the children in your care.",
    ],
    sections: [
      {
        heading: "Accreditation",
        body: ["CPD approved"],
      },
    ],
    buyOnlineUrl:
      "https://www.videotilehost.com/pulse8/purchaseCourse.php?nid=29",
  },
  "equality-diversity-and-discrimination": {
    intro: [
      "We've all heard and used the words 'equality' and 'diversity' before but what do they actually mean and how do they affect you as an employer or employee?",
      "Well, if you take the words on their own they are actually quite different. Equality is the state of being equal, especially in rights and opportunities. Diversity is the state of being different or varied.",
      "However, these 2 things should not be seen as opposite to each other; after all, people can be different but they still have the same rights. When it comes to places of work there is legislation in place to ensure that we all meet our responsibilities in relation to equality and diversity. And one way to make sure we meet these responsibilities is through training.",
    ],
    sections: [
      {
        heading: "Accreditation",
        body: ["CPD approved"],
      },
    ],
    buyOnlineUrl:
      "https://www.videotilehost.com/pulse8/purchaseCourse.php?nid=35",
  },
  "level-1-food-safety-manufacturing": {
    intro: [
      "Food handlers and their employers have a legal duty to manage food safety. These obligations are set out by a number of EU and UK laws. These laws state that food handlers must make sure that food which is prepared, cooked, served or sold, is safe for human consumption. Failing to follow food safety standards can cause food to become contaminated with potentially fatal consequences.",
      "Training your employees with our online system will go a long way to give them greater awareness of the dangers that poor food safety standards pose, as well as covering how food safety risks actually arise and how to control and prevent them.",
    ],
    sections: [
      {
        heading: "Accreditation",
        body: [
          "CPD, IIRSM, Gatehouse Awards, Institute of Hospitality and IOSH approved",
        ],
      },
      {
        heading: "Who should attend",
        body: [
          "The Level 1 Awards in Food Safety provide an ideal solution to staff induction training including:",
        ],
        items: [
          "New employees with minimal or no prior food safety knowledge",
          "Employees handling low-risk or wrapped foods (category A)",
          "Front of house employees, such as waiting or check out staff",
          "Back of house employees, such as kitchen porters or warehouse staff",
        ],
      },
      {
        heading: "Course level",
        body: [
          "Please note that this course is level 1 in terms of the subject knowledge level of the content presented and the course does not lead to a formal level 1 qualification.",
        ],
      },
      {
        heading: "Learning objectives",
        body: ["By the end of this course, you will be able to:"],
        items: [
          "Identify the key legislation involved with food safety and its application to the food manufacturing workplace",
          "Recognise hazards that can occur during delivery through to service of food and how to contain them",
          "Understand the nature of micro-organisms and their link to food borne illnesses and food poisoning",
          "State the safety procedures and how they assist with controlling risk in the work environment",
          "Demonstrate understanding of the importance of effective pest control",
        ],
      },
    ],
  },
};

export function getCourseDetail(slug: string): CourseDetail | undefined {
  return courseDetails[slug];
}

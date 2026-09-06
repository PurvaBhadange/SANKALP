export type Language = "en" | "hi" | "mr";

export interface TranslationDictionary {
  [key: string]: {
    en: string;
    hi: string;
    mr: string;
  };
}

export const translations: TranslationDictionary = {
  // Top Header Bar
  portal_subtitle: {
    en: "GOVERNMENT OF INDIA INNOVATION PORTAL",
    hi: "भारत सरकार नवोन्मेष पोर्टल",
    mr: "भारत सरकार नवसंशोधन पोर्टल"
  },
  scaleup_runway: {
    en: "NATIONAL INNOVATION SCALE-UP RUNWAY",
    hi: "राष्ट्रीय नवोन्मेष स्केल-अप रनवे",
    mr: "राष्ट्रीय नवसंशोधन स्केल-अप रनवे"
  },
  helpdesk_faqs: {
    en: "HELPDESK & FAQS",
    hi: "हेल्पडेस्क और प्रश्नोत्तर",
    mr: "हेल्पडेस्क आणि प्रश्नोत्तरे"
  },

  // Navbar Links & Branding
  brand_title: {
    en: "SANKALP",
    hi: "संकल्प",
    mr: "संकल्प"
  },
  gov_tech_tag: {
    en: "GOV TECH",
    hi: "गव टेक",
    mr: "गव्ह टेक"
  },
  platform_tagline: {
    en: "National Innovation Marketplace",
    hi: "राष्ट्रीय नवोन्मेष बाज़ार",
    mr: "राष्ट्रीय नवसंशोधन बाजारपेठ"
  },
  search_placeholder: {
    en: "Search challenges, sectors, pilots...",
    hi: "चुनौतियाँ, क्षेत्र, पायलट खोजें...",
    mr: "आव्हाने, क्षेत्रे, पायलट शोधा..."
  },
  nav_home: {
    en: "Home",
    hi: "होम",
    mr: "मुख्यपृष्ठ"
  },
  nav_challenges: {
    en: "Challenges",
    hi: "चुनौतियाँ",
    mr: "आव्हाने"
  },
  nav_sectors: {
    en: "Sector Hubs",
    hi: "क्षेत्र हब",
    mr: "क्षेत्र हब"
  },
  nav_pilots: {
    en: "Pilot Runway",
    hi: "पायलट रनवे",
    mr: "पायलट रनवे"
  },
  nav_startups: {
    en: "Startups",
    hi: "स्टार्टअप्स",
    mr: "स्टार्टअप्स"
  },
  nav_officers: {
    en: "Officer Portal",
    hi: "अधिकारी पोर्टल",
    mr: "अधिकारी पोर्टल"
  },
  nav_faqs: {
    en: "FAQs & Help",
    hi: "प्रश्नोत्तर एवं सहायता",
    mr: "प्रश्नोत्तरे व मदत"
  },

  // Auth & Roles
  btn_login: {
    en: "Sign In",
    hi: "साइन इन",
    mr: "साइन इन करा"
  },
  btn_register: {
    en: "Register Startup",
    hi: "स्टार्टअप पंजीकृत करें",
    mr: "स्टार्टअप नोंदणी करा"
  },
  btn_logout: {
    en: "Sign Out",
    hi: "साइन आउट",
    mr: "साइन आउट"
  },
  role_super_admin: {
    en: "SUPER ADMIN",
    hi: "सुपर व्यवस्थापक",
    mr: "सुपर प्रशासक"
  },
  role_officer: {
    en: "OFFICER",
    hi: "अधिकारी",
    mr: "अधिकारी"
  },
  role_procurement: {
    en: "PROCUREMENT",
    hi: "खरीद अधिकारी",
    mr: "खरेदी अधिकारी"
  },
  role_evaluator: {
    en: "EVALUATOR",
    hi: "मूल्यांकनकर्ता",
    mr: "मूल्यमापक"
  },
  role_startup: {
    en: "STARTUP PORTAL",
    hi: "स्टार्टअप पोर्टल",
    mr: "स्टार्टअप पोर्टल"
  },
  role_user: {
    en: "PORTAL USER",
    hi: "पोर्टल उपयोगकर्ता",
    mr: "पोर्टल वापरकर्ता"
  },

  // Homepage Hero
  hero_title_1: {
    en: "BRIDGING PUBLIC SECTOR CHALLENGES WITH",
    hi: "सार्वजनिक क्षेत्र की चुनौतियों को जोड़ना",
    mr: "सार्वजनिक क्षेत्रातील आव्हानांना जोडणे"
  },
  hero_title_highlight: {
    en: "CUTTING-EDGE STARTUP SOLUTIONS",
    hi: "अत्याधुनिक स्टार्टअप समाधानों से",
    mr: "अत्याधुनिक स्टार्टअप उपायांसह"
  },
  hero_desc: {
    en: "The unified procurement runway empowering Indian Ministries & State Departments to issue real-world problem statements, run transparent trials, and procure validated innovations directly.",
    hi: "भारतीय मंत्रालयों और राज्य विभागों को वास्तविक समस्याओं को जारी करने, पारदर्शी परीक्षण चलाने और सीधे मान्यता प्राप्त नवोन्मेषों को खरीदने के लिए सशक्त बनाने वाला मंच।",
    mr: "भारतीय मंत्रालये आणि राज्य विभागांना वास्तविक समस्या मांडणे, पारदर्शक चाचण्या घेणे आणि थेट प्रमाणित नवसंशोधने खरेदी करण्यास सक्षम करणारा मंच."
  },
  btn_explore_challenges: {
    en: "EXPLORE LIVE CHALLENGES",
    hi: "लाइव चुनौतियाँ देखें",
    mr: "थेट आव्हाने पहा"
  },
  btn_submit_proposal: {
    en: "SUBMIT INNOVATION PROPOSAL",
    hi: "नवोन्मेष प्रस्ताव जमा करें",
    mr: "नवसंशोधन प्रस्ताव सादर करा"
  },

  // Homepage Metrics & Sectors
  stat_live_challenges: {
    en: "LIVE CHALLENGES",
    hi: "सक्रिय चुनौतियाँ",
    mr: "सक्रिय आव्हाने"
  },
  stat_active_pilots: {
    en: "ACTIVE PILOTS",
    hi: "सक्रिय पायलट",
    mr: "सक्रिय पायलट"
  },
  stat_funds_allocated: {
    en: "PILOT FUNDING",
    hi: "पायलट फंडिंग",
    mr: "पायलट निधी"
  },
  stat_depts_onboarded: {
    en: "DEPARTMENTS ONBOARDED",
    hi: "शामिल विभाग",
    mr: "सहभागी विभाग"
  },
  sectors_heading: {
    en: "ACTIVE SECTOR INNOVATION HUBS",
    hi: "सक्रिय क्षेत्र नवोन्मेष हब",
    mr: "सक्रिय क्षेत्र नवसंशोधन हब"
  },
  sectors_subheading: {
    en: "Targeted problem statements deployed across key national development sectors.",
    hi: "प्रमुख राष्ट्रीय विकास क्षेत्रों में तैनात लक्षित समस्या कथन।",
    mr: "प्रमुख राष्ट्रीय विकास क्षेत्रांमध्ये तैनात केलेली लक्षित समस्या विधाने."
  },
  sector_agritech_title: {
    en: "AGRITECH & FARMING",
    hi: "कृषि-तकनीक और खेती",
    mr: "ॲग्रीटेक आणि शेती"
  },
  sector_agritech_desc: {
    en: "Autonomous yield monitoring, soil quality sensors & climate-resilient crop analytics for rural missions.",
    hi: "ग्रामीण मिशनों के लिए स्वायत्त उपज निगरानी, मिट्टी की गुणवत्ता सेंसर और जलवायु-लचीला फसल विश्लेषण।",
    mr: "ग्रामीण मोहिमांसाठी स्वायत्त उत्पादन देखरेख, मातीची गुणवत्ता सेन्सर्स आणि हवामान-अनुकूल पीक विश्लेषण."
  },
  sector_mobility_title: {
    en: "SMART MOBILITY & TRANSIT",
    hi: "स्मार्ट गतिशीलता और पारगमन",
    mr: "स्मार्ट मोबिलिटी आणि ट्रान्सिट"
  },
  sector_mobility_desc: {
    en: "AI traffic optimization, EV charging mesh networks, and smart fleet telemetry systems.",
    hi: "एआई ट्रैफिक अनुकूलन, ईवी चार्जिंग मेश नेटवर्क और स्मार्ट बेड़ा टेलीमेट्री सिस्टम।",
    mr: "एआय ट्रॅफिक ऑप्टिमायझेशन, ईव्ही चार्जिंग मेश नेटवर्क आणि स्मार्ट ताफा टेलीमेट्री प्रणाली."
  },
  sector_cleantech_title: {
    en: "CLEANTECH & RENEWABLES",
    hi: "क्लीनटेक और नवीकरणीय ऊर्जा",
    mr: "क्लीनटेक आणि नूतनीकरणक्षम ऊर्जा"
  },
  sector_cleantech_desc: {
    en: "Industrial effluent treatment, carbon audit engines, and zero-emission micro-grid power plants.",
    hi: "औद्योगिक अपशिष्ट उपचार, कार्बन ऑडिट इंजन और शून्य-उत्सर्जन माइक्रो-ग्रिड पावर प्लांट।",
    mr: "औद्योगिक सांडपाणी प्रक्रिया, कार्बन ऑडिट इंजिन आणि शून्य-उत्सर्जन मायक्रो-ग्रिड पॉवर प्लांट."
  },
  sector_healthtech_title: {
    en: "HEALTHCARE & MEDTECH",
    hi: "स्वास्थ्य सेवा और मेडटेक",
    mr: "आरोग्यसेवा आणि मेडटेक"
  },
  sector_healthtech_desc: {
    en: "Tele-ICU nodes, AI diagnostic imaging scanners, and cold-chain vaccine monitoring hardware.",
    hi: "टेली-आईसीयू नोड्स, एआई डायग्नोस्टिक इमेजिंग स्कैनर्स और कोल्ड-चेन वैक्सीन निगरानी हार्डवेयर।",
    mr: "टेली-आयसीयू नोड्स, एआय डायग्नोस्टिक इमेजिंग स्कॅनर्स आणि कोल्ड-चेन लस देखरेख हार्डवेअर."
  },
  btn_view_hub: {
    en: "EXPLORE HUB",
    hi: "हब देखें",
    mr: "हब पहा"
  },

  // Why Choose Section
  why_section_heading: {
    en: "WHY GOV DEPARTMENTS & STARTUPS CHOOSE SANKALP",
    hi: "सरकारी विभाग और स्टार्टअप संकल्प को क्यों चुनते हैं",
    mr: "सरकारी विभाग आणि स्टार्टअप्स संकल्प का निवडतात"
  },
  why_feature_1_title: {
    en: "TRANSPARENT EVALUATION & PILOT GRANTS",
    hi: "पारदर्शी मूल्यांकन और पायलट अनुदान",
    mr: "पारदर्शक मूल्यमापन आणि पायलट अनुदान"
  },
  why_feature_1_desc: {
    en: "Structured multi-stage evaluation by technical juries with upfront pilot deployment funding.",
    hi: "तकनीकी जूरी द्वारा संरचित बहु-स्तरीय मूल्यांकन और अग्रिम पायलट तैनाती वित्तपोषण।",
    mr: "तांत्रिक ज्युरीद्वारे टप्प्याटप्प्याने केलेले मूल्यमापन आणि थेट पायलट तैनाती निधी."
  },
  why_feature_2_title: {
    en: "DIRECT GOVERNMENT PROCUREMENT FAST-TRACK",
    hi: "प्रत्यक्ष सरकारी खरीद फास्ट-ट्रैक",
    mr: "थेट सरकारी खरेदी फास्ट-ट्रॅक"
  },
  why_feature_2_desc: {
    en: "Successful pilot completions unlock streamlined commercial procurement pathways under GeM & department frameworks.",
    hi: "सफल पायलट पूरे होने पर GeM और विभागीय ढांचे के तहत वाणिज्यिक खरीद का मार्ग आसान होता है।",
    mr: "यशस्वी पायलट पूर्ण झाल्यास GeM आणि विभागीय चौकटीअंतर्गत थेट व्यावसायिक खरेदीची वाट मोकळी होते."
  },

  // FAQs Page Translations
  faqs_title: {
    en: "FREQUENTLY ASKED QUESTIONS & HELPDESK",
    hi: "अक्सर पूछे जाने वाले प्रश्न और हेल्पडेस्क",
    mr: "सतत विचारले जाणारे प्रश्न आणि हेल्पडेस्क"
  },
  faqs_subtitle: {
    en: "Everything you need to know about problem statements, pilot trials, eligibility, and procurement policies.",
    hi: "समस्या कथनों, पायलट परीक्षणों, पात्रता और खरीद नीतियों के बारे में सब कुछ जानें।",
    mr: "समस्या विधाने, पायलट चाचण्या, पात्रता आणि खरेदी धोरणांबद्दल सर्व काही जाणून घ्या."
  },
  faq_tab_all: {
    en: "ALL QUESTIONS",
    hi: "सभी प्रश्न",
    mr: "सर्व प्रश्न"
  },
  faq_tab_eligibility: {
    en: "ELIGIBILITY",
    hi: "पात्रता",
    mr: "पात्रता"
  },
  faq_tab_pilots: {
    en: "PILOT TRIALS",
    hi: "पायलट परीक्षण",
    mr: "पायलट चाचण्या"
  },
  faq_tab_governance: {
    en: "GOVERNANCE & Gem",
    hi: "शासन और GeM",
    mr: "प्रशासन आणि GeM"
  },
  faq_tab_ip: {
    en: "IP & ROYALTIES",
    hi: "आईपी और रॉयल्टी",
    mr: "आयपी आणि रॉयल्टी"
  },
  helpdesk_contact_title: {
    en: "STILL HAVE QUESTIONS?",
    hi: "क्या आपके पास अभी भी प्रश्न हैं?",
    mr: "अजूनही काही शंका आहेतका?"
  },
  helpdesk_contact_desc: {
    en: "Our technical desk and procurement officers are here to help startups and departmental leads.",
    hi: "हमारी तकनीकी डेस्क और खरीद अधिकारी स्टार्टअप्स और विभागीय प्रमुखों की सहायता के लिए उपलब्ध हैं।",
    mr: "आमचे तांत्रिक डेस्क आणि खरेदी अधिकारी स्टार्टअप्स व विभागीय प्रमुखांना मदत करण्यास तत्पर आहेत."
  },
  btn_contact_support: {
    en: "CONTACT HELPDESK",
    hi: "हेल्पडेस्क से संपर्क करें",
    mr: "हेल्पडेस्कशी संपर्क साधा"
  },

  // Login & Register Pages
  login_heading: {
    en: "OFFICER & STARTUP PORTAL SIGN IN",
    hi: "अधिकारी एवं स्टार्टअप पोर्टल साइन इन",
    mr: "अधिकारी आणि स्टार्टअप पोर्टल साइन इन"
  },
  login_subheading: {
    en: "Enter your registered credentials to access challenges, proposals, and pilot evaluations.",
    hi: "चुनौतियों, प्रस्तावों और पायलट मूल्यांकनों तक पहुँचने के लिए अपने साख दर्ज करें।",
    mr: "आव्हाने, प्रस्ताव आणि पायलट मूल्यमापनांमध्ये प्रवेश करण्यासाठी तुमची माहिती प्रविष्ट करा."
  },
  field_email: {
    en: "EMAIL ADDRESS",
    hi: "ईमेल आईडी",
    mr: "ईमेल पत्ता"
  },
  field_password: {
    en: "PASSWORD",
    hi: "पासवर्ड",
    mr: "पासवर्ड"
  },
  field_full_name: {
    en: "FULL NAME",
    hi: "पूरा नाम",
    mr: "पूर्ण नाव"
  },
  field_role: {
    en: "ACCOUNT TYPE",
    hi: "खाता प्रकार",
    mr: "खात्याचा प्रकार"
  },
  link_no_account: {
    en: "Don't have an account? Register here",
    hi: "क्या आपके पास खाता नहीं है? यहाँ पंजीकरण करें",
    mr: "खाते नाही का? येथे नोंदणी करा"
  },
  link_have_account: {
    en: "Already registered? Sign in here",
    hi: "पहले से पंजीकृत हैं? यहाँ साइन इन करें",
    mr: "आधीच नोंदणी केली आहे का? येथे साइन इन करा"
  }
};

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class AppLocalizations {
  final Locale locale;

  AppLocalizations(this.locale);

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  static const List<Locale> supportedLocales = [
    Locale('en', ''),
    Locale('hi', ''),
    Locale('te', ''),
    Locale('ta', ''),
    Locale('mr', ''),
  ];

  String get languageCode => locale.languageCode;

  String translate(String key) {
    return _translations[languageCode]?[key] ?? _translations['en']?[key] ?? key;
  }

  String get appName => translate('app_name');
  String get symptomChecker => translate('symptom_checker');
  String get healthPassport => translate('health_passport');
  String get telemedicine => translate('telemedicine');
  String get selectSymptoms => translate('select_symptoms');
  String get selectLanguage => translate('select_language');
  String get continueButton => translate('continue');
  String get back => translate('back');
  String get save => translate('save');
  String get cancel => translate('cancel');
  String get done => translate('done');
  String get emergency => translate('emergency');
  String get visitClinic => translate('visit_clinic');
  String get homeCare => translate('home_care');
  String get possibleConditions => translate('possible_conditions');
  String get severity => translate('severity');
  String get recommendation => translate('recommendation');
  String get redFlags => translate('red_flags');
  String get homeCareAdvice => translate('home_care_advice');
  String get noSymptomsSelected => translate('no_symptoms_selected');
  String get selectAtLeastOne => translate('select_at_least_one');
  String get patientProfile => translate('patient_profile');
  String get vaccinations => translate('vaccinations');
  String get medicalHistory => translate('medical_history');
  String get allergies => translate('allergies');
  String get medicines => translate('medicines');
  String get pregnancy => translate('pregnancy');
  String get appointments => translate('appointments');
  String get prescriptions => translate('prescriptions');
  String get addNew => translate('add_new');
  String get edit => translate('edit');
  String get delete => translate('delete');
  String get name => translate('name');
  String get age => translate('age');
  String get gender => translate('gender');
  String get phone => translate('phone');
  String get address => translate('address');
  String get bloodGroup => translate('blood_group');
  String get emergencyContact => translate('emergency_contact');
  String get allergyAlert => translate('allergy_alert');
  String get noAllergies => translate('no_allergies');
  String get bookAppointment => translate('book_appointment');
  String get selectDoctor => translate('select_doctor');
  String get selectDate => translate('select_date');
  String get selectTime => translate('select_time');
  String get confirmBooking => translate('confirm_booking');
  String get videoCall => translate('video_call');
  String get audioCall => translate('audio_call');
  String get inPerson => translate('in_person');
  String get payment => translate('payment');
  String get upi => translate('upi');
  String get netBanking => translate('net_banking');
  String get cashAtClinic => translate('cash_at_clinic');
  String get payNow => translate('pay_now');
  String get prescription => translate('prescription');
  String get medications => translate('medications');
  String get dosage => translate('dosage');
  String get frequency => translate('frequency');
  String get duration => translate('duration');
  String get instructions => translate('instructions');
  String get followUp => translate('follow_up');
  String get scanQr => translate('scan_qr');
  String get generateQr => translate('generate_qr');
  String get printReport => translate('print_report');
  String get syncNow => translate('sync_now');
  String get lastSynced => translate('last_synced');
  String get offlineMode => translate('offline_mode');
  String get onlineMode => translate('online_mode');
  String get chwMode => translate('chw_mode');
  String get patientMode => translate('patient_mode');
  String get screenPatient => translate('screen_patient');
  String get screeningHistory => translate('screening_history');
  String get searchDoctors => translate('search_doctors');
  String get specialty => translate('specialty');
  String get language => translate('language');
  String get rating => translate('rating');
  String get experience => translate('experience');
  String get fee => translate('fee');
  String get availableSlots => translate('available_slots');
  String get noDoctorsFound => translate('no_doctors_found');
  String get noAppointments => translate('no_appointments');
  String get upcoming => translate('upcoming');
  String get past => translate('past');
  String get remindMe => translate('remind_me');
  String get smsReminder => translate('sms_reminder');
  String get pushReminder => translate('push_reminder');
  String get settings => translate('settings');
  String get about => translate('about');
  String get version => translate('version');
  String get privacyPolicy => translate('privacy_policy');
  String get termsOfService => translate('terms_of_service');
  String get logout => translate('logout');
  String get login => translate('login');
  String get register => translate('register');
  String get forgotPassword => translate('forgot_password');
  String get enterOtp => translate('enter_otp');
  String get verify => translate('verify');
  String get resendOtp => translate('resend_otp');
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return AppLocalizations.supportedLocales.contains(locale);
  }

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(AppLocalizations(locale));
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

final Map<String, Map<String, String>> _translations = {
  'en': {
    'app_name': 'Gram Swasthya',
    'symptom_checker': 'Symptom Checker',
    'health_passport': 'Health Passport',
    'telemedicine': 'Telemedicine',
    'select_symptoms': 'Select your symptoms',
    'select_language': 'Select Language',
    'continue': 'Continue',
    'back': 'Back',
    'save': 'Save',
    'cancel': 'Cancel',
    'done': 'Done',
    'emergency': 'Emergency',
    'visit_clinic': 'Visit Clinic',
    'home_care': 'Home Care',
    'possible_conditions': 'Possible Conditions',
    'severity': 'Severity',
    'recommendation': 'Recommendation',
    'red_flags': 'Red Flags - Seek immediate care if:',
    'home_care_advice': 'Home Care Advice:',
    'no_symptoms_selected': 'No symptoms selected',
    'select_at_least_one': 'Please select at least one symptom',
    'patient_profile': 'Patient Profile',
    'vaccinations': 'Vaccinations',
    'medical_history': 'Medical History',
    'allergies': 'Allergies',
    'medicines': 'Medicines',
    'pregnancy': 'Pregnancy & Child',
    'appointments': 'Appointments',
    'prescriptions': 'Prescriptions',
    'add_new': 'Add New',
    'edit': 'Edit',
    'delete': 'Delete',
    'name': 'Name',
    'age': 'Age',
    'gender': 'Gender',
    'phone': 'Phone',
    'address': 'Address',
    'blood_group': 'Blood Group',
    'emergency_contact': 'Emergency Contact',
    'allergy_alert': '⚠️ Allergy Alert',
    'no_allergies': 'No known allergies',
    'book_appointment': 'Book Appointment',
    'select_doctor': 'Select Doctor',
    'select_date': 'Select Date',
    'select_time': 'Select Time',
    'confirm_booking': 'Confirm Booking',
    'video_call': 'Video Call',
    'audio_call': 'Audio Call',
    'in_person': 'In Person',
    'payment': 'Payment',
    'upi': 'UPI',
    'net_banking': 'Net Banking',
    'cash_at_clinic': 'Cash at Clinic',
    'pay_now': 'Pay Now',
    'prescription': 'Prescription',
    'medications': 'Medications',
    'dosage': 'Dosage',
    'frequency': 'Frequency',
    'duration': 'Duration',
    'instructions': 'Instructions',
    'follow_up': 'Follow-up',
    'scan_qr': 'Scan QR Code',
    'generate_qr': 'Generate QR Code',
    'print_report': 'Print Report',
    'sync_now': 'Sync Now',
    'last_synced': 'Last Synced',
    'offline_mode': 'Offline Mode',
    'online_mode': 'Online Mode',
    'chw_mode': 'CHW Mode',
    'patient_mode': 'Patient Mode',
    'screen_patient': 'Screen Patient',
    'screening_history': 'Screening History',
    'search_doctors': 'Search Doctors',
    'specialty': 'Specialty',
    'language': 'Language',
    'rating': 'Rating',
    'experience': 'Experience',
    'fee': 'Consultation Fee',
    'available_slots': 'Available Slots',
    'no_doctors_found': 'No doctors found',
    'no_appointments': 'No appointments yet',
    'upcoming': 'Upcoming',
    'past': 'Past',
    'remind_me': 'Remind Me',
    'sms_reminder': 'SMS Reminder',
    'push_reminder': 'Push Notification',
    'settings': 'Settings',
    'about': 'About',
    'version': 'Version',
    'privacy_policy': 'Privacy Policy',
    'terms_of_service': 'Terms of Service',
    'logout': 'Logout',
    'login': 'Login',
    'register': 'Register',
    'forgot_password': 'Forgot Password',
    'enter_otp': 'Enter OTP',
    'verify': 'Verify',
    'resend_otp': 'Resend OTP',
  },
  'hi': {
    'app_name': 'ग्राम स्वास्थ्य',
    'symptom_checker': 'लक्षण जांच',
    'health_passport': 'स्वास्थ्य पासपोर्ट',
    'telemedicine': 'टेलीमेडिसिन',
    'select_symptoms': 'अपने लक्षण चुनें',
    'select_language': 'भाषा चुनें',
    'continue': 'जारी रखें',
    'back': 'वापस',
    'save': 'सेव करें',
    'cancel': 'रद्द करें',
    'done': 'हो गया',
    'emergency': 'आपातकाल',
    'visit_clinic': 'क्लिनिक जाएं',
    'home_care': 'घरेलू देखभाल',
    'possible_conditions': 'संभावित स्थितियां',
    'severity': 'गंभीरता',
    'recommendation': 'सिफारिश',
    'red_flags': 'खतरे के संकेत - तुरंत देखभाल लें यदि:',
    'home_care_advice': 'घरेलू देखभाल सलाह:',
    'no_symptoms_selected': 'कोई लक्षण नहीं चुना गया',
    'select_at_least_one': 'कम से कम एक लक्षण चुनें',
    'patient_profile': 'रोगी प्रोफाइल',
    'vaccinations': 'टीकाकरण',
    'medical_history': 'चिकित्सा इतिहास',
    'allergies': 'एलर्जी',
    'medicines': 'दवाएं',
    'pregnancy': 'गर्भावस्था और बच्चा',
    'appointments': 'अपॉइंटमेंट',
    'prescriptions': 'नुस्खे',
    'add_new': 'नया जोड़ें',
    'edit': 'संपादित करें',
    'delete': 'हटाएं',
    'name': 'नाम',
    'age': 'उम्र',
    'gender': 'लिंग',
    'phone': 'फोन',
    'address': 'पता',
    'blood_group': 'ब्लड ग्रुप',
    'emergency_contact': 'आपातकालीन संपर्क',
    'allergy_alert': '⚠️ एलर्जी चेतावनी',
    'no_allergies': 'कोई ज्ञात एलर्जी नहीं',
    'book_appointment': 'अपॉइंटमेंट बुक करें',
    'select_doctor': 'डॉक्टर चुनें',
    'select_date': 'तारीख चुनें',
    'select_time': 'समय चुनें',
    'confirm_booking': 'बुकिंग पुष्टि करें',
    'video_call': 'वीडियो कॉल',
    'audio_call': 'ऑडियो कॉल',
    'in_person': 'व्यक्तिगत रूप से',
    'payment': 'भुगतान',
    'upi': 'यूपीआई',
    'net_banking': 'नेट बैंकिंग',
    'cash_at_clinic': 'क्लिनिक में नकद',
    'pay_now': 'अभी भुगतान करें',
    'prescription': 'नुस्खा',
    'medications': 'दवाएं',
    'dosage': 'खुराक',
    'frequency': 'आवृत्ति',
    'duration': 'अवधि',
    'instructions': 'निर्देश',
    'follow_up': 'फॉलो-अप',
    'scan_qr': 'QR कोड स्कैन करें',
    'generate_qr': 'QR कोड जनरेट करें',
    'print_report': 'रिपोर्ट प्रिंट करें',
    'sync_now': 'अभी सिंक करें',
    'last_synced': 'अंतिम सिंक',
    'offline_mode': 'ऑफलाइन मोड',
    'online_mode': 'ऑनलाइन मोड',
    'chw_mode': 'सीएचडब्ल्यू मोड',
    'patient_mode': 'रोगी मोड',
    'screen_patient': 'रोगी की जांच करें',
    'screening_history': 'जांच इतिहास',
    'search_doctors': 'डॉक्टर खोजें',
    'specialty': 'विशेषता',
    'language': 'भाषा',
    'rating': 'रेटिंग',
    'experience': 'अनुभव',
    'fee': 'परामर्श शुल्क',
    'available_slots': 'उपलब्ध स्लॉट',
    'no_doctors_found': 'कोई डॉक्टर नहीं मिला',
    'no_appointments': 'अभी तक कोई अपॉइंटमेंट नहीं',
    'upcoming': 'आने वाला',
    'past': 'पिछला',
    'remind_me': 'मुझे याद दिलाएं',
    'sms_reminder': 'एसएमएस रिमाइंडर',
    'push_reminder': 'पुश नोटिफिकेशन',
    'settings': 'सेटिंग्स',
    'about': 'बारे में',
    'version': 'संस्करण',
    'privacy_policy': 'गोपनीयता नीति',
    'terms_of_service': 'सेवा की शर्तें',
    'logout': 'लॉगआउट',
    'login': 'लॉगिन',
    'register': 'रजिस्टर',
    'forgot_password': 'पासवर्ड भूल गए',
    'enter_otp': 'OTP दर्ज करें',
    'verify': 'सत्यापित करें',
    'resend_otp': 'OTP फिर से भेजें',
  },
  'te': {
    'app_name': 'గ్రామ باور شش',
    'symptom_checker': 'లక్షణromes',
    'health_passport': 'ఆరోగ్య పాస్‌పోర్టు',
    'telemedicine': 'టెలిమెడిసిన్',
    'select_symptoms': 'మీ లక్షణాలను ఎంచుకోండి',
    'select_language': 'భాషను ఎంచుకోండి',
    'continue': 'ప్రస్తుతం',
    'back': 'వెనుకకు',
    'save': 'సేవ్ చేయండి',
    'cancel': 'రద్దు చేయండి',
    'done': 'పూర్తిగయింది',
    'emergency': 'అత్యవసరం',
    'visit_clinic': 'క్లినిక్ వెళ్ళండి',
    'home_care': 'ఇంటి చర్య',
    'possible_conditions': 'సాధ్యమైన పరిస్థితులు',
    'severity': 'తీవ్రత',
    'recommendation': 'సిఫార్సు',
    'red_flags': 'చెప్పుకోవాల్సినிகా - ప్రతికూల పరిస్థితులలో:',
    'home_care_advice': 'ఇంటి చర్య సలహాలు:',
    'no_symptoms_selected': 'లక్షణాలు ఎంచుకోలేదు',
    'select_at_least_one': 'కొంచెం едно లక్షణం ఎంచుకోండి',
    'patient_profile': 'రోగి ప్రొఫైల్',
    'vaccinations': 'వాక్సీనేషన్లు',
    'medical_history': 'వૈద్య చరిత్ర',
    'allergies': 'అలర్జీలు',
    'medicines': 'మండులు',
    'pregnancy': 'గర్భధారణ మరియు పిల్ల',
    'appointments': 'అపాయింట్మెంట్లు',
    'prescriptions': 'ప్రతిపాదనలు',
    'add_new': 'కొత్తదానిని జోడించు',
    'edit': 'సవరించు',
    'delete': 'మొ utvik',
    'name': 'పేరు',
    'age': 'వయస్సు',
    'gender': 'లింగం',
    'phone': 'ఫోన్',
    'address': 'చిరునామా',
    'blood_group': 'రక్త సమూహం',
    'emergency_contact': 'అత్యవసర సంప్రదிப்பு',
    'allergy_alert': '⚠️ అలర్జీ హెచ్చరిక',
    'no_allergies': 'ఏ అలర్జీలు లేవు',
    'book_appointment': 'అపాయింట్మెంట్ బుక్ చేయండి',
    'select_doctor': 'డాక్టర్‌ను ఎంచుకోండి',
    'select_date': 'తేదీని ఎంచుకోండి',
    'select_time': 'సమయాన్ని ఎంచుకోండి',
    'confirm_booking': 'బుకింగ్‌ను నిర్ధారించండి',
    'video_call': 'వీడియో కాల్',
    'audio_call': 'ఆడియో కాల్',
    'in_person': 'ప్రత్యక్షంగా',
    'payment': 'చెల్లింపు',
    'upi': 'యూపిఐ',
    'net_banking': 'నెట్ బ్యాంకింగ్',
    'cash_at_clinic': 'క్లినిక్‌లో నగదు',
    'pay_now': 'ఇప్పుడు చెల్లించండి',
    'prescription': 'ప్రոշ్క్రిప్షన్',
    'medications': 'మండులు',
    'dosage': 'డోజీ',
    'frequency': 'వేగు',
    'duration': 'కాలం',
    'instructions': 'నిర్దేశాలు',
    'follow_up': 'అనుబంధం',
    'scan_qr': 'QR కోడ్ స్కాన్ చేయండి',
    'generate_qr': 'QR కోడ్ రూపొందించండి',
    'print_report': 'సమాచార장을 মুద్రించు',
    'sync_now': 'ఇప్పుడు సింక్ చేయండి',
    'last_synced': 'చివరి సింక్',
    'offline_mode': 'ఆఫ్‌లైన్ మొడ్',
    'online_mode': 'ఆన్‌లైన్ మొడ్',
    'chw_mode': 'చidium హరచుర్ మోడ్',
    'patient_mode': 'రోగి మోడ్',
    'screen_patient': 'రోగిని పరిశీలించండి',
    'screening_history': 'పరిశీలన చరిత్ర',
    'search_doctors': 'డాక్టర్‌లను సెర్చ్ చేయండి',
    'specialty': 'విశేషణ',
    'language': 'భాష',
    'rating': 'రేటింగ్',
    'experience': 'అనుభవం',
    'fee': 'పరామర్శ ఫీ',
    'available_slots': 'లభ్య స్లాట్లు',
    'no_doctors_found': 'డాక్టర్‌లు దొరకలేదు',
    'no_appointments': 'ఇంకా అపాయింట్మెంట్లు లేవు',
    'upcoming': 'köprüdekiler',
    'past': 'గత',
    'remind_me': 'నాకు గుర్తించండి',
    'sms_reminder': 'ఎస్ఎంఎస్ రిమైండర్',
    'push_reminder': 'పుష్ నోటిఫికేషన్',
    'settings': 'సెట్టింగ్స్',
    'about': 'గురించి',
    'version': 'వెర్షన్',
    'privacy_policy': 'గోప్యతా నీతి',
    'terms_of_service': 'సేవా నియమాలు',
    'logout': 'లాగ్ అవుట్',
    'login': 'లాగిన్',
    'register': 'రజిస్టర్',
    'forgot_password': 'పాస్‌వర్డ్ మర్చిపోయినా',
    'enter_otp': 'ওటిపి నమోదు చేయండి',
    'verify': 'నిర్ధారించండి',
    'resend_otp': 'ఒటిపి پھر పంపండి',
  },
  'ta': {
    'app_name': 'கிராம் சுகாதாரம்',
    'symptom_checker': 'அறிகுறிகள் சரிபார்ப்பு',
    'health_passport': 'சுகாதாரப் பாஸ்போர்ட்',
    'telemedicine': 'தூர மருத்துவம்',
    'select_symptoms': 'உங்கள் அறிகுறிகளைத் தேர்ந்தெடுக்கவும்',
    'select_language': 'மொழியைத் தேர்ந்தெடுக்கவும்',
    'continue': 'தொடரவும்',
    'back': 'பின்னால்',
    'save': 'சேமிக்கவும்',
    'cancel': 'ரத்து செய்யவும்',
    'done': 'முடிந்தது',
    'emergency': 'அவசரநிலை',
    'visit_clinic': 'கிளினிக்கு செல்லுங்கள்',
    'home_care': 'வீட்டு பராமரிப்பு',
    'possible_conditions': 'சாத்தியமான நிலைகள்',
    'severity': 'தீவிரம்',
    'recommendation': 'பரிந்துரை',
    'red_flags': 'சிவப்பு கொடியங்கள் - உடனடி பராமரிப்பு தேவைப்பட்டால்:',
    'home_care_advice': 'வீட்டு பராமரிப்பு குறிப்பு:',
    'no_symptoms_selected': 'அறிகுறிகள் தேர்ந்தெடுக்கப்படவில்லை',
    'select_at_least_one': 'குறைந்தது ஒரு அறிகுறியைத் தேர்ந்தெடுக்கவும்',
    'patient_profile': 'நோயாளி விவரம்',
    'vaccinations': 'தடுப்பூசிகள்',
    'medical_history': 'மருத்துவ வரலாறு',
    'allergies': 'அலர்ஜிகள்',
    'medicines': 'மருந்துகள்',
    'pregnancy': 'கர்ப்பமும் குழந்தையும்',
    'appointments': 'நியமனங்கள்',
    'prescriptions': 'மருந்து திட்டங்கள்',
    'add_new': 'புதியவற்றைக் சேர்க்கவும்',
    'edit': 'திருத்தவும்',
    'delete': 'நீக்கவும்',
    'name': 'பெயர்',
    'age': 'வயது',
    'gender': 'பாலினம்',
    'phone': 'தொலைபேசி',
    'address': 'முகவரி',
    'blood_group': 'இரத்த குழு',
    'emergency_contact': 'அவசர தொடர்பு',
    'allergy_alert': '⚠️ அலர்ஜி எச்சரிக்கை',
    'no_allergies': 'அறியப்பட்ட அலர்ஜிகள் இல்லை',
    'book_appointment': 'நியமനം புக் செய்யவும்',
    'select_doctor': 'மருத்துவரைத் தேர்ந்தெடுக்கவும்',
    'select_date': 'தேதியைத் தேர்ந்தெடுக்கவும்',
    'select_time': 'நேரத்தைத் தேர்ந்தெடுக்கவும்',
    'confirm_booking': 'புக்கிங் உறுதிப்படுத்தவும்',
    'video_call': 'வீடியோ கல்',
    'audio_call': 'ஆடியோ கல்',
    'in_person': 'நேரில்',
    'payment': 'கட்டணம்',
    'upi': 'யூபிஐ',
    'net_banking': 'நெட் பேங்கிங்',
    'cash_at_clinic': 'கிளினிக்கில் கேஷ்',
    'pay_now': 'இப்போது செலுத்தவும்',
    'prescription': 'மருந்து திட்டம்',
    'medications': 'மருந்துகள்',
    'dosage': 'மாத்திரை',
    'frequency': 'அதிர்வு',
    'duration': 'கால அளவு',
    'instructions': 'விளக்கங்கள்',
    'follow_up': 'தொடர்வு',
    'scan_qr': 'QR குறியெழுத்தை ஸ்கேன் செய்யவும்',
    'generate_qr': 'QR குறியெழுத்தை உருவாக்கவும்',
    'print_report': 'அறிக்கையைப் அச்சிடவும்',
    'sync_now': 'இப்போது சிங்க் செய்யவும்',
    'last_synced': 'கடைசி சிங்க்',
    'offline_mode': 'ஆஃப்லைன் мобиட்',
    'online_mode': 'ஆன்லைன் мобиட்',
    'chw_mode': 'சிஎచ்வி மொட்',
    'patient_mode': 'நோயாளி மொட்',
    'screen_patient': 'நோயாளியைப் பரிசோதிக்கவும்',
    'screening_history': 'பரிசோதனை வரலாறு',
    'search_doctors': 'மருத்துவர்களைத் தேடுங்கள்',
    'specialty': 'திறமை',
    'language': 'மொழி',
    'rating': 'மதிப்பீடு',
    'experience': 'அனுபவம்',
    'fee': 'பராமர்ஷ் கட்டணம்',
    'available_slots': 'கிடைக்கும் நேரங்கள்',
    'no_doctors_found': 'மருத்துவர்கள் கிடைக்கவில்லை',
    'no_appointments': 'இன்னும் நியமனங்கள் இல்லை',
    'upcoming': 'வரவிருக்கும்',
    'past': 'கடந்த',
    'remind_me': 'எனக்குத் தூண்டு',
    'sms_reminder': 'எச்எம்எஸ் நினைவூட்டல்',
    'push_reminder': 'பஷ் அறிவிப்பு',
    'settings': 'அமைப்புகள்',
    'about': 'பற்றி',
    'version': 'எம்என்',
    'privacy_policy': 'தனியுரிமை கொள்கை',
    'terms_of_service': 'சேவை நிபந்தனைகள்',
    'logout': 'வெளியேறு',
    'login': 'உள்நுழை',
    'register': 'பதிவு',
    'forgot_password': 'கடவுச்சொல் மறந்துவிட்டது',
    'enter_otp': 'ஓடிபி உள்ளிடவும்',
    'verify': 'சரிபார்க்கவும்',
    'resend_otp': 'ஓடிபியை மீண்டும் அனுப்பவும்',
  },
  'mr': {
    'app_name': 'ग्राम स्वास्थ्य',
    'symptom_checker': 'लक्षण तपासणी',
    'health_passport': 'आरोग्य पासपोर्ट',
    'telemedicine': 'टेलीमेडिसिन',
    'select_symptoms': 'आपले लक्षण निवडा',
    'select_language': 'भाषा निवडा',
    'continue': 'सुरू ठेवा',
    'back': 'मागे',
    'save': 'सेव्ह करा',
    'cancel': 'रद्द करा',
    'done': 'झाले',
    'emergency': 'आपत्कालीन',
    'visit_clinic': 'क्लिनिकला जा',
    'home_care': 'घरगुती काळजी',
    'possible_conditions': 'शक्य अवस्था',
    'severity': 'तीव्रता',
    'recommendation': 'शिफारस',
    'red_flags': 'लाल सिग्नल - त्वरित काळजी घ्या जर:',
    'home_care_advice': 'घरगुती काळजी सल्ला:',
    'no_symptoms_selected': 'कोणतेही लक्षण निवडलेले नाही',
    'select_at_least_one': 'कमीत कमी एक लक्षण निवडा',
    'patient_profile': 'रुग्ण प्रोफाइल',
    'vaccinations': 'लसीकरण',
    'medical_history': 'वैद्यकीय इतिहास',
    'allergies': 'अलर्जी',
    'medicines': 'औषधे',
    'pregnancy': 'गर्भावस्था आणि बाळ',
    'appointments': 'आॅपोईंटमेंट्स',
    'prescriptions': 'औषधोपचार',
    'add_new': 'नवीन जोडा',
    'edit': 'संपादन करा',
    'delete': 'हटवा',
    'name': 'नाव',
    'age': 'वय',
    'gender': 'लिंग',
    'phone': 'फोन',
    'address': 'पत्ता',
    'blood_group': 'रक्तगट',
    'emergency_contact': 'आपत्कालीन संपर्क',
    'allergy_alert': '⚠️ अलर्जी चेतावणी',
    'no_allergies': 'कोणतीही अलर्जी नाही',
    'book_appointment': 'आॅपोईंटमेंट बुक करा',
    'select_doctor': 'डॉक्टर निवडा',
    'select_date': 'तारीख निवडा',
    'select_time': 'वेळ निवडा',
    'confirm_booking': 'बुकिंग पुष्टी करा',
    'video_call': 'व्हिडिओ कॉल',
    'audio_call': 'ऑडिओ कॉल',
    'in_person': 'स्वतः',
    'payment': 'पेमेंट',
    'upi': 'यूपीआय',
    'net_banking': 'नेट बॅंकिंग',
    'cash_at_clinic': 'क्लिनिकमध्ये कॅश',
    'pay_now': 'आता पेमेंट करा',
    'prescription': 'प्रेस्क्रिप्शन',
    'medications': 'औषधे',
    'dosage': 'डोसेज',
    'frequency': 'आवृत्ती',
    'duration': 'कालावधी',
    'instructions': 'सूचना',
    'follow_up': 'फॉलो-अप',
    'scan_qr': 'QR कोड स्कॅन करा',
    'generate_qr': 'QR कोड तयार करा',
    'print_report': 'अहवाल प्रिंट करा',
    'sync_now': 'आता सिंक करा',
    'last_synced': 'शेवटचा सिंक',
    'offline_mode': 'ऑफलाइन मोड',
    'online_mode': 'ऑनलाइन मोड',
    'chw_mode': 'सीएचडब्ल्यू मोड',
    'patient_mode': 'रुग्ण मोड',
    'screen_patient': 'रुग्णाची तपासणी करा',
    'screening_history': 'तपासणी इतिहास',
    'search_doctors': 'डॉक्टर शोधा',
    'specialty': 'विशेषज्ञता',
    'language': 'भाषा',
    'rating': 'रेटिंग',
    'experience': 'अनुभव',
    'fee': 'परामर्श शुल्क',
    'available_slots': 'उपलब्ध स्लॉट्स',
    'no_doctors_found': 'डॉक्टर सापडले नाही',
    'no_appointments': 'अजून कोणतेही आॅपोईंटमेंट नाही',
    'upcoming': 'येणारे',
    'past': 'मागील',
    'remind_me': 'मला लक्षात ठेवा',
    'sms_reminder': 'एसएमएस स्मरणपत्र',
    'push_reminder': 'पुश सूचना',
    'settings': 'सेटिंग्ज',
    'about': 'बद्दल',
    'version': 'वर्जन',
    'privacy_policy': 'गोपनीयता धोरण',
    'terms_of_service': 'सेवा अटी',
    'logout': 'लॉगआउट',
    'login': 'लॉगिन',
    'register': 'नोंदणी',
    'forgot_password': 'पासवर्ड विसरले',
    'enter_otp': 'OTP टाका',
    'verify': 'पडताळा',
    'resend_otp': 'OTP पुन्हा पाठवा',
  },
};
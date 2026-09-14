import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/localization/app_localizations.dart';
import '../../shared/theme/app_theme.dart';
import '../../features/symptom_selection/providers/symptom_provider.dart';
import '../../features/settings/providers/locale_provider.dart';
import '../../features/medicine_reminder/providers/medicine_provider.dart';
import '../../features/pregnancy/providers/pregnancy_provider.dart';
import 'symptom_checker_screen.dart';
import 'health_passport_screen.dart';
import 'telemedicine_screen.dart';
import 'medicine_reminder_screen.dart';
import 'pregnancy_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  late PageController _pageController;

  final List<Widget> _screens = [
    const SymptomCheckerScreen(),
    const HealthPassportScreen(),
    const TelemedicineScreen(),
    const MedicineReminderScreen(),
    const PregnancyScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Scaffold(
      body: PageView(
        controller: _pageController,
        onPageChanged: (index) => setState(() => _currentIndex = index),
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) {
            setState(() => _currentIndex = index);
            _pageController.animateToPage(
              index,
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeInOut,
            );
          },
          items: [
            BottomNavigationBarItem(
              icon: const Icon(Icons.medical_services_outlined),
              activeIcon: const Icon(Icons.medical_services),
              label: l10n.symptomChecker,
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.badge_outlined),
              activeIcon: const Icon(Icons.badge),
              label: l10n.healthPassport,
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.video_call_outlined),
              activeIcon: const Icon(Icons.video_call),
              label: l10n.telemedicine,
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.medication_outlined),
              activeIcon: const Icon(Icons.medication),
              label: l10n.medicines,
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.pregnant_woman_outlined),
              activeIcon: const Icon(Icons.pregnant_woman),
              label: l10n.pregnancy,
            ),
          ],
        ),
      ),
    );
  }
}
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'routes.dart';
import '../core/services/auth_service.dart';
import '../modules/authentication/screens/login_screen.dart';
import '../modules/authentication/screens/signup_screen.dart';

class Oven2DoorApp extends StatelessWidget {
  const Oven2DoorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<AuthService>(
      create: (_) => AuthService(),
      child: MaterialApp(
        title: 'Oven2Door',
        theme: ThemeData.dark().copyWith(
          primaryColor: Colors.redAccent,
          scaffoldBackgroundColor: Colors.black,
          cardColor: Colors.grey[900],
          textTheme: const TextTheme(
            bodyMedium: TextStyle(color: Colors.white),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              textStyle: const TextStyle(fontSize: 16),
            ),
          ),
        ),
        initialRoute: Routes.login,
        routes: {
          Routes.login: (_) => const LoginScreen(),
          Routes.signup: (_) => const SignUpScreen(),
        },
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'app/app.dart'; // keep this if you have an Oven2DoorApp defined elsewhere
import 'modules/authentication/screens/login_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const Oven2DoorApp()); // this should be your real root widget
}

// If you want to use MyApp instead of Oven2DoorApp, do this:
class MyApp extends StatelessWidget {
  const MyApp({super.key}); // add const constructor

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Oven2Door',
      theme: ThemeData.dark().copyWith(
        // global dark theme
        primaryColor: Colors.redAccent,
        scaffoldBackgroundColor: Colors.black,
        textTheme: const TextTheme(
          bodyMedium: TextStyle(color: Colors.white),
        ),
      ),
      home: const LoginScreen(), // point to your login_screen.dart
    );
  }
}

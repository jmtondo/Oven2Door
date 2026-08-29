// App routes definition
import 'package:flutter/material.dart';
import '../modules/authentication/screens/login_screen.dart';

class Routes {
  static const String login = '/login';
  static const String home = '/home'; // placeholder for later
  static const signup = '/signup';

  static Route<dynamic>? onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case login:
        return MaterialPageRoute(builder: (_) => const LoginScreen());
      case home:
        return MaterialPageRoute(
            builder: (_) => const Scaffold(body: Center(child: Text('Home'))));
      default:
        return MaterialPageRoute(builder: (_) => const LoginScreen());
    }
  }
}

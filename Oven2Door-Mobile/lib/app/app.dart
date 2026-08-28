import 'package:flutter/material.dart';
import 'routes.dart';
import '../app/theme.dart';
import '../core/services/auth_service.dart';
import 'package:provider/provider.dart';

class Oven2DoorApp extends StatelessWidget {
  const Oven2DoorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<AuthService>(
      create: (_) => AuthService(),
      child: MaterialApp(
        title: 'Oven2Door',
        theme: AppTheme.light(),
        initialRoute: Routes.login,
        onGenerateRoute: Routes.onGenerateRoute,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}

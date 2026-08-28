import 'package:flutter/material.dart';
import 'package:oven2door_mobile/core/services/auth_service.dart';

class AuthController {
  final AuthService authService;
  AuthController({required this.authService});

  Future<AuthResult> signIn({required String email, required String password}) {
    return authService.signIn(email: email, password: password);
  }
}

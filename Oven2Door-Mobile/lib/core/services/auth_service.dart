library oven2door_mobile.core.services.auth_service;

import 'package:flutter/material.dart';

/// Result object for authentication attempts
class AuthResult {
  final bool success;
  final String message;

  AuthResult({required this.success, required this.message});
}

/// AuthService handles login/logout and token management.
/// Replace the stubbed logic with your API integration.
class AuthService extends ChangeNotifier {
  String? _token;
  bool get isLoggedIn => _token != null;

  Future<AuthResult> signIn({
    required String email,
    required String password,
  }) async {
    // TODO: Replace with call to your API client (auth_api.dart)
    await Future.delayed(const Duration(seconds: 1));

    if (email == 'demo@oven2door.com' && password == 'password') {
      _token = 'fake_token';
      notifyListeners();
      return AuthResult(success: true, message: 'Login successful');
    }
    return AuthResult(success: false, message: 'Invalid credentials');
  }

  void signOut() {
    _token = null;
    notifyListeners();
  }
}

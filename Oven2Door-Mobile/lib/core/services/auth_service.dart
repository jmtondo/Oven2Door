library oven2door_mobile.core.services.auth_service;

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Result object for authentication attempts
class AuthResult {
  final bool success;
  final String message;

  AuthResult({required this.success, required this.message});
}

/// AuthService handles login/logout and token management.
class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  User? get currentUser => _auth.currentUser;
  bool get isLoggedIn => currentUser != null;

  Future<AuthResult> signIn({
    required String email,
    required String password,
  }) async {
    try {
      await _auth.signInWithEmailAndPassword(email: email, password: password);
      notifyListeners();
      return AuthResult(success: true, message: 'Login successful');
    } on FirebaseAuthException catch (e) {
      return AuthResult(success: false, message: e.message ?? 'Login failed');
    } catch (e) {
      return AuthResult(success: false, message: 'Unexpected error: $e');
    }
  }

  Future<AuthResult> signUp({
    required String email,
    required String password,
  }) async {
    try {
      await _auth.createUserWithEmailAndPassword(email: email, password: password);
      notifyListeners();
      return AuthResult(success: true, message: 'Account created successfully');
    } on FirebaseAuthException catch (e) {
      return AuthResult(success: false, message: e.message ?? 'Signup failed');
    } catch (e) {
      return AuthResult(success: false, message: 'Unexpected error: $e');
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
    notifyListeners();
  }
}

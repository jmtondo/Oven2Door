library oven2door_mobile.core.services.auth_service;

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../api/auth_api.dart';

/// Result object for authentication attempts
class AuthResult {
  final bool success;
  final String message;

  AuthResult({required this.success, required this.message});
}

/// AuthService handles login/logout and token management.
class AuthService extends ChangeNotifier {
  AuthService({FirebaseAuth? firebaseAuth, AuthApi? authApi})
      : _auth = firebaseAuth ?? FirebaseAuth.instance,
        _authApi = authApi ?? AuthApi();

  final FirebaseAuth _auth;
  final AuthApi _authApi;

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
    required String firstName,
    required String lastName,
    required String phone,
  }) async {
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      final idToken = await credential.user?.getIdToken();
      if (idToken == null) {
        return AuthResult(
          success: false,
          message: 'Could not verify the new Firebase account.',
        );
      }

      await _authApi.signUp(
        idToken: idToken,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
      );
      notifyListeners();
      return AuthResult(success: true, message: 'Account created successfully');
    } on FirebaseAuthException catch (e) {
      return AuthResult(success: false, message: e.message ?? 'Signup failed');
    } on AuthApiException catch (e) {
      return AuthResult(
        success: false,
        message: 'Firebase account was created, but MySQL sync failed: ${e.message}',
      );
    } catch (e) {
      return AuthResult(success: false, message: 'Unexpected error: $e');
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
    notifyListeners();
  }
}

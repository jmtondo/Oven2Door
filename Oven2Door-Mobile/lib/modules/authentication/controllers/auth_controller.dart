import 'package:oven2door_mobile/core/services/auth_service.dart';

class AuthController {
  final AuthService authService;

  AuthController({required this.authService});

  Future<AuthResult> signIn({
    required String email,
    required String password,
  }) async {
    return await authService.signIn(email: email, password: password);
  }

  Future<AuthResult> signUp({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String phone,
  }) async {
    return await authService.signUp(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
    );
  }
}

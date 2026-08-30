import 'dart:convert';

import 'package:http/http.dart' as http;

/// Client for the server endpoints that mirror Firebase users to MySQL.
class AuthApi {
  AuthApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  // Android emulators reach the computer's localhost through 10.0.2.2.
  // Override this for a physical device or a deployed server, for example:
  // --dart-define=API_BASE_URL=http://192.168.1.20:3000/api
  static const _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api',
  );

  Future<void> signUp({
    required String idToken,
    required String firstName,
    required String lastName,
    required String email,
    required String phone,
  }) async {
    final response = await _client.post(
      Uri.parse('$_baseUrl/signup'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({
        'idToken': idToken,
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'phone': phone,
      }),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) return;

    String message = 'Could not save the account to MySQL.';
    try {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      message = body['message'] as String? ?? message;
    } catch (_) {
      // The server did not return JSON; retain the safe fallback message.
    }
    throw AuthApiException(message);
  }
}

class AuthApiException implements Exception {
  AuthApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

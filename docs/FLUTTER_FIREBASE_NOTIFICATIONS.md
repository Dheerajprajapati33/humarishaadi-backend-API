# Flutter Firebase Push Notifications Integration Guide
**HumaariShaadi Matrimonial Backend (`humarishaadi-1488e`)**

This guide provides a complete, copy-paste-ready implementation for integrating **Firebase Cloud Messaging (FCM) Push Notifications** into your Flutter mobile application for both **Foreground**, **Background**, and **Terminated (App Closed)** states.

---

## 📋 Table of Contents
1. [Architecture & Backend Flow](#1-architecture--backend-flow)
2. [Firebase Project Setup (FlutterFire CLI)](#2-firebase-project-setup-flutterfire-cli)
3. [Dependencies (`pubspec.yaml`)](#3-dependencies-pubspecyaml)
4. [Platform Configurations (Android & iOS)](#4-platform-configurations-android--ios)
5. [Notification Service (`lib/services/notification_service.dart`)](#5-notification-service-libservicesnotification_servicedart)
6. [App Entry Point (`lib/main.dart`)](#6-app-entry-point-libmaindart)
7. [Notification Tap & Deep-Link Navigation](#7-notification-tap--deep-link-navigation)
8. [Testing & Verification](#8-testing--verification)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Architecture & Backend Flow

```
+--------------------------------------------------------------------------------+
|                             FLUTTER MOBILE APP                                 |
+--------------------------------------------------------------------------------+
       |                                                    |
       | 1. App starts -> Generates FCM Device Token        |
       | 2. User logs in -> Sends Token to Backend          |
       v                                                    |
+------------------------------------------+                |
| POST /api/v1/notifications/device-token  |                |
+------------------------------------------+                |
       |                                                    |
       v                                                    |
+------------------------------------------+                |
|           HUMAARISHAADI BACKEND          |                |
|     (Persists token in User.fcmTokens)   |                |
+------------------------------------------+                |
       |                                                    |
       | Action happens (Chat message, Like, Shortlist)     |
       v                                                    |
+------------------------------------------+                |
|      Firebase Admin SDK (FCM Server)     |                |
+------------------------------------------+                |
       |                                                    |
       | Push Notification dispatched                       v
       +=========================================> [Mobile Device Alerts]
                                                    - App Open: Heads-up Alert
                                                    - Background: System Tray
                                                    - Closed: Lock Screen Alert
```

### Backend Endpoints Available:
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/notifications/device-token` | Register device FCM token on login/launch |
| `DELETE` | `/api/v1/notifications/device-token` | Unregister token on logout |
| `POST` | `/api/v1/notifications/send-test` | Dispatch a test notification to logged-in user |

---

## 2. Firebase Project Setup (FlutterFire CLI)

Your backend is already connected to Firebase project: **`humarishaadi-1488e`**. Connect your Flutter app to the exact same project:

### Step 2.1: Install FlutterFire CLI
Run in terminal:
```bash
# Install Firebase Tools (if not already installed)
npm install -g firebase-tools

# Login to Firebase (use the Google account that has humarishaadi-1488e)
firebase login

# Activate FlutterFire CLI
dart pub global activate flutterfire_cli
```

### Step 2.2: Configure your Flutter App
In the **root directory of your Flutter project**, run:
```bash
flutterfire configure --project=humarishaadi-1488e
```
- Select platforms: **Android** and **iOS** (and Web if applicable).
- This will automatically:
  - Register your Android app package (e.g., `com.humarishaadi.app`).
  - Download `android/app/google-services.json`.
  - Download `ios/Runner/GoogleService-Info.plist`.
  - Generate `lib/firebase_options.dart`.

---

## 3. Dependencies (`pubspec.yaml`)

Add the required packages to your Flutter `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter

  # Firebase Core & Messaging
  firebase_core: ^3.6.0
  firebase_messaging: ^15.1.3

  # Local notifications (Required to show heads-up popups when app is FOREGROUND)
  flutter_local_notifications: ^17.2.3

  # HTTP client for communicating with backend
  http: ^1.2.2
```

Run:
```bash
flutter pub get
```

---

## 4. Platform Configurations (Android & iOS)

### 4.1 Android Setup

#### A. Edit `android/app/src/main/AndroidManifest.xml`
Add permissions and notification channel inside the `<manifest>` and `<application>` tags:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions for Android 13+ (API 33+) Push Notifications -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <application
        android:label="HumaariShaadi"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher">

        <!-- Default Notification Channel (Must match backend channelId) -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="humaari_shaadi_alerts" />

        <!-- Notification Default Icon -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@mipmap/ic_launcher" />

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
```

#### B. Check `android/app/build.gradle`
Ensure minimum SDK is at least 21:
```groovy
android {
    compileSdkVersion 34

    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 34
        multiDexEnabled true
    }
}
```

---

### 4.2 iOS Setup

1. Open the `ios` folder in **Xcode**.
2. Select the `Runner` target -> **Signing & Capabilities**.
3. Click `+ Capability` and add:
   - **Push Notifications**
   - **Background Modes** -> Check **Remote notifications** & **Background fetch**.
4. In `ios/Runner/AppDelegate.swift`:
```swift
import UIKit
import Flutter
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

---

## 5. Notification Service (`lib/services/notification_service.dart`)

Create `lib/services/notification_service.dart`. This service handles:
- Requesting permissions (Android 13+ & iOS).
- Generating & refreshing FCM tokens.
- Syncing device tokens to your backend API.
- Creating the high-priority Android notification channel (`humaari_shaadi_alerts`).
- Displaying foreground heads-up banners.

```dart
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;

/// Background Message Handler (Must be a top-level function)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint("Handling background notification: ${message.messageId}");
  debugPrint("Data payload: ${message.data}");
}

class NotificationService {
  NotificationService._privateConstructor();
  static final NotificationService instance = NotificationService._privateConstructor();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  // Android Notification Channel definition
  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'humaari_shaadi_alerts', // Must match backend channelId
    'HumaariShaadi Alerts',
    description: 'Notifications for new messages, likes, and matches',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
  );

  String? _currentToken;
  Function(Map<String, dynamic> data)? onNotificationClicked;

  /// Initialize Firebase Messaging & Local Notifications
  Future<void> initialize({
    required String backendBaseUrl,
    required Future<String?> Function() getAuthToken,
    Function(Map<String, dynamic> data)? onNotificationTap,
  }) async {
    onNotificationClicked = onNotificationTap;

    // 1. Request OS Permissions (Critical for iOS and Android 13+)
    await requestPermissions();

    // 2. Setup Local Notifications for Foreground display
    await _setupLocalNotifications();

    // 3. Create Android High Priority Notification Channel
    if (Platform.isAndroid) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_channel);
    }

    // 4. Set Foreground Presentation options for iOS
    await _fcm.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    // 5. Retrieve FCM Device Token
    _currentToken = await _fcm.getToken();
    debugPrint("🔥 [FCM] Device Token: $_currentToken");

    // 6. Listen for Token Refreshes
    _fcm.onTokenRefresh.listen((newToken) async {
      _currentToken = newToken;
      debugPrint("🔄 [FCM] Token Refreshed: $newToken");
      final authToken = await getAuthToken();
      if (authToken != null && authToken.isNotEmpty) {
        await registerDeviceToken(
          backendBaseUrl: backendBaseUrl,
          authToken: authToken,
          fcmToken: newToken,
        );
      }
    });

    // 7. Handle Foreground Notifications
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint("📩 [FCM] Foreground Message received: ${message.notification?.title}");
      _showLocalNotification(message);
    });

    // 8. Handle Notification Click when app is in BACKGROUND
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint("🚀 [FCM] App opened from background notification");
      if (onNotificationClicked != null) {
        onNotificationClicked!(message.data);
      }
    });

    // 9. Handle Notification Click when app was TERMINATED (Cold Start)
    final initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      debugPrint("🚀 [FCM] App launched from terminated state via notification");
      if (onNotificationClicked != null) {
        onNotificationClicked!(initialMessage.data);
      }
    }
  }

  /// Request Notification Permissions
  Future<void> requestPermissions() async {
    final settings = await _fcm.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );
    debugPrint("🔒 [FCM] Permission status: ${settings.authorizationStatus}");
  }

  /// Register FCM Token with HumaariShaadi Backend
  Future<bool> registerDeviceToken({
    required String backendBaseUrl,
    required String authToken,
    String? fcmToken,
  }) async {
    final tokenToSend = fcmToken ?? _currentToken ?? await _fcm.getToken();
    if (tokenToSend == null || tokenToSend.isEmpty) {
      debugPrint("⚠️ [FCM] No token available to register");
      return false;
    }

    try {
      final url = Uri.parse('$backendBaseUrl/api/v1/notifications/device-token');
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({'token': tokenToSend}),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        debugPrint("✅ [FCM] Token registered with backend successfully");
        return true;
      } else {
        debugPrint("❌ [FCM] Failed to register token: ${response.statusCode} -> ${response.body}");
        return false;
      }
    } catch (e) {
      debugPrint("❌ [FCM] Error registering token with backend: $e");
      return false;
    }
  }

  /// Remove FCM Token on User Logout
  Future<void> unregisterDeviceToken({
    required String backendBaseUrl,
    required String authToken,
  }) async {
    try {
      final url = Uri.parse('$backendBaseUrl/api/v1/notifications/device-token');
      await http.delete(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({'token': _currentToken}),
      );
      debugPrint("🚪 [FCM] Device token removed from backend on logout");
    } catch (e) {
      debugPrint("⚠️ [FCM] Error unregistering token: $e");
    }
  }

  /// Setup flutter_local_notifications for foreground display
  Future<void> _setupLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        if (response.payload != null && response.payload!.isNotEmpty) {
          try {
            final data = jsonDecode(response.payload!) as Map<String, dynamic>;
            if (onNotificationClicked != null) {
              onNotificationClicked!(data);
            }
          } catch (_) {}
        }
      },
    );
  }

  /// Show popup when message arrives while app is open
  void _showLocalNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    final androidDetails = AndroidNotificationDetails(
      _channel.id,
      _channel.name,
      channelDescription: _channel.description,
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    _localNotifications.show(
      message.hashCode,
      notification.title ?? "HumaariShaadi",
      notification.body ?? "",
      details,
      payload: jsonEncode(message.data),
    );
  }

  String? get currentToken => _currentToken;
}
```

---

## 6. App Entry Point (`lib/main.dart`)

Here is how to wire up the service in your `main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'firebase_options.dart';
import 'services/notification_service.dart';

// Top-level Background message handler
@pragma('vm:entry-point')
Future<void> _backgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await firebaseMessagingBackgroundHandler(message);
}

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // 2. Register Background Handler
  FirebaseMessaging.onBackgroundMessage(_backgroundHandler);

  // 3. Initialize Notification Service
  await NotificationService.instance.initialize(
    backendBaseUrl: 'http://10.0.2.2:6000', // Use your server IP / domain
    getAuthToken: () async {
      // Return user JWT token from SecureStorage / SharedPreferences
      return "USER_SAVED_JWT_TOKEN";
    },
    onNotificationTap: (Map<String, dynamic> data) {
      _handleNotificationNavigation(data);
    },
  );

  runApp(const MyApp());
}

/// Deep Linking / Redirection Handler
void _handleNotificationNavigation(Map<String, dynamic> data) {
  debugPrint("👉 Navigating from notification data: $data");
  final type = data['type'];

  if (type == 'chat_message') {
    final chatId = data['chatId'];
    if (chatId != null) {
      navigatorKey.currentState?.pushNamed('/chat', arguments: {'chatId': chatId});
    }
  } else if (type == 'interaction_like' || type == 'interaction_shortlist') {
    final fromUserId = data['fromUserId'];
    navigatorKey.currentState?.pushNamed('/matches', arguments: {'userId': fromUserId});
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HumaariShaadi',
      navigatorKey: navigatorKey,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
      routes: {
        '/chat': (context) => const ChatScreenPlaceholder(),
        '/matches': (context) => const MatchesScreenPlaceholder(),
      },
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('HumaariShaadi')),
      body: const Center(child: Text('Welcome to HumaariShaadi')),
    );
  }
}

class ChatScreenPlaceholder extends StatelessWidget {
  const ChatScreenPlaceholder({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Chat')));
}

class MatchesScreenPlaceholder extends StatelessWidget {
  const MatchesScreenPlaceholder({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Matches')));
}
```

---

## 7. Notification Tap & Deep-Link Payload Spec

When backend sends push notifications, it includes custom data in `message.data`. Your app can inspect `data['type']` to open the right screen:

| Action in App | `data.type` | Accompanying Data | Target Flutter Screen |
|---|---|---|---|
| **Chat Message** | `"chat_message"` | `chatId`, `senderId` | `ChatScreen(chatId: data['chatId'])` |
| **Profile Liked** | `"interaction_like"` | `fromUserId` | `ProfileDetailScreen(userId: ...)` |
| **Shortlisted** | `"interaction_shortlist"` | `fromUserId` | `ShortlistScreen()` |
| **Contact Request** | `"interaction_contact"` | `fromUserId` | `RequestsScreen()` |

---

## 8. Testing & Verification

### Step 8.1: Verify Token Registration
1. Run your Flutter app on a real Android/iOS device or emulator with Google Play Services.
2. In Flutter logs, copy the printed token:
   ```
   🔥 [FCM] Device Token: fXyz123...
   ```
3. Check your backend database or call `POST /api/v1/notifications/device-token`:
   ```bash
   curl -X POST http://localhost:6000/api/v1/notifications/device-token \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"token": "fXyz123..."}'
   ```

### Step 8.2: Send a Test Notification
Test sending from backend:
```bash
curl -X POST http://localhost:6000/api/v1/notifications/send-test \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "HumaariShaadi Test 🔔",
    "body": "Background notification is working!"
  }'
```

### Step 8.3: Test App States:
1. **Background Test**: Press Home button on device -> Send test notification -> Notification pops up in status bar with sound.
2. **Terminated Test**: Swipe away and kill the app -> Send test notification -> Notification pops up on lock screen -> Tapping opens app.
3. **Foreground Test**: Keep app open -> Send test notification -> Local notification heads-up banner drops down from the top.

---

## 9. Troubleshooting

### 1. Notifications not showing on Android emulator
- Ensure you are using an **Android Emulator with Google APIs or Google Play Store**. Emulators without Google APIs do not support FCM.
- Testing on a physical Android device is always the most reliable.

### 2. Notifications delayed or blocked on Xiaomi / Oppo / Vivo / OnePlus
- Chinese OEM ROMs have strict battery saver managers.
- In phone settings: Go to **App Info -> Battery Saver -> No Restrictions**, and enable **Autostart**.

### 3. Android 13+ (API 33+) Permission Denied
- On Android 13+, apps cannot show notifications until the user explicitly accepts the popup permission. Ensure `requestPermissions()` runs upon login.


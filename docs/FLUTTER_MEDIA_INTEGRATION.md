# 📱 Flutter Frontend Integration Guide - Profile Media & Cloudinary

Yeh guide Flutter developer ke liye banayi gayi hai taaki wo **HumaariShaadi** backend ke sath **Profile Photos** aur **ID Verification Documents** ka upload, delete aur primary switch feature asaani se integrate kar sakein.

---

## 📌 1. Quick Summary & Endpoints Overview

* **Base URL:** `http://<SERVER_IP_OR_DOMAIN>:6000/api/v1/profiles`
* **Auth Header:** Saare endpoints par **`Authorization: Bearer <JWT_TOKEN>`** header zaroori hai.
* **Content-Type:** File upload ke liye `multipart/form-data` use hoga.

| Feature | Method | Endpoint | Form Field Name | Allowed Types |
| :--- | :--- | :--- | :--- | :--- |
| **Upload Single Photo** | `POST` | `/photos` | `photo` | JPG, PNG, WEBP (Max 5MB) |
| **Upload Multiple Photos** | `POST` | `/photos/bulk` | `photos` | JPG, PNG, WEBP (Max 5 files) |
| **Set Primary Photo (DP)** | `PATCH` | `/photos/:photoId/primary` | None (URL Param) | - |
| **Delete Photo** | `DELETE` | `/photos/:photoId` | None (URL Param) | - |
| **Upload ID Document** | `POST` | `/verification/upload` | `document` | JPG, PNG, PDF (Max 10MB) |

---

## 📦 2. Flutter Dependencies (`pubspec.yaml`)

Apne Flutter project ke `pubspec.yaml` me ye packages add karein:

```yaml
dependencies:
  flutter:
    sdk: flutter
  dio: ^5.7.0            # Best for multipart uploads with progress
  image_picker: ^1.1.2   # Camera aur Gallery se photo lene ke liye
  file_picker: ^8.1.4    # PDF ya documents pick karne ke liye
```

---

## 🧱 3. Data Model (`profile_photo_model.dart`)

Backend se photos is format me aati hain:

```dart
class ProfilePhoto {
  final String id;
  final String url;
  final String publicId;
  final bool isPrimary;

  ProfilePhoto({
    required this.id,
    required this.url,
    required this.publicId,
    required this.isPrimary,
  });

  factory ProfilePhoto.fromJson(Map<String, dynamic> json) {
    return ProfilePhoto(
      id: json['_id'] ?? '',
      url: json['url'] ?? '',
      publicId: json['publicId'] ?? '',
      isPrimary: json['isPrimary'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'url': url,
    'publicId': publicId,
    'isPrimary': isPrimary,
  };
}
```

---

## 🚀 4. Flutter API Service Implementation (`profile_media_service.dart`)

Niche pura ready-to-use Service code diya gaya hai jisme `Dio` use kiya gaya hai:

```dart
import 'dart:io';
import 'package:dio/dio.dart';
import 'profile_photo_model.dart';

class ProfileMediaService {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'http://YOUR_SERVER_IP:6000/api/v1/profiles', // Real device pe IP daalein
    connectTimeout: const Duration(seconds: 20),
    receiveTimeout: const Duration(seconds: 20),
  ));

  // Helper method to set Auth Token
  void setAuthToken(String token) {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  // ==========================================
  // 1. Upload Single Photo
  // ==========================================
  Future<List<ProfilePhoto>> uploadSinglePhoto(
    File imageFile, {
    void Function(int sent, int total)? onProgress,
  }) async {
    try {
      String fileName = imageFile.path.split('/').last;

      FormData formData = FormData.fromMap({
        'photo': await MultipartFile.fromFile(
          imageFile.path,
          filename: fileName,
        ),
      });

      Response response = await _dio.post(
        '/photos',
        data: formData,
        onSendProgress: onProgress,
      );

      if (response.data['success'] == true) {
        List<dynamic> list = response.data['data'];
        return list.map((item) => ProfilePhoto.fromJson(item)).toList();
      } else {
        throw Exception(response.data['message'] ?? 'Upload failed');
      }
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? e.message);
    }
  }

  // ==========================================
  // 2. Upload Multiple Photos (Bulk)
  // ==========================================
  Future<List<ProfilePhoto>> uploadMultiplePhotos(
    List<File> imageFiles, {
    void Function(int sent, int total)? onProgress,
  }) async {
    try {
      List<MultipartFile> filesList = [];
      for (var file in imageFiles) {
        filesList.add(await MultipartFile.fromFile(
          file.path,
          filename: file.path.split('/').last,
        ));
      }

      FormData formData = FormData.fromMap({
        'photos': filesList,
      });

      Response response = await _dio.post(
        '/photos/bulk',
        data: formData,
        onSendProgress: onProgress,
      );

      if (response.data['success'] == true) {
        List<dynamic> list = response.data['data'];
        return list.map((item) => ProfilePhoto.fromJson(item)).toList();
      } else {
        throw Exception(response.data['message'] ?? 'Bulk upload failed');
      }
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? e.message);
    }
  }

  // ==========================================
  // 3. Set Primary Photo (Main DP)
  // ==========================================
  Future<List<ProfilePhoto>> setPrimaryPhoto(String photoId) async {
    try {
      Response response = await _dio.patch('/photos/$photoId/primary');

      if (response.data['success'] == true) {
        List<dynamic> list = response.data['data'];
        return list.map((item) => ProfilePhoto.fromJson(item)).toList();
      } else {
        throw Exception(response.data['message'] ?? 'Failed to update DP');
      }
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? e.message);
    }
  }

  // ==========================================
  // 4. Delete Photo
  // ==========================================
  Future<List<ProfilePhoto>> deletePhoto(String photoId) async {
    try {
      Response response = await _dio.delete('/photos/$photoId');

      if (response.data['success'] == true) {
        List<dynamic> list = response.data['data'];
        return list.map((item) => ProfilePhoto.fromJson(item)).toList();
      } else {
        throw Exception(response.data['message'] ?? 'Failed to delete photo');
      }
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? e.message);
    }
  }

  // ==========================================
  // 5. Upload Verification Document (ID Proof / PDF / Image)
  // ==========================================
  Future<Map<String, dynamic>> uploadVerificationDocument(
    File docFile, {
    void Function(int sent, int total)? onProgress,
  }) async {
    try {
      String fileName = docFile.path.split('/').last;

      FormData formData = FormData.fromMap({
        'document': await MultipartFile.fromFile(
          docFile.path,
          filename: fileName,
        ),
      });

      Response response = await _dio.post(
        '/verification/upload',
        data: formData,
        onSendProgress: onProgress,
      );

      if (response.data['success'] == true) {
        return response.data['data']; // Returns { status: 'pending', documentUrl: '...' }
      } else {
        throw Exception(response.data['message'] ?? 'Document upload failed');
      }
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? e.message);
    }
  }
}
```

---

## 🎨 5. UI Integration Example (Image Picker & Upload)

Flutter UI me Image Pick karke upload karne ka sample snippet:

```dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'profile_media_service.dart';

class PhotoUploadWidget extends StatefulWidget {
  final ProfileMediaService mediaService;
  const PhotoUploadWidget({super.key, required this.mediaService});

  @override
  State<PhotoUploadWidget> createState() => _PhotoUploadWidgetState();
}

class _PhotoUploadWidgetState extends State<PhotoUploadWidget> {
  final ImagePicker _picker = ImagePicker();
  bool _isLoading = false;
  double _uploadProgress = 0.0;

  Future<void> _pickAndUploadPhoto() async {
    final XFile? pickedFile = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85, // Cloudinary resize handle karta hai
    );

    if (pickedFile == null) return;

    setState(() {
      _isLoading = true;
      _uploadProgress = 0.0;
    });

    try {
      final updatedPhotos = await widget.mediaService.uploadSinglePhoto(
        File(pickedFile.path),
        onProgress: (sent, total) {
          setState(() {
            _uploadProgress = sent / total;
          });
        },
      );

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Photo uploaded successfully!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload failed: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_isLoading)
          LinearProgressIndicator(value: _uploadProgress),
        ElevatedButton.icon(
          onPressed: _isLoading ? null : _pickAndUploadPhoto,
          icon: const Icon(Icons.add_a_photo),
          label: const Text('Add Profile Photo'),
        ),
      ],
    );
  }
}
```

---

## ⚠️ 6. Important Notes for Flutter Developers

1. **Localhost Issue (Android/iOS):**
   * Android Emulator me `localhost` kaam nahi karta, iski jagah **`http://10.0.2.2:6000`** use karein.
   * Real physical phone me test karne ke liye apne laptop ka Wi-Fi IP address (jaise `http://192.168.1.15:6000`) use karein.
2. **Cleartext Traffic (Android):**
   * Agar development me `http://` par network call fail ho rahi ho, toh `android/app/src/main/AndroidManifest.xml` me `<application>` tag ke andar `android:usesCleartextTraffic="true"` add karein.
3. **Field Names ka Dhyan Rakhein:**
   * Single photo ke liye exact field name: **`photo`**
   * Multiple photos ke liye exact field name: **`photos`**
   * ID proof ke liye exact field name: **`document`**


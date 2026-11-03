# Flutter Frontend Socket.IO Chat Integration Guide
**HumaariShaadi Matrimonial Backend**

This guide provides a complete, copy-paste ready implementation for integrating the real-time chat socket in your Flutter mobile application.

---

## 1. Prerequisites & Dependencies

Add the official `socket_io_client` package to your Flutter project's `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  socket_io_client: ^3.0.2  # Compatible with Socket.IO v4.x backend
  intl: ^0.19.0             # For message timestamps
```

Run:
```bash
flutter pub get
```

### Android Network Security (For Local/HTTP Testing)
If testing with local IP (e.g. `http://192.168.x.x:6000` or `http://10.0.2.2:6000`), ensure cleartext traffic is permitted in `android/app/src/main/AndroidManifest.xml`:

```xml
<application
    android:usesCleartextTraffic="true"
    ... >
```

---

## 2. Message Data Model (`lib/models/chat_message.dart`)

```dart
class ChatMessage {
  final String id;
  final String chatId;
  final String senderId;
  final String senderPhone;
  final String text;
  final List<String> readBy;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.chatId,
    required this.senderId,
    required this.senderPhone,
    required this.text,
    required this.readBy,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final sender = json['sender'];
    String sId = '';
    String sPhone = '';

    if (sender is Map<String, dynamic>) {
      sId = sender['_id']?.toString() ?? '';
      sPhone = sender['phone']?.toString() ?? '';
    } else if (sender is String) {
      sId = sender;
    }

    return ChatMessage(
      id: json['_id']?.toString() ?? '',
      chatId: json['chat']?.toString() ?? '',
      senderId: sId,
      senderPhone: sPhone,
      text: json['text']?.toString() ?? '',
      readBy: (json['readBy'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'chat': chatId,
        'sender': {'_id': senderId, 'phone': senderPhone},
        'text': text,
        'readBy': readBy,
        'createdAt': createdAt.toIso8601String(),
      };
}
```

---

## 3. Socket Service (`lib/services/chat_socket_service.dart`)

A robust singleton service handling connection, rooms, broadcasts, and disconnections:

```dart
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../models/chat_message.dart';

class ChatSocketService {
  static final ChatSocketService _instance = ChatSocketService._internal();
  factory ChatSocketService() => _instance;
  ChatSocketService._internal();

  IO.Socket? _socket;
  bool get isConnected => _socket?.connected ?? false;

  // Stream Controllers for real-time UI updates
  final _messageController = StreamController<ChatMessage>.broadcast();
  final _typingController = StreamController<Map<String, dynamic>>.broadcast();
  final _readController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();

  Stream<ChatMessage> get onMessageReceived => _messageController.stream;
  Stream<Map<String, dynamic>> get onTypingChanged => _typingController.stream;
  Stream<Map<String, dynamic>> get onMessagesRead => _readController.stream;
  Stream<bool> get onConnectionChanged => _connectionController.stream;

  /// Initialize and connect socket with JWT Token
  void connect({required String serverUrl, required String token}) {
    if (_socket != null && _socket!.connected) return;

    _socket = IO.io(
      serverUrl,
      IO.OptionBuilder()
          .setTransports(['websocket']) // WebSocket transport is mandatory for mobile
          .disableAutoConnect()
          .setAuth({'token': 'Bearer $token'})
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(2000)
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('⚡ [Socket] Connected successfully: ${_socket?.id}');
      _connectionController.add(true);
    });

    _socket!.onDisconnect((reason) {
      debugPrint('🔌 [Socket] Disconnected: $reason');
      _connectionController.add(false);
    });

    _socket!.onConnectError((err) {
      debugPrint('❌ [Socket] Connection Error: $err');
      _connectionController.add(false);
    });

    // 1. Listen for new incoming messages
    _socket!.on('chat:message', (data) {
      if (data is Map<String, dynamic>) {
        final message = ChatMessage.fromJson(data);
        _messageController.add(message);
      }
    });

    // 2. Listen for typing indicators
    _socket!.on('chat:typing', (data) {
      if (data is Map<String, dynamic>) {
        _typingController.add(data); // { userId: String, isTyping: bool }
      }
    });

    // 3. Listen for read receipts (blue ticks)
    _socket!.on('chat:read', (data) {
      if (data is Map<String, dynamic>) {
        _readController.add(data); // { chatId: String, readBy: String }
      }
    });

    _socket!.connect();
  }

  /// Join a chat room
  void joinChat(String chatId, {Function(bool success, String? message)? onAck}) {
    if (_socket == null || !_socket!.connected) return;

    _socket!.emitWithAck(
      'chat:join',
      {'chatId': chatId},
      ack: (response) {
        if (response is Map<String, dynamic>) {
          final success = response['success'] == true;
          onAck?.call(success, response['message']?.toString());
        }
      },
    );
  }

  /// Leave a chat room on screen exit
  void leaveChat(String chatId) {
    if (_socket == null || !_socket!.connected) return;
    _socket!.emit('chat:leave', {'chatId': chatId});
  }

  /// Send message via Socket
  void sendMessage({
    required String chatId,
    required String text,
    Function(bool success, ChatMessage? message)? onAck,
  }) {
    if (_socket == null || !_socket!.connected) {
      onAck?.call(false, null);
      return;
    }

    _socket!.emitWithAck(
      'chat:message',
      {'chatId': chatId, 'text': text.trim()},
      ack: (response) {
        if (response is Map<String, dynamic>) {
          final success = response['success'] == true;
          final msgData = response['message'];
          final msg = (success && msgData is Map<String, dynamic>)
              ? ChatMessage.fromJson(msgData)
              : null;
          onAck?.call(success, msg);
        }
      },
    );
  }

  /// Send typing indicator
  void sendTyping({required String chatId, required bool isTyping}) {
    if (_socket == null || !_socket!.connected) return;
    _socket!.emit('chat:typing', {'chatId': chatId, 'isTyping': isTyping});
  }

  /// Mark all messages in chat as read
  void markAsRead({required String chatId, Function(bool success)? onAck}) {
    if (_socket == null || !_socket!.connected) return;

    _socket!.emitWithAck(
      'chat:read',
      {'chatId': chatId},
      ack: (response) {
        if (response is Map<String, dynamic>) {
          onAck?.call(response['success'] == true);
        }
      },
    );
  }

  /// Disconnect socket (e.g. on user logout)
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _connectionController.add(false);
  }
}
```

---

## 4. Flutter Chat Screen Implementation Example

Here is a complete `ChatScreen` showing message loading, typing debouncing, real-time message receiving, and read receipts:

```dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/chat_message.dart';
import '../services/chat_socket_service.dart';

class ChatScreen extends StatefulWidget {
  final String chatId;
  final String currentUserId;
  final String recipientName;

  const ChatScreen({
    Key? key,
    required this.chatId,
    required this.currentUserId,
    required this.recipientName,
  }) : super(key: key);

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ChatSocketService _socketService = ChatSocketService();
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<ChatMessage> _messages = [];
  bool _isRecipientTyping = false;
  Timer? _typingDebounce;

  StreamSubscription? _msgSub;
  StreamSubscription? _typingSub;
  StreamSubscription? _readSub;

  @override
  void initState() {
    super.initState();

    // 1. Join room
    _socketService.joinChat(widget.chatId, onAck: (success, msg) {
      debugPrint("Room Join: $success ($msg)");
      // 2. Mark existing messages as read once joined
      _socketService.markAsRead(chatId: widget.chatId);
    });

    // 3. Listen for incoming messages
    _msgSub = _socketService.onMessageReceived.listen((newMsg) {
      if (newMsg.chatId == widget.chatId) {
        setState(() {
          _messages.add(newMsg);
        });
        _scrollToBottom();

        // If received from peer, mark read immediately
        if (newMsg.senderId != widget.currentUserId) {
          _socketService.markAsRead(chatId: widget.chatId);
        }
      }
    });

    // 4. Listen for typing indicators
    _typingSub = _socketService.onTypingChanged.listen((data) {
      if (data['userId'] != widget.currentUserId) {
        setState(() {
          _isRecipientTyping = data['isTyping'] == true;
        });
      }
    });

    // 5. Listen for read receipts
    _readSub = _socketService.onMessagesRead.listen((data) {
      if (data['chatId'] == widget.chatId) {
        final readByUserId = data['readBy'];
        setState(() {
          for (var msg in _messages) {
            if (msg.senderId == widget.currentUserId &&
                !msg.readBy.contains(readByUserId)) {
              msg.readBy.add(readByUserId);
            }
          }
        });
      }
    });
  }

  void _onTextChanged(String text) {
    // Notify typing = true
    _socketService.sendTyping(chatId: widget.chatId, isTyping: true);

    // Debounce to auto-clear typing after 2 seconds of inactivity
    _typingDebounce?.cancel();
    _typingDebounce = Timer(const Duration(seconds: 2), () {
      _socketService.sendTyping(chatId: widget.chatId, isTyping: false);
    });
  }

  void _sendMessage() {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    _textController.clear();
    _typingDebounce?.cancel();
    _socketService.sendTyping(chatId: widget.chatId, isTyping: false);

    _socketService.sendMessage(
      chatId: widget.chatId,
      text: text,
      onAck: (success, message) {
        if (!success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to send message')),
          );
        }
      },
    );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 60,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _typingDebounce?.cancel();
    _msgSub?.cancel();
    _typingSub?.cancel();
    _readSub?.cancel();

    // Cleanly leave room on screen exit
    _socketService.leaveChat(widget.chatId);
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.recipientName),
            if (_isRecipientTyping)
              const Text(
                'typing...',
                style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.greenAccent),
              ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isMe = msg.senderId == widget.currentUserId;
                final isRead = msg.readBy.isNotEmpty;

                return Align(
                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isMe ? const Color(0xFFE91E63) : Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          msg.text,
                          style: TextStyle(color: isMe ? Colors.white : Colors.black87),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              DateFormat('hh:mm a').format(msg.createdAt),
                              style: TextStyle(
                                fontSize: 10,
                                color: isMe ? Colors.white70 : Colors.black54,
                              ),
                            ),
                            if (isMe) ...[
                              const SizedBox(width: 4),
                              Icon(
                                Icons.done_all,
                                size: 14,
                                color: isRead ? Colors.lightBlueAccent : Colors.white70,
                              ),
                            ]
                          ],
                        )
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      onChanged: _onTextChanged,
                      decoration: const InputDecoration(
                        hintText: 'Type a message...',
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.send, color: Color(0xFFE91E63)),
                    onPressed: _sendMessage,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```

---

## 5. App Startup & Socket Lifecycle

Connect the socket immediately when the user logs in:

```dart
// In your AuthController / LoginScreen upon successful login:
final socketService = ChatSocketService();
socketService.connect(
  serverUrl: 'https://bouncy-ember-enlisted.ngrok-free.dev', // Active Ngrok tunnel (or http://10.0.2.2:6000 for local)
  token: userJwtToken,
);

// On Logout:
socketService.disconnect();
```

---

## 6. Socket Events Summary Table

| Event Name | Direction | Payload Example | Purpose |
|:---|:---:|:---|:---|
| **`chat:join`** | Client ➔ Server | `{ "chatId": "6ae9..." }` | Joins the chat room (validates participation). |
| **`chat:leave`** | Client ➔ Server | `{ "chatId": "6ae9..." }` | Leaves the chat room on screen exit. |
| **`chat:message`** | Client ➔ Server | `{ "chatId": "6ae9...", "text": "Hi" }` | Sends message, saves to DB, returns ACK with populated message. |
| **`chat:message`** | Server ➔ Client | Full populated `ChatMessage` JSON | Received in real-time by participants. |
| **`chat:typing`** | Both Ways | `{ "chatId": "6ae9...", "isTyping": true }` | Broadcasts user typing status. |
| **`chat:read`** | Client ➔ Server | `{ "chatId": "6ae9..." }` | Marks messages as read in DB and notifies sender. |
| **`chat:read`** | Server ➔ Client | `{ "chatId": "6ae9...", "readBy": "userId" }` | Receiver updates blue ticks in real-time. |


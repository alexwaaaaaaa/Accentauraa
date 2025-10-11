enum ActivityType {
  flashcard,
  mcq,
  fillBlank,
  listening,
  speaking;

  static ActivityType fromString(String type) {
    switch (type) {
      case 'flashcard':
        return ActivityType.flashcard;
      case 'mcq':
        return ActivityType.mcq;
      case 'fill_blank':
        return ActivityType.fillBlank;
      case 'listening':
        return ActivityType.listening;
      case 'speaking':
        return ActivityType.speaking;
      default:
        throw ArgumentError('Unknown activity type: $type');
    }
  }

  String toJsonString() {
    switch (this) {
      case ActivityType.flashcard:
        return 'flashcard';
      case ActivityType.mcq:
        return 'mcq';
      case ActivityType.fillBlank:
        return 'fill_blank';
      case ActivityType.listening:
        return 'listening';
      case ActivityType.speaking:
        return 'speaking';
    }
  }
}

abstract class Activity {
  final String id;
  final ActivityType type;

  Activity({
    required this.id,
    required this.type,
  });

  factory Activity.fromJson(Map<String, dynamic> json) {
    final type = ActivityType.fromString(json['type'] as String);
    
    switch (type) {
      case ActivityType.flashcard:
        return FlashcardActivity.fromJson(json);
      case ActivityType.mcq:
        return McqActivity.fromJson(json);
      case ActivityType.fillBlank:
        return FillBlankActivity.fromJson(json);
      case ActivityType.listening:
        return ListeningActivity.fromJson(json);
      case ActivityType.speaking:
        return SpeakingActivity.fromJson(json);
    }
  }

  Map<String, dynamic> toJson();
}


class FlashcardItem {
  final String word;
  final String? imageUrl;
  final String? audioUrl;
  final String? translation;

  FlashcardItem({
    required this.word,
    this.imageUrl,
    this.audioUrl,
    this.translation,
  });

  factory FlashcardItem.fromJson(Map<String, dynamic> json) {
    return FlashcardItem(
      word: json['word'] as String,
      imageUrl: json['imageUrl'] as String?,
      audioUrl: json['audioUrl'] as String?,
      translation: json['translation'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'word': word,
      'imageUrl': imageUrl,
      'audioUrl': audioUrl,
      'translation': translation,
    };
  }
}

class FlashcardActivity extends Activity {
  final List<FlashcardItem> items;

  FlashcardActivity({
    required super.id,
    required this.items,
  }) : super(type: ActivityType.flashcard);

  factory FlashcardActivity.fromJson(Map<String, dynamic> json) {
    return FlashcardActivity(
      id: json['id'] as String,
      items: (json['items'] as List<dynamic>)
          .map((item) => FlashcardItem.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.toJsonString(),
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class McqActivity extends Activity {
  final String question;
  final List<String> options;
  final String correctAnswer;

  McqActivity({
    required super.id,
    required this.question,
    required this.options,
    required this.correctAnswer,
  }) : super(type: ActivityType.mcq);

  factory McqActivity.fromJson(Map<String, dynamic> json) {
    return McqActivity(
      id: json['id'] as String,
      question: json['question'] as String,
      options: (json['options'] as List<dynamic>).cast<String>(),
      correctAnswer: json['correctAnswer'] as String,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.toJsonString(),
      'question': question,
      'options': options,
      'correctAnswer': correctAnswer,
    };
  }
}

class FillBlankActivity extends Activity {
  final String sentence;
  final String correctAnswer;
  final List<String>? hints;

  FillBlankActivity({
    required super.id,
    required this.sentence,
    required this.correctAnswer,
    this.hints,
  }) : super(type: ActivityType.fillBlank);

  factory FillBlankActivity.fromJson(Map<String, dynamic> json) {
    return FillBlankActivity(
      id: json['id'] as String,
      sentence: json['sentence'] as String,
      correctAnswer: json['correctAnswer'] as String,
      hints: json['hints'] != null
          ? (json['hints'] as List<dynamic>).cast<String>()
          : null,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.toJsonString(),
      'sentence': sentence,
      'correctAnswer': correctAnswer,
      'hints': hints,
    };
  }
}

class ListeningActivity extends Activity {
  final String audioUrl;
  final String question;
  final List<String> options;
  final String correctAnswer;

  ListeningActivity({
    required super.id,
    required this.audioUrl,
    required this.question,
    required this.options,
    required this.correctAnswer,
  }) : super(type: ActivityType.listening);

  factory ListeningActivity.fromJson(Map<String, dynamic> json) {
    return ListeningActivity(
      id: json['id'] as String,
      audioUrl: json['audioUrl'] as String,
      question: json['question'] as String,
      options: (json['options'] as List<dynamic>).cast<String>(),
      correctAnswer: json['correctAnswer'] as String,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.toJsonString(),
      'audioUrl': audioUrl,
      'question': question,
      'options': options,
      'correctAnswer': correctAnswer,
    };
  }
}

class SpeakingActivity extends Activity {
  final String prompt;
  final String? expectedResponse;
  final String? audioUrl;

  SpeakingActivity({
    required super.id,
    required this.prompt,
    this.expectedResponse,
    this.audioUrl,
  }) : super(type: ActivityType.speaking);

  factory SpeakingActivity.fromJson(Map<String, dynamic> json) {
    return SpeakingActivity(
      id: json['id'] as String,
      prompt: json['prompt'] as String,
      expectedResponse: json['expectedResponse'] as String?,
      audioUrl: json['audioUrl'] as String?,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.toJsonString(),
      'prompt': prompt,
      'expectedResponse': expectedResponse,
      'audioUrl': audioUrl,
    };
  }
}

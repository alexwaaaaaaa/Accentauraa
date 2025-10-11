// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'progress_update.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class ProgressUpdateAdapter extends TypeAdapter<ProgressUpdate> {
  @override
  final int typeId = 0;

  @override
  ProgressUpdate read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return ProgressUpdate(
      id: fields[0] as String,
      userId: fields[1] as String,
      level: fields[2] as int,
      xpEarned: fields[3] as int,
      lessonCompleted: fields[4] as bool,
      timestamp: fields[5] as DateTime,
      activityResults: (fields[6] as Map?)?.cast<String, dynamic>(),
    );
  }

  @override
  void write(BinaryWriter writer, ProgressUpdate obj) {
    writer
      ..writeByte(7)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.userId)
      ..writeByte(2)
      ..write(obj.level)
      ..writeByte(3)
      ..write(obj.xpEarned)
      ..writeByte(4)
      ..write(obj.lessonCompleted)
      ..writeByte(5)
      ..write(obj.timestamp)
      ..writeByte(6)
      ..write(obj.activityResults);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ProgressUpdateAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { ValidationError } from '../utils/errors.util';

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter for audio files
const audioFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-m4a', 'audio/m4a'];
  const allowedExtensions = ['.wav', '.mp3', '.m4a'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  
  if (allowedMimeTypes.includes(mimeType) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ValidationError([{
      field: file.fieldname,
      message: 'Invalid audio file type. Allowed types: .wav, .mp3, .m4a',
    }]));
  }
};

// File filter for video files
const videoFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['video/mp4', 'video/quicktime'];
  const allowedExtensions = ['.mp4', '.mov'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  
  if (allowedMimeTypes.includes(mimeType) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ValidationError([{
      field: file.fieldname,
      message: 'Invalid video file type. Allowed types: .mp4, .mov',
    }]));
  }
};

// File filter for both audio and video
const audioVideoFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-m4a', 'audio/m4a',
    'video/mp4', 'video/quicktime'
  ];
  const allowedExtensions = ['.wav', '.mp3', '.m4a', '.mp4', '.mov'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  
  if (allowedMimeTypes.includes(mimeType) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ValidationError([{
      field: file.fieldname,
      message: 'Invalid file type. Allowed types: .wav, .mp3, .m4a, .mp4, .mov',
    }]));
  }
};

// Audio upload middleware (10MB limit)
export const uploadAudio = multer({
  storage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Video upload middleware (50MB limit)
export const uploadVideo = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Combined audio and video upload middleware
export const uploadAudioVideo = multer({
  storage,
  fileFilter: audioVideoFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB (max for video)
  },
});

// Single audio file upload
export const uploadSingleAudio = uploadAudio.single('audio');

// Single video file upload
export const uploadSingleVideo = uploadVideo.single('video');

// Multiple files upload (audio + optional video)
export const uploadInterviewFiles = uploadAudioVideo.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 },
]);

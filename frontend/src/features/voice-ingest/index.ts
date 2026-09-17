/**
 * Public barrel export for the live voice & speech knowledge ingestion module.
 */

export { VoiceIngestModal } from './components/VoiceIngestModal';
export type { VoiceIngestModalProps } from './components/VoiceIngestModal';
export { useSpeechRecognition } from './hooks/useSpeechRecognition';
export type { UseSpeechRecognitionReturn } from './hooks/useSpeechRecognition';
export { useVoiceRecorder } from './hooks/useVoiceRecorder';
export type {
  UseVoiceRecorderOptions,
  UseVoiceRecorderReturn,
} from './hooks/useVoiceRecorder';
export type {
  CardCategory,
  StructuredCard,
  IngestTextResponse,
} from './types/voiceIngestTypes';


export enum TranscriptRole {
  USER = 'user',
  MODEL = 'model',
}

export interface TranscriptEntry {
  id: string;
  role: TranscriptRole;
  text: string;
}

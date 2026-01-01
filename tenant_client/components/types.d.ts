interface ReplayMessageProps {
  IS_OG: boolean;
  LANG: string;
  TEXT: string;
  TS: string;
  USER: string;
  messageId: string;
  replayed: boolean;
}

interface LiveMessageProps {
  user: string;
  translatedText: string;
  targetLang: string;
  TS: string;
  messageId: string;
  replayed: boolean;
}

interface RawMessageProps {
  messageId: string;
  user: string;
  originText: string;
  translatedText: string;
  originLang: string;
  targetLang: string;
  ts: string;
}

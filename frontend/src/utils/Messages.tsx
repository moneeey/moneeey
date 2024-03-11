import React, { ReactNode } from 'react';

import LanguageEnglish from './LanguageEnglish';
import LanguagePortuguese from './LanguagePortuguese';
import LanguageSpanish from './LanguageSpanish';
import { identity } from './Utils';

export type TMessages = typeof LanguageEnglish;

const Languages = {
  english: LanguageEnglish,
  portuguese: LanguagePortuguese,
  spanish: LanguageSpanish,
};

const MessagesContext = React.createContext({
  current: Languages.english,
  update: (messages: TMessages) => identity(messages),
});

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [current, update] = React.useState(Languages.english);

  return <MessagesContext.Provider value={{ current, update }}>{children}</MessagesContext.Provider>;
}

export default function useMessages(): TMessages {
  return React.useContext(MessagesContext).current;
}

export function WithMessages({ children }: { children: (Messages: TMessages) => ReactNode }) {
  const Messages = useMessages();

  return <>{children(Messages)}</>;
}

export function changeLanguage(language: keyof typeof Languages) {
  React.useContext(MessagesContext).update(Languages[language]);
}

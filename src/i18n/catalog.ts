import type { Catalog } from './types';
import { messagesDe } from './de';
import { messagesEn } from './en';
import { messagesEs } from './es';
import { messagesFr } from './fr';
import { messagesIt } from './it';
import { messagesPl } from './pl';
import { messagesPt } from './pt';
import { messagesRu } from './ru';

export const catalog: Catalog = {
  en: messagesEn,
  es: messagesEs,
  pt: messagesPt,
  fr: messagesFr,
  it: messagesIt,
  de: messagesDe,
  ru: messagesRu,
  pl: messagesPl,
};

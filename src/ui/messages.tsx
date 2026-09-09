/**
 * Hands the messages down to each part of the settings screen. A part receives them only through
 * `useMessages()` and knows neither which language is in use nor who decided it.
 */
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { messagesFor, type Messages } from '../i18n/index.ts';

/** What it says when rendered outside a Provider. English because that is the reference dictionary */
const MessagesContext = createContext<Messages>(messagesFor('en'));

export const MessagesProvider = MessagesContext.Provider;

export const useMessages = (): Messages => useContext(MessagesContext);

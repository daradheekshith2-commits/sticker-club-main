/**
 * SECRET MESSAGE CARDS
 *
 * Each Secret Message product contains a sealed card from one of these series.
 * The real messages are deliberately NOT stored in the website, so they stay a
 * surprise. Customers see the series theme and tone (so they know what kind
 * of message they're buying), plus one sample card that is clearly marked as
 * a sample and is not included in any pack.
 */

export interface MessageCardSeries {
  id: string;
  name: string;
  /** What kind of message to expect — honest, without revealing it. */
  tone: string;
  color: string;
}

export const messageCardSeries: MessageCardSeries[] = [
  { id: 'mc-student-life', name: 'Student Life', tone: 'Funny, relatable notes about classes, canteens and deadlines.', color: '#FFD447' },
  { id: 'mc-tech', name: 'Coding & Tech', tone: 'Developer humour and small encouragements for long builds.', color: '#8FD3FF' },
  { id: 'mc-introvert', name: 'Introvert Hours', tone: 'Quiet, kind jokes for people who recharge alone.', color: '#7FE0B5' },
  { id: 'mc-motivation', name: 'Motivation', tone: 'Short, sincere pep talks — no hustle-culture slogans.', color: '#FFB3D1' },
  { id: 'mc-mixed', name: 'One from each series', tone: 'A mix: one sealed card from each of the four series.', color: '#D4FF3A' },
];

export function getMessageSeries(id: string | undefined): MessageCardSeries | undefined {
  return messageCardSeries.find((m) => m.id === id);
}

/** Shown on the site as an example. NOT a message from any pack. */
export const sampleMessageCard = {
  heading: 'Sample card',
  message: 'Plot twist: you were the main character all along.',
  note: 'This sample isn’t inside any pack — the real messages stay sealed until you open yours.',
};

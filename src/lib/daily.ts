// Deterministic "prompt of the day" — same pick worldwide for a given UTC date.
import { images, type ImagePrompt } from './data';
import { promptOfTheDay as pick, todayKey as dayKey, utcDay as dayNum } from './daily-build.mjs';

export const utcDay = dayNum;
export const todayKey = dayKey;
export const promptOfTheDay = (d = new Date()): ImagePrompt => pick(images, d);

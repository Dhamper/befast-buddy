import type { Letter } from "./scoring";

export type LetterInfo = {
  letter: Letter;
  label: string;
  bullets: string[];
  how: string;
  observer: { id: string; question: string }[];
};

export const LETTERS: LetterInfo[] = [
  {
    letter: "B",
    label: "BALANCE",
    bullets: [
      "Sudden loss of balance",
      "Dizziness or trouble walking",
      "Poor coordination",
    ],
    how: "Stand still, arms at your sides, for 10 seconds while the camera estimates postural sway.",
    observer: [
      { id: "sway", question: "Is the person unsteady, swaying or unable to stand?" },
      { id: "dizzy", question: "Do they report sudden dizziness or spinning?" },
      { id: "walk", question: "Is walking or coordination suddenly worse?" },
    ],
  },
  {
    letter: "E",
    label: "EYES",
    bullets: [
      "Sudden blurred or double vision",
      "Vision loss in one or both eyes",
      "Uneven gaze or eyelid",
    ],
    how: "Look at the centre dot and tap when a target flashes near an edge; the camera also checks eyelid symmetry.",
    observer: [
      { id: "vision", question: "Is there sudden vision loss, blurring or double vision?" },
      { id: "side", question: "Do they miss things on one side only?" },
      { id: "lid", question: "Is one eyelid drooping or one eye turned?" },
    ],
  },
  {
    letter: "F",
    label: "FACE",
    bullets: [
      "Face drooping on one side",
      "Uneven smile",
      "Numbness in the face",
    ],
    how: "Hold neutral, then smile broadly, then raise the eyebrows while the camera measures left/right asymmetry.",
    observer: [
      { id: "droop", question: "Is one side of the face drooping?" },
      { id: "smile", question: "Is the smile uneven?" },
      { id: "numb", question: "Is one side of the face numb?" },
    ],
  },
  {
    letter: "A",
    label: "ARMS",
    bullets: [
      "Weakness in one arm",
      "One arm drifts downward",
      "Numbness or tingling",
    ],
    how: "Hold both arms straight out, palms up, for 10 seconds. The camera tracks each wrist for downward drift.",
    observer: [
      { id: "drift", question: "Does one arm drift down or fall?" },
      { id: "weak", question: "Is one arm or leg suddenly weak?" },
      { id: "tingle", question: "Numbness or tingling on one side?" },
    ],
  },
  {
    letter: "S",
    label: "SPEECH",
    bullets: [
      "Slurred speech",
      "Trouble finding words",
      "Trouble understanding others",
    ],
    how: "Read one fixed phrase out loud. The transcript is compared to the target, on device.",
    observer: [
      { id: "slur", question: "Is speech slurred or hard to understand?" },
      { id: "words", question: "Trouble finding or using the right words?" },
      { id: "understand", question: "Trouble understanding what you say?" },
    ],
  },
  {
    letter: "T",
    label: "TIME",
    bullets: [
      "Note the exact onset time",
      "Call emergency services now",
      "Do not wait for symptoms to pass",
    ],
    how: "Time is not measured by camera — it is the onset answer plus everything flagged so far.",
    observer: [],
  },
];

export const byLetter = (l: Letter) =>
  LETTERS.find((x) => x.letter === l) as LetterInfo;

export const SPEECH_PHRASE = "You can't teach an old dog new tricks.";

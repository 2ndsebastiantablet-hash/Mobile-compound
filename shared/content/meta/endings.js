// One ending per difficulty, shown when you beat the top floor in Story mode.
export const ENDINGS = [
  { title: 'TEMP TO PERM', color: '#70e070', tag: 'EASY ENDING', lines: [
    'The Chairman falls. The lights flicker, then steady.',
    'Nobody comes to thank you. A printer, somewhere, starts printing your contract.',
    'You walk out into the rain at 6:02 AM. The tower is still standing behind you.',
    'Tomorrow morning there is a new temp in the lobby. The elevator is already waiting for them.',
    'Maybe next time, try a harder shift.' ] },
  { title: 'CLOCKING OUT', color: '#f0c860', tag: 'MEDIUM ENDING', lines: [
    'The Chairman falls, and the building lets out a long, tired breath.',
    'One by one the doors unlock. The staff stumble out into the dawn, blinking, still holding their mugs.',
    'Some of them are not quite people anymore. They go home anyway.',
    'You drop your badge in the bin by the revolving door.',
    'For the first time in three years, Halvorsen-Pike Holdings is closed.' ] },
  { title: 'HOSTILE TAKEOVER', color: '#ff9040', tag: 'HARD ENDING', lines: [
    'The Chairman falls. His chair is still warm.',
    'The board turns to face you. All eleven of them. Waiting for instructions.',
    'You sit down. The building hums under your hands. It would do anything you asked.',
    'You ask it to stop.',
    'The tower goes dark floor by floor, top to bottom, and you are the last one to leave.' ] },
  { title: 'THE LAST SHIFT', color: '#ff4040', tag: 'EXTRA HARD ENDING · THE TRUE ENDING', lines: [
    'The Chairman falls, and with him the thing that lived in the wiring.',
    'You look at your hands. The supplement got to you too, somewhere around floor nine.',
    'The building reaches for you. It needs a new heart, and you would do.',
    'You give it one last order instead: everybody goes home. Everybody. Even you.',
    'At dawn the tower is empty and quiet. Some shifts never end. This one did.' ] },
];

// New Game+ has its own ending, whatever the difficulty
export const ENDING_NGP = { title: 'UNDER NEW MANAGEMENT', color: '#ff4040', tag: 'NEW GAME+ ENDING', lines: [
  'The Chairman falls again. This time he laughs on the way down.',
  'You remember this. The rain, the elevator, the printer. You have done this before.',
  'In the lobby a temp is waiting for the elevator. It is you. It was always you.',
  'You hand yourself the badge. The doors close. The display reads 01.',
  'Overtime is mandatory. Overtime is forever.' ] };

// One ending per difficulty, shown when you beat the top floor in Story mode.
export const ENDINGS = [
  { title: 'SEVERANCE PACKAGE', color: '#70e070', tag: 'EASY ENDING', lines: [
    'The Chairman is dead. You press the button anyway.',
    'Thirty floors of Halvorsen-Pike Holdings go up behind you, one after another.',
    'The paper recycling breaks your fall. It is the first useful thing the company ever did for you.',
    'You climb out, straighten your tie, and walk home through the glow.',
    'Nobody asks for two weeks\' notice.' ] },
  { title: 'HOSTILE TAKEOVER', color: '#f0c860', tag: 'MEDIUM ENDING', lines: [
    'The Chairman falls. His crown rolls across the carpet and stops at your feet.',
    'You pick it up. It fits.',
    'The elevator opens. The board files out in red, hoods up, and kneels around you.',
    'Nobody says a word. Nobody has to.',
    'Halvorsen-Pike Holdings is under new management.' ] },
  { title: 'UNFINISHED BUSINESS', color: '#ff9040', tag: 'HARD ENDING', lines: [
    'The tower burned for three days. You read about it in the papers.',
    'Two years later, a man in a long coat leaves a briefcase on your table and walks out into the rain.',
    'Inside: a photograph. A beach. A cocktail. The Chairman, smiling.',
    'You leave a tip, get in the car, and drive toward the sunset.',
    'Some contracts are never really terminated.' ] },
  { title: 'THE LAST SHIFT', color: '#c040ff', tag: 'EXTRA HARD ENDING · THE TRUE ENDING', lines: [
    'The Chairman is dead. You look down at your hands, and they are not hands anymore.',
    'The supplement did what it was made to do. You are what the program was for.',
    'You go out through the window. The street cracks where you land.',
    'Somewhere in the rain, something that used to be a temp screams at the city.',
    'The city screams back.' ] },
];

// New Game+ has its own ending, whatever the difficulty
export const ENDING_NGP = { title: 'UNDER NEW MANAGEMENT', color: '#ff4040', tag: 'NEW GAME+ ENDING', lines: [
  'The Chairman falls again. This time he laughs on the way down.',
  'You remember this. The rain, the elevator, the printer. You have done this before.',
  'In the lobby a temp is waiting for the elevator. It is you. It was always you.',
  'You hand yourself the badge. The doors close. The display reads 01.',
  'Overtime is mandatory. Overtime is forever.' ] };

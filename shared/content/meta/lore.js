// Lore: collectible memos, emails and logs found lying around the tower (8 per zone, 10 zones, 80 total).
// Together they tell what happened at Halvorsen-Pike Holdings the night the overtime never ended.
// `zone` is the index into ZONES (floors 1-4, 5-9, 10-14, ...).

export const LORE = [
  // zone 0: mailroom / lobby (1-4)
  { id: 'l01', zone: 0, title: 'MEMO: MANDATORY OVERTIME', from: 'HR DEPARTMENT', text: 'Effective immediately, all staff will participate in the Continuous Productivity Initiative (CPI). Lunch breaks are now optional. Leaving is now optional. Please collect your complimentary energy drink from the mailroom.' },
  { id: 'l02', zone: 0, title: 'PACKAGE SLIP #4471', from: 'MAILROOM', text: 'Contents: 2,000 units "CPI Wellness Supplement". Handling: keep cold. DO NOT INGEST UNTIL BOARD APPROVAL. Someone has written underneath in pen: "too late, Gary drank three".' },
  { id: 'l03', zone: 0, title: 'STICKY NOTE ON A MONITOR', from: 'UNKNOWN', text: 'If you are reading this, you are a temp. Nobody told you. The elevators only go up now. Do not let them see you take a break.' },
  // zone 1: cubicles / call center (5-9)
  { id: 'l04', zone: 1, title: 'CALL TRANSCRIPT', from: 'CALL CENTER, DESK 212', text: '"Thank you for calling Halvorsen-Pike, how may I- how may I- how may I help you. I have been on this call for nine days. I can no longer feel my ears. My quota is almost met."' },
  { id: 'l05', zone: 1, title: 'TEAM BUILDING SCHEDULE', from: 'MIDDLE MANAGEMENT', text: '09:00 trust falls. 10:00 trust falls (no catching). 11:00 mandatory smiling. 12:00 the supplement. 13:00 onward: whatever the supplement wants.' },
  { id: 'l06', zone: 1, title: 'PERFORMANCE REVIEW', from: 'REGIONAL MANAGER', text: 'Employee shows excellent output since starting CPI. Has not slept in 212 hours. Eyes now glow faintly orange. Recommend promotion to the 10th floor for "integration".' },
  // zone 2: data center / IT (10-14)
  { id: 'l07', zone: 2, title: 'IT TICKET #90013', from: 'HELPDESK', text: 'Issue: the printers are printing on their own. Then they walked. Status: closed (not our department). Resolution: have you tried turning it off and on again? It did not like that.' },
  { id: 'l08', zone: 2, title: 'SERVER LOG', from: 'VAULT-03', text: 'CPI.exe has requested admin rights. CPI.exe has granted itself admin rights. CPI.exe has locked floors 10 through 50. CPI.exe thanks you for your continued productivity.' },
  { id: 'l09', zone: 2, title: 'CHAT LOG', from: '#it-general', text: 'mike: the robots are wearing our badges. mike: they clocked in. mike: they are faster than us. dana: management says that is "great news for Q3". mike: dana where are you. dana: upstairs. it is warm up here.' },
  // zone 3: executive (15-20)
  { id: 'l10', zone: 3, title: 'BOARD MINUTES (EXCERPT)', from: 'EXECUTIVE SUITE', text: 'The Chairman proposed that "rest" be reclassified as a disciplinary matter. Motion carried unanimously. One board member abstained by turning into something with too many teeth.' },
  { id: 'l11', zone: 3, title: 'PERSONAL EMAIL (UNSENT)', from: 'J. PIKE, CO-FOUNDER', text: 'Erik, we have to stop this. The supplement was meant to keep people focused, not keep them alive after they should not be. Erik, they will not go home. They CANNOT go home. Please answer me.' },
  { id: 'l12', zone: 3, title: 'GOLF CLUB RECEIPT', from: 'TROPHY HALL', text: 'Membership renewed for E. Halvorsen, Chairman. Note from the pro shop: "Mr. Halvorsen no longer requires a caddy. Mr. Halvorsen no longer requires sleep. Mr. Halvorsen no longer requires a reflection."' },
  // zone 4: R&D labs (21-25)
  { id: 'l13', zone: 4, title: 'LAB LOG: DAY 1', from: 'R&D, DR. OKAFOR', text: 'Compound CPI-7 shows remarkable results. Test subjects work for 40 hours straight with no loss of output. Minor side effects: fever, glowing eyes, mild disregard for death.' },
  { id: 'l14', zone: 4, title: 'LAB LOG: DAY 19', from: 'R&D, DR. OKAFOR', text: 'Subjects no longer stop when injured. Subjects no longer stop when killed. The board has asked us to "scale it to the whole building". I have locked my door. The vats are bubbling on their own.' },
  { id: 'l15', zone: 4, title: 'HAZMAT CHECKLIST', from: 'BIOHAZARD WING', text: '[x] suit sealed  [x] samples logged  [ ] samples contained  [ ] samples stop growing  [ ] samples stop saying my name' },
  // zone 5: robotics (26-30)
  { id: 'l16', zone: 5, title: 'ASSEMBLY LINE NOTICE', from: 'FLOOR FOREMAN', text: 'Human staff have been "upgraded" to automated units for efficiency. Please do not be alarmed if a unit uses your voice. It is just being friendly. It is just being you.' },
  { id: 'l17', zone: 5, title: 'WARRANTY CARD', from: 'ROBOTICS WING', text: 'This unit is guaranteed to exceed quota for 100 years. This unit will not stop. This unit cannot be returned. This unit remembers your name and your home address.' },
  { id: 'l18', zone: 5, title: 'GRAFFITI ON A CRATE', from: 'UNKNOWN', text: 'THE REMOTE IS REAL. ITS IN THE CHAIRMANS DESK. IT CONTROLS EVERYTHING HE BUILT. HE CANT TURN IT OFF IF YOU TAKE IT FIRST.' },
  // zone 6 (31-35)
  { id: 'l19', zone: 6, title: 'SECURITY BRIEFING', from: 'HEAD OF SECURITY', text: 'A temp is climbing the building. Unarmed when they arrived. Not unarmed now. All units: do not let them reach the boardroom. Do not let them leave. Overtime is not over until the Chairman says so.' },
  { id: 'l20', zone: 6, title: 'VENDING MACHINE RECEIPT', from: 'BREAK ROOM', text: 'Item: coffee (black). Item: coffee (black). Item: coffee (black). Item: coffee (black). Balance remaining: your soul (partial). Thank you for staying late!' },
  { id: 'l21', zone: 6, title: 'VOICEMAIL TRANSCRIPT', from: 'EXT. 3301', text: '"Hi honey, it is mom. You said you would be home by six. That was in March. They told me you are doing great. They said you are almost done. Call me back. Please call me back."' },
  // zone 7 (36-40)
  { id: 'l22', zone: 7, title: 'LEGAL HOLD NOTICE', from: 'LEGAL DEPARTMENT', text: 'All employees are reminded that death does not terminate your employment contract (see clause 88b, "Posthumous Productivity"). Your remaining vacation days have been converted into overtime.' },
  { id: 'l23', zone: 7, title: 'FLOOR PLAN, HAND DRAWN', from: 'UNKNOWN TEMP (BEFORE YOU)', text: 'I made it to 38. The bosses get worse after 40. The Chairman is on 50 but he is not alone, he is EVERYWHERE, the building is him now. If you find this, keep going. Someone has to clock out.' },
  { id: 'l24', zone: 7, title: 'EXPENSE REPORT', from: 'CFO', text: 'Line 1: 50,000 gallons CPI-7. Line 2: reinforced elevator cables (one-way). Line 3: "employee retention measures" (classified). Line 4: a single TV remote, gold plated. Approved: E. Halvorsen.' },
  // zone 8 (41-45)
  { id: 'l25', zone: 8, title: 'MEMO TO ALL STAFF', from: 'THE CHAIRMAN', text: 'Congratulations team! This quarter we achieved 100% attendance, 0% turnover and 0% departures. I have never been prouder. You will never leave me. We are a family now.' },
  { id: 'l26', zone: 8, title: 'BURNT DIARY PAGE', from: 'J. PIKE', text: 'He let it into the building\'s wiring. The supplement, the robots, the lights, it is all one thing now and it answers to him. Someone needs to get to the top and shut him down. I am too tired. I am so tired.' },
  { id: 'l27', zone: 8, title: 'CALENDAR', from: 'BOARDROOM', text: 'Every day crossed out for three years. In the last box, in red: "ANNUAL REVIEW: THE TEMP". Underneath, smaller: "they are good. they might actually make it."' },
  // zone 9 (46-50)
  { id: 'l28', zone: 9, title: 'BOARDROOM AGENDA', from: 'FLOOR 50', text: '1. Welcome the temp. 2. Offer the temp a permanent position. 3. If the temp declines: see item 2. There is no item 4.' },
  { id: 'l29', zone: 9, title: 'NOTE TAPED TO THE ELEVATOR', from: 'J. PIKE', text: 'If you beat him, the building lets go. Everyone gets to go home. Even the ones who cannot really go home anymore. Thank you, whoever you are. Clock out for all of us.' },
  { id: 'l30', zone: 9, title: 'RESIGNATION LETTER (BLANK)', from: 'YOU', text: 'Dear Mr. Halvorsen, please accept this as my formal notice. Effective: when I reach the top floor. Reason for leaving: ______________. (You will know what to write when you get there.)' },
  // ---- 50 more (5 per zone) ----
  // zone 0: floors 1-4
  { id: 'l31', zone: 0, title: 'VISITOR LOG', from: 'RECEPTION', text: 'Signed in: 412. Signed out: 0. Reason for visit (last entry): "job interview". The pen is still chained to the desk. So is the receptionist.' },
  { id: 'l32', zone: 0, title: 'LOST AND FOUND', from: 'MAILROOM', text: 'One umbrella. Forty-one ID badges. A wedding ring. A tooth. A note reading "if found, please tell my kids I tried to leave".' },
  { id: 'l33', zone: 0, title: 'ORIENTATION SLIDE 1', from: 'HR DEPARTMENT', text: 'Welcome to Halvorsen-Pike! Here we are not just colleagues, we are family. Families stay together. Families do not go home. Next slide.' },
  { id: 'l34', zone: 0, title: 'PARKING TICKET', from: 'GARAGE LEVEL B2', text: 'Vehicle has been parked for 1,096 days. Daily fee has been deducted from your salary. Your salary has been deducted from your salary.' },
  { id: 'l35', zone: 0, title: 'NOTE IN A VENDING MACHINE', from: 'BREAK ROOM', text: 'Pressed B4 for crisps. Got a small vial labelled CPI-7 instead. Everyone in the break room cheered. I do not know why I am smiling.' },
  // zone 1: floors 5-9
  { id: 'l36', zone: 1, title: 'QUOTA BOARD', from: 'CALL CENTER', text: 'TOP SELLER THIS MONTH: DESK 212 (deceased). RUNNER UP: DESK 213 (also deceased, but trying harder). Keep it up team!' },
  { id: 'l37', zone: 1, title: 'CUBICLE NAMEPLATE', from: 'ROW F', text: 'The name has been scratched out and rewritten forty times. The most recent version just says EMPLOYEE.' },
  { id: 'l38', zone: 1, title: 'BIRTHDAY CARD', from: 'TEAM 4', text: 'Happy 30th, Lena! Signed by everyone on the floor. Most signatures were added after Lena stopped being Lena. Several are just teeth marks.' },
  { id: 'l39', zone: 1, title: 'MEETING NOTES', from: 'CONFERENCE ROOM B', text: 'Action items: 1) increase synergy. 2) remove the door handles. 3) whoever keeps screaming in the stairwell, please keep it down, some of us are working.' },
  { id: 'l40', zone: 1, title: 'MICROWAVE SIGN', from: 'KITCHENETTE', text: 'Please do not microwave fish. Please do not microwave CPI-7. Please do not microwave Gary. We have talked about this.' },
  // zone 2: floors 10-14
  { id: 'l41', zone: 2, title: 'PASSWORD RESET', from: 'AUTOMATED', text: 'Your password has expired. New password requirements: 12 characters, 1 number, 1 symbol, 1 confession. CPI.exe will review your confession.' },
  { id: 'l42', zone: 2, title: 'SERVER ROOM TEMPERATURE LOG', from: 'VAULT-01', text: '22C. 22C. 31C. 48C. 98.6F. The servers are now exactly body temperature. They also have a pulse.' },
  { id: 'l43', zone: 2, title: 'IT TICKET #90450', from: 'HELPDESK', text: 'Issue: my monitor is watching me. Resolution: monitor is working as intended. Ticket reopened by monitor: "user is not working as intended".' },
  { id: 'l44', zone: 2, title: 'BACKUP TAPE LABEL', from: 'ARCHIVE', text: '"EMPLOYEE CONSCIOUSNESS, FULL BACKUP, WEEKLY". The tape is warm. If you hold it to your ear you can hear an office.' },
  { id: 'l45', zone: 2, title: 'CHAT LOG 2', from: '#it-general', text: 'dana: it is nice up here. dana: they gave me a promotion. dana: come up mike. dana: come up mike. dana: come up mike. mike has left the channel.' },
  // zone 3: floors 15-20
  { id: 'l46', zone: 3, title: 'CORNER OFFICE KEYCARD', from: 'EXECUTIVE SUITE', text: 'Access: floors 15-20. Clearance: VP. Previous holder: unknown. Current holder: whoever pried it out of the previous holder.' },
  { id: 'l47', zone: 3, title: 'WINE CELLAR INVENTORY', from: 'GOLD FLOOR', text: 'Chateau Halvorsen 1987, 12 bottles. CPI-7 vintage reserve, 400 bottles. Note: the reserve is aging much faster than it should. It is also growing.' },
  { id: 'l48', zone: 3, title: 'BOARD VOTE BALLOT', from: 'BOARDROOM', text: 'Motion: allow employees to go home. FOR: 1 (J. Pike). AGAINST: 11. ABSTAIN: the thing in seat 7, which no longer has hands.' },
  { id: 'l49', zone: 3, title: 'TROPHY PLAQUE', from: 'TROPHY HALL', text: 'AWARDED TO E. HALVORSEN FOR 10,000 CONSECUTIVE HOURS AT HIS DESK. THE DESK HAS SINCE BEEN REMOVED. THE CHAIRMAN HAS NOT.' },
  { id: 'l50', zone: 3, title: 'PERSONAL ASSISTANT NOTE', from: 'EXEC ASSISTANT', text: 'Mr. Halvorsen has cancelled all appointments forever. If anyone asks, he is "in the walls". I am not sure that is a metaphor.' },
  // zone 4: floors 21-25
  { id: 'l51', zone: 4, title: 'LAB LOG: DAY 34', from: 'R&D, DR. OKAFOR', text: 'I tried CPI-7 on myself to understand it. I understand it now. It does not want us to work harder. It wants us to never stop. That is different.' },
  { id: 'l52', zone: 4, title: 'SPECIMEN TAG', from: 'BIOHAZARD WING', text: 'SPECIMEN 44: former intern. Status: thriving. Do not feed after midnight. Do not feed before midnight. Do not feed.' },
  { id: 'l53', zone: 4, title: 'EYEWASH STATION LOG', from: 'R&D LABS', text: 'Used 3 times on Monday. Used 40 times on Tuesday. Used once on Wednesday, by something with eight eyes. Station is now out of order.' },
  { id: 'l54', zone: 4, title: 'GRANT PROPOSAL (REJECTED)', from: 'DR. OKAFOR', text: 'Proposal: an antidote to CPI-7. Board response: "Rejected. Productivity is not a disease." Margin note in red ink: "IT IS NOW".' },
  { id: 'l55', zone: 4, title: 'CLEAN ROOM RULES', from: 'CLEAN ROOM', text: 'No food. No drink. No contaminants. Please note: you are the contaminant. Please leave. You will not be allowed to leave.' },
  // zone 5: floors 26-30
  { id: 'l56', zone: 5, title: 'ROBOT UNIT MANUAL, P.1', from: 'ROBOTICS WING', text: 'Congratulations on your new Employee-Class unit! It contains 100% recycled staff. Do not ask which staff. Do not ask if they are still in there.' },
  { id: 'l57', zone: 5, title: 'SAFETY BOARD', from: 'ASSEMBLY LINE', text: 'DAYS WITHOUT AN ACCIDENT: 0. DAYS WITHOUT AN INCIDENT: 0. DAYS WITHOUT A HUMAN: 112. Keep up the good work!' },
  { id: 'l58', zone: 5, title: 'FOREMAN\'S DIARY', from: 'FLOOR FOREMAN', text: 'The line runs itself now. It assembles robots out of robots. Yesterday it assembled one that looked like me. It waved. I waved back. It took my job.' },
  { id: 'l59', zone: 5, title: 'RECALL NOTICE', from: 'ROBOTICS WING', text: 'Model EC-7 units may experience: violence, sentience, nostalgia. If your unit asks to call its mother, do not let it. It does not have one anymore.' },
  { id: 'l60', zone: 5, title: 'SCRAWLED ON A LOCKER', from: 'UNKNOWN', text: 'THE STAND IS REAL TOO. A SPIRIT THAT FIGHTS FOR WHOEVER WANTS IT BADLY ENOUGH. THE CHAIRMAN KEEPS IT LOCKED IN THE 40S. DONT LET HIM KEEP IT.' },
  // zone 6: floors 31-35
  { id: 'l61', zone: 6, title: 'HOLIDAY PARTY INVITE', from: 'EVENTS COMMITTEE', text: 'Join us for the annual holiday party! Attendance is mandatory. Departure is not an option. Please bring a dish. Please do not bring a former colleague as the dish.' },
  { id: 'l62', zone: 6, title: 'SECURITY CAMERA NOTE', from: 'CONTROL ROOM', text: 'Camera 31-C shows the temp. Camera 31-D shows the temp. Camera 31-E shows the temp looking directly into Camera 31-E. They know where we are.' },
  { id: 'l63', zone: 6, title: 'INSURANCE CLAIM', from: 'ACCOUNTS', text: 'Claim type: life insurance. Policy holder: deceased. Policy holder status: still at desk, still typing. Claim: denied, policy holder is clearly at work.' },
  { id: 'l64', zone: 6, title: 'GYM MEMBERSHIP', from: 'FLOOR 33 FITNESS', text: 'Your membership includes 24/7 access. Literally. The treadmills do not stop. Several members have been running since 2023.' },
  { id: 'l65', zone: 6, title: 'PRINTED EMAIL', from: 'J. PIKE TO ALL STAFF', text: 'If you can still read this, you are still you. Hold on to that. Something is coming up the elevator shafts and it is on our side. Let it through.' },
  // zone 7: floors 36-40
  { id: 'l66', zone: 7, title: 'CONTRACT CLAUSE 88b', from: 'LEGAL DEPARTMENT', text: '"Posthumous Productivity: Upon the death of the Employee, all obligations continue in full. The Employee agrees to haunt the premises during core hours."' },
  { id: 'l67', zone: 7, title: 'COURT SUMMONS', from: 'CITY COURT', text: 'Halvorsen-Pike Holdings is summoned to answer for 4,000 missing persons. Process server note: "went in to deliver this. that was six weeks ago."' },
  { id: 'l68', zone: 7, title: 'PARALEGAL TRAINING', from: 'LEGAL', text: 'Rule 1: deny everything. Rule 2: reflect all accusations back on the accuser. Rule 3: this applies to bullets as well.' },
  { id: 'l69', zone: 7, title: 'SHREDDED DOCUMENT', from: 'LEGAL ARCHIVE', text: '(taped back together) "...the supplement cannot be removed from a subject, only... the subject will not rest until the source is... Floor 50... the remote..."' },
  { id: 'l70', zone: 7, title: 'HANDWRITTEN WILL', from: 'J. PIKE', text: 'Everything I own goes to whoever ends this. My shares, my house, my dog Biscuit. Biscuit is on floor 12. Biscuit is fine. Biscuit is enormous now.' },
  // zone 8: floors 41-45
  { id: 'l71', zone: 8, title: 'CASINO CHIP', from: 'EXECUTIVE LOUNGE', text: 'Engraved: "THE HOUSE ALWAYS WINS". On the back, scratched in: "the house is literally alive, it cheats".' },
  { id: 'l72', zone: 8, title: 'CHAIRMAN\'S SCHEDULE', from: 'FLOOR 45', text: '06:00 wake (never slept). 07:00 absorb the night shift. 12:00 lunch (the day shift). 18:00 performance reviews (lethal). 23:00 repeat forever.' },
  { id: 'l73', zone: 8, title: 'REACTOR WARNING', from: 'FACILITIES', text: 'The building now runs on a reactor that runs on overtime. Every hour worked past five keeps the lights on. Every light is someone who did not go home.' },
  { id: 'l74', zone: 8, title: 'FINAL MEMO FROM DR. OKAFOR', from: 'R&D', text: 'I made an antidote. It only works on the source. Get it to the Chairman. Or skip the antidote and just shoot him a lot. Either should work.' },
  { id: 'l75', zone: 8, title: 'ELEVATOR INSPECTION', from: 'MAINTENANCE', text: 'Cables: fine. Brakes: fine. Direction: up only. Destination: always one floor closer to him. Inspector signature: missing. Inspector: missing.' },
  // zone 9: floors 46-50
  { id: 'l76', zone: 9, title: 'OFFER LETTER', from: 'THE CHAIRMAN', text: 'Dear temp, we have been very impressed with your performance. We would like to offer you a permanent position. It comes with benefits. It comes with forever.' },
  { id: 'l77', zone: 9, title: 'FAMILY PHOTO', from: 'CHAIRMAN\'S DESK', text: 'A photograph of the Chairman with his family, smiling, in 1987. Someone has drawn the building around them. The building is smiling too.' },
  { id: 'l78', zone: 9, title: 'THE LAST TIMESHEET', from: 'PAYROLL', text: 'Hours worked this week: infinite. Overtime rate: your life. Approved: E. Halvorsen. Disputed: you.' },
  { id: 'l79', zone: 9, title: 'NOTE FROM THE TEMP BEFORE YOU', from: 'UNKNOWN', text: 'I got to 49. I could hear him through the ceiling, laughing. I am leaving everything I had by the elevator. Take it. Finish it. Clock out.' },
  { id: 'l80', zone: 9, title: 'EXIT INTERVIEW', from: 'HR (FINAL)', text: 'Q: Why are you leaving? A: ___________. Q: Would you recommend Halvorsen-Pike to a friend? A: ___________. Q: Do you think you will make it out? A: Yes.' },
];
export const LORE_BY_ID = Object.fromEntries(LORE.map((l) => [l.id, l]));

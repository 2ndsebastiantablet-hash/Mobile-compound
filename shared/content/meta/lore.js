// Lore: collectible memos, emails and logs found lying around the tower (3 per zone, 10 zones).
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
];
export const LORE_BY_ID = Object.fromEntries(LORE.map((l) => [l.id, l]));

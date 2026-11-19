// Call standards: four quadrants (Validation, Understand, Solve, Verify) with a scorecard per call type.
// Scores are computed in code from these definitions; the model only judges each step with evidence.

export type Quadrant = "Validation" | "Understand" | "Solve" | "Verify";
export type Step = { key: string; label: string; quadrant: Quadrant; pass: string; objection?: boolean };
export type Scorecard = { id: "sales" | "office" | "retention"; name: string; steps: Step[]; gold: number; green: number };

const validation: Step[] = [
  { key: "validate", label: "Validate", quadrant: "Validation", pass: "Validates the specific reason for calling with genuine empathy or enthusiasm, using details of their situation (not a generic 'okay')." },
  { key: "confidence", label: "Confidence Statement", quadrant: "Validation", pass: "Clearly states they can help / will take care of it, e.g. 'I can definitely take care of this for you.'" },
  { key: "expectation_1", label: "Expectation Statement", quadrant: "Validation", pass: "Tells the customer what comes next before investigating, e.g. 'I'm going to ask a few questions so…'" },
];
const understand: Step[] = [
  { key: "investigate", label: "Investigate", quadrant: "Understand", pass: "Asks mostly open-ended questions (who/what/when/where/why/how) to understand the situation and root cause before solving." },
  { key: "summary", label: "Summary Statement", quadrant: "Understand", pass: "Reflects the customer's situation / wants, interests and needs back to them and checks agreement ('So it sounds like… does that sound right?')." },
  { key: "expectation_2", label: "Expectation Statement", quadrant: "Understand", pass: "Previews the next part before presenting the solution, e.g. 'I'll walk you through our service, then we'll talk price.'" },
];
const solve: Step[] = [
  { key: "present", label: "Present Solution", quadrant: "Solve", pass: "Explains the service or fix in clear detail (what / how / why), tailored to this customer's situation." },
  { key: "consensus", label: "Consensus", quadrant: "Solve", pass: "Checks the customer agrees or has questions before moving on, e.g. 'Does that sound good?' / 'Any questions before we talk price?'" },
  { key: "close", label: "Close", quadrant: "Solve", pass: "Asks for the commitment, ideally an option close ('morning or afternoon?') or books/confirms the action." },
];
const verifyOffice: Step[] = [
  { key: "conclusion", label: "Provide a Conclusion", quadrant: "Verify", pass: "Wraps up loose ends and sets expectations (date/time, what happens next, reminders, notes)." },
  { key: "thank", label: "Thank the Customer", quadrant: "Verify", pass: "Genuinely thanks the customer before ending." },
  { key: "final_info", label: "Offer Final Information", quadrant: "Verify", pass: "Offers final info: 'anything else I can help with', one-stop shop for other pests, or referral program." },
];

export const SCORECARDS: Record<Scorecard["id"], Scorecard> = {
  sales: {
    id: "sales",
    name: "Sales Call Scorecard",
    gold: 17,
    green: 14,
    steps: [
      ...validation,
      ...understand,
      ...solve,
      { key: "pricing", label: "Pricing", quadrant: "Solve", pass: "Presents price properly: anchor price first, then the sales price / special, framed against value." },
      { key: "agree", label: "Agree", quadrant: "Solve", objection: true, pass: "On an objection, first agrees with / validates the customer's point of view without debating." },
      { key: "restate", label: "Restate & Insinuate", quadrant: "Solve", objection: true, pass: "Restates the objection in their own words and suggests the underlying reason, to isolate it." },
      { key: "resolve", label: "Resolve", quadrant: "Solve", objection: true, pass: "Resolves the concern by addressing it and building more value." },
      { key: "reclose", label: "Re-Close", quadrant: "Solve", objection: true, pass: "Confidently asks for the sale again after handling the objection." },
      { key: "conclusion", label: "Provide a Conclusion", quadrant: "Verify", pass: "Confirms details: name, address, email, date/time, notes for the technician, pets, gate codes." },
      { key: "final_info", label: "Offer Final Information", quadrant: "Verify", pass: "Mentions the one-stop shop for other pests and/or the referral program." },
      { key: "thank", label: "Thank the Customer", quadrant: "Verify", pass: "Genuinely thanks the customer before ending." },
    ],
  },
  office: {
    id: "office",
    name: "Call Process Scorecard (All Calls)",
    gold: 12,
    green: 11,
    steps: [...validation, ...understand, ...solve, ...verifyOffice],
  },
  retention: {
    id: "retention",
    name: "Retention Call Scorecard",
    gold: 12,
    green: 11,
    steps: [
      { key: "validate_confidence", label: "Validate & Confidence Statement", quadrant: "Validation", pass: "Acknowledges the request calmly and assures they'll take care of the customer, e.g. 'No problem, I'll get you taken care of today.' Fails if they confirm the cancellation up front ('Yes, I can cancel that')." },
      { key: "transition", label: "Transition Statement", quadrant: "Validation", pass: "Transitions to gathering info, e.g. 'What's the address on the account? Let me take a quick look here.'" },
      { key: "research", label: "Do Your Research", quadrant: "Validation", pass: "Looks up the account and uses what they find (tenure, plan, recent services), e.g. 'I see you've been with us 3 years…'." },
      { key: "investigate", label: "Investigate", quadrant: "Understand", pass: "Asks why they want to cancel (without over-questioning) to find the real reason." },
      { key: "validate_summary", label: "Validate & Summary Statement", quadrant: "Understand", pass: "Validates their frustration and summarizes the reason back to them." },
      { key: "validate_expectation", label: "Validate & Expectation Statement", quadrant: "Understand", pass: "Validates again and previews that they will offer an option before the customer decides." },
      { key: "present", label: "Present Solution", quadrant: "Solve", pass: "Offers a specific save option that fits the root cause, from the solution bank: free re-service, back-to-back services, custom service plan, waive next month, set day/time/technician, brief account hold, service or branch manager visit, or (only when price is the root issue) a 10% price drop." },
      { key: "consensus", label: "Consensus", quadrant: "Solve", pass: "Asks for buy-in on the offer: 'Does that work for you?'" },
      { key: "repeat", label: "Repeat (when necessary)", quadrant: "Solve", pass: "If the first offer is declined, asks more questions and offers another solution. Pass automatically if the first offer was accepted." },
      { key: "conclusion", label: "Provide a Conclusion", quadrant: "Verify", pass: "Confirms the outcome and next steps (save details, or cancellation details / fees)." },
      { key: "thank", label: "Thank the Customer", quadrant: "Verify", pass: "Genuinely thanks the customer." },
      { key: "teaser", label: "Leave a Teaser", quadrant: "Verify", pass: "For cancels: leaves an incentive to come back. Pass automatically if the customer was saved." },
    ],
  },
};

export const CALL_TYPES = {
  sales: { label: "New Sale", scorecard: "sales", hint: "Prospect asking about service, a quote, or a new treatment." },
  retention: { label: "Cancellation", scorecard: "retention", hint: "Existing customer wants to cancel, pause, or is threatening to leave." },
  reservice: { label: "Re-service", scorecard: "office", hint: "Existing customer still seeing pests and needs a callback treatment." },
  scheduling: { label: "Scheduling", scorecard: "office", hint: "Book, confirm, move, or ask about an appointment." },
  billing: { label: "Billing", scorecard: "office", hint: "Payments, invoices, card on file, pricing questions on an existing account." },
  general: { label: "General Question", scorecard: "office", hint: "Other customer question handled by the office." },
  not_scorable: { label: "Not Scorable", scorecard: null, hint: "Voicemail, wrong number, spam/solicitor, vendor, internal, or too short to judge." },
} as const;
export type CallType = keyof typeof CALL_TYPES;

export const OUTCOMES = {
  booked: "Booked",
  quoted: "Quoted, not booked",
  lost: "Lost",
  saved: "Saved",
  cancelled: "Cancelled",
  resolved: "Resolved",
  unresolved: "Unresolved",
  no_conversation: "No conversation",
} as const;
export type Outcome = keyof typeof OUTCOMES;

export function grade(card: Scorecard, score: number) {
  return score >= card.gold ? "Gold" : score >= card.green ? "Green" : "Below";
}

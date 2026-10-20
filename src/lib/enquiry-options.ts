// Shared by the enquiry form and /api/enquiries so the accepted answers stay in sync.
export const eventTypes = ['Weddings', 'Birthday parties', 'Anniversary', 'Funerals', 'Corporate'] as const;
export const waiterOptions = ['Yes', 'No', 'Not sure yet'] as const;
export const waiterCostNote = 'Waiter service comes at an additional cost.';

// Validation rules the browser applies before sending and the server enforces again.
export const limits = { name: 100, email: 254, location: 200, notes: 1000, guests: 100000 } as const;
export const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export const wholeNumberPattern = /^\d+$/;
// Control characters, zero-width spaces and bidirectional overrides can fake extra lines in the
// email or disguise text. Joiners (U+200C/D) and direction marks stay allowed for real names.
export const hiddenCharacters = /[\u0000-\u001f\u007f-\u009f\u200b\u2028\u2029\u202a-\u202e\u2060\u2066-\u2069\ufeff]/;
// Notes may span lines, so tabs and line breaks are allowed there.
export const hiddenCharactersInNotes = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b\u2028\u2029\u202a-\u202e\u2060\u2066-\u2069\ufeff]/;

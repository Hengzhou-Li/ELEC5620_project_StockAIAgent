// lib/notify.ts
// Simulated email sender for development before real SendGrid integration.

export type MockEmail = {
  to: string;
  subject: string;
  text: string;
  sentAt: Date;
};

declare global {
  var __mockEmails: MockEmail[] | undefined;
}

function getEmailStore(): MockEmail[] {
  if (!global.__mockEmails) {
    global.__mockEmails = [];
  }
  return global.__mockEmails;
}

export async function sendEmailMock(to: string, subject: string, text: string) {
  const store = getEmailStore();
  const entry: MockEmail = { to, subject, text, sentAt: new Date() };
  store.push(entry);
  console.log(`[MockEmail] To: ${to} | Subject: ${subject} | ${text}`);
  return { success: true };
}

export function listMockEmails(limit = 50): MockEmail[] {
  const store = getEmailStore();
  return store.slice(-limit);
}

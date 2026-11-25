import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Terms of Service', alternates: { canonical: '/terms' } };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="25 November 2026">
      <p>By using UAP/Matrix you agree to these terms. They are short because the site is for fun and curiosity.</p>
      <h2>Be decent</h2>
      <ul>
        <li>Only post photos and videos you have the right to share.</li>
        <li>No harassment, hate, spam, or personal information about other people.</li>
        <li>Do not knowingly post hoaxes as genuine reports.</li>
      </ul>
      <h2>Your content</h2>
      <p>You keep ownership of what you post. You give us permission to display it on the site and in share cards. We may remove content that breaks these terms.</p>
      <h2>No guarantees</h2>
      <p>Credibility scores, AI answers and archive summaries are best effort and for entertainment and research. The service is provided as is, without warranty.</p>
      <h2>Changes</h2>
      <p>We may update these terms; the date above shows the latest version.</p>
    </LegalPage>
  );
}

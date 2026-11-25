import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Privacy Policy', alternates: { canonical: '/privacy' } };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="25 November 2026">
      <p>UAP/Matrix is a community map and archive of unexplained aerial sightings, built by Lowkee Studios. This page explains what we collect and why. Short version: as little as possible.</p>
      <h2>Signing in</h2>
      <p>You can sign in with Google or GitHub. We receive your name, profile picture and a provider account id. We use them only to create your pilot handle and to show your posts, co-witness logs and arcade scores under it. We never receive your password and we do not read your email, contacts or any other account data.</p>
      <h2>What you post</h2>
      <ul>
        <li>Sightings you report: description, time, location and any photo or video you upload. These are public on the map.</li>
        <li>Comments, upvotes, co-witness confirmations and arcade scores. These are public.</li>
      </ul>
      <h2>Stored on your device</h2>
      <p>Your pilot name, alien avatar, theme and onboarding progress are kept in your browser&apos;s local storage. A sign-in cookie keeps you logged in. Clearing site data removes them.</p>
      <h2>Analytics</h2>
      <p>We use Vercel Web Analytics and Speed Insights, which measure page views and performance without cookies or cross-site tracking.</p>
      <h2>AI features</h2>
      <p>Questions you ask the AI Archivist and reports sent for analysis are processed by Google Gemini to generate a reply. Do not include personal information in them.</p>
      <h2>Sharing</h2>
      <p>We do not sell or share your data with advertisers. Data is hosted with Vercel and Neon (database) to run the service.</p>
      <h2>Your choices</h2>
      <p>You can ask us to delete your account and the content linked to it at any time by opening an issue at <a href="https://github.com/BrandDeb/uap-global-matrix/issues">our GitHub</a> or contacting the support email shown on the Google sign-in screen.</p>
    </LegalPage>
  );
}

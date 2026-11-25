import type { Metadata } from 'next';
import SettingsView from '@/components/profile/SettingsView';

export const metadata: Metadata = { title: 'Settings · UAP/MATRIX', robots: { index: false } };

export default function SettingsPage() {
  return <SettingsView />;
}

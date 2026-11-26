import type { Metadata } from 'next';
import Comms from '@/components/comms/Comms';

export const metadata: Metadata = {
  title: 'Comms: talk about UFO sightings and space',
  description: 'Describe what you saw and talk with other skywatchers in moderated, on-topic channels: live sightings, stories, space talk and the debunk desk.',
  alternates: { canonical: '/comms' },
};

export default function CommsPage() {
  return <Comms />;
}

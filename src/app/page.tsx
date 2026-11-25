import type { Metadata } from 'next';
import Landing from '@/components/landing/Landing';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = {
  title: { absolute: 'UAP/MATRIX: live UFO sighting map, declassified archive and arcade' },
  alternates: { canonical: '/' },
  description:
    'A live, planet-scale atlas of unidentified anomalous phenomena: every sighting since 1947, geotagged, forensically scored and argued about in public.',
};

const HOME_FAQ: [string, string][] = [
  ['What is UAP/MATRIX?', 'A free, live 3D atlas of UFO and UAP sightings since 1942. It maps community reports and a curated archive of declassified cases on an interactive globe, scores each one with a 0 to 100 credibility index, and includes original UFO arcade games. It is designed and built by Lowkee Studios.'],
  ['How do I report a UFO sighting?', 'Open the landing page and use Report a sighting, or go to the globe. Add when and where you saw it, a description and an optional photo or video. It appears on the live globe where others can co-witness, upvote and discuss it.'],
  ['How is the credibility score calculated?', 'Each report gets a 0 to 100 index combining photo EXIF forensics, a deep-fake check, and proximity to known aircraft and satellites at that time and place. Archive cases are scored on source quality and corroboration.'],
  ['What are the most famous UFO cases?', 'Landmark cases include Roswell (1947), the Washington DC flap (1952), the Betty and Barney Hill abduction (1961), the Belgian triangle wave (1989 to 1990), the Phoenix Lights (1997) and the USS Nimitz Tic Tac encounter (2004). All are in the archive with sources.'],
  ['Is UAP/MATRIX free?', 'Yes. Browsing, reporting sightings and playing the arcade are free. Signing in with Google or GitHub is optional and only used for your pilot handle.'],
];

export default function Home() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: HOME_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
        }}
      />
      <Landing />
    </>
  );
}

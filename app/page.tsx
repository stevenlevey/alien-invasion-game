'use client';

import dynamic from 'next/dynamic';

const AlienInvasionGame = dynamic(() => import('./components/AlienInvasionGame'), {
  ssr: false
});

export default function Home() {
  return <AlienInvasionGame />;
}

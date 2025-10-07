'use client';

import BoardList from '@/components/BoardList';
import CreateRootBoard from '@/components/CreateRootBoard';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <CreateRootBoard />
      <BoardList />

    </main>
  );
}

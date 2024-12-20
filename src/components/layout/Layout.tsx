import { Outlet } from 'react-router-dom';
import { Header } from '../navigation/Header';
import { Sidebar } from '../navigation/Sidebar';
import { MobileNav } from '../navigation/MobileNav';
import { Toaster } from '../ui/toaster';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-16 pb-16 md:pb-8 md:pl-64">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <Toaster />
    </div>
  );
}
import Navbar from './layout/Navbar';
import Footer from './layout/Footer';
import PageHeroComponent from './ui/PageHero';

export function PageHero(props) {
  return <PageHeroComponent {...props} />;
}

export default function UniLayout({ children, session }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar session={session} />

      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
// app/page.tsx

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

export default function HomePage() {
  return (
    <div>
      <Navbar />
      <main>
        {/* The home page now only contains the HeroSection */}
        <HeroSection />
      </main>
      {/* Other landing page contents can be added here, such as function introductions, customer reviews, etc */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-6 px-4 text-center text-gray-500">
          <p>&copy; {new Date().getFullYear()} MyFinAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
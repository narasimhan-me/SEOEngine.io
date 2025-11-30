import Link from 'next/link';
import Image from 'next/image';

export default function MarketingNavbar() {
  return (
    <header className="bg-white border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and nav links */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo/A_digital_vector_graphic_displays_the_logo_for_SEO.png"
                alt="SEOEngine.io"
                width={140}
                height={35}
                priority
              />
            </Link>
            <div className="hidden md:flex md:ml-10 md:space-x-8">
              <Link
                href="/features"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/contact"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>

          {/* Right side - Auth links */}
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              Sign Up Free
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

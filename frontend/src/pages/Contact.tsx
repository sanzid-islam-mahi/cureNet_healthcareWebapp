import contactImage from '../assets/image_395.png';

export default function Contact() {
  return (
    <div className="bg-white py-14 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Heading */}
        <h1 className="text-center text-3xl font-light text-gray-800 mb-12 tracking-wide">
          CONTACT <span className="font-bold text-gray-900">US</span>
        </h1>

        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row items-center gap-12">

          {/* Left – illustration */}
          <div className="flex-shrink-0 w-full md:w-72 lg:w-80">
            <img
              src={contactImage}
              alt="Contact illustration"
              className="w-full h-auto object-contain"
              decoding="async"
            />
          </div>

          {/* Right – info */}
          <div className="flex-1 space-y-8">

            {/* Our Office */}
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3">
                Our Office
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                54709 Willms Station<br />
                Suite 350, Chittagong, Bangladesh
              </p>
              <p className="text-gray-600 text-sm mt-3">
                Tel: +012-456-7890
              </p>
              <p className="text-gray-600 text-sm">
                Email: curenet@gmail.com
              </p>
            </div>

            {/* Careers */}
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3">
                Careers at CureNet
              </h2>
              <p className="text-gray-500 text-sm mb-4">
                Learn more about our teams and job openings.
              </p>
              <button className="border border-gray-400 text-gray-700 text-sm px-8 py-2.5 hover:bg-gray-50 hover:border-gray-600 transition-colors duration-200">
                Explore Jobs
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

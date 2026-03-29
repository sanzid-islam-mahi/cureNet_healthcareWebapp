import doctorImage from '../assets/image_394.png';

export default function About() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ===== ABOUT SECTION ===== */}
      <div className="max-w-5xl mx-auto w-full px-6 py-14">

        {/* Heading */}
        <h1 className="text-center text-3xl font-light text-gray-800 mb-10 tracking-wide">
          ABOUT <span className="font-bold text-gray-900">US</span>
        </h1>

        {/* Two-column: image + text */}
        <div className="flex flex-col md:flex-row gap-10 items-start">

          {/* Left – doctor image */}
          <div className="flex-shrink-0 w-full md:w-64 lg:w-72">
            <img
              src={doctorImage}
              alt="Healthcare professionals"
              className="w-full h-auto object-contain"
              decoding="async"
            />
          </div>

          {/* Right – text content */}
          <div className="flex-1 text-gray-600 text-sm leading-relaxed space-y-4">
            <p>
              Welcome to CureNet, your trusted partner in managing your healthcare needs conveniently and efficiently.
              At CureNet, we understand the challenges individuals face when it comes to scheduling doctor
              appointments and managing their health records.
            </p>
            <p>
              CureNet is committed to excellence in healthcare technology. We continuously strive to enhance our
              platform, integrating the latest advancements to improve user experience and deliver superior service.
              Whether you're booking your first appointment or managing ongoing care, CureNet is here to support you
              every step of the way.
            </p>

            {/* Our Vision */}
            <div>
              <h2 className="text-sm font-bold text-gray-800 mb-2">Our Vision</h2>
              <p>
                Our vision at CureNet is to create a seamless healthcare experience for every user. We aim to bridge the
                gap between patients and healthcare providers, making it easier for you to access the care you need, when
                you need it.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== THREE FEATURE COLUMNS ===== */}
      <div className="bg-white border-t border-gray-100 py-14">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">

          {/* Efficiency */}
          <div>
            <p className="font-bold text-gray-800 mb-2 uppercase tracking-wide">Efficiency:</p>
            <p className="text-gray-500 leading-relaxed">
              Streamlined appointment scheduling<br />
              that fits into your busy lifestyle.
            </p>
          </div>

          {/* Convenience */}
          <div>
            <p className="font-bold text-gray-800 mb-2 uppercase tracking-wide">Convenience:</p>
            <p className="text-gray-500 leading-relaxed">
              Access to a network of trusted<br />
              healthcare professionals in your area.
            </p>
          </div>

          {/* Personalization */}
          <div>
            <p className="font-bold text-gray-800 mb-2 uppercase tracking-wide">Personalization:</p>
            <p className="text-gray-500 leading-relaxed">
              Tailored recommendations and reminders<br />
              to help you stay on top of your health.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

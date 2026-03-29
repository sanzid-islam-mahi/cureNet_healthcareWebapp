import { Link } from 'react-router-dom';
import logo from '../assets/curenet_logo.webp';

const Footer = () => {
  return (
    <div className="md:mx-10">
      <div className="flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm">
        {/* Left Section */}
        <div>
          <img src={logo} className="w-40 mb-5" alt="CureNET" />
          <p className="w-full md:w-2/3 text-gray-600 leading-6">
            CureNET is a comprehensive healthcare management platform designed to streamline patient care,
            appointment scheduling, and medical record management. Empowering healthcare providers to deliver exceptional care.
          </p>
        </div>

        {/* Center Section */}
        <div>
          <p className="text-xl font-medium mb-5 text-gray-900">COMPANY</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li><Link to="/" className="hover:text-blue-600">Home</Link></li>
            <li><Link to="/about" className="hover:text-blue-600">About us</Link></li>
            <li><Link to="/contact" className="hover:text-blue-600">Contact us</Link></li>
            <li><a href="#" className="hover:text-blue-600">Privacy policy</a></li>
          </ul>
        </div>

        {/* Right Section */}
        <div>
          <p className="text-xl font-medium mb-5 text-gray-900">GET IN TOUCH</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li>+012-456-7890</li>
            <li>curenet@gmail.com</li>
          </ul>
        </div>
      </div>

      {/* Copyright Text */}
      <div>
        <hr className="border-gray-200" />
        <p className="py-5 text-sm text-center text-gray-600">Copyright 2024 @ CureNET - All Right Reserved.</p>
      </div>
    </div>
  );
};

export default Footer;

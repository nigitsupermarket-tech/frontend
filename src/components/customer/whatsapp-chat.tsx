// components/WhatsAppChat.tsx
import Link from "next/link";
import React from "react";
import { BsWhatsapp } from "react-icons/bs";

const WhatsAppChat: React.FC = () => {
  return (
    <Link
      href="https://wa.me/2349169776138?text=Hello,%20I'd%20like%20to%20place%20an%20order..."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-[9999] flex items-center justify-center w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition"
      aria-label="Chat on WhatsApp"
    >
      <BsWhatsapp className="text-3xl" />
    </Link>
  );
};

export default WhatsAppChat;

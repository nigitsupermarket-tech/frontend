"use client";

import { useState } from "react";
import { FileText, Home, Mail, Phone, Shield, FileCheck } from "lucide-react";
import AdminHomeSettingsTab from "@/components/admin/settings/home-settings-tab";
import AdminAboutUsTab from "@/components/admin/settings/about-us-tab";
import AdminContactTab from "@/components/admin/settings/contact-tab";
import AdminPrivacyTab from "@/components/admin/settings/privacy-tab";
import AdminTermsTab from "@/components/admin/settings/terms-tab";

export default function AdminPagesSettingsPage() {
  const [activeTab, setActiveTab] = useState("home");

  const tabs = [
    { id: "home", label: "Home Page", icon: Home },
    { id: "about", label: "About Us", icon: FileText },
    { id: "contact", label: "Contact", icon: Phone },
    { id: "privacy", label: "Privacy Policy", icon: Shield },
    { id: "terms", label: "Terms of Service", icon: FileCheck },
  ];

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pages Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage all your website pages content
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 bg-white rounded-xl p-2 mb-6 overflow-x-auto border border-gray-100">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-gray-100">
        {activeTab === "home" && <AdminHomeSettingsTab />}
        {activeTab === "about" && <AdminAboutUsTab />}
        {activeTab === "contact" && <AdminContactTab />}
        {activeTab === "privacy" && <AdminPrivacyTab />}
        {activeTab === "terms" && <AdminTermsTab />}
      </div>
    </div>
  );
}

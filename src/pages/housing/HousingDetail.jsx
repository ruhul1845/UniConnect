import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import LocationMap from "../../components/housing/LocationMap";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80";

export default function HousingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data, error: err } = await supabase
        .from("housing_listings")
        .select("*")
        .eq("id", id)
        .single();

      if (err) {
        setError("Listing not found.");
      } else {
        setListing(data);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const isOwner = currentUser && listing && currentUser.id === listing.user_id;

  const handleDelete = async () => {
    if (!window.confirm("Delete this listing?")) return;
    const { error: err } = await supabase
      .from("housing_listings")
      .delete()
      .eq("id", id);
    if (!err) navigate("/housing");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0d1b4b] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading listing…</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center justify-center gap-4">
        <p className="text-red-500 text-lg">{error || "Listing not found"}</p>
        <button onClick={() => navigate("/housing")} className="text-[#0d1b4b] underline">
          ← Back to listings
        </button>
      </div>
    );
  }

  const {
    title, description, price, location,
    room_type, contact, image, religion, created_at,
  } = listing;

  const formattedDate = created_at
    ? new Date(created_at).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const infoItems = [
    { icon: "🏠", label: "Room Type", value: room_type },
    { icon: "📍", label: "Location", value: location },
    { icon: "💰", label: "Monthly Rent", value: `৳${Number(price).toLocaleString()}` },
    { icon: "🕌", label: "Religion Preference", value: religion || "Any" },
    { icon: "📅", label: "Posted On", value: formattedDate },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#0d1b4b] hover:text-[#f5a623] font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            All Listings
          </button>
          {isOwner && (
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/housing/edit/${id}`)}
                className="px-4 py-1.5 text-sm border border-[#f5a623] text-[#c47f00] rounded-lg hover:bg-[#f5a623] hover:text-white transition-colors font-medium"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-1.5 text-sm border border-red-400 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left column ─────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Hero Image */}
            <div className="rounded-2xl overflow-hidden shadow-md h-72">
              <img
                src={image || PLACEHOLDER_IMAGE}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
              />
            </div>

            {/* Title + Badge */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="bg-[#0d1b4b] text-white text-xs font-bold px-3 py-1 rounded-full">
                  {room_type}
                </span>
                {religion && religion !== "Any" && (
                  <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {religion} preferred
                  </span>
                )}
              </div>
              <h1 className="text-[#0d1b4b] text-2xl md:text-3xl font-extrabold leading-tight">
                {title}
              </h1>
              <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span className="text-sm">{location}, Dhaka</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-[#0d1b4b] font-bold text-lg mb-3">About This Place</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{description}</p>
            </div>

            {/* OpenStreetMap */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-[#0d1b4b] font-bold text-lg mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#f5a623]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Location on Map
              </h2>
              <LocationMap location={`${location}, Dhaka`} height="320px" />
              <p className="text-xs text-gray-400 mt-2 text-center">
                Map data © OpenStreetMap contributors. Location is approximate.
              </p>
            </div>
          </div>

          {/* ── Right column ────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Price Card */}
            <div
              className="rounded-2xl p-6 text-white shadow-lg"
              style={{ background: "linear-gradient(135deg, #0d1b4b, #1a3a6e)" }}
            >
              <p className="text-blue-200 text-sm mb-1">Monthly Rent</p>
              <p className="text-4xl font-extrabold text-[#f5a623]">
                ৳{Number(price).toLocaleString()}
              </p>
              <p className="text-blue-300 text-sm mt-1">per month</p>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-[#0d1b4b] font-bold text-base">Details</h3>
              {infoItems.map(({ icon, label, value }) => value && (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
                    <p className="text-[#0d1b4b] font-medium text-sm">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="text-[#0d1b4b] font-bold text-base mb-3">Contact Landlord</h3>
              <a
                href={`tel:${contact}`}
                className="flex items-center gap-3 w-full bg-[#0d1b4b] text-white rounded-xl py-3 px-4 hover:bg-[#1a2d6d] transition-colors mb-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="font-semibold">{contact}</span>
              </a>
              <a
                href={`https://wa.me/88${contact?.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full border-2 border-green-400 text-green-600 rounded-xl py-2.5 px-4 hover:bg-green-50 transition-colors font-semibold text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.112 1.523 5.843L0 24l6.321-1.499A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.6c-1.988 0-3.855-.538-5.462-1.476l-.39-.232-4.054.96.998-3.948-.254-.406A9.56 9.56 0 012.4 12c0-5.292 4.308-9.6 9.6-9.6 5.292 0 9.6 4.308 9.6 9.6 0 5.292-4.308 9.6-9.6 9.6z" />
                </svg>
                WhatsApp
              </a>
            </div>

            {/* Back */}
            <button
              onClick={() => navigate("/housing")}
              className="w-full text-center text-sm text-gray-400 hover:text-[#0d1b4b] transition-colors py-2"
            >
              ← Back to all listings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

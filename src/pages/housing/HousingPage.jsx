import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient"; // adjust path if needed
import HousingCard from "../../components/housing/HousingCard";

const ROOM_TYPES = ["All Types", "Single Room", "Shared Room", "Sublet", "Whole Flat", "Seat (Mess)"];
const VISIBILITIES = ["CSE Only", "University Wide", "Public"];
const LOCATIONS = ["Azimpur", "Dhanmondi", "Nilkhet", "Palashi", "Shahbag", "Elephant Road", "New Market"];

export default function HousingPage() {
  const navigate = useNavigate();

  // Filters
  const [locationInput, setLocationInput] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [roomType, setRoomType] = useState("All Types");
  const [visibility, setVisibility] = useState("CSE Only");
  const [quickFilter, setQuickFilter] = useState("Available Now");

  // Data
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("housing_listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (locationInput.trim()) {
        query = query.ilike("location", `%${locationInput.trim()}%`);
      }
      if (maxRent) {
        query = query.lte("price", parseInt(maxRent));
      }
      if (roomType !== "All Types") {
        query = query.eq("room_type", roomType);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setListings(data || []);
    } catch (e) {
      setError("Failed to load listings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [locationInput, maxRent, roomType]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleLocationInput = (val) => {
    setLocationInput(val);
    if (val.length > 1) {
      setSuggestions(LOCATIONS.filter((l) => l.toLowerCase().includes(val.toLowerCase())));
    } else {
      setSuggestions([]);
    }
  };

  const quickFilters = ["Available Now", "Roommate Match", "Map View", "Near Campus"];

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d1b4b 0%, #1a3a6e 50%, #1a6b8a 100%)",
          minHeight: 280,
        }}
      >
        {/* subtle dot grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-14">
          <p className="text-[#f5a623] text-xs font-bold tracking-widest uppercase mb-3">
            Accommodation Finder
          </p>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-white text-4xl md:text-5xl font-extrabold leading-tight mb-3">
                Housing &amp; To-Let Finder
              </h1>
              <p className="text-blue-200 text-base max-w-lg">
                Find flats, sublets and compatible roommates near campus with
                CSE-only visibility and availability filters.
              </p>
            </div>
            <button
              onClick={() => navigate("/housing/post")}
              className="self-start md:self-center bg-[#f5a623] hover:bg-[#e09010] text-[#0d1b4b] font-bold px-6 py-3 rounded-full transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              + Post Housing Listing
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Location */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1.5">
                Location
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <input
                  value={locationInput}
                  onChange={(e) => handleLocationInput(e.target.value)}
                  placeholder="Azimpur, Dhanmondi, Nilkhet…"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0d1b4b]"
                />
              </div>
              {suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 mt-1 overflow-hidden">
                  {suggestions.map((s) => (
                    <li
                      key={s}
                      onClick={() => { setLocationInput(s); setSuggestions([]); }}
                      className="px-4 py-2.5 text-sm hover:bg-blue-50 cursor-pointer text-gray-700"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Max Rent */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1.5">
                Max Rent
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">৳</span>
                <input
                  type="number"
                  value={maxRent}
                  onChange={(e) => setMaxRent(e.target.value)}
                  placeholder="10000"
                  className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0d1b4b]"
                />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1.5">
                Type
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d1b4b]"
              >
                {ROOM_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1.5">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d1b4b]"
              >
                {VISIBILITIES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Quick filter pills */}
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((f) => (
              <button
                key={f}
                onClick={() => {
                  setQuickFilter(f);
                  if (f === "Map View") navigate("/housing/map");
                  if (f === "My Posts") navigate("/housing/my-listings");
                }}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  quickFilter === f
                    ? "bg-[#f5a623] text-[#0d1b4b] shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
            <button
              onClick={() => navigate("/housing/my-listings")}
              className="ml-auto px-4 py-2 rounded-full text-sm font-semibold bg-[#0d1b4b] text-white hover:bg-[#1a2d6d] transition-all"
            >
              My Posts →
            </button>
          </div>
        </div>
      </div>

      {/* ── Listings Grid ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-[#0d1b4b] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Finding listings near you…</p>
          </div>
        ) : error ? (
          <div className="text-center py-24 text-red-500">{error}</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-bold text-[#0d1b4b] mb-2">No listings found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your filters or be the first to post!</p>
            <button
              onClick={() => navigate("/housing/post")}
              className="bg-[#f5a623] text-[#0d1b4b] font-bold px-6 py-3 rounded-full hover:bg-[#e09010] transition-all"
            >
              Post a Listing
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#0d1b4b] font-bold text-xl">
                {listings.length} listing{listings.length !== 1 ? "s" : ""} found
              </h2>
              <button
                onClick={fetchListings}
                className="text-sm text-gray-500 hover:text-[#0d1b4b] flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <HousingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

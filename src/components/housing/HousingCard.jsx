import React from "react";
import { useNavigate } from "react-router-dom";

const ROOM_TYPE_COLORS = {
  "Single Room": "bg-blue-100 text-blue-800",
  "Shared Room": "bg-purple-100 text-purple-800",
  Sublet: "bg-green-100 text-green-800",
  "Whole Flat": "bg-orange-100 text-orange-800",
  "Seat (Mess)": "bg-pink-100 text-pink-800",
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80";

export default function HousingCard({ listing, showOwnerActions, onEdit, onDelete }) {
  const navigate = useNavigate();

  const {
    id,
    title,
    description,
    price,
    location,
    room_type,
    department,
    image,
    images,
    religion,
    created_at,
  } = listing;

  const badgeClass =
    ROOM_TYPE_COLORS[room_type] || "bg-gray-100 text-gray-700";

  const postedDaysAgo = () => {
    if (!created_at) return "";
    const diff = Math.floor(
      (Date.now() - new Date(created_at)) / (1000 * 60 * 60 * 24)
    );
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return `${diff} days ago`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={images?.[0] || image || PLACEHOLDER_IMAGE}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
        />
        {/* Type Badge */}
        <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
          {room_type || "Room"}
        </span>
        {/* Price Badge */}
        <span className="absolute top-3 right-3 bg-[#0d1b4b] text-white text-sm font-bold px-3 py-1 rounded-full">
          ৳{Number(price).toLocaleString()}/mo
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-[#0d1b4b] font-bold text-base leading-snug mb-1 line-clamp-1">
          {title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-2">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="line-clamp-1">{location}</span>
        </div>

        {/* Description */}
        <p className="text-gray-500 text-sm line-clamp-2 flex-1 mb-3">
          {description}
        </p>

        {/* Tags Row */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {department && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              {department}
            </span>
          )}
          {religion && religion !== "Any" && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              {religion}
            </span>
          )}
          <span className="text-xs text-gray-400">{postedDaysAgo()}</span>
        </div>

        {/* Actions */}
        {showOwnerActions ? (
          <div className="flex gap-2 mt-auto">
            <button
              onClick={() => navigate(`/housing/${id}`)}
              className="flex-1 text-sm border border-[#0d1b4b] text-[#0d1b4b] py-2 rounded-lg hover:bg-[#0d1b4b] hover:text-white transition-colors font-medium"
            >
              View
            </button>
            <button
              onClick={() => onEdit(listing)}
              className="flex-1 text-sm border border-[#f5a623] text-[#c47f00] py-2 rounded-lg hover:bg-[#f5a623] hover:text-white transition-colors font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(id)}
              className="flex-1 text-sm border border-red-400 text-red-500 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors font-medium"
            >
              Delete
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate(`/housing/${id}`)}
            className="w-full bg-[#0d1b4b] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a2d6d] transition-colors mt-auto"
          >
            View Details →
          </button>
        )}
      </div>
    </div>
  );
}

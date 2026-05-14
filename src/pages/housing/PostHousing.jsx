import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";

const ROOM_TYPES = [
  "Single Room",
  "Shared Room",
  "Sublet",
  "Whole Flat",
  "Seat (Mess)",
];

const RELIGIONS = [
  "Any",
  "Muslim",
  "Hindu",
  "Christian",
  "Buddhist",
  "Other",
];

const EMPTY_FORM = {
  title: "",
  description: "",
  price: "",
  location: "",
  latitude: null,
  longitude: null,
  room_type: "Single Room",
  contact: "",
  religion: "Any",
  images: [],
};

export default function PostHousing() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();

      if (!u) {
        navigate("/login");
        return;
      }

      setUser(u);

      if (isEdit) {
        const { data, error: err } = await supabase
          .from("housing_listings")
          .select("*")
          .eq("id", id)
          .single();

        if (err || !data) {
          navigate("/housing");
          return;
        }

        if (data.user_id !== u.id) {
          navigate("/housing");
          return;
        }

        setForm({
          title: data.title || "",
          description: data.description || "",
          price: data.price || "",
          location: data.location || "",
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          room_type: data.room_type || "Single Room",
          contact: data.contact || "",
          religion: data.religion || "Any",
          images: data.images || [],
        });

        if (data.images?.length > 0) {
          setImagePreview(data.images[0]);
        }
      }
    };

    init();
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

 const detectCurrentLocation = async () => {
  if (!navigator.geolocation) {
    setError("Geolocation is not supported by your browser.");
    return;
  }

  setError(null);
  setDetectingLocation(true);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        console.log("LAT:", lat);
        console.log("LNG:", lng);

        // Save coordinates immediately
        setForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));

        // Reverse geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Location lookup failed");
        }

        const data = await response.json();

        console.log("Nominatim response:", data);

        const address =
          data.address?.suburb ||
          data.address?.city_district ||
          data.address?.neighbourhood ||
          data.address?.road ||
          data.address?.city ||
          data.display_name;

        setForm((prev) => ({
          ...prev,
          location: address || `${lat}, ${lng}`,
          latitude: lat,
          longitude: lng,
        }));
      } catch (err) {
        console.error(err);

        // fallback
        setForm((prev) => ({
          ...prev,
          location: "Current Location",
        }));

        setError("Could not fetch address name.");
      } finally {
        setDetectingLocation(false);
      }
    },
    (geoError) => {
      console.error(geoError);

      if (geoError.code === 1) {
        setError("Location permission denied.");
      } else if (geoError.code === 2) {
        setError("Location unavailable.");
      } else {
        setError("Failed to detect location.");
      }

      setDetectingLocation(false);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
};
 const uploadImages = async () => {
  if (!imageFile) return form.images || [];

  console.log("Uploading file:", imageFile);

  const ext = imageFile.name.split(".").pop();

  const fileName = `housing/${user.id}_${Date.now()}.${ext}`;

  console.log("PATH:", fileName);

  const { data, error } = await supabase.storage
    .from("housing-image")
    .upload(fileName, imageFile, {
      cacheControl: "3600",
      upsert: true,
    });

  console.log("UPLOAD DATA:", data);
  console.log("UPLOAD ERROR:", error);

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from("housing-image")
    .getPublicUrl(fileName);

  console.log("PUBLIC URL:", publicUrlData.publicUrl);

  return [publicUrlData.publicUrl];
};
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const required = ["title", "price", "location", "contact"];

    for (const field of required) {
      if (!form[field]) {
        setError(`Please fill in the ${field} field.`);
        return;
      }
    }

    if (isNaN(Number(form.price)) || Number(form.price) <= 0) {
      setError("Please enter a valid price.");
      return;
    }

    setSubmitting(true);

    try {
      const imageUrls = await uploadImages();

      const payload = {
        ...form,
        price: Number(form.price),
        images: imageUrls,
        user_id: user.id,
      };

      if (isEdit) {
        const { error: err } = await supabase
          .from("housing_listings")
          .update(payload)
          .eq("id", id);

        if (err) throw err;

        navigate(`/housing/${id}`);
      } else {
        const { data, error: err } = await supabase
          .from("housing_listings")
          .insert([payload])
          .select()
          .single();

        if (err) throw err;

        navigate(`/housing/${data.id}`);
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <div
        className="px-6 py-10"
        style={{
          background: "linear-gradient(135deg, #0d1b4b, #1a3a6e)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-300 hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors"
          >
            ← Back
          </button>

          <p className="text-[#f5a623] text-xs font-bold tracking-widest uppercase mb-1">
            Housing & To-Let
          </p>

          <h1 className="text-white text-3xl font-extrabold">
            {isEdit ? "Edit Your Listing" : "Post a New Listing"}
          </h1>

          <p className="text-blue-200 text-sm mt-2">
            {isEdit
              ? "Update the details of your listing below."
              : "Share your room or flat with fellow students."}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Field
              label="Listing Title *"
              hint="Example: Spacious room near Dhanmondi"
            >
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter listing title"
                className={inputCls}
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Monthly Rent (৳) *">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    ৳
                  </span>

                  <input
                    name="price"
                    type="number"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="6000"
                    className={`${inputCls} pl-7`}
                    min={0}
                    required
                  />
                </div>
              </Field>

              <Field label="Location *">
                <div className="space-y-2">
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Type area or detect current location"
                    className={inputCls}
                    required
                  />

                  <button
                    type="button"
                    onClick={detectCurrentLocation}
                    disabled={detectingLocation}
                    className="text-sm px-4 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    {detectingLocation
                      ? "Detecting..."
                      : "Use Current Location"}
                  </button>
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Room Type">
                <select
                  name="room_type"
                  value={form.room_type}
                  onChange={handleChange}
                  className={inputCls}
                >
                  {ROOM_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>

              <Field label="Religion Preference">
                <select
                  name="religion"
                  value={form.religion}
                  onChange={handleChange}
                  className={inputCls}
                >
                  {RELIGIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Contact Number *">
              <input
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="01XXXXXXXXX"
                className={inputCls}
                required
              />
            </Field>

            <Field label="Description">
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe the room, facilities, utilities, and conditions"
                className={`${inputCls} resize-none`}
              />
            </Field>

            <Field label="Room Photo">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-[#0d1b4b] transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />

                {imagePreview ? (
                  <div>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-40 object-cover rounded-lg mx-auto mb-2"
                    />

                    <p className="text-xs text-gray-400">
                      Click to change photo
                    </p>
                  </div>
                ) : (
                  <div className="py-4">
                    <div className="text-4xl mb-2">📷</div>

                    <p className="text-sm text-gray-500">
                      Click to upload a photo
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      JPG, PNG, WEBP — max 5MB
                    </p>
                  </div>
                )}
              </div>
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-[#f5a623] hover:bg-[#e09010] text-[#0d1b4b] font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0d1b4b] border-t-transparent rounded-full animate-spin" />
                    {isEdit ? "Saving..." : "Posting..."}
                  </>
                ) : isEdit ? (
                  "Save Changes"
                ) : (
                  "Post Listing"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0d1b4b] bg-white";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0d1b4b] mb-1.5">
        {label}
      </label>

      {children}

      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

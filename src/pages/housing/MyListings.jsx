import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import HousingCard from "../../components/housing/HousingCard";
import { Button } from "../../components/ui/Button";

const MyListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("housing_listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setListings(data);
    }

    setLoading(false);
  };

  const deleteListing = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this listing?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("housing_listings")
      .delete()
      .eq("id", id);

    if (!error) {
      setListings((prev) => prev.filter((item) => item.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          My Listings
        </h1>
      </div>

      {listings.length === 0 ? (
        <div className="text-center text-gray-500">
          No listings posted yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div key={listing.id}>
              <HousingCard listing={listing} />

              <div className="flex gap-2 mt-3">
                <Button
                  onClick={() =>
                    window.location.href = `/housing/edit/${listing.id}`
                  }
                >
                  Edit
                </Button>

                <Button
                  onClick={() => deleteListing(listing.id)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyListings;
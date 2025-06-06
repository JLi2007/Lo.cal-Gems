"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import SwipeCard from "@/components/swipeCard";
import { FilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { getSession } from "next-auth/react";

interface Location {
  latitude: number;
  longitude: number;
}

interface Place {
  id: string | number;
  name: string;
  address?: string;
  description?: string;
  photo?: string;
  query?: string;
}

export default function Swipe() {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [displayCount, setDisplayCount] = useState(3);
  const [likedPlaces, setLikedPlaces] = useState<Record<string | number, boolean>>({});
  const [showFilter, adjustShowFilter] = useState(false);
  const [query, setQuery] = useState("");
  const isExitClicked = useRef(false);
  const [userWishlist, setUserWishlist] = useState<Place[]>([]);

  const fetchUserWishlist = async () => {
    try {
      const session = await getSession();
      if (!session?.user?.email) {
        console.log("No user session found");
        return [];
      }

      // Fetch the user's wishlist from Firebase
      const response = await fetch(`/api/likes/wishlist`);
      if (!response.ok) {
        throw new Error('Failed to fetch wishlist');
      }
      
      const data = await response.json();
      setUserWishlist(data.wishlist || []);
      return data.wishlist;
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      return [];
    }
  };
  const fetchPlaces = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(location);
  
          try {
            // Fetch the user's wishlist
            const wishlistResponse = await fetch("/api/likes/wishlist");
            const wishlistData = await wishlistResponse.json();
            const userWishlist = wishlistData.wishlist || [];
  
            if (userWishlist.length === 0) {
              // Wishlist is empty: fetch places from /api/places endpoint
              const placesResponse = await fetch(
                `/api/places?location=${location.latitude},${location.longitude}`
              );
              const data = await placesResponse.json();
  
              if (Array.isArray(data)) {
                // Randomize and pick 20 places
                const shuffled = data.sort(() => 0.5 - Math.random());
                const randomPlaces = shuffled.slice(0, 20);
                setPlaces(randomPlaces);
              } else {
                console.error("Unexpected response from /api/places:", data);
                setPlaces([]);
              }
            } else {
              // If wishlist exists, use recommendations logic (or bypass for now)
              // For now, you might simply log the wishlist or fallback to /api/places.
              console.log("Wishlist exists, but currently bypassing recommendations.");
              const placesResponse = await fetch(
                `/api/places?location=${location.latitude},${location.longitude}`
              );
              const data = await placesResponse.json();
  
              if (Array.isArray(data)) {
                const shuffled = data.sort(() => 0.5 - Math.random());
                const randomPlaces = shuffled.slice(0, 20);
                setPlaces(randomPlaces);
              } else {
                setPlaces([]);
              }
            }
            setLikedPlaces({});
          } catch (error) {
            console.error("Error fetching places:", error);
          }
        },
        (error) => console.error("Error getting location", error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  };
  
  

  const handleExit = () => {
    isExitClicked.current = true;
    adjustShowFilter((prev) => !prev);
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  useEffect(() => {
    if (isExitClicked.current) {
      isExitClicked.current = false;
      return;
    }
    fetchPlaces();
  }, [adjustShowFilter]);

  const togglePanel = () => {
    adjustShowFilter((prev) => !prev);
  };

  const loadMorePlaces = useCallback(() => {
    setDisplayCount((prev) => prev + 3);
    setLikedPlaces({}); // Reset likes when new places are displayed
  }, []);

useEffect(() => {
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      // Each time space/enter is pressed, re-fetch recommendations.
      fetchPlaces();
    }
  };
  document.addEventListener("keydown", handleKeyPress);
  return () => document.removeEventListener("keydown", handleKeyPress);
}, [fetchPlaces]);


  return (
    <div className="relative overflow-hidden">
      <div className="h-screen w-screen bg-gradient-to-b from-white via-stone-200 to-stone-400 font-manrope overflow-x-hidden">
        <div>
          {places && (
            <div>
              {showFilter && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                  <div className="bg-stone-400/80 shadow-lg p-6 rounded-lg w-100 h-auto">
                    <h1 className="text-black">Filters</h1>
                    <Textarea
                      placeholder="What local businesses do you want to see?"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="mt-5 h-auto">
                      <h4 className="flex items-center justify-center">radius(km)</h4>
                      <div className="flex">
                        <h4 className="flex justify-start w-full">1km</h4>
                        <h4 className="flex justify-end w-full">20km</h4>
                      </div>
                      <Slider defaultValue={[100]} max={20000} step={10} className={"h-10"} />
                    </div>
                    <button
                      onClick={() => adjustShowFilter(false)}
                      className="mt-4 px-4 py-2 bg-green-600 text-white rounded w-full"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => handleExit()}
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded w-full"
                    >
                      Exit
                    </button>
                  </div>
                </div>
              )}
              <div className="w-full flex items-center justify-center">
                <Button
                  className="text-black bg-transparent hover:bg-stone-100/80 shadow-black/80 shadow-sm m-2"
                  onClick={togglePanel}
                >
                  <FilterIcon />
                </Button>

                <button
                  onClick={loadMorePlaces}
                  className="btn underline font-bold w-full"
                >
                  Load More (Press Space / Enter)
                </button>
              </div>
              <ul className="flex justify-between w-full">
  {Array.isArray(places) && places.slice(displayCount - 3, displayCount).map((place: Place) => (
    <SwipeCard
      key={place.id}
      place={place}
      likedPlaces={likedPlaces}
      setLikedPlaces={setLikedPlaces}
    />
  ))}
</ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface Seat {
  seatNumber: string;
  type: 'Regular' | 'Premium' | 'VIP';
  price: number;
  isBooked: boolean;
}

interface Theatre {
  name: string;
  location: string;
  showtimes: string[];
  date: string;
  price: number;
}

interface Movie {
  theatres: any;
  _id: string;
  title: string;
  poster: string;
  duration: string;
  rating: string;
  language: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Generate cinema-style seats (A1-J10)
const generateSeats = (price: number): Seat[] => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const seatsPerRow = 10;
  const seats: Seat[] = [];

  rows.forEach((row, rowIndex) => {
    for (let i = 1; i <= seatsPerRow; i++) {
      let seatType: 'Regular' | 'Premium' | 'VIP' = 'Regular';
      let seatPrice = price;

      // First 3 rows are VIP (more expensive)
      if (rowIndex < 3) {
        seatType = 'VIP';
        seatPrice = price * 1.5;
      }
      // Middle rows are Premium
      else if (rowIndex < 6) {
        seatType = 'Premium';
        seatPrice = price * 1.25;
      }

      seats.push({
        seatNumber: `${row}${i}`,
        type: seatType,
        price: Math.round(seatPrice),
        isBooked: Math.random() > 0.7, // Randomly book some seats for demo
      });
    }
  });

  return seats;
};

export default function BookingPage() {
  const router = useRouter();
  const params = useParams();
  const { user, token } = useAuth();
  const movieId = params.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [selectedTheatre, setSelectedTheatre] = useState<Theatre | null>(null);
  const [selectedShowtime, setSelectedShowtime] = useState<string>('');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'theatre' | 'seats' | 'payment'>('theatre');

  useEffect(() => {
    if (!user) {
      router.push(`/auth/login?redirect=/movies/${movieId}/booking`);
      return;
    }
    fetchMovie();
  }, [movieId, user]);

  const fetchMovie = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/movies/${movieId}`);
      const data = await res.json();

      if (data.success) {
        setMovie(data.data);
      } else {
        setError('Movie not found');
      }
    } catch (err) {
      setError('Error fetching movie details');
    } finally {
      setLoading(false);
    }
  };

  const handleTheatreSelect = (theatre: Theatre, showtime: string) => {
    setSelectedTheatre(theatre);
    setSelectedShowtime(showtime);
    setSeats(generateSeats(theatre.price));
    setStep('seats');
  };

  const toggleSeat = (seatNumber: string) => {
    const seat = seats.find(s => s.seatNumber === seatNumber);
    if (!seat || seat.isBooked) return;

    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatNumber));
    } else {
      if (selectedSeats.length >= 10) {
        alert('Maximum 10 seats can be selected');
        return;
      }
      setSelectedSeats([...selectedSeats, seatNumber]);
    }
  };

  const calculateTotal = () => {
    return selectedSeats.reduce((total, seatNum) => {
      const seat = seats.find(s => s.seatNumber === seatNum);
      return total + (seat?.price || 0);
    }, 0);
  };

  const handleBooking = async () => {
    if (!selectedTheatre || !selectedShowtime || selectedSeats.length === 0) {
      alert('Please select seats');
      return;
    }

    setBookingLoading(true);
    setError('');

    try {
      const bookingData = {
        movieId: movie?._id,
        theatre: {
          name: selectedTheatre.name,
          location: selectedTheatre.location,
        },
        showtime: {
          date: selectedTheatre.date,
          time: selectedShowtime,
        },
        seats: selectedSeats.map(seatNum => {
          const seat = seats.find(s => s.seatNumber === seatNum);
          return {
            seatNumber: seatNum,
            type: seat?.type || 'Regular',
            price: seat?.price || 0,
          };
        }),
        totalAmount: calculateTotal(),
        paymentMethod: 'Card',
      };

      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingData),
      });

      const data = await res.json();

      if (data.success) {
        // Update payment status to completed (in real app, this happens after payment gateway)
        await fetch(`${API_URL}/api/bookings/${data.data._id}/payment`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentStatus: 'Completed' }),
        });

        router.push(`/bookings/${data.data._id}`);
      } else {
        setError(data.message || 'Booking failed');
      }
    } catch (err) {
      setError('Error creating booking');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !movie) {
    return (
      <div className="pt-16 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => step === 'seats' ? setStep('theatre') : router.push(`/movies/${movieId}`)}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {step === 'seats' ? 'Change Theatre/Showtime' : 'Back to Movie'}
          </button>

          <h1 className="text-3xl font-bold mb-2">{movie?.title}</h1>
          <p className="text-gray-400">{movie?.duration} • {movie?.language} • {movie?.rating}</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center gap-4">
          <div className={`flex items-center gap-2 ${step === 'theatre' ? 'text-red-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'theatre' ? 'bg-red-600' : 'bg-gray-700'}`}>
              1
            </div>
            <span className="font-medium">Select Showtime</span>
          </div>
          <div className="flex-1 h-px bg-gray-700"></div>
          <div className={`flex items-center gap-2 ${step === 'seats' ? 'text-red-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'seats' ? 'bg-red-600' : 'bg-gray-700'}`}>
              2
            </div>
            <span className="font-medium">Select Seats</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Step 1: Theatre Selection */}
        {step === 'theatre' && movie && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Select Theatre & Showtime</h2>
            {movie.theatres && movie.theatres.map((theatre: Theatre, idx: number) => (
              <div key={idx} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{theatre.name}</h3>
                    <p className="text-gray-400">{theatre.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-400">Rs {theatre.price}</p>
                    <p className="text-sm text-gray-500">Starting price</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  {new Date(theatre.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <div className="flex flex-wrap gap-3">
                  {theatre.showtimes.map((time: string, timeIdx: number) => (
                    <button
                      key={timeIdx}
                      onClick={() => handleTheatreSelect(theatre, time)}
                      className="px-6 py-3 bg-gray-700 hover:bg-red-600 border border-gray-600 hover:border-red-500 rounded-lg font-medium transition-all"
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Seat Selection */}
        {step === 'seats' && (
          <div>
            {/* Selected Theatre Info */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Theatre</p>
                  <p className="font-semibold">{selectedTheatre?.name}</p>
                  <p className="text-sm text-gray-400">{selectedTheatre?.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Showtime</p>
                  <p className="font-semibold">{selectedShowtime}</p>
                  <p className="text-sm text-gray-400">
                    {selectedTheatre && new Date(selectedTheatre.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Selected Seats</p>
                  <p className="font-semibold">{selectedSeats.length} seat(s)</p>
                  <p className="text-sm text-gray-400">
                    {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-6">Select Your Seats</h2>

            {/* Screen */}
            <div className="mb-8">
              <div className="bg-gray-700 h-2 rounded-full mb-2"></div>
              <p className="text-center text-sm text-gray-400">Screen</p>
            </div>

            {/* Legend */}
            <div className="flex gap-6 mb-6 justify-center flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-700 border-2 border-gray-600 rounded"></div>
                <span className="text-sm">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-600 border-2 border-red-500 rounded"></div>
                <span className="text-sm">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-900 border-2 border-gray-800 rounded opacity-50"></div>
                <span className="text-sm">Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-600 border-2 border-purple-500 rounded"></div>
                <span className="text-sm">VIP (Rs {Math.round((selectedTheatre?.price || 0) * 1.5)})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 border-2 border-blue-500 rounded"></div>
                <span className="text-sm">Premium (Rs {Math.round((selectedTheatre?.price || 0) * 1.25)})</span>
              </div>
            </div>

            {/* Seat Map */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((row) => (
                    <div key={row} className="flex items-center gap-2 mb-2">
                      <div className="w-8 text-center font-semibold text-gray-400">{row}</div>
                      <div className="flex gap-2">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
                          const seatNumber = `${row}${num}`;
                          const seat = seats.find(s => s.seatNumber === seatNumber);
                          const isSelected = selectedSeats.includes(seatNumber);
                          const isBooked = seat?.isBooked;

                          let bgColor = 'bg-gray-700 border-gray-600';
                          if (isBooked) {
                            bgColor = 'bg-gray-900 border-gray-800 opacity-50 cursor-not-allowed';
                          } else if (isSelected) {
                            bgColor = 'bg-red-600 border-red-500';
                          } else if (seat?.type === 'VIP') {
                            bgColor = 'bg-purple-600/30 border-purple-500 hover:bg-purple-600';
                          } else if (seat?.type === 'Premium') {
                            bgColor = 'bg-blue-600/30 border-blue-500 hover:bg-blue-600';
                          } else {
                            bgColor = 'bg-gray-700 border-gray-600 hover:bg-gray-600';
                          }

                          return (
                            <button
                              key={seatNumber}
                              onClick={() => toggleSeat(seatNumber)}
                              disabled={isBooked}
                              className={`w-10 h-10 border-2 rounded text-xs font-medium transition-all ${bgColor}`}
                              title={`${seatNumber} - ${seat?.type} - Rs ${seat?.price}`}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking Summary */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-xl font-bold mb-4">Booking Summary</h3>
              <div className="space-y-3 mb-6">
                {selectedSeats.map((seatNum) => {
                  const seat = seats.find(s => s.seatNumber === seatNum);
                  return (
                    <div key={seatNum} className="flex justify-between">
                      <span>
                        Seat {seatNum} <span className="text-sm text-gray-400">({seat?.type})</span>
                      </span>
                      <span className="font-semibold">Rs {seat?.price}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-red-400">Rs {calculateTotal()}</span>
                </div>
              </div>
              <button
                onClick={handleBooking}
                disabled={selectedSeats.length === 0 || bookingLoading}
                className="w-full mt-6 px-6 py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all"
              >
                {bookingLoading ? 'Processing...' : `Pay Rs ${calculateTotal()}`}
              </button>
              <p className="text-center text-sm text-gray-400 mt-3">
                {selectedSeats.length === 0 ? 'Please select at least one seat' : `${selectedSeats.length} seat(s) selected`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

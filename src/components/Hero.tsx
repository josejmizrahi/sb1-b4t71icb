import React from 'react';

export function Hero() {
  return (
    <div className="relative bg-blue-700">
      <div className="absolute inset-0">
        <img
          className="w-full h-full object-cover opacity-30"
          src="https://images.unsplash.com/photo-1519766304817-4f37bda74a26?auto=format&fit=crop&q=80"
          alt="Jerusalem cityscape"
        />
        <div className="absolute inset-0 bg-blue-700 mix-blend-multiply" />
      </div>
      
      <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Building Our Digital Homeland
        </h1>
        <p className="mt-6 text-xl text-blue-100 max-w-3xl">
          Join us in creating a vibrant, connected Jewish community for the digital age. 
          Together we'll preserve our traditions, foster innovation, and build a strong future.
        </p>
        <div className="mt-10">
          <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50">
            Join the Movement
          </button>
        </div>
      </div>
    </div>
  );
}
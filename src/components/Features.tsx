import React from 'react';
import { BookOpen, Users, Globe, Scale } from 'lucide-react';

const features = [
  {
    name: 'Digital Torah Study',
    description: 'Access to virtual learning resources, online shiurim, and interactive study groups.',
    icon: BookOpen,
  },
  {
    name: 'Global Community',
    description: 'Connect with Jews worldwide, share experiences, and build meaningful relationships.',
    icon: Globe,
  },
  {
    name: 'Democratic Governance',
    description: 'Participate in community decisions through transparent digital voting and discussion.',
    icon: Scale,
  },
  {
    name: 'Support Network',
    description: 'Access mutual aid, professional networking, and community resources.',
    icon: Users,
  },
];

export function Features() {
  return (
    <div className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Building Blocks of Our Digital Nation
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Our platform combines ancient wisdom with modern technology
          </p>
        </div>

        <div className="mt-10">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.name} className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                        <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                      {feature.name}
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
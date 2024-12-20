import { BookOpen, Users, Globe, Scale } from 'lucide-react';
import { Container } from '../layout/Container';
import { Button } from '../ui/button';

const features = [
  {
    name: 'Digital Torah Study',
    description: 'Access to virtual learning resources, online shiurim, and interactive study groups.',
    icon: BookOpen,
    href: '/learning'
  },
  {
    name: 'Global Community',
    description: 'Connect with Jews worldwide, share experiences, and build meaningful relationships.',
    icon: Globe,
    href: '/community'
  },
  {
    name: 'Democratic Governance',
    description: 'Participate in community decisions through transparent digital voting and discussion.',
    icon: Scale,
    href: '/governance'
  },
  {
    name: 'Support Network',
    description: 'Access mutual aid, professional networking, and community resources.',
    icon: Users,
    href: '/support'
  },
];

export function Features() {
  return (
    <section className="py-24 bg-background">
      <Container size="full">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              Building Blocks of Our Digital Nation
            </h2>
            <p className="mt-4 text-xl text-muted-foreground">
              Our platform combines ancient wisdom with modern technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {features.map((feature) => (
              <div key={feature.name} className="group">
                <div className="flex flex-col h-full">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-md">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </span>
                  </div>
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-foreground">
                      {feature.name}
                    </h3>
                    <p className="mt-3 text-base text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <div className="mt-6">
                    <Button variant="outline" asChild>
                      <a href={feature.href}>Learn More</a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
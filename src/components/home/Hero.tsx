import { Button } from '../ui/button';
import { Container } from '../layout/Container';

export function Hero() {
  return (
    <section className="relative bg-background">
      <div className="absolute inset-0">
        <img
          className="w-full h-full object-cover opacity-10"
          src="https://images.unsplash.com/photo-1519766304817-4f37bda74a26?auto=format&fit=crop&q=80"
          alt="Jerusalem cityscape"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background to-background/50" />
      </div>
      
      <Container size="full" className="relative py-24 sm:py-32">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Building Our Digital Homeland
              </h1>
              <p className="mt-6 text-xl text-muted-foreground max-w-3xl">
                Join us in creating a vibrant, connected Jewish community for the digital age. 
                Together we'll preserve our traditions, foster innovation, and build a strong future.
              </p>
              <div className="mt-10 space-x-4">
                <Button size="lg">Join the Movement</Button>
                <Button size="lg" variant="outline">Learn More</Button>
              </div>
            </div>
            <div className="hidden lg:block">
              {/* Add an illustration or additional content here */}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
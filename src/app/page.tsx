import { Navbar } from '@/components/marketing/Navbar'
import { Hero } from '@/components/marketing/sections/Hero'
import { HowItWorks } from '@/components/marketing/sections/HowItWorks'
import { DeliveryAreas } from '@/components/marketing/sections/DeliveryAreas'
import { DriverCTA } from '@/components/marketing/sections/DriverCTA'
import { Testimonials } from '@/components/marketing/sections/Testimonials'
import { Footer } from '@/components/marketing/sections/Footer'

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <DeliveryAreas />
        <DriverCTA />
        <Testimonials />
      </main>
      <Footer />
    </div>
  )
}


import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeaturedAuctions from "@/components/FeaturedAuctions";
import Categories from "@/components/Categories";
import TrendingProducts from "@/components/TrendingProducts";
import SustainabilityFeature from "@/components/SustainabilityFeature";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <FeaturedAuctions />
        <Categories />
        <TrendingProducts />
        <SustainabilityFeature />
        <Testimonials />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

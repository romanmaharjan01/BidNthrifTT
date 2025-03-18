import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="flex-1 py-12 px-6">
        <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-4xl font-bold text-center text-brand-green">About Us</h1>
          <p className="text-lg text-gray-600 mt-4 text-center">
            Welcome to <span className="font-semibold">BidNthrifT</span> – the ultimate destination for <strong>sustainable fashion</strong>.
          </p>

          <div className="mt-8 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800">🌍 Our Mission</h2>
              <p className="text-gray-600 mt-2">
                We believe in <strong>sustainable and affordable shopping</strong>. Our platform connects buyers and sellers who
                want to <strong>thrift, bid, and shop</strong> while reducing waste.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800">🔄 How It Works</h2>
              <ul className="list-disc pl-6 text-gray-600 mt-2">
                <li>Sell your <strong>pre-loved fashion items</strong> easily.</li>
                <li>Bid on high-quality <strong>thrift items</strong> at great prices.</li>
                <li>Find amazing <strong>second-hand fashion deals</strong> in one place.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800">💡 Why Choose Us?</h2>
              <p className="text-gray-600 mt-2">
                Unlike traditional marketplaces, we focus on <strong>sustainability, affordability, and community-driven
                commerce</strong>.
              </p>
              <ul className="list-disc pl-6 text-gray-600 mt-2">
                <li>Secure transactions & easy checkout.</li>
                <li>Support for both <strong>direct sales</strong> and <strong>auctions</strong>.</li>
                <li>Empowering <strong>eco-friendly shopping choices</strong>.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800">📞 Contact Us</h2>
              <p className="text-gray-600 mt-2">
                Have questions? <strong>We’d love to hear from you!</strong> Reach out at{" "}
                <a href="mailto:support@bidnthrift.com" className="text-blue-500 hover:underline">
                  support@bidnthrift.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;

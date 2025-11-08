'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Music, Ticket, MessageCircle, Film, Play, TrendingUp, Sparkles, Instagram, Youtube } from 'lucide-react';
import { Button } from '@/components/ui';

export default function Home() {
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const floatAnimation = {
    y: [-10, 10],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: "reverse" as const,
      ease: "easeInOut",
    },
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          {/* Gradient Orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl"
          />
          
          {/* Floating Music Notes */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: 6 + i,
                repeat: Infinity,
                delay: i * 0.8,
              }}
              className="absolute text-emerald-500/20"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 20}%`,
                fontSize: '2rem',
              }}
            >
              ♪
            </motion.div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 py-20 text-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-semibold mb-8">
                <Sparkles className="inline w-4 h-4 mr-2" />
                Welcome to the Future of Entertainment
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-6xl md:text-8xl font-['Poppins',sans-serif] font-bold mb-6"
            >
              <span className="block mb-4 text-gray-100">Discover. Connect.</span>
              <span className="bg-linear-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
                Experience.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Your world of music, events, and creators — powered by community.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/music">
                <Button variant="primary" size="lg">
                  <Play className="w-5 h-5 mr-2" />
                  Explore Now
                </Button>
              </Link>
              <Link href="/community">
                <Button variant="outline" size="lg">
                  Join the Community
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-emerald-500/30 rounded-full p-1">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-emerald-500 rounded-full mx-auto"
            />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-['Poppins',sans-serif] font-bold mb-4"
            >
              Everything You Need,{' '}
              <span className="bg-linear-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
                One Platform
              </span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-400 text-lg">
              Seamlessly integrated features for the ultimate entertainment experience
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                icon: Music,
                title: 'Music Streaming',
                description: 'Access millions of tracks from emerging and established artists',
                href: '/music',
                gradient: 'from-purple-500 to-pink-500',
              },
              {
                icon: Ticket,
                title: 'Event Booking',
                description: 'Discover and attend live concerts, festivals, and exclusive shows',
                href: '/events',
                gradient: 'from-blue-500 to-cyan-500',
              },
              {
                icon: MessageCircle,
                title: 'Community Hub',
                description: 'Connect with fans, share moments, and build your network',
                href: '/community',
                gradient: 'from-emerald-500 to-teal-500',
              },
              {
                icon: Film,
                title: 'Shows & Originals',
                description: 'Watch exclusive content, documentaries, and behind-the-scenes',
                href: '/shows',
                gradient: 'from-red-500 to-orange-500',
              },
            ].map((feature, index) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Link href={feature.href}>
                  <div className="group h-full p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1">
                    <div className={`inline-flex p-3 bg-linear-to-br ${feature.gradient} rounded-xl mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-emerald-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-20 px-6 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 text-emerald-400 mb-4">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">What's Hot Right Now</span>
            </motion.div>
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-['Poppins',sans-serif] font-bold mb-4"
            >
              Trending Across{' '}
              <span className="bg-linear-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
                MyScope
              </span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ scale: 1.05 }}
                className="aspect-square bg-linear-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden group"
              >
                <div className="w-full h-full flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                  {['🎵', '🎬', '🎤', '🎸', '🎧', '🎪'][i]}
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Link href="/music">
              <Button variant="secondary" size="lg">
                See What's Hot
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-emerald-600/20 to-indigo-600/20" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <Sparkles className="w-12 h-12 mx-auto mb-6 text-emerald-400" />
          <h2 className="text-5xl md:text-6xl font-['Poppins',sans-serif] font-bold mb-6">
            Ready to Amplify{' '}
            <span className="bg-linear-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              Your World?
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of music lovers, creators, and fans in the most vibrant entertainment community.
          </p>
          <Link href="/auth/register">
            <Button variant="primary" size="lg" className="text-xl px-12 py-5">
              Join MyScope Now
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}

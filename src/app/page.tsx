'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Music, Ticket, MessageCircle, Film, Play, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';

export default function Home() {
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0,
      },
    },
  };

  return (
    <div style={{ backgroundColor: '#07060A', color: '#F5F3FA' }}>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20" style={{ backgroundColor: '#07060A' }}>
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 -z-10" style={{
          background: 'radial-gradient(ellipse at 20% 50%, rgba(167, 139, 250, 0.15) 0%, transparent 50%)',
        }} />
        <div className="absolute inset-0 -z-10" style={{
          background: 'radial-gradient(ellipse at 80% 80%, rgba(255, 122, 198, 0.1) 0%, transparent 50%)',
        }} />

        {/* Animated Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl -z-10"
          style={{
            background: 'radial-gradient(circle, rgba(167, 139, 250, 0.3), transparent)',
          }}
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl -z-10"
          style={{
            background: 'radial-gradient(circle, rgba(255, 122, 198, 0.2), transparent)',
          }}
        />

        <div className="max-w-5xl mx-auto px-6 py-20 text-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Badge */}
            <motion.div variants={fadeInUp} className="mb-8">
              <span
                className="inline-block px-4 py-2.5 rounded-full text-sm font-medium font-inter mb-8"
                style={{
                  backgroundColor: 'rgba(196, 181, 253, 0.08)',
                  border: '1px solid rgba(196, 181, 253, 0.28)',
                  color: '#C4B5FD',
                }}
              >
                <Sparkles className="inline w-4 h-4 mr-2" />
                Welcome to Your Entertainment Hub
              </span>
            </motion.div>

            {/* Hero Title */}
            <motion.h1
              variants={fadeInUp}
              className="text-5xl md:text-7xl lg:text-8xl font-outfit font-bold mb-8 leading-tight"
              style={{ letterSpacing: '-0.04em' }}
            >
              <span className="block mb-3" style={{ color: '#F5F3FA' }}>Discover.</span>
              <span className="block" style={{
                background: 'linear-gradient(110deg, #A78BFA, #C4B5FD, #6366F1)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Connect. Experience.
              </span>
            </motion.h1>

            {/* Hero Description */}
            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl max-w-3xl mx-auto mb-12 leading-relaxed font-inter"
              style={{ color: '#9B95B5' }}
            >
              Your world of music, events, and entertainment — powered by community and driven by innovation. Stream, discover, and connect with creators worldwide.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/music">
                <Button variant="primary" size="lg">
                  <Play size={20} className="mr-2" />
                  Explore Now
                </Button>
              </Link>
              <Link href="/community">
                <Button variant="outline" size="lg">
                  Join Community
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
          <div className="w-6 h-10 border-2 rounded-full p-1" style={{ borderColor: 'rgba(167, 139, 250, 0.3)' }}>
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-accent-primary rounded-full mx-auto"
              style={{ backgroundColor: '#A78BFA' }}
            />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 relative" style={{ backgroundColor: '#07060A' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-20"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-6xl font-outfit font-bold mb-6"
              style={{ letterSpacing: '-0.04em' }}
            >
              Everything You Need,{' '}
              <span style={{
                background: 'linear-gradient(110deg, #A78BFA, #C4B5FD)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                One Platform
              </span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg font-inter" style={{ color: '#9B95B5' }}>
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
                color: '#A78BFA',
              },
              {
                icon: Ticket,
                title: 'Event Booking',
                description: 'Discover and attend live concerts, festivals, and exclusive shows',
                href: '/events',
                color: '#B794F6',
              },
              {
                icon: MessageCircle,
                title: 'Community Hub',
                description: 'Connect with fans, share moments, and build your network',
                href: '/community',
                color: '#C4B5FD',
              },
              {
                icon: Film,
                title: 'Shows & Originals',
                description: 'Watch exclusive content, documentaries, and behind-the-scenes',
                href: '/shows',
                color: '#6366F1',
              },
            ].map((feature) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Link href={feature.href}>
                  <div
                    className="group h-full p-8 rounded-lg border transition-all duration-300 cursor-pointer"
                    style={{
                      backgroundColor: '#15121D',
                      border: '1px solid rgba(196, 181, 253, 0.1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#1E1A2B';
                      e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                      e.currentTarget.style.boxShadow = '0 24px 50px rgba(167, 139, 250, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#15121D';
                      e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div
                      className="inline-flex p-4 rounded-lg mb-6 group-hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: `rgba(167, 139, 250, 0.1)`,
                        color: feature.color,
                      }}
                    >
                      <feature.icon size={28} />
                    </div>
                    <h3 className="text-xl font-outfit font-semibold mb-3 transition-colors" style={{ color: '#F5F3FA' }}>
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed font-inter" style={{ color: '#9B95B5' }}>
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
      <section className="py-24 px-6" style={{ backgroundColor: '#0F0D14' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 mb-6 font-inter font-medium text-sm" style={{ color: '#A78BFA' }}>
              <TrendingUp size={18} />
              <span>What's Hot Right Now</span>
            </motion.div>
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-6xl font-outfit font-bold mb-4"
              style={{ letterSpacing: '-0.04em' }}
            >
              Trending Across{' '}
              <span style={{
                background: 'linear-gradient(110deg, #A78BFA, #B794F6)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                MyScope
              </span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12"
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ scale: 1.05 }}
                className="aspect-square rounded-2xl border transition-all cursor-pointer overflow-hidden group hover:shadow-lg"
                style={{
                  backgroundColor: '#15121D',
                  border: '1px solid rgba(196, 181, 253, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
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
                See What's Trending
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Banner Section */}
      <section className="py-32 px-6 relative overflow-hidden" style={{ backgroundColor: '#07060A' }}>
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(167, 139, 250, 0.1) 0%, transparent 70%)',
        }} />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <Sparkles className="w-16 h-16 mx-auto mb-8" style={{ color: '#A78BFA' }} />
          <h2 className="text-5xl md:text-7xl font-outfit font-bold mb-8" style={{
            letterSpacing: '-0.04em',
            color: '#F5F3FA',
          }}>
            Ready to Amplify{' '}
            <span style={{
              background: 'linear-gradient(110deg, #A78BFA, #C4B5FD, #B794F6)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Your World?
            </span>
          </h2>
          <p className="text-xl max-w-3xl mx-auto mb-12 leading-relaxed font-inter" style={{ color: '#9B95B5' }}>
            Join thousands of music lovers, creators, and fans in the most vibrant entertainment community. Stream exclusive content, discover new artists, and connect with your community.
          </p>
          <Link href="/auth/register">
            <Button variant="primary" size="lg" style={{ fontSize: '16px', padding: '16px 48px' }}>
              Join MyScope Now
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}

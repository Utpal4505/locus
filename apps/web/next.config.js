/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@locus/api-client", "@locus/contracts"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
      },
      {
        protocol: "https",
        hostname: "yt3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;

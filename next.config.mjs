const config = { output: 'export', images: { unoptimized: true }, devIndicators: false, basePath: process.env.GITHUB_ACTIONS === 'true' ? '/tradepilot' : '', trailingSlash: true };
export default config;

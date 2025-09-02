const esbuild = require('esbuild');
const { nodeExternalsPlugin } = require('esbuild-node-externals');
const fs = require('fs');
const path = require('path');

const entryPoints = [
  'src/handlers/presigned-url.ts',
  'src/handlers/orchestrator.ts',
  'src/handlers/validator.ts',
  'src/handlers/resize.ts',
  'src/handlers/exposure.ts',
];

const build = async () => {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
  }
  fs.mkdirSync('dist');

  try {
    await esbuild.build({
      entryPoints,
      bundle: true,
      platform: 'node',
      target: 'node20',
      outdir: 'dist',
      sourcemap: true,
      minify: process.env.NODE_ENV === 'production',
      metafile: true,
      plugins: [
        nodeExternalsPlugin({
          // Sharp needs to be bundled separately in a Lambda Layer
          allowList: ['sharp']
        })
      ],
      external: ['sharp'], // Sharp will be provided by Lambda Layer
      loader: {
        '.json': 'json',
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      },
    });

    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
};

build();
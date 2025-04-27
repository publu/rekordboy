const webpack = require('@nativescript/webpack');
const { ProvidePlugin } = require('webpack');

module.exports = (env) => {
  webpack.init(env);

  webpack.chainWebpack((config) => {
    // Chainable alias
    config.resolve.alias
      .set('zlib', false);

    // Merge fallback as an object (not chainable)
    config.resolve.merge({
      fallback: {
        stream: require.resolve('stream-browserify'),
        string_decoder: require.resolve('string_decoder/'),
        zlib: require.resolve('browserify-zlib'),
        buffer: require.resolve('buffer/')
      }
    });

    // Provide global Buffer
    config.plugin('buffer')
      .use(ProvidePlugin, [{
        Buffer: ['buffer', 'Buffer']
      }]);
  });

  return webpack.resolveConfig();
};

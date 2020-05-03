const path = require('path');

module.exports = {
  entry: './src/ts/main.ts',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js', '.html' ],
  },
  output: {
    filename: 'note-sequencer.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/'
  }
};
